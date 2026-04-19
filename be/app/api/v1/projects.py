import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.models.project import Meeting, Project, ProjectMember
from app.models.user import User
from app.schemas.project import (
    MeetingRead,
    ProjectCreate,
    ProjectMemberCreate,
    ProjectMemberRead,
    ProjectRead,
    ProjectUpdate,
)

router = APIRouter(prefix="/projects", tags=["projects"])


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
    return [ProjectRead.model_validate(project) for project in projects]


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
    return ProjectRead.model_validate(project)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ProjectRead:
    project = await _get_project_or_404(db, project_id)
    await _ensure_project_access(db, project, current_user)
    return ProjectRead.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ProjectRead:
    project = await _get_project_or_404(db, project_id)
    await _ensure_project_admin(db, project, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    for field_name, field_value in update_data.items():
        setattr(project, field_name, field_value)

    project.updated_at = datetime.now(UTC)
    project.updated_by = current_user.id

    await db.commit()
    await db.refresh(project)
    return ProjectRead.model_validate(project)


@router.get("/{project_id}/meetings", response_model=list[MeetingRead])
async def list_project_meetings(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[MeetingRead]:
    project = await _get_project_or_404(db, project_id)
    await _ensure_project_access(db, project, current_user)

    meetings = (
        await db.scalars(
            select(Meeting)
            .where(Meeting.project_id == project_id, Meeting.deleted_at.is_(None))
            .order_by(Meeting.meeting_date.desc())
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

    target_user = await db.scalar(
        select(User).where(User.id == payload.user_id, User.deleted_at.is_(None))
    )
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = await db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == payload.user_id,
            ProjectMember.deleted_at.is_(None),
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member")

    now = datetime.now(UTC)
    member = ProjectMember(
        project_id=project_id,
        user_id=payload.user_id,
        member_role=payload.member_role,
        created_at=now,
        updated_at=now,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return ProjectMemberRead.model_validate(member)


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