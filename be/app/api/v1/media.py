import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.supabase import create_signed_upload_url, get_public_url
from app.crud.media import media_crud
from app.schemas.media import (
    MediaConfirmRequest,
    MediaCreate,
    MediaRead,
    PresignedUrlRequest,
    PresignedUrlResponse,
)

router = APIRouter(prefix="/media", tags=["media"])

DBSession = Annotated[AsyncSession, Depends(get_db)]

# Mapping from MIME type to logical media type
MIME_TO_MEDIA_TYPE: dict[str, str] = {
    "audio/mpeg": "audio",
    "audio/mp3": "audio",
    "audio/wav": "audio",
    "audio/wave": "audio",
    "audio/x-wav": "audio",
    "image/jpeg": "image",
    "image/png": "image",
    "image/gif": "image",
    "image/webp": "image",
    "video/mp4": "video",
    "video/mpeg": "video",
    "video/quicktime": "video",
    "application/pdf": "document",
    "application/msword": "document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
}

# Maximum allowed file sizes per media type (bytes)
MAX_FILE_SIZES: dict[str, int] = {
    "audio": 50 * 1024 * 1024,    # 50 MB
    "image": 5 * 1024 * 1024,     # 5 MB
    "video": 200 * 1024 * 1024,   # 200 MB
    "document": 20 * 1024 * 1024, # 20 MB
}


def _require_storage() -> None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Storage service is not configured",
        )


def _resolve_media_type(mime_type: str) -> str:
    media_type = MIME_TO_MEDIA_TYPE.get(mime_type.lower())
    if not media_type:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported MIME type: {mime_type}",
        )
    return media_type


def _validate_file_size(file_size: int, media_type: str) -> None:
    max_size = MAX_FILE_SIZES.get(media_type)
    if max_size is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No size limit configured for media type: {media_type}",
        )
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File too large for {media_type}. "
                f"Maximum allowed size is {max_size // (1024 * 1024)} MB."
            ),
        )


@router.post(
    "/presigned-url",
    response_model=PresignedUrlResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a presigned upload URL for direct Supabase Storage upload",
)
async def get_presigned_upload_url(
    payload: PresignedUrlRequest,
    current_user: CurrentUser,
) -> PresignedUrlResponse:
    """
    Validates the file type and size, then returns a short-lived signed URL so
    the frontend can upload directly to Supabase Storage.

    Allowed audio MIME types: audio/mpeg, audio/mp3, audio/wav, audio/wave, audio/x-wav
    Maximum audio file size: 50 MB
    """
    _require_storage()

    media_type = _resolve_media_type(payload.mime_type)
    _validate_file_size(payload.file_size, media_type)

    # Build a unique, deterministic path inside the bucket
    unique_id = uuid.uuid4()
    storage_path = f"{media_type}/{current_user.id}/{unique_id}/{payload.file_name}"

    try:
        result = await create_signed_upload_url(storage_path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create signed upload URL",
        ) from exc

    return PresignedUrlResponse(
        signed_url=result["signed_url"],
        token=result["token"],
        path=result["path"],
    )


@router.post(
    "",
    response_model=MediaRead,
    status_code=status.HTTP_201_CREATED,
    summary="Confirm an upload and persist media metadata",
)
async def confirm_media_upload(
    payload: MediaConfirmRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> MediaRead:
    """
    Called by the frontend after a successful direct upload to Supabase Storage.
    Resolves the public URL, validates the metadata, and saves a record to the
    database.
    """
    _require_storage()

    media_type = _resolve_media_type(payload.mime_type)
    _validate_file_size(payload.file_size, media_type)

    # Check for duplicate path (prevents double-confirm)
    existing = await media_crud.exists(db, file_path=payload.path)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A media record for this path already exists",
        )

    try:
        file_url = await get_public_url(payload.path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve public URL from storage",
        ) from exc

    media = await media_crud.create(
        db,
        object=MediaCreate(
            file_name=payload.file_name,
            file_path=payload.path,
            file_url=file_url,
            file_size=payload.file_size,
            media_type=media_type,
            mime_type=payload.mime_type,
            user_id=current_user.id,
        ),
    )
    return MediaRead.model_validate(media)


@router.get(
    "/{media_id}",
    response_model=MediaRead,
    summary="Retrieve media metadata by ID",
)
async def get_media_by_id(
    media_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> MediaRead:
    """
    Returns the metadata for a single media record.
    Only the owning user (or a superuser) may access the record.
    """
    media = await media_crud.get(db, id=media_id)
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found",
        )
    if media.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return MediaRead.model_validate(media)
