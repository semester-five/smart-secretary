import tempfile
import os
import asyncio
from datetime import UTC, datetime
from pathlib import Path

import huggingface_hub
import numpy as np
import torch
import torchaudio

# Import torch before faster-whisper/CTranslate2. On Windows, both stacks load
# cuDNN DLLs and the order affects which DLL is reused by the process.
from faster_whisper import WhisperModel

if not hasattr(torchaudio, "set_audio_backend"):
    torchaudio.set_audio_backend = lambda *args, **kwargs: None
if not hasattr(torchaudio, "get_audio_backend"):
    torchaudio.get_audio_backend = lambda *args, **kwargs: "soundfile"
if not hasattr(np, "NaN"):
    np.NaN = np.nan

_original_hf_hub_download = huggingface_hub.hf_hub_download


def _hf_hub_download_compat(*args, **kwargs):
    if "use_auth_token" in kwargs and "token" not in kwargs:
        kwargs["token"] = kwargs.pop("use_auth_token")
    else:
        kwargs.pop("use_auth_token", None)
    return _original_hf_hub_download(*args, **kwargs)


huggingface_hub.hf_hub_download = _hf_hub_download_compat

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.project import ProcessingJob, Meeting, MeetingFile, Speaker, TranscriptSegment, MeetingVersion
from app.core.supabase import get_storage_client

# ---------------------------------------------------------------------------
# Device setup
# ---------------------------------------------------------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float16" if device == "cuda" else "int8"
diarization_device = device

whisper_model: WhisperModel | None = None
diarization_pipeline = None
_diarization_failed = False   # FIX Bug 3: tách biệt "chưa load" vs "load thất bại"


# ---------------------------------------------------------------------------
# Model initialization
# ---------------------------------------------------------------------------
def _initialize_models() -> None:
    global whisper_model, diarization_pipeline, _diarization_failed

    if whisper_model is None:
        print("Loading Faster-Whisper [large-v3-turbo]...")
        whisper_model = WhisperModel(
            "large-v3-turbo",
            device=device,
            compute_type=compute_type,
        )
        print("✅ Whisper loaded.")

    if diarization_pipeline is None and not _diarization_failed:
        try:
            from pyannote.audio import Pipeline

            print("Loading Pyannote Diarization [speaker-diarization-3.1]...")
            try:
                diarization_pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    token=settings.HF_TOKEN,
                )
            except TypeError as exc:
                if "token" not in str(exc):
                    raise
                diarization_pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=settings.HF_TOKEN,
                )
            if diarization_device == "cuda":
                diarization_pipeline.to(torch.device("cuda"))
            print(f"✅ Pyannote loaded on {diarization_device}.")
        except Exception as exc:
            _diarization_failed = True   # FIX Bug 3: không dùng sentinel False nữa
            print(f"⚠️  Pyannote diarization disabled: {exc}")


# ---------------------------------------------------------------------------
# Helper: overlap scoring
# ---------------------------------------------------------------------------
def _get_best_speaker(annotation, start_sec: float, end_sec: float) -> str:
    """
    Tính tổng thời gian overlap của mỗi speaker với segment Whisper,
    trả về speaker có overlap lớn nhất.
    Chính xác hơn midpoint khi 1 segment kéo dài qua nhiều người nói.
    """
    scores: dict[str, float] = {}
    for turn, _, label in annotation.itertracks(yield_label=True):
        overlap = min(turn.end, end_sec) - max(turn.start, start_sec)
        if overlap > 0:
            scores[label] = scores.get(label, 0) + overlap
    return max(scores, key=scores.get) if scores else "UNKNOWN"


def _get_audio_suffix(file_name: str, mime_type: str) -> str:
    suffix = Path(file_name).suffix
    if suffix:
        return suffix
    if "mpeg" in mime_type or "mp3" in mime_type:
        return ".mp3"
    if "wav" in mime_type or "wave" in mime_type:
        return ".wav"
    if "mp4" in mime_type or "m4a" in mime_type:
        return ".m4a"
    return ".wav"


def _normalize_speaker_label(raw_label: str, speaker_order: dict[str, str]) -> str:
    if raw_label == "UNKNOWN":
        return raw_label
    if raw_label not in speaker_order:
        speaker_order[raw_label] = f"speaker {len(speaker_order) + 1:02d}"
    return speaker_order[raw_label]


