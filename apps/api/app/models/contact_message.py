import enum
from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin


class ContactMessageStatus(enum.StrEnum):
    NEW = "new"
    READ = "read"
    ARCHIVED = "archived"


class ContactMessage(IdMixin, TimestampMixin, Base):
    __tablename__ = "contact_messages"

    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(CITEXT)
    subject: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[ContactMessageStatus] = mapped_column(default=ContactMessageStatus.NEW)
    delete_after: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
