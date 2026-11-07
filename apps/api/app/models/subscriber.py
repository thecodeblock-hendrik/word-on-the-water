import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin


class SubscriberStatus(enum.StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    UNSUBSCRIBED = "unsubscribed"
    BOUNCED = "bounced"


class Subscriber(IdMixin, TimestampMixin, Base):
    __tablename__ = "subscribers"

    email: Mapped[str] = mapped_column(CITEXT, unique=True)
    first_name: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[SubscriberStatus] = mapped_column(default=SubscriberStatus.PENDING, index=True)
    # Kit owns the list, the confirmation and the unsubscribe links; this is its id for the person.
    kit_subscriber_id: Mapped[int | None] = mapped_column(BigInteger, unique=True)
    consent_text_version: Mapped[str] = mapped_column(String(20))
    consent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    unsubscribed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(40))
