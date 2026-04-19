import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    status: Literal["active", "inactive", "suspended"] = "active"
    is_active: bool = True
    is_superuser: bool = False


class UserCreate(UserBase):
    full_name: str | None = None
    password: str

    @model_validator(mode="after")
    def normalize_full_name(self) -> "UserCreate":
        if self.full_name is None or not self.full_name.strip():
            self.full_name = self.username
        return self

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password is too long. Maximum is 72 bytes.")
        return value


class UserCreateInternal(UserBase):
    hashed_password: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    full_name: str | None = None
    status: Literal["active", "inactive", "suspended"] | None = None
    password: str | None = None
    is_active: bool | None = None

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str | None) -> str | None:
        if value is not None and len(value.encode("utf-8")) > 72:
            raise ValueError("Password is too long. Maximum is 72 bytes.")
        return value


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class UserAuthRead(UserRead):
    hashed_password: str


class UserUpdateInternal(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    full_name: str | None = None
    status: Literal["active", "inactive", "suspended"] | None = None
    hashed_password: str | None = None
    last_login_at: datetime | None = None
    is_active: bool | None = None