# ---------------------------------------------------------------------------
# Main background task
# ---------------------------------------------------------------------------
async def process_meeting_audio_task(
    meeting_id: str,
    job_id: str,
    current_user_id: str,
    db: AsyncSession,
) -> None:
    """Chạy ngầm (Background Task): transcribe + diarize → lưu DB."""

    tmp_filepath: str | None = None

    try:
        await asyncio.to_thread(_initialize_models)

        # 1. Đổi trạng thái Job → running
        job = await db.scalar(select(ProcessingJob).where(ProcessingJob.id == job_id))
        if job:
            job.status = "running"
            job.progress = 10
            job.started_at = datetime.now(UTC)
            job.updated_at = datetime.now(UTC)
            job.updated_by = current_user_id
            await db.commit()

        # 2. Lấy thông tin file audio mới nhất
        meeting_file = await db.scalar(
            select(MeetingFile)
            .where(
                MeetingFile.meeting_id == meeting_id,
                MeetingFile.deleted_at.is_(None),
            )
            .order_by(MeetingFile.created_at.desc())
        )
        if not meeting_file:
            raise Exception("Không tìm thấy file ghi âm cho cuộc họp này.")

        # 3. Tải file từ Supabase → ổ cứng tạm
        storage_client = get_storage_client()
        file_bytes = await storage_client.from_(settings.SUPABASE_BUCKET).download(
            meeting_file.storage_key
        )
        suffix = _get_audio_suffix(meeting_file.file_name, meeting_file.mime_type)
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            tmp_file.write(file_bytes)
            tmp_filepath = tmp_file.name

        # 4. Diarization (Pyannote)
        # FIX Bug 1 & 2: Pipeline.__call__ luôn trả về Annotation trực tiếp.
        # Không cần check .speaker_diarization — attribute đó không tồn tại
        # trong pyannote.audio 3.x khi gọi pipeline(audio_path).
        annotation = None
        if diarization_pipeline is not None:
            print("Bắt đầu phân chia giọng nói (Pyannote)...")
            try:
                # Pipeline.__call__ trả về pyannote.core.Annotation trực tiếp
                annotation = await asyncio.to_thread(
                    diarization_pipeline, tmp_filepath
                )
                labels = annotation.labels()
                turns_count = sum(1 for _ in annotation.itertracks(yield_label=True))
                print(f"✅ Diarization xong. Số speakers: {len(labels)}, turns: {turns_count}")
                if job:
                    job.progress = 35
                    job.updated_at = datetime.now(UTC)
                    await db.commit()
            except Exception as exc:
                annotation = None
                print(f"⚠️  Diarization failed, fallback to UNKNOWN speaker: {exc}")
        else:
            print("⚠️  Skip diarization: model unavailable, fallback to UNKNOWN speaker.")

        # 5. Transcribe (Faster-Whisper large-v3-turbo)
        print("Bắt đầu chuyển âm thanh thành văn bản (Whisper)...")
        segments_generator, info = await asyncio.to_thread(
            whisper_model.transcribe,
            tmp_filepath,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            word_timestamps=True,
            condition_on_previous_text=False,
        )
        whisper_segments = list(segments_generator)
        print(
            f"✅ Whisper xong. Ngôn ngữ detect: {info.language} "
            f"({info.language_probability:.0%}), {len(whisper_segments)} segments."
        )
        if job:
            job.progress = 65
            job.updated_at = datetime.now(UTC)
            await db.commit()

        # Xóa file tạm sau khi cả 2 model đã xử lý xong
        os.remove(tmp_filepath)
        tmp_filepath = None

        # 6. Đảm bảo MeetingVersion = 1 tồn tại
        version = await db.scalar(
            select(MeetingVersion).where(
                MeetingVersion.meeting_id == meeting_id,
                MeetingVersion.version_no == 1,
            )
        )
        if not version:
            version = MeetingVersion(
                meeting_id=meeting_id,
                version_no=1,
                change_note="Initial AI Transcript",
                created_by=current_user_id,
                updated_by=current_user_id,
            )
            db.add(version)
            await db.flush()

        now = datetime.now(UTC)
        existing_segments = (
            await db.scalars(
                select(TranscriptSegment).where(
                    TranscriptSegment.meeting_id == meeting_id,
                    TranscriptSegment.version_no == 1,
                    TranscriptSegment.deleted_at.is_(None),
                )
            )
        ).all()
        for existing_segment in existing_segments:
            existing_segment.deleted_at = now
            existing_segment.updated_at = now
            existing_segment.updated_by = current_user_id

        existing_ai_speakers = (
            await db.scalars(
                select(Speaker).where(
                    Speaker.meeting_id == meeting_id,
                    Speaker.is_confirmed.is_(False),
                    Speaker.deleted_at.is_(None),
                )
            )
        ).all()
        for existing_speaker in existing_ai_speakers:
            existing_speaker.deleted_at = now
            existing_speaker.updated_at = now
            existing_speaker.updated_by = current_user_id

        await db.flush()

        # 7. Merge kết quả & Xác định Speaker
        print("Xác định người nói cho từng đoạn...")
        segment_speaker_assignments = []
        unique_speakers = set()
        speaker_order: dict[str, str] = {}
        
        for segment in whisper_segments:
            start_sec = segment.start
            end_sec = segment.end

            assigned_speaker = "UNKNOWN"
            if annotation is not None:
                raw_speaker = _get_best_speaker(annotation, start_sec, end_sec)
                assigned_speaker = _normalize_speaker_label(raw_speaker, speaker_order)
            
            unique_speakers.add(assigned_speaker)
            segment_speaker_assignments.append({
                "segment": segment,
                "assigned_speaker": assigned_speaker
            })

        speaker_distribution = {
            speaker: sum(1 for item in segment_speaker_assignments if item["assigned_speaker"] == speaker)
            for speaker in sorted(unique_speakers)
        }
        print(f"Speaker assignment distribution: {speaker_distribution}")

        # 8. Lưu danh sách Speaker
        print("Lưu thông tin người nói vào Database...")
        speaker_colors = ["blue", "violet", "emerald", "rose", "amber", "cyan"]
        speaker_map = {}
        for idx, spk_label in enumerate(sorted(unique_speakers)):
            color = speaker_colors[idx % len(speaker_colors)]
            speaker_record = await db.scalar(
                select(Speaker).where(
                    Speaker.meeting_id == meeting_id,
                    Speaker.speaker_label == spk_label,
                )
            )
            if speaker_record is None:
                speaker_record = Speaker(
                    meeting_id=meeting_id,
                    speaker_label=spk_label,
                    display_name=spk_label,
                    color_label=color,
                    is_confirmed=False,
                    created_by=current_user_id,
                    updated_by=current_user_id
                )
                db.add(speaker_record)
            else:
                if not speaker_record.is_confirmed:
                    speaker_record.display_name = spk_label
                    speaker_record.color_label = color
                speaker_record.deleted_at = None
                speaker_record.updated_at = datetime.now(UTC)
                speaker_record.updated_by = current_user_id
            speaker_map[spk_label] = speaker_record
            
        await db.flush()
        if job:
            job.progress = 90
            job.updated_at = datetime.now(UTC)
            await db.commit()

        # 9. Lưu từng đoạn Transcript với speaker_id
        print("Ghi nhận transcript vào Database...")
        for item in segment_speaker_assignments:
            segment = item["segment"]
            assigned_speaker = item["assigned_speaker"]
            
            transcript_seg = TranscriptSegment(
                meeting_id=meeting_id,
                version_no=1,
                speaker_id=speaker_map[assigned_speaker].id,
                start_ms=int(segment.start * 1000),
                end_ms=int(segment.end * 1000),
                text=segment.text.strip(),
                source="ai",
                created_by=current_user_id,
                updated_by=current_user_id
            )
            db.add(transcript_seg)

        # 10. Hoàn thành
        meeting = await db.scalar(select(Meeting).where(Meeting.id == meeting_id))
        if meeting:
            meeting.status = "completed"
            meeting.updated_at = datetime.now(UTC)
            meeting.updated_by = current_user_id

        if job:
            job.status = "completed"
            job.progress = 100
            job.finished_at = datetime.now(UTC)
            job.updated_at = datetime.now(UTC)
            job.updated_by = current_user_id
        await db.commit()
        print(f"✅ Xử lý thành công cuộc họp {meeting_id}!")

    except Exception as e:
        print(f"❌ Lỗi khi xử lý AI: {e}")
        # Cleanup file tạm nếu chưa xóa
        if tmp_filepath and os.path.exists(tmp_filepath):
            os.remove(tmp_filepath)
        job = await db.scalar(select(ProcessingJob).where(ProcessingJob.id == job_id))
        if job:
            job.status        = "failed"
            job.error_message = str(e)
            job.finished_at   = datetime.now(UTC)
            job.updated_at    = datetime.now(UTC)
            job.updated_by    = current_user_id
        meeting = await db.scalar(select(Meeting).where(Meeting.id == meeting_id))
        if meeting:
            meeting.status = "failed"
            meeting.updated_at = datetime.now(UTC)
            meeting.updated_by = current_user_id
        await db.commit()
