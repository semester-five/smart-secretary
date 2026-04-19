from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.crud.user import user_crud
from app.models.user import User
from app.schemas.user import UserRead

bearer_scheme = HTTPBearer(auto_error=False)

DBSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DBSession,
    access_token_cookie: Annotated[str | None, Cookie(alias="access_token")] = None,
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials if credentials else access_token_cookie
    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = await user_crud.get(
        db,
        id=int(user_id),
        schema_to_select=UserRead,
        return_as_model=True,
    )
    if user is None:
        raise credentials_exception
    return user


async def get_current_user_from_refresh(
    refresh_token: Annotated[str | None, Cookie()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing refresh token",
    )
    if not refresh_token:
        raise credentials_exception

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = await user_crud.get(
        db,
        id=int(user_id),
        schema_to_select=UserRead,
        return_as_model=True,
    )
    if user is None:
        raise credentials_exception
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
