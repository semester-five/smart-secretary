import asyncio
import json
from datetime import UTC, date, datetime
from typing import Any, Literal

import requests
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.project import (
    ActionItem,
    Meeting,
    MeetingSummary,
    ProcessingJob,
    Speaker,
    TranscriptSegment,
)


MAX_SUMMARY_OUTPUT_TOKENS = 8192


class GeneratedActionItem(BaseModel):
    title: str = Field(min_length=1)
    assignee: str | None = None
    due_date: str | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    evidence: str | None = None


class GeneratedMeetingSummary(BaseModel):
    language: Literal["en", "vi", "mixed"]
    summary_text: str = Field(min_length=1)
    key_points: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    action_items: list[GeneratedActionItem] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)


def _response_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "language": {"type": "string", "enum": ["en", "vi", "mixed"]},
            "summary_text": {"type": "string"},
            "key_points": {"type": "array", "items": {"type": "string"}},
            "decisions": {"type": "array", "items": {"type": "string"}},
            "action_items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "assignee": {"type": "string", "nullable": True},
                        "due_date": {"type": "string", "nullable": True},
                        "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                        "evidence": {"type": "string", "nullable": True},
                    },
                    "required": ["title", "assignee", "due_date", "priority", "evidence"],
                },
            },
            "open_questions": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "language",
            "summary_text",
            "key_points",
            "decisions",
            "action_items",
            "open_questions",
        ],
    }


def _format_timestamp(ms: int) -> str:
    total_seconds = max(0, ms // 1000)
    minutes, seconds = divmod(total_seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    return f"{minutes:02d}:{seconds:02d}"


async def _build_transcript_text(
    db: AsyncSession,
    meeting_id: str,
    version_no: int,
) -> str:
    speakers = (
        await db.scalars(
            select(Speaker).where(
                Speaker.meeting_id == meeting_id,
                Speaker.deleted_at.is_(None),
            )
        )
    ).all()
    speaker_names = {
        speaker.id: speaker.display_name or speaker.speaker_label
        for speaker in speakers
    }

    segments = (
        await db.scalars(
            select(TranscriptSegment)
            .where(
                TranscriptSegment.meeting_id == meeting_id,
                TranscriptSegment.version_no == version_no,
                TranscriptSegment.deleted_at.is_(None),
            )
            .order_by(TranscriptSegment.start_ms.asc())
        )
    ).all()
    if not segments:
        raise ValueError("No transcript segments found for this meeting.")

    lines = []
    for segment in segments:
        speaker = speaker_names.get(segment.speaker_id, "UNKNOWN")
        start = _format_timestamp(segment.start_ms)
        end = _format_timestamp(segment.end_ms)
        lines.append(f"[{start} - {end}] {speaker}: {segment.text}")
    return "\n".join(lines)


def _count_words(text: str) -> int:
    return len(text.split())


def _summary_length_guidance(word_count: int) -> str:
    if word_count < 600:
        return (
            "Write 1-2 focused paragraphs, about 80-160 words total. "
            "Keep it compact because the transcript is short."
        )
    if word_count < 1800:
        return (
            "Write 2-4 paragraphs, about 180-350 words total. "
            "Cover the main discussion flow, important context, and outcomes."
        )
    if word_count < 4500:
        return (
            "Write 4-6 substantial paragraphs, about 350-700 words total. "
            "Preserve the major topics, trade-offs, decisions, and follow-up context."
        )
    return (
        "Write 6-10 substantial paragraphs, about 700-1200 words total. "
        "For long meetings, include enough detail for someone who did not attend to understand "
        "the discussion flow, key context, decisions, risks, and next steps."
    )


def _key_point_guidance(word_count: int) -> str:
    if word_count < 600:
        return "3-5 important points"
    if word_count < 1800:
        return "4-8 important points"
    if word_count < 4500:
        return "6-12 important points"
    return "8-16 important points"


def _build_prompt(transcript: str) -> str:
    language_instruction = {
        "auto": "Use the same primary language as the transcript.",
        "en": "Write the output in English.",
        "vi": "Write the output in Vietnamese.",
    }.get(settings.SUMMARY_LANGUAGE, "Use the same primary language as the transcript.")
    transcript_word_count = _count_words(transcript)
    summary_length_guidance = _summary_length_guidance(transcript_word_count)
    key_point_guidance = _key_point_guidance(transcript_word_count)

    return f"""
You are a meeting intelligence assistant.

{language_instruction}

Summarize the meeting transcript faithfully. The summary length must scale with the amount
of transcript content instead of always being a short abstract.

Rules:
- Do not invent facts, attendees, decisions, owners, or due dates.
- Transcript length: approximately {transcript_word_count} words.
- summary_text: {summary_length_guidance}
- summary_text: use multiple paragraphs separated by blank lines when the transcript is medium or long.
- key_points: {key_point_guidance}.
- decisions: only explicit decisions. Use an empty list if none.
- action_items: only explicit or strongly implied tasks. Include transcript evidence.
- open_questions: unresolved questions or follow-ups. Use an empty list if none.

Transcript:
{transcript}
""".strip()


def _extract_gemini_text(payload: dict[str, Any]) -> str:
    try:
        return payload["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError(f"Gemini response did not contain text: {payload}") from exc


def _call_gemini(prompt: str) -> GeneratedMeetingSummary:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_SUMMARY_MODEL}:generateContent"
    )
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": MAX_SUMMARY_OUTPUT_TOKENS,
            "responseMimeType": "application/json",
            "responseJsonSchema": _response_schema(),
        },
    }
    response = requests.post(
        url,
        params={"key": settings.GEMINI_API_KEY},
        json=payload,
        timeout=120,
    )
    response.raise_for_status()
    raw_text = _extract_gemini_text(response.json())
    try:
        return GeneratedMeetingSummary.model_validate_json(raw_text)
    except ValidationError:
        return GeneratedMeetingSummary.model_validate(json.loads(raw_text))


