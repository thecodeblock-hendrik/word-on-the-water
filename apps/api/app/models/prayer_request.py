import enum
from datetime import datetime

from sqlalchemy import DateTime, LargeBinary, String
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin


class PrayerRequestStatus(enum.StrEnum):
    NEW = "new"
    PRAYED_FOR = "prayed_for"
    REPLIED = "replied"
    ARCHIVED = "archived"


class PrayerRequest(IdMixin, TimestampMixin, Base):
    """The request text is stored only as AES-256-GCM ciphertext (see ADR 0006)."""

    __tablename__ = "prayer_requests"

    first_name: Mapped[str | None] = mapped_column(String(80))
    email: Mapped[str | None] = mapped_column(CITEXT)
    body_ciphertext: Mapped[bytes] = mapped_column(LargeBinary)
    key_id: Mapped[str] = mapped_column(String(40))
    share_with_team: Mapped[bool] = mapped_column(default=False)
    wants_reply: Mapped[bool] = mapped_column(default=False)
    status: Mapped[PrayerRequestStatus] = mapped_column(default=PrayerRequestStatus.NEW, index=True)
    delete_after: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
