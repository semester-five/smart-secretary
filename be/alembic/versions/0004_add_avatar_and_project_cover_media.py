"""add avatar and project cover media references

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-19 00:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_media_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index(op.f("ix_users_avatar_media_id"), "users", ["avatar_media_id"], unique=False)
    op.create_foreign_key(
        "fk_users_avatar_media_id_media",
        "users",
        "media",
        ["avatar_media_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column("projects", sa.Column("cover_image_media_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index(op.f("ix_projects_cover_image_media_id"), "projects", ["cover_image_media_id"], unique=False)
    op.create_foreign_key(
        "fk_projects_cover_image_media_id_media",
        "projects",
        "media",
        ["cover_image_media_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_projects_cover_image_media_id_media", "projects", type_="foreignkey")
    op.drop_index(op.f("ix_projects_cover_image_media_id"), table_name="projects")
    op.drop_column("projects", "cover_image_media_id")

    op.drop_constraint("fk_users_avatar_media_id_media", "users", type_="foreignkey")
    op.drop_index(op.f("ix_users_avatar_media_id"), table_name="users")
    op.drop_column("users", "avatar_media_id")
