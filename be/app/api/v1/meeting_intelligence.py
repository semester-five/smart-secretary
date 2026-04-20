import uuid
from datetime import UTC, datetime
from math import ceil
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import and_, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.models.project import (
    ActionItem,
    Meeting,
    MeetingSummary,
    MeetingVersion,
    ProcessingJob,
    Project,
    ProjectMember,
    Speaker,
    TranscriptSegment,
)
from app.models.user import User
from app.schemas.meeting import ProcessingJobRead
from app.schemas.meeting_intelligence import (
    ActionItemCreate,
    ActionItemRead,
    ActionItemUpdate,
    MeetingSearchResponse,
    MeetingSummaryRead,
    MeetingSummaryUpdate,
    MeetingVersionCreate,
    MeetingVersionRead,
    SpeakerRead,
    SpeakerRenameRequest,
    TranscriptRead,
    TranscriptSegmentRead,
    TranscriptSegmentUpdate,
)
from app.schemas.project import MeetingRead

router = APIRouter(prefix="/meetings", tags=["meeting-intelligence"])
DBSession = Annotated[AsyncSession, Depends(get_db)]


async def _get_project_or_404(db: AsyncSession, project_id: uuid.UUID) -> Project:
    project = await db.scalar(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


async def _get_meeting_or_404(db: AsyncSession, meeting_id: uuid.UUID) -> Meeting:
    meeting = await db.scalar(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.deleted_at.is_(None))
    )
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return meeting


async def _is_project_member(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    member = await db.scalar(
        select(ProjectMember.id).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.deleted_at.is_(None),
        )
    )
    return member is not None


async def _get_project_member_role(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> str | None:
    return await db.scalar(
        select(ProjectMember.member_role).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.deleted_at.is_(None),
        )
    )


async def _ensure_project_access(db: AsyncSession, project: Project, current_user: User) -> None:
    if current_user.is_superuser or project.owner_id == current_user.id:
        return
    if await _is_project_member(db, project.id, current_user.id):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


async def _ensure_project_editor(db: AsyncSession, project: Project, current_user: User) -> None:
    if current_user.is_superuser or project.owner_id == current_user.id:
        return
    role = await _get_project_member_role(db, project.id, current_user.id)
    if role in {"owner", "editor"}:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


async def _resolve_version_no(
    db: AsyncSession,
    meeting_id: uuid.UUID,
    version: str | int | None = "latest",
) -> int:
    if isinstance(version, int):
        target = await db.scalar(
            select(MeetingVersion.id).where(
                MeetingVersion.meeting_id == meeting_id,
                MeetingVersion.version_no == version,
                MeetingVersion.deleted_at.is_(None),
            )
        )
        if target is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
        return version

    if isinstance(version, str) and version != "latest":
        try:
            parsed = int(version)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid version") from exc
        return await _resolve_version_no(db, meeting_id, parsed)

    latest_version = await db.scalar(
        select(func.max(MeetingVersion.version_no)).where(
            MeetingVersion.meeting_id == meeting_id,
            MeetingVersion.deleted_at.is_(None),
        )
    )
    if latest_version is None:
        return 1
    return int(latest_version)


