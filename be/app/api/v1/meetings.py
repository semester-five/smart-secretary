import uuid
from datetime import UTC, datetime
from pathlib import Path
import re
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, BackgroundTasks
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.ai_processor import process_meeting_audio_task
from storage3.exceptions import StorageApiError

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.core.deps import CurrentUser
from app.core.supabase import get_public_url, get_storage_client
from app.models.project import Meeting, MeetingFile, ProcessingJob, Project, ProjectMember
from app.models.user import User
from app.schemas.meeting import (
    MeetingCreate,
    MeetingDetailRead,
    MeetingFileRead,
    MeetingStatusRead,
    ProcessingJobRead,
)
from app.schemas.project import MeetingRead

router = APIRouter(prefix="/meetings", tags=["meetings"])

DBSession = Annotated[AsyncSession, Depends(get_db)]

ALLOWED_AUDIO_MIME_TYPES: set[str] = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/ogg",
    "audio/webm",
}
MAX_MEETING_FILE_SIZE = 200 * 1024 * 1024


def _sanitize_filename_for_storage(file_name: str) -> str:
    suffix = Path(file_name).suffix.lower()
    stem = Path(file_name).stem
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip("-._")
    if not normalized:
        normalized = "meeting-audio"
    return f"{normalized}{suffix}" if suffix else normalized


def _require_storage() -> None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Storage service is not configured",
        )


async def _get_project_or_404(db: AsyncSession, project_id: uuid.UUID) -> Project:
    project = await db.scalar(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


async def _get_meeting_or_404(db: AsyncSession, meeting_id: uuid.UUID) -> Meeting:
    meeting = await db.scalar(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.deleted_at.is_(None))
    )
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return meeting


async def _is_project_member(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    member = await db.scalar(
        select(ProjectMember.id).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.deleted_at.is_(None),
        )
    )
    return member is not None


async def _get_project_member_role(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> str | None:
    return await db.scalar(
        select(ProjectMember.member_role).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.deleted_at.is_(None),
        )
    )


async def _ensure_project_access(db: AsyncSession, project: Project, current_user: User) -> None:
    if current_user.is_superuser or project.owner_id == current_user.id:
        return
    if await _is_project_member(db, project.id, current_user.id):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


async def _ensure_project_editor(db: AsyncSession, project: Project, current_user: User) -> None:
    if current_user.is_superuser or project.owner_id == current_user.id:
        return
    role = await _get_project_member_role(db, project.id, current_user.id)
    if role in {"owner", "editor"}:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


async def _serialize_meeting_file(db: AsyncSession, meeting_file: MeetingFile) -> MeetingFileRead:
    file_url = await get_public_url(meeting_file.storage_key)
    return MeetingFileRead.model_validate(meeting_file).model_copy(update={"file_url": file_url})


async def _serialize_meeting_files(db: AsyncSession, meeting_id: uuid.UUID) -> list[MeetingFileRead]:
    meeting_files = (
        await db.scalars(
            select(MeetingFile)
            .where(MeetingFile.meeting_id == meeting_id, MeetingFile.deleted_at.is_(None))
            .order_by(MeetingFile.created_at.asc())
        )
    ).all()
    return [await _serialize_meeting_file(db, meeting_file) for meeting_file in meeting_files]


async def _serialize_latest_job(db: AsyncSession, meeting_id: uuid.UUID) -> ProcessingJobRead | None:
    latest_job = await db.scalar(
        select(ProcessingJob)
        .where(ProcessingJob.meeting_id == meeting_id, ProcessingJob.deleted_at.is_(None))
        .order_by(ProcessingJob.created_at.desc())
    )
    return ProcessingJobRead.model_validate(latest_job) if latest_job else None


async def _serialize_meeting_detail(db: AsyncSession, meeting: Meeting) -> MeetingDetailRead:
    files = await _serialize_meeting_files(db, meeting.id)
    return MeetingDetailRead.model_validate(meeting).model_copy(update={"files": files})


async def _serialize_meeting_status(db: AsyncSession, meeting: Meeting) -> MeetingStatusRead:
    latest_job = await _serialize_latest_job(db, meeting.id)
    file_count = await db.scalar(
        select(func.count()).select_from(MeetingFile).where(
            MeetingFile.meeting_id == meeting.id,
            MeetingFile.deleted_at.is_(None),
        )
    )
    return MeetingStatusRead(
        meeting_id=meeting.id,
        meeting_status=meeting.status,
        latest_job=latest_job,
        file_count=0 if file_count is None else int(file_count),
        updated_at=meeting.updated_at,
    )


