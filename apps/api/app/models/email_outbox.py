import enum
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin


class OutboxStatus(enum.StrEnum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class EmailOutbox(IdMixin, TimestampMixin, Base):
    """Written in the same transaction as the business change, drained by cron."""

    __tablename__ = "email_outbox"
    __table_args__ = (Index("ix_email_outbox_drain", "status", "next_attempt_at"),)

    template: Mapped[str] = mapped_column(String(60))
    to_address: Mapped[str] = mapped_column(String(254))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    status: Mapped[OutboxStatus] = mapped_column(default=OutboxStatus.PENDING)
    attempts: Mapped[int] = mapped_column(default=0)
    last_error: Mapped[str | None] = mapped_column(Text)
    next_attempt_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
