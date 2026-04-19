import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr


class ProjectCreate(BaseModel):
    code: str
    name: str
    description: str | None = None
    status: Literal["active", "archived"] = "active"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: Literal["active", "archived"] | None = None
    cover_image_media_id: uuid.UUID | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    description: str | None
    owner_id: uuid.UUID
    status: str
    cover_image_media_id: uuid.UUID | None = None
    cover_image_url: str | None = None
    created_at: datetime
    updated_at: datetime


class ProjectMemberCreate(BaseModel):
    email: EmailStr
    member_role: Literal["editor", "viewer"] = "viewer"


class ProjectMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    member_role: str
    created_at: datetime
    updated_at: datetime


class ProjectMemberListItem(ProjectMemberRead):
    user_email: EmailStr
    user_full_name: str
    user_avatar_url: str | None = None


class ProjectMemberListResponse(BaseModel):
    data: list[ProjectMemberListItem]
    total: int
    page: int
    items_per_page: int
    total_pages: int


class MeetingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    meeting_date: datetime
    status: str
    created_at: datetime
    updated_at: datetime