@router.post("", response_model=MeetingRead, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    payload: MeetingCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> MeetingRead:
    project = await _get_project_or_404(db, payload.project_id)
    await _ensure_project_editor(db, project, current_user)

    now = datetime.now(UTC)
    meeting = Meeting(
        project_id=payload.project_id,
        title=payload.title,
        meeting_date=payload.meeting_date,
        status="draft",
        created_at=now,
        updated_at=now,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)
    return MeetingRead.model_validate(meeting)


@router.get("/{meeting_id}", response_model=MeetingDetailRead)
async def get_meeting_detail(
    meeting_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> MeetingDetailRead:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_access(db, project, current_user)
    return await _serialize_meeting_detail(db, meeting)


@router.post("/{meeting_id}/files:upload", response_model=MeetingFileRead, status_code=status.HTTP_201_CREATED)
async def upload_meeting_file(
    meeting_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    file: UploadFile = File(...),
) -> MeetingFileRead:
    _require_storage()

    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_editor(db, project, current_user)

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File name is required")

    mime_type = (file.content_type or "").lower()
    if mime_type not in ALLOWED_AUDIO_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported audio MIME type: {mime_type or 'unknown'}",
        )

    contents = await file.read()
    file_size = len(contents)
    if file_size <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Empty file is not allowed")
    if file_size > MAX_MEETING_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Meeting file is too large")

    safe_name = _sanitize_filename_for_storage(file.filename)
    storage_key = f"meetings/{project.id}/{meeting.id}/{uuid.uuid4()}/{safe_name}"

    try:
        client = get_storage_client()
        await client.from_(settings.SUPABASE_BUCKET).upload(
            storage_key,
            contents,
            file_options={"content-type": mime_type},
        )
        file_url = await get_public_url(storage_key)
    except StorageApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to upload meeting file: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to upload meeting file: {exc}",
        ) from exc

    now = datetime.now(UTC)
    meeting_file = MeetingFile(
        meeting_id=meeting.id,
        file_name=file.filename,
        mime_type=mime_type,
        file_size_bytes=file_size,
        storage_key=storage_key,
        created_at=now,
        updated_at=now,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(meeting_file)
    meeting.status = "draft"
    meeting.updated_at = now
    meeting.updated_by = current_user.id
    await db.commit()
    await db.refresh(meeting_file)
    return MeetingFileRead.model_validate(meeting_file).model_copy(update={"file_url": file_url})


@router.post("/{meeting_id}/process", response_model=MeetingStatusRead)
async def enqueue_meeting_process(
    meeting_id: uuid.UUID,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> MeetingStatusRead:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_editor(db, project, current_user)

    latest_job = await db.scalar(
        select(ProcessingJob)
        .where(
            ProcessingJob.meeting_id == meeting.id,
            ProcessingJob.deleted_at.is_(None),
            ProcessingJob.status.in_(["queued", "running"]),
        )
        .order_by(ProcessingJob.created_at.desc())
    )

    now = datetime.now(UTC)
    if latest_job is None:
        latest_job = ProcessingJob(
            meeting_id=meeting.id,
            job_type="stt",
            provider="internal",
            status="queued",
            progress=0,
            created_at=now,
            updated_at=now,
            created_by=current_user.id,
            updated_by=current_user.id,
        )
        db.add(latest_job)

    meeting.status = "processing"
    meeting.updated_at = now
    meeting.updated_by = current_user.id
    await db.commit()
    await db.refresh(meeting)
    if latest_job.id is not None:
        await db.refresh(latest_job)

    async def task_wrapper():
        # Phải tạo một session DB mới cho Background Task, vì session cũ ở API đã bị đóng
        async with AsyncSessionLocal() as session:
            await process_meeting_audio_task(meeting.id, latest_job.id, current_user.id, session)

    if latest_job.status == "queued":
        background_tasks.add_task(task_wrapper)
        
    return await _serialize_meeting_status(db, meeting)


@router.get("/{meeting_id}/status", response_model=MeetingStatusRead)
async def get_meeting_status(
    meeting_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> MeetingStatusRead:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_access(db, project, current_user)
    return await _serialize_meeting_status(db, meeting)
