from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

# Dữ liệu client gửi lên khi tạo user
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

# Dữ liệu server trả về (che đi mật khẩu)
class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True