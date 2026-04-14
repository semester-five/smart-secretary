import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PresignedUrlRequest(BaseModel):
    file_name: str = Field(..., description="Original file name including extension")
    mime_type: str = Field(..., description="MIME type of the file (e.g. audio/mpeg)")
    file_size: int = Field(..., gt=0, description="File size in bytes")


class PresignedUrlResponse(BaseModel):
    signed_url: str
    token: str
    path: str


class MediaConfirmRequest(BaseModel):
    path: str = Field(..., description="Storage path returned by the presigned-url endpoint")
    file_name: str
    file_size: int = Field(..., gt=0)
    mime_type: str


class MediaCreate(BaseModel):
    file_name: str
    file_path: str
    file_url: str
    file_size: int
    media_type: str
    mime_type: str
    user_id: int


class MediaUpdate(BaseModel):
    file_name: str | None = None


class MediaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    file_name: str
    file_path: str
    file_url: str
    file_size: int
    media_type: str
    mime_type: str
    user_id: int
    created_at: datetime
    updated_at: datetime
