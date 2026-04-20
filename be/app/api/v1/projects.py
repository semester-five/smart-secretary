import uuid
from typing import Literal
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.models.media import Media
from app.models.project import Meeting, Project, ProjectMember
from app.models.user import User
from app.schemas.project import (
    MeetingRead,
    ProjectCreate,
    ProjectMemberCreate,
    ProjectMemberListItem,
    ProjectMemberListResponse,
    ProjectMemberRead,
    ProjectRead,
    ProjectUpdate,
)

router = APIRouter(prefix="/projects", tags=["projects"])


async def _get_image_media_or_404(db: AsyncSession, media_id: uuid.UUID) -> Media:
    media = await db.scalar(
        select(Media).where(Media.id == media_id, Media.deleted_at.is_(None))
    )
    if media is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
    if media.media_type != "image":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cover media must be an image",
        )
    return media


async def _resolve_cover_image_url(
    db: AsyncSession,
    cover_image_media_id: uuid.UUID | None,
) -> str | None:
    if cover_image_media_id is None:
        return None
    media = await db.scalar(
        select(Media).where(Media.id == cover_image_media_id, Media.deleted_at.is_(None))
    )
    return media.file_url if media else None


async def _serialize_project(db: AsyncSession, project: Project) -> ProjectRead:
    cover_image_url = await _resolve_cover_image_url(db, project.cover_image_media_id)
    return ProjectRead.model_validate(project).model_copy(update={"cover_image_url": cover_image_url})


async def _get_project_or_404(db: AsyncSession, project_id: uuid.UUID) -> Project:
    project = await db.scalar(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


async def _is_project_member(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    member = await db.scalar(
        select(ProjectMember.id).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.deleted_at.is_(None),
        )
    )
    return member is not None


async def _ensure_project_access(db: AsyncSession, project: Project, current_user: User) -> None:
    if current_user.is_superuser or project.owner_id == current_user.id:
        return
    if await _is_project_member(db, project.id, current_user.id):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


async def _ensure_project_admin(db: AsyncSession, project: Project, current_user: User) -> None:
    if current_user.is_superuser or project.owner_id == current_user.id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


async def _ensure_project_cover_editor(
    db: AsyncSession,
    project: Project,
    current_user: User,
) -> None:
    if current_user.is_superuser or project.owner_id == current_user.id:
        return

    role = await db.scalar(
        select(ProjectMember.member_role).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.deleted_at.is_(None),
        )
    )
    if role in {"owner", "editor"}:
        return

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


async def _resolve_user_by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(
        select(User).where(
            func.lower(User.email) == email.lower(),
            User.deleted_at.is_(None),
        )
    )


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[ProjectRead]:
    stmt = select(Project).where(Project.deleted_at.is_(None))

    if not current_user.is_superuser:
        stmt = stmt.where(
            or_(
                Project.owner_id == current_user.id,
                Project.id.in_(
                    select(ProjectMember.project_id).where(
                        ProjectMember.user_id == current_user.id,
                        ProjectMember.deleted_at.is_(None),
                    )
                ),
            )
        )

    projects = (await db.scalars(stmt.order_by(Project.created_at.desc()))).all()
    return [await _serialize_project(db, project) for project in projects]


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ProjectRead:
    existing = await db.scalar(
        select(Project.id).where(Project.code == payload.code, Project.deleted_at.is_(None))
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project code already exists")

    now = datetime.now(UTC)
    project = Project(
        code=payload.code,
        name=payload.name,
        description=payload.description,
        owner_id=current_user.id,
        status=payload.status,
        created_at=now,
        updated_at=now,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(project)
    await db.flush()

    db.add(
        ProjectMember(
            project_id=project.id,
            user_id=current_user.id,
            member_role="owner",
            created_at=now,
            updated_at=now,
            created_by=current_user.id,
            updated_by=current_user.id,
        )
    )
    await db.commit()
    await db.refresh(project)
    return await _serialize_project(db, project)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ProjectRead:
    project = await _get_project_or_404(db, project_id)
    await _ensure_project_access(db, project, current_user)
    return await _serialize_project(db, project)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ProjectRead:
    project = await _get_project_or_404(db, project_id)

    update_data = payload.model_dump(exclude_unset=True)
    non_cover_updates = {
        field_name: field_value
        for field_name, field_value in update_data.items()
        if field_name != "cover_image_media_id"
    }

    if non_cover_updates:
        await _ensure_project_admin(db, project, current_user)

    if "cover_image_media_id" in update_data:
        await _ensure_project_cover_editor(db, project, current_user)
        cover_image_media_id = update_data["cover_image_media_id"]
        if cover_image_media_id is not None:
            media = await _get_image_media_or_404(db, cover_image_media_id)
            if media.user_id != current_user.id and not current_user.is_superuser:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not enough permissions",
                )

    for field_name, field_value in update_data.items():
        setattr(project, field_name, field_value)

    project.updated_at = datetime.now(UTC)
    project.updated_by = current_user.id

    await db.commit()
    await db.refresh(project)
    return await _serialize_project(db, project)


@router.get("/{project_id}/meetings", response_model=list[MeetingRead])
async def list_project_meetings(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    sort: str = "meeting_date.desc",
) -> list[MeetingRead]:
    project = await _get_project_or_404(db, project_id)
    await _ensure_project_access(db, project, current_user)

    if sort == "meeting_date.asc":
        order_by = Meeting.meeting_date.asc()
    elif sort == "meeting_date.desc":
        order_by = Meeting.meeting_date.desc()
    elif sort == "created_at.asc":
        order_by = Meeting.created_at.asc()
    elif sort == "created_at.desc":
        order_by = Meeting.created_at.desc()
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid sort value",
        )

    meetings = (
        await db.scalars(
            select(Meeting)
            .where(Meeting.project_id == project_id, Meeting.deleted_at.is_(None))
            .order_by(order_by)
        )
    ).all()
    return [MeetingRead.model_validate(meeting) for meeting in meetings]