def _parse_due_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


async def _save_summary(
    db: AsyncSession,
    meeting_id: str,
    version_no: int,
    current_user_id: str,
    generated: GeneratedMeetingSummary,
) -> None:
    now = datetime.now(UTC)
    summary = await db.scalar(
        select(MeetingSummary).where(
            MeetingSummary.meeting_id == meeting_id,
            MeetingSummary.version_no == version_no,
            MeetingSummary.deleted_at.is_(None),
        )
    )
    key_points_json = {
        "items": generated.key_points,
        "open_questions": generated.open_questions,
        "language": generated.language,
    }
    decisions_json = {"items": generated.decisions}

    if summary is None:
        summary = MeetingSummary(
            meeting_id=meeting_id,
            version_no=version_no,
            summary_text=generated.summary_text,
            key_points_json=key_points_json,
            decisions_json=decisions_json,
            source="ai",
            created_at=now,
            updated_at=now,
            created_by=current_user_id,
            updated_by=current_user_id,
        )
        db.add(summary)
    else:
        summary.summary_text = generated.summary_text
        summary.key_points_json = key_points_json
        summary.decisions_json = decisions_json
        summary.source = "ai"
        summary.updated_at = now
        summary.updated_by = current_user_id

    existing_ai_items = (
        await db.scalars(
            select(ActionItem).where(
                ActionItem.meeting_id == meeting_id,
                ActionItem.version_no == version_no,
                ActionItem.source == "ai",
                ActionItem.deleted_at.is_(None),
            )
        )
    ).all()
    for item in existing_ai_items:
        item.deleted_at = now
        item.updated_at = now
        item.updated_by = current_user_id

    for item in generated.action_items:
        db.add(
            ActionItem(
                meeting_id=meeting_id,
                version_no=version_no,
                title=item.title,
                description=item.evidence,
                assignee_text=item.assignee,
                due_date=_parse_due_date(item.due_date),
                priority=item.priority,
                status="open",
                source="ai",
                created_at=now,
                updated_at=now,
                created_by=current_user_id,
                updated_by=current_user_id,
            )
        )


async def process_meeting_summary_task(
    meeting_id: str,
    job_id: str,
    current_user_id: str,
    db: AsyncSession,
    version_no: int = 1,
) -> None:
    try:
        job = await db.scalar(select(ProcessingJob).where(ProcessingJob.id == job_id))
        if job:
            job.status = "running"
            job.progress = 10
            job.started_at = datetime.now(UTC)
            await db.commit()

        transcript = await _build_transcript_text(db, meeting_id, version_no)
        prompt = _build_prompt(transcript)
        generated = await asyncio.to_thread(_call_gemini, prompt)

        await _save_summary(db, meeting_id, version_no, current_user_id, generated)

        meeting = await db.scalar(select(Meeting).where(Meeting.id == meeting_id))
        if meeting:
            meeting.status = "draft"
            meeting.updated_at = datetime.now(UTC)
            meeting.updated_by = current_user_id

        if job:
            job.status = "completed"
            job.progress = 100
            job.finished_at = datetime.now(UTC)
            job.updated_at = datetime.now(UTC)
            job.updated_by = current_user_id

        await db.commit()
        print(f"✅ Summary generated for meeting {meeting_id}.")

    except Exception as exc:
        print(f"❌ Summary generation failed: {exc}")
        job = await db.scalar(select(ProcessingJob).where(ProcessingJob.id == job_id))
        if job:
            job.status = "failed"
            job.error_message = str(exc)
            job.finished_at = datetime.now(UTC)
            job.updated_at = datetime.now(UTC)
            job.updated_by = current_user_id
            await db.commit()
