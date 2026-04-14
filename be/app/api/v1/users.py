from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.security import hash_password
from app.crud.user import user_crud
from app.schemas.user import UserRead, UserUpdate, UserUpdateInternal

router = APIRouter(prefix="/users", tags=["users"])

DBSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
async def update_current_user(
    payload: UserUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> UserRead:
    update_data = payload.model_dump(exclude_unset=True)

    if "password" in update_data:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))

    await user_crud.update(
        db,
        object=UserUpdateInternal(**update_data),
        id=current_user.id,
    )
    updated = await user_crud.get(db, id=current_user.id)
    return UserRead.model_validate(updated)


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
