import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    code: str
    name: str
    description: str | None = None
    status: Literal["active", "archived"] = "active"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: Literal["active", "archived"] | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    description: str | None
    owner_id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime


class ProjectMemberCreate(BaseModel):
    user_id: uuid.UUID
    member_role: Literal["owner", "editor", "viewer"] = "viewer"


class ProjectMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    member_role: str
    created_at: datetime
    updated_at: datetime


class MeetingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    meeting_date: datetime
    status: str
    created_at: datetime
    updated_at: datetime