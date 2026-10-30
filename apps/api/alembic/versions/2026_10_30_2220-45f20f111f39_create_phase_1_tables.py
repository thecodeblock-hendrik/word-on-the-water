"""create phase 1 tables

Revision ID: 45f20f111f39
Revises:
Create Date: 2026-10-30 22:20:37.814693

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "45f20f111f39"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")
    op.create_table(
        "audit_log",
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=60), nullable=False),
        sa.Column("entity_type", sa.String(length=40), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=True),
        sa.Column("ip_hash", sa.String(length=64), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_audit_log")),
    )
    op.create_table(
        "contact_messages",
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("subject", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("new", "read", "archived", name="contactmessagestatus"),
            nullable=False,
        ),
        sa.Column("delete_after", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_contact_messages")),
    )
    op.create_index(
        op.f("ix_contact_messages_delete_after"), "contact_messages", ["delete_after"], unique=False
    )
    op.create_table(
        "email_outbox",
        sa.Column("template", sa.String(length=60), nullable=False),
        sa.Column("to_address", sa.String(length=254), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "status", sa.Enum("pending", "sent", "failed", name="outboxstatus"), nullable=False
        ),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column(
            "next_attempt_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_email_outbox")),
    )
    op.create_index("ix_email_outbox_drain", "email_outbox", ["status", "next_attempt_at"])
    op.create_table(
        "prayer_requests",
        sa.Column("first_name", sa.String(length=80), nullable=True),
        sa.Column("email", postgresql.CITEXT(), nullable=True),
        sa.Column("body_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("key_id", sa.String(length=40), nullable=False),
        sa.Column("share_with_team", sa.Boolean(), nullable=False),
        sa.Column("wants_reply", sa.Boolean(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("new", "prayed_for", "replied", "archived", name="prayerrequeststatus"),
            nullable=False,
        ),
        sa.Column("delete_after", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_prayer_requests")),
    )
    op.create_index(
        op.f("ix_prayer_requests_delete_after"), "prayer_requests", ["delete_after"], unique=False
    )
    op.create_index(op.f("ix_prayer_requests_status"), "prayer_requests", ["status"], unique=False)
    op.create_table(
        "subscribers",
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("first_name", sa.String(length=80), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "active", "unsubscribed", "bounced", name="subscriberstatus"),
            nullable=False,
        ),
        sa.Column("confirm_token_hash", sa.String(length=64), nullable=True),
        sa.Column("confirm_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unsubscribe_token_hash", sa.String(length=64), nullable=True),
        sa.Column("consent_text_version", sa.String(length=20), nullable=False),
        sa.Column("consent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unsubscribed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_subscribers")),
        sa.UniqueConstraint("email", name=op.f("uq_subscribers_email")),
    )
    op.create_index(
        op.f("ix_subscribers_confirm_token_hash"),
        "subscribers",
        ["confirm_token_hash"],
        unique=False,
    )
    op.create_index(op.f("ix_subscribers_status"), "subscribers", ["status"], unique=False)
    op.create_index(
        op.f("ix_subscribers_unsubscribe_token_hash"),
        "subscribers",
        ["unsubscribe_token_hash"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_subscribers_unsubscribe_token_hash"), table_name="subscribers")
    op.drop_index(op.f("ix_subscribers_status"), table_name="subscribers")
    op.drop_index(op.f("ix_subscribers_confirm_token_hash"), table_name="subscribers")
    op.drop_table("subscribers")
    op.drop_index(op.f("ix_prayer_requests_status"), table_name="prayer_requests")
    op.drop_index(op.f("ix_prayer_requests_delete_after"), table_name="prayer_requests")
    op.drop_table("prayer_requests")
    op.drop_index("ix_email_outbox_drain", table_name="email_outbox")
    op.drop_table("email_outbox")
    op.drop_index(op.f("ix_contact_messages_delete_after"), table_name="contact_messages")
    op.drop_table("contact_messages")
    op.drop_table("audit_log")
    for enum_name in (
        "contactmessagestatus",
        "outboxstatus",
        "prayerrequeststatus",
        "subscriberstatus",
    ):
        op.execute(f"DROP TYPE {enum_name}")
