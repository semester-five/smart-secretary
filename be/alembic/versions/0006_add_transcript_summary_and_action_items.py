"""add transcript, speaker, version, summary, and action item tables

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-20 10:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "speakers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("speaker_label", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("is_confirmed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("meeting_id", "speaker_label", name="uq_speakers_meeting_label"),
    )
    op.create_index(op.f("ix_speakers_meeting_id"), "speakers", ["meeting_id"], unique=False)

    op.create_table(
        "meeting_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False),
        sa.Column("change_note", sa.String(), nullable=True),
        sa.Column("is_final", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("meeting_id", "version_no", name="uq_meeting_versions_meeting_version"),
    )
    op.create_index(op.f("ix_meeting_versions_meeting_id"), "meeting_versions", ["meeting_id"], unique=False)

    op.create_table(
        "transcript_segments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False),
        sa.Column("speaker_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("speaker_label", sa.String(), nullable=False),
        sa.Column("start_ms", sa.Integer(), nullable=False),
        sa.Column("end_ms", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("source", sa.String(), nullable=False, server_default="ai"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("start_ms >= 0", name="ck_transcript_segments_start_ms_non_negative"),
        sa.CheckConstraint("end_ms >= start_ms", name="ck_transcript_segments_end_ms_ge_start_ms"),
        sa.CheckConstraint("confidence IS NULL OR (confidence >= 0 AND confidence <= 1)", name="ck_transcript_segments_confidence_range"),
        sa.ForeignKeyConstraint(["meeting_id", "version_no"], ["meeting_versions.meeting_id", "meeting_versions.version_no"], name="fk_transcript_segments_meeting_version"),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.ForeignKeyConstraint(["speaker_id"], ["speakers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_transcript_segments_meeting_id"), "transcript_segments", ["meeting_id"], unique=False)
    op.create_index(op.f("ix_transcript_segments_version_no"), "transcript_segments", ["version_no"], unique=False)
    op.create_index(op.f("ix_transcript_segments_speaker_id"), "transcript_segments", ["speaker_id"], unique=False)
    op.create_index("ix_transcript_segments_meeting_version_start", "transcript_segments", ["meeting_id", "version_no", "start_ms"], unique=False)
    op.execute(
        "CREATE INDEX ix_transcript_segments_fts_text ON transcript_segments USING gin (to_tsvector('simple', text))"
    )

    op.create_table(
        "meeting_summaries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False),
        sa.Column("summary_text", sa.Text(), nullable=False),
        sa.Column("key_points_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("decisions_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("source", sa.String(), nullable=False, server_default="ai"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["meeting_id", "version_no"], ["meeting_versions.meeting_id", "meeting_versions.version_no"], name="fk_meeting_summaries_meeting_version"),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("meeting_id", "version_no", name="uq_meeting_summaries_meeting_version"),
    )
    op.create_index(op.f("ix_meeting_summaries_meeting_id"), "meeting_summaries", ["meeting_id"], unique=False)
    op.create_index(op.f("ix_meeting_summaries_version_no"), "meeting_summaries", ["version_no"], unique=False)
    op.create_index("ix_meeting_summaries_meeting_version", "meeting_summaries", ["meeting_id", "version_no"], unique=False)
    op.execute(
        "CREATE INDEX ix_meeting_summaries_fts_text ON meeting_summaries USING gin (to_tsvector('simple', summary_text))"
    )

    op.create_table(
        "action_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("assignee_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("assignee_text", sa.String(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("priority", sa.String(), nullable=False, server_default="medium"),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("source", sa.String(), nullable=False, server_default="ai"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["assignee_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["meeting_id", "version_no"], ["meeting_versions.meeting_id", "meeting_versions.version_no"], name="fk_action_items_meeting_version"),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_action_items_meeting_id"), "action_items", ["meeting_id"], unique=False)
    op.create_index(op.f("ix_action_items_version_no"), "action_items", ["version_no"], unique=False)
    op.create_index(op.f("ix_action_items_assignee_user_id"), "action_items", ["assignee_user_id"], unique=False)
    op.create_index(op.f("ix_action_items_priority"), "action_items", ["priority"], unique=False)
    op.create_index(op.f("ix_action_items_status"), "action_items", ["status"], unique=False)
    op.create_index("ix_action_items_meeting_due_date", "action_items", ["meeting_id", "due_date"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_action_items_meeting_due_date", table_name="action_items")
    op.drop_index(op.f("ix_action_items_status"), table_name="action_items")
    op.drop_index(op.f("ix_action_items_priority"), table_name="action_items")
    op.drop_index(op.f("ix_action_items_assignee_user_id"), table_name="action_items")
    op.drop_index(op.f("ix_action_items_version_no"), table_name="action_items")
    op.drop_index(op.f("ix_action_items_meeting_id"), table_name="action_items")
    op.drop_table("action_items")

    op.execute("DROP INDEX IF EXISTS ix_meeting_summaries_fts_text")
    op.drop_index("ix_meeting_summaries_meeting_version", table_name="meeting_summaries")
    op.drop_index(op.f("ix_meeting_summaries_version_no"), table_name="meeting_summaries")
    op.drop_index(op.f("ix_meeting_summaries_meeting_id"), table_name="meeting_summaries")
    op.drop_table("meeting_summaries")

    op.execute("DROP INDEX IF EXISTS ix_transcript_segments_fts_text")
    op.drop_index("ix_transcript_segments_meeting_version_start", table_name="transcript_segments")
    op.drop_index(op.f("ix_transcript_segments_speaker_id"), table_name="transcript_segments")
    op.drop_index(op.f("ix_transcript_segments_version_no"), table_name="transcript_segments")
    op.drop_index(op.f("ix_transcript_segments_meeting_id"), table_name="transcript_segments")
    op.drop_table("transcript_segments")

    op.drop_index(op.f("ix_meeting_versions_meeting_id"), table_name="meeting_versions")
    op.drop_table("meeting_versions")

    op.drop_index(op.f("ix_speakers_meeting_id"), table_name="speakers")
    op.drop_table("speakers")
