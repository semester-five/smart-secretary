from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class UserBase(BaseModel):
    email: EmailStr
    username: str
    is_active: bool = True
    is_superuser: bool = False


class UserCreate(UserBase):
    password: str

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

    id: int


class UserAuthRead(UserRead):
    hashed_password: str


class UserUpdateInternal(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    hashed_password: str | None = None
    is_active: bool | None = None
