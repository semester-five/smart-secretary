from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    username: EmailStr
    password: str