import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.project import MeetingRead


class SpeakerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    speaker_label: str
    display_name: str | None = None
    is_confirmed: bool
    created_at: datetime
    updated_at: datetime


class TranscriptSegmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    version_no: int
    speaker_id: uuid.UUID | None = None
    speaker_label: str
    start_ms: int
    end_ms: int
    text: str
    confidence: float | None = None
    source: Literal["ai", "manual"]
    created_at: datetime
    updated_at: datetime


class TranscriptRead(BaseModel):
    meeting_id: uuid.UUID
    version_no: int
    speakers: list[SpeakerRead] = Field(default_factory=list)
    segments: list[TranscriptSegmentRead] = Field(default_factory=list)


class TranscriptSegmentUpdate(BaseModel):
    text: str = Field(min_length=1)


class SpeakerRenameRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)


class MeetingVersionCreate(BaseModel):
    from_version: int | Literal["latest"] = "latest"
    change_note: str | None = None


class MeetingVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    version_no: int
    change_note: str | None = None
    is_final: bool
    created_at: datetime
    updated_at: datetime


class MeetingSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    version_no: int
    summary_text: str
    key_points_json: dict[str, Any] | None = None
    decisions_json: dict[str, Any] | None = None
    source: Literal["ai", "manual"]
    created_at: datetime
    updated_at: datetime


class MeetingSummaryUpdate(BaseModel):
    summary_text: str = Field(min_length=1)
    key_points_json: dict[str, Any] | None = None
    decisions_json: dict[str, Any] | None = None


class ActionItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    version_no: int
    title: str
    description: str | None = None
    assignee_user_id: uuid.UUID | None = None
    assignee_text: str | None = None
    due_date: date | None = None
    priority: Literal["low", "medium", "high"]
    status: Literal["open", "in_progress", "done"]
    source: Literal["ai", "manual"]
    created_at: datetime
    updated_at: datetime


class ActionItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    assignee_user_id: uuid.UUID | None = None
    assignee_text: str | None = None
    due_date: date | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    status: Literal["open", "in_progress", "done"] = "open"


class ActionItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    assignee_user_id: uuid.UUID | None = None
    assignee_text: str | None = None
    due_date: date | None = None
    priority: Literal["low", "medium", "high"] | None = None
    status: Literal["open", "in_progress", "done"] | None = None


class MeetingSearchResponse(BaseModel):
    data: list[MeetingRead]
    total: int
    page: int
    page_size: int
    total_pages: int
