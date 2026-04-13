from fastcrud import FastCRUD

from app.models.user import User
from app.schemas.user import UserCreateInternal, UserUpdateInternal

user_crud: FastCRUD[User, UserCreateInternal, UserUpdateInternal, UserUpdateInternal, None, None] = FastCRUD(User)
