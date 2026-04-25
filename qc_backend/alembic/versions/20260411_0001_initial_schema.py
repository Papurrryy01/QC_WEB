"""initial schema

Revision ID: 20260411_0001
Revises:
Create Date: 2026-04-11 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260411_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


message_role_enum = sa.Enum("user", "assistant", "system", name="message_role")
generation_type_enum = sa.Enum(
    "conversation",
    "ideate",
    "rewrite",
    "reveal_plan",
    "render_scene",
    "image",
    "voice",
    name="generation_type",
)
job_type_enum = sa.Enum("image", "voice", "scene", name="job_type")
job_status_enum = sa.Enum("queued", "processing", "done", "failed", name="job_status")
asset_type_enum = sa.Enum("background", "voice", "scene", name="asset_type")
moment_status_enum = sa.Enum("draft", "ready", "scheduled", "delivered", name="moment_status")


def upgrade() -> None:
    bind = op.get_bind()
    message_role_enum.create(bind, checkfirst=True)
    generation_type_enum.create(bind, checkfirst=True)
    job_type_enum.create(bind, checkfirst=True)
    job_status_enum.create(bind, checkfirst=True)
    asset_type_enum.create(bind, checkfirst=True)
    moment_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=True),
        sa.Column("avatar_url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=True),
        sa.Column("mode", sa.String(length=32), nullable=False, server_default="moment_architect"),
        sa.Column("language", sa.String(length=16), nullable=True),
        sa.Column("emotion_state", sa.String(length=24), nullable=True),
        sa.Column("direction_state", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_conversations_user_id"), "conversations", ["user_id"], unique=False)

    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", message_role_enum, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("language", sa.String(length=16), nullable=True),
        sa.Column("audio_url", sa.String(length=1024), nullable=True),
        sa.Column("structured_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_messages_conversation_id"), "messages", ["conversation_id"], unique=False)

    op.create_table(
        "moments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("emotional_goal", sa.Text(), nullable=True),
        sa.Column("recipient_type", sa.String(length=80), nullable=True),
        sa.Column("relationship_context", sa.Text(), nullable=True),
        sa.Column("tone_profile", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("suggested_message", sa.Text(), nullable=True),
        sa.Column("variations", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("reveal_style", sa.String(length=120), nullable=True),
        sa.Column("reveal_steps", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("delivery_timing", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", moment_status_enum, nullable=False, server_default="draft"),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_moments_user_id"), "moments", ["user_id"], unique=False)
    op.create_index(op.f("ix_moments_conversation_id"), "moments", ["conversation_id"], unique=False)

    op.create_table(
        "ai_generations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("moment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("moments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("generation_type", generation_type_enum, nullable=False),
        sa.Column("model", sa.String(length=80), nullable=False),
        sa.Column("prompt_input", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("output_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("safety_flags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_ai_generations_user_id"), "ai_generations", ["user_id"], unique=False)
    op.create_index(op.f("ix_ai_generations_conversation_id"), "ai_generations", ["conversation_id"], unique=False)
    op.create_index(op.f("ix_ai_generations_moment_id"), "ai_generations", ["moment_id"], unique=False)

    op.create_table(
        "generation_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("moment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("moments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("type", job_type_enum, nullable=False),
        sa.Column("status", job_status_enum, nullable=False, server_default="queued"),
        sa.Column("result_url", sa.String(length=1024), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_generation_jobs_user_id"), "generation_jobs", ["user_id"], unique=False)
    op.create_index(op.f("ix_generation_jobs_moment_id"), "generation_jobs", ["moment_id"], unique=False)

    op.create_table(
        "moment_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("moment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("moments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("generation_jobs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("asset_type", asset_type_enum, nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_moment_assets_moment_id"), "moment_assets", ["moment_id"], unique=False)
    op.create_index(op.f("ix_moment_assets_job_id"), "moment_assets", ["job_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_moment_assets_job_id"), table_name="moment_assets")
    op.drop_index(op.f("ix_moment_assets_moment_id"), table_name="moment_assets")
    op.drop_table("moment_assets")

    op.drop_index(op.f("ix_generation_jobs_moment_id"), table_name="generation_jobs")
    op.drop_index(op.f("ix_generation_jobs_user_id"), table_name="generation_jobs")
    op.drop_table("generation_jobs")

    op.drop_index(op.f("ix_ai_generations_moment_id"), table_name="ai_generations")
    op.drop_index(op.f("ix_ai_generations_conversation_id"), table_name="ai_generations")
    op.drop_index(op.f("ix_ai_generations_user_id"), table_name="ai_generations")
    op.drop_table("ai_generations")

    op.drop_index(op.f("ix_moments_conversation_id"), table_name="moments")
    op.drop_index(op.f("ix_moments_user_id"), table_name="moments")
    op.drop_table("moments")

    op.drop_index(op.f("ix_messages_conversation_id"), table_name="messages")
    op.drop_table("messages")

    op.drop_index(op.f("ix_conversations_user_id"), table_name="conversations")
    op.drop_table("conversations")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    asset_type_enum.drop(bind, checkfirst=True)
    job_status_enum.drop(bind, checkfirst=True)
    job_type_enum.drop(bind, checkfirst=True)
    generation_type_enum.drop(bind, checkfirst=True)
    moment_status_enum.drop(bind, checkfirst=True)
    message_role_enum.drop(bind, checkfirst=True)