@router.post("/{project_id}/members", response_model=ProjectMemberRead, status_code=status.HTTP_201_CREATED)
async def add_project_member(
    project_id: uuid.UUID,
    payload: ProjectMemberCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ProjectMemberRead:
    project = await _get_project_or_404(db, project_id)
    await _ensure_project_admin(db, project, current_user)

    target_user = await _resolve_user_by_email(db, str(payload.email))
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = await db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == target_user.id,
            ProjectMember.deleted_at.is_(None),
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member")

    existing_soft_deleted = await db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == target_user.id,
            ProjectMember.deleted_at.is_not(None),
        )
    )

    now = datetime.now(UTC)
    if existing_soft_deleted is not None:
        existing_soft_deleted.deleted_at = None
        existing_soft_deleted.member_role = payload.member_role
        existing_soft_deleted.updated_at = now
        existing_soft_deleted.updated_by = current_user.id

        await db.commit()
        await db.refresh(existing_soft_deleted)
        return ProjectMemberRead.model_validate(existing_soft_deleted)

    member = ProjectMember(
        project_id=project_id,
        user_id=target_user.id,
        member_role=payload.member_role,
        created_at=now,
        updated_at=now,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(member)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member")
    await db.refresh(member)
    return ProjectMemberRead.model_validate(member)


@router.get("/{project_id}/members", response_model=ProjectMemberListResponse)
async def list_project_members(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    page: int = 1,
    items_per_page: int = 20,
    search: str | None = None,
    role: Literal["owner", "editor", "viewer"] | None = None,
    sort_by: Literal["created_at", "full_name", "email", "member_role"] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
) -> ProjectMemberListResponse:
    project = await _get_project_or_404(db, project_id)
    await _ensure_project_access(db, project, current_user)

    if page < 1:
        page = 1
    if items_per_page < 1:
        items_per_page = 20

    search_pattern = f"%{search.lower()}%" if search else None

    filters = [
        ProjectMember.project_id == project_id,
        ProjectMember.deleted_at.is_(None),
        User.deleted_at.is_(None),
    ]
    if role:
        filters.append(ProjectMember.member_role == role)
    if search_pattern:
        filters.append(
            or_(
                func.lower(User.full_name).like(search_pattern),
                func.lower(User.email).like(search_pattern),
            )
        )

    sort_map = {
        "created_at": ProjectMember.created_at,
        "full_name": User.full_name,
        "email": User.email,
        "member_role": ProjectMember.member_role,
    }
    sort_column = sort_map[sort_by]
    order_by = sort_column.asc() if sort_order == "asc" else sort_column.desc()

    total_stmt = (
        select(func.count())
        .select_from(ProjectMember)
        .join(User, User.id == ProjectMember.user_id)
        .where(*filters)
    )
    total = await db.scalar(total_stmt)
    total_count = int(total or 0)

    offset = (page - 1) * items_per_page
    rows_stmt = (
        select(ProjectMember, User, Media.file_url)
        .join(User, User.id == ProjectMember.user_id)
        .outerjoin(
            Media,
            and_(
                Media.id == User.avatar_media_id,
                Media.deleted_at.is_(None),
            ),
        )
        .where(*filters)
        .order_by(order_by)
        .offset(offset)
        .limit(items_per_page)
    )
    rows = (await db.execute(rows_stmt)).all()

    data = [
        ProjectMemberListItem(
            **ProjectMemberRead.model_validate(member).model_dump(),
            user_email=user.email,
            user_full_name=user.full_name,
            user_avatar_url=avatar_url,
        )
        for member, user, avatar_url in rows
    ]

    total_pages = (total_count + items_per_page - 1) // items_per_page if total_count > 0 else 0
    return ProjectMemberListResponse(
        data=data,
        total=total_count,
        page=page,
        items_per_page=items_per_page,
        total_pages=total_pages,
    )


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project_member(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> Response:
    project = await _get_project_or_404(db, project_id)
    await _ensure_project_admin(db, project, current_user)

    if project.owner_id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove project owner")

    member = await db.scalar(
        select(ProjectMember).where(
            and_(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id,
                ProjectMember.deleted_at.is_(None),
            )
        )
    )
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project member not found")

    member.deleted_at = datetime.now(UTC)
    member.updated_at = datetime.now(UTC)
    member.updated_by = current_user.id

    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)