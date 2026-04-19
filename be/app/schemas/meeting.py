import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.project import MeetingRead


class MeetingCreate(BaseModel):
    project_id: uuid.UUID
    title: str
    meeting_date: datetime


class MeetingFileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    file_name: str
    mime_type: str
    file_size_bytes: int
    storage_key: str
    file_url: str | None = None
    duration_sec: int | None = None
    checksum_sha256: str | None = None
    created_at: datetime
    updated_at: datetime


class MeetingDetailRead(MeetingRead):
    files: list[MeetingFileRead] = Field(default_factory=list)


class ProcessingJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    job_type: str
    provider: str | None = None
    status: str
    progress: int
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class MeetingStatusRead(BaseModel):
    meeting_id: uuid.UUID
    meeting_status: str
    latest_job: ProcessingJobRead | None = None
    file_count: int = 0
    updated_at: datetime