async def _ensure_meeting_version_exists(
    db: AsyncSession,
    meeting_id: uuid.UUID,
    version_no: int,
    current_user: User,
) -> MeetingVersion:
    existing = await db.scalar(
        select(MeetingVersion).where(
            MeetingVersion.meeting_id == meeting_id,
            MeetingVersion.version_no == version_no,
            MeetingVersion.deleted_at.is_(None),
        )
    )
    if existing:
        return existing

    now = datetime.now(UTC)
    meeting_version = MeetingVersion(
        meeting_id=meeting_id,
        version_no=version_no,
        change_note="Initial version",
        is_final=False,
        created_at=now,
        updated_at=now,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(meeting_version)
    await db.flush()
    return meeting_version


@router.get("/search", response_model=MeetingSearchResponse)
async def search_meetings(
    current_user: CurrentUser,
    db: DBSession,
    project_id: uuid.UUID | None = Query(default=None, alias="projectId"),
    from_date: datetime | None = Query(default=None, alias="fromDate"),
    to_date: datetime | None = Query(default=None, alias="toDate"),
    keyword: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = 1,
    page_size: int = Query(default=20, alias="pageSize"),
) -> MeetingSearchResponse:
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20

    filters = [Meeting.deleted_at.is_(None)]

    if not current_user.is_superuser:
        filters.append(
            or_(
                Meeting.project_id.in_(
                    select(Project.id).where(Project.owner_id == current_user.id, Project.deleted_at.is_(None))
                ),
                Meeting.project_id.in_(
                    select(ProjectMember.project_id).where(
                        ProjectMember.user_id == current_user.id,
                        ProjectMember.deleted_at.is_(None),
                    )
                ),
            )
        )

    if project_id:
        filters.append(Meeting.project_id == project_id)
    if from_date:
        filters.append(Meeting.meeting_date >= from_date)
    if to_date:
        filters.append(Meeting.meeting_date <= to_date)
    if status_filter:
        filters.append(Meeting.status == status_filter)

    if keyword:
        ts_query = func.plainto_tsquery("simple", keyword)
        transcript_match = exists(
            select(TranscriptSegment.id).where(
                TranscriptSegment.meeting_id == Meeting.id,
                TranscriptSegment.deleted_at.is_(None),
                func.to_tsvector("simple", TranscriptSegment.text).op("@@")(ts_query),
            )
        )
        summary_match = exists(
            select(MeetingSummary.id).where(
                MeetingSummary.meeting_id == Meeting.id,
                MeetingSummary.deleted_at.is_(None),
                func.to_tsvector("simple", MeetingSummary.summary_text).op("@@")(ts_query),
            )
        )
        action_match = exists(
            select(ActionItem.id).where(
                ActionItem.meeting_id == Meeting.id,
                ActionItem.deleted_at.is_(None),
                func.to_tsvector(
                    "simple",
                    func.concat(ActionItem.title, " ", func.coalesce(ActionItem.description, "")),
                ).op("@@")(ts_query),
            )
        )
        filters.append(or_(transcript_match, summary_match, action_match))

    total = await db.scalar(select(func.count()).select_from(Meeting).where(and_(*filters)))

    meetings = (
        await db.scalars(
            select(Meeting)
            .where(and_(*filters))
            .order_by(Meeting.meeting_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    total_items = 0 if total is None else int(total)
    total_pages = ceil(total_items / page_size) if total_items > 0 else 1
    return MeetingSearchResponse(
        data=[MeetingRead.model_validate(item) for item in meetings],
        total=total_items,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{meeting_id}/transcript", response_model=TranscriptRead)
async def get_transcript(
    meeting_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    version: str = "latest",
) -> TranscriptRead:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_access(db, project, current_user)

    resolved_version = await _resolve_version_no(db, meeting_id, version)

    speakers = (
        await db.scalars(
            select(Speaker)
            .where(Speaker.meeting_id == meeting_id, Speaker.deleted_at.is_(None))
            .order_by(Speaker.speaker_label.asc())
        )
    ).all()
    segments = (
        await db.scalars(
            select(TranscriptSegment)
            .where(
                TranscriptSegment.meeting_id == meeting_id,
                TranscriptSegment.version_no == resolved_version,
                TranscriptSegment.deleted_at.is_(None),
            )
            .order_by(TranscriptSegment.start_ms.asc())
        )
    ).all()

    return TranscriptRead(
        meeting_id=meeting_id,
        version_no=resolved_version,
        speakers=[SpeakerRead.model_validate(speaker) for speaker in speakers],
        segments=[TranscriptSegmentRead.model_validate(segment) for segment in segments],
    )


@router.patch("/{meeting_id}/transcript/segments/{segment_id}", response_model=TranscriptSegmentRead)
async def update_transcript_segment(
    meeting_id: uuid.UUID,
    segment_id: uuid.UUID,
    payload: TranscriptSegmentUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> TranscriptSegmentRead:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_editor(db, project, current_user)

    segment = await db.scalar(
        select(TranscriptSegment).where(
            TranscriptSegment.id == segment_id,
            TranscriptSegment.meeting_id == meeting_id,
            TranscriptSegment.deleted_at.is_(None),
        )
    )
    if segment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Segment not found")

    segment.text = payload.text
    segment.source = "manual"
    segment.updated_at = datetime.now(UTC)
    segment.updated_by = current_user.id

    await db.commit()
    await db.refresh(segment)
    return TranscriptSegmentRead.model_validate(segment)


@router.post("/{meeting_id}/speakers/{speaker_id}/rename", response_model=SpeakerRead)
async def rename_speaker(
    meeting_id: uuid.UUID,
    speaker_id: uuid.UUID,
    payload: SpeakerRenameRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> SpeakerRead:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_editor(db, project, current_user)

    speaker = await db.scalar(
        select(Speaker).where(
            Speaker.id == speaker_id,
            Speaker.meeting_id == meeting_id,
            Speaker.deleted_at.is_(None),
        )
    )
    if speaker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Speaker not found")

    speaker.display_name = payload.display_name.strip()
    speaker.is_confirmed = True
    speaker.updated_at = datetime.now(UTC)
    speaker.updated_by = current_user.id

    await db.commit()
    await db.refresh(speaker)
    return SpeakerRead.model_validate(speaker)


@router.post("/{meeting_id}/versions", response_model=MeetingVersionRead, status_code=status.HTTP_201_CREATED)
async def create_meeting_version(
    meeting_id: uuid.UUID,
    payload: MeetingVersionCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> MeetingVersionRead:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_editor(db, project, current_user)

    source_version = await _resolve_version_no(db, meeting_id, payload.from_version)

    latest_version = await db.scalar(
        select(func.max(MeetingVersion.version_no)).where(
            MeetingVersion.meeting_id == meeting_id,
            MeetingVersion.deleted_at.is_(None),
        )
    )
    next_version = 1 if latest_version is None else int(latest_version) + 1

    now = datetime.now(UTC)
    new_version = MeetingVersion(
        meeting_id=meeting_id,
        version_no=next_version,
        change_note=payload.change_note,
        is_final=False,
        created_at=now,
        updated_at=now,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(new_version)
    await db.flush()

    source_segments = (
        await db.scalars(
            select(TranscriptSegment).where(
                TranscriptSegment.meeting_id == meeting_id,
                TranscriptSegment.version_no == source_version,
                TranscriptSegment.deleted_at.is_(None),
            )
        )
    ).all()
    for segment in source_segments:
        db.add(
            TranscriptSegment(
                meeting_id=meeting_id,
                version_no=next_version,
                speaker_id=segment.speaker_id,
                speaker_label=segment.speaker_label,
                start_ms=segment.start_ms,
                end_ms=segment.end_ms,
                text=segment.text,
                confidence=segment.confidence,
                source=segment.source,
                created_at=now,
                updated_at=now,
                created_by=current_user.id,
                updated_by=current_user.id,
            )
        )

    source_summary = await db.scalar(
        select(MeetingSummary).where(
            MeetingSummary.meeting_id == meeting_id,
            MeetingSummary.version_no == source_version,
            MeetingSummary.deleted_at.is_(None),
        )
    )
    if source_summary:
        db.add(
            MeetingSummary(
                meeting_id=meeting_id,
                version_no=next_version,
                summary_text=source_summary.summary_text,
                key_points_json=source_summary.key_points_json,
                decisions_json=source_summary.decisions_json,
                source=source_summary.source,
                created_at=now,
                updated_at=now,
                created_by=current_user.id,
                updated_by=current_user.id,
            )
        )

    source_action_items = (
        await db.scalars(
            select(ActionItem).where(
                ActionItem.meeting_id == meeting_id,
                ActionItem.version_no == source_version,
                ActionItem.deleted_at.is_(None),
            )
        )
    ).all()
    for item in source_action_items:
        db.add(
            ActionItem(
                meeting_id=meeting_id,
                version_no=next_version,
                title=item.title,
                description=item.description,
                assignee_user_id=item.assignee_user_id,
                assignee_text=item.assignee_text,
                due_date=item.due_date,
                priority=item.priority,
                status=item.status,
                source=item.source,
                created_at=now,
                updated_at=now,
                created_by=current_user.id,
                updated_by=current_user.id,
            )
        )

    await db.commit()
    await db.refresh(new_version)
    return MeetingVersionRead.model_validate(new_version)


@router.post("/{meeting_id}/summary:generate", response_model=ProcessingJobRead, status_code=status.HTTP_202_ACCEPTED)
async def generate_summary(
    meeting_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> ProcessingJobRead:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_editor(db, project, current_user)

    existing_job = await db.scalar(
        select(ProcessingJob).where(
            ProcessingJob.meeting_id == meeting_id,
            ProcessingJob.job_type == "summary",
            ProcessingJob.status.in_(["queued", "running"]),
            ProcessingJob.deleted_at.is_(None),
        )
    )
    if existing_job:
        return ProcessingJobRead.model_validate(existing_job)

    now = datetime.now(UTC)
    job = ProcessingJob(
        meeting_id=meeting_id,
        job_type="summary",
        provider="internal",
        status="queued",
        progress=0,
        created_at=now,
        updated_at=now,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(job)
    meeting.status = "processing"
    meeting.updated_at = now
    meeting.updated_by = current_user.id

    await db.commit()
    await db.refresh(job)
    return ProcessingJobRead.model_validate(job)


@router.get("/{meeting_id}/summary", response_model=MeetingSummaryRead | None)
async def get_meeting_summary(
    meeting_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    version: str = "latest",
) -> MeetingSummaryRead | None:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_access(db, project, current_user)

    resolved_version = await _resolve_version_no(db, meeting_id, version)
    summary = await db.scalar(
        select(MeetingSummary).where(
            MeetingSummary.meeting_id == meeting_id,
            MeetingSummary.version_no == resolved_version,
            MeetingSummary.deleted_at.is_(None),
        )
    )
    if summary is None:
        return None
    return MeetingSummaryRead.model_validate(summary)


@router.patch("/{meeting_id}/summary", response_model=MeetingSummaryRead)
async def update_meeting_summary(
    meeting_id: uuid.UUID,
    payload: MeetingSummaryUpdate,
    current_user: CurrentUser,
    db: DBSession,
    version: str = "latest",
) -> MeetingSummaryRead:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_editor(db, project, current_user)

    resolved_version = await _resolve_version_no(db, meeting_id, version)
    await _ensure_meeting_version_exists(db, meeting_id, resolved_version, current_user)

    summary = await db.scalar(
        select(MeetingSummary).where(
            MeetingSummary.meeting_id == meeting_id,
            MeetingSummary.version_no == resolved_version,
            MeetingSummary.deleted_at.is_(None),
        )
    )

    now = datetime.now(UTC)
    if summary is None:
        summary = MeetingSummary(
            meeting_id=meeting_id,
            version_no=resolved_version,
            summary_text=payload.summary_text,
            key_points_json=payload.key_points_json,
            decisions_json=payload.decisions_json,
            source="manual",
            created_at=now,
            updated_at=now,
            created_by=current_user.id,
            updated_by=current_user.id,
        )
        db.add(summary)
    else:
        summary.summary_text = payload.summary_text
        summary.key_points_json = payload.key_points_json
        summary.decisions_json = payload.decisions_json
        summary.source = "manual"
        summary.updated_at = now
        summary.updated_by = current_user.id

    await db.commit()
    await db.refresh(summary)
    return MeetingSummaryRead.model_validate(summary)


@router.get("/{meeting_id}/action-items", response_model=list[ActionItemRead])
async def list_action_items(
    meeting_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    version: str = "latest",
) -> list[ActionItemRead]:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_access(db, project, current_user)

    resolved_version = await _resolve_version_no(db, meeting_id, version)
    items = (
        await db.scalars(
            select(ActionItem)
            .where(
                ActionItem.meeting_id == meeting_id,
                ActionItem.version_no == resolved_version,
                ActionItem.deleted_at.is_(None),
            )
            .order_by(ActionItem.created_at.asc())
        )
    ).all()
    return [ActionItemRead.model_validate(item) for item in items]


@router.post("/{meeting_id}/action-items", response_model=ActionItemRead, status_code=status.HTTP_201_CREATED)
async def create_action_item(
    meeting_id: uuid.UUID,
    payload: ActionItemCreate,
    current_user: CurrentUser,
    db: DBSession,
    version: str = "latest",
) -> ActionItemRead:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_editor(db, project, current_user)

    resolved_version = await _resolve_version_no(db, meeting_id, version)
    await _ensure_meeting_version_exists(db, meeting_id, resolved_version, current_user)

    now = datetime.now(UTC)
    item = ActionItem(
        meeting_id=meeting_id,
        version_no=resolved_version,
        title=payload.title,
        description=payload.description,
        assignee_user_id=payload.assignee_user_id,
        assignee_text=payload.assignee_text,
        due_date=payload.due_date,
        priority=payload.priority,
        status=payload.status,
        source="manual",
        created_at=now,
        updated_at=now,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return ActionItemRead.model_validate(item)


@router.patch("/{meeting_id}/action-items/{action_item_id}", response_model=ActionItemRead)
async def update_action_item(
    meeting_id: uuid.UUID,
    action_item_id: uuid.UUID,
    payload: ActionItemUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> ActionItemRead:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_editor(db, project, current_user)

    item = await db.scalar(
        select(ActionItem).where(
            ActionItem.id == action_item_id,
            ActionItem.meeting_id == meeting_id,
            ActionItem.deleted_at.is_(None),
        )
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field_name, field_value in update_data.items():
        setattr(item, field_name, field_value)

    item.source = "manual"
    item.updated_at = datetime.now(UTC)
    item.updated_by = current_user.id

    await db.commit()
    await db.refresh(item)
    return ActionItemRead.model_validate(item)


@router.delete("/{meeting_id}/action-items/{action_item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_action_item(
    meeting_id: uuid.UUID,
    action_item_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> Response:
    meeting = await _get_meeting_or_404(db, meeting_id)
    project = await _get_project_or_404(db, meeting.project_id)
    await _ensure_project_editor(db, project, current_user)

    item = await db.scalar(
        select(ActionItem).where(
            ActionItem.id == action_item_id,
            ActionItem.meeting_id == meeting_id,
            ActionItem.deleted_at.is_(None),
        )
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found")

    item.deleted_at = datetime.now(UTC)
    item.updated_at = datetime.now(UTC)
    item.updated_by = current_user.id

    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
