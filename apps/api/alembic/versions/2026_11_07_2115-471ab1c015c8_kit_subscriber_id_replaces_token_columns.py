"""kit subscriber id replaces token columns

Revision ID: 471ab1c015c8
Revises: 45f20f111f39
Create Date: 2026-11-07 21:15:32.493581

Kit owns the confirmation and unsubscribe links, so our token columns go and the Kit id arrives.
Nothing in the deployed code reads or writes the token columns, so dropping them with the add is
safe for a rollback of the app (they were always empty).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "471ab1c015c8"
down_revision: str | Sequence[str] | None = "45f20f111f39"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("subscribers", sa.Column("kit_subscriber_id", sa.BigInteger(), nullable=True))
    op.create_unique_constraint(
        op.f("uq_subscribers_kit_subscriber_id"), "subscribers", ["kit_subscriber_id"]
    )
    op.drop_index(op.f("ix_subscribers_confirm_token_hash"), table_name="subscribers")
    op.drop_index(op.f("ix_subscribers_unsubscribe_token_hash"), table_name="subscribers")
    op.drop_column("subscribers", "confirm_token_hash")
    op.drop_column("subscribers", "confirm_token_expires_at")
    op.drop_column("subscribers", "unsubscribe_token_hash")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "subscribers", sa.Column("unsubscribe_token_hash", sa.String(length=64), nullable=True)
    )
    op.add_column(
        "subscribers",
        sa.Column("confirm_token_expires_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "subscribers", sa.Column("confirm_token_hash", sa.String(length=64), nullable=True)
    )
    op.create_index(
        op.f("ix_subscribers_unsubscribe_token_hash"),
        "subscribers",
        ["unsubscribe_token_hash"],
        unique=False,
    )
    op.create_index(
        op.f("ix_subscribers_confirm_token_hash"),
        "subscribers",
        ["confirm_token_hash"],
        unique=False,
    )
    op.drop_constraint(op.f("uq_subscribers_kit_subscriber_id"), "subscribers", type_="unique")
    op.drop_column("subscribers", "kit_subscriber_id")
