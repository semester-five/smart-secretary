from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    username: str
    is_active: bool = True
    is_superuser: bool = False


class UserCreate(UserBase):
    password: str


class UserCreateInternal(UserBase):
    hashed_password: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    password: str | None = None
    is_active: bool | None = None


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class UserUpdateInternal(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    hashed_password: str | None = None
    is_active: bool | None = None
