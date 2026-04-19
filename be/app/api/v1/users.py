import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.security import hash_password
from app.crud.user import user_crud
from app.models.media import Media
from app.models.user import User
from app.schemas.user import UserRead, UserReadWithAvatar, UserUpdate, UserUpdateInternal

router = APIRouter(prefix="/users", tags=["users"])

DBSession = Annotated[AsyncSession, Depends(get_db)]


async def _get_media_or_404(db: AsyncSession, media_id: uuid.UUID) -> Media:
    media = await db.scalar(
        select(Media).where(Media.id == media_id, Media.deleted_at.is_(None))
    )
    if media is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
    return media


async def _resolve_avatar_url(db: AsyncSession, avatar_media_id: uuid.UUID | None) -> str | None:
    if avatar_media_id is None:
        return None

    media = await db.scalar(
        select(Media).where(Media.id == avatar_media_id, Media.deleted_at.is_(None))
    )
    return media.file_url if media else None


async def _serialize_user(db: AsyncSession, user: User) -> UserReadWithAvatar:
    avatar_url = await _resolve_avatar_url(db, user.avatar_media_id)
    return UserReadWithAvatar.model_validate(user).model_copy(update={"avatar_url": avatar_url})


@router.get("/me", response_model=UserReadWithAvatar)
async def read_current_user(current_user: CurrentUser, db: DBSession) -> UserReadWithAvatar:
    return await _serialize_user(db, current_user)


@router.patch("/me", response_model=UserReadWithAvatar)
async def update_current_user(
    payload: UserUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> UserReadWithAvatar:
    update_data = payload.model_dump(exclude_unset=True)

    avatar_media_id = update_data.get("avatar_media_id")
    if "avatar_media_id" in update_data and avatar_media_id is not None:
        media = await _get_media_or_404(db, avatar_media_id)
        if media.media_type != "image":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Avatar media must be an image",
            )
        if media.user_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )

    if "password" in update_data:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))

    await user_crud.update(
        db,
        object=UserUpdateInternal(**update_data),
        id=current_user.id,
    )
    updated = await user_crud.get(
        db,
        id=current_user.id,
        schema_to_select=UserRead,
        return_as_model=True,
    )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return await _serialize_user(db, updated)


@router.get("", response_model=dict[str, Any])
async def list_users(
    current_user: CurrentUser,
    db: DBSession,
    page: int = 1,
    items_per_page: int = 20,
) -> dict[str, Any]:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    result = await user_crud.get_multi(
        db,
        offset=(page - 1) * items_per_page,
        limit=items_per_page,
        schema_to_select=UserRead,
    )
    return result
