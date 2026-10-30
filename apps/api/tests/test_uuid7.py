import uuid

from app.db.ids import uuid7


def test_uuid7_version_variant_and_ordering() -> None:
    a, b = uuid7(), uuid7()
    assert a.version == 7
    assert a.variant == uuid.RFC_4122
    assert a.int >> 80 <= b.int >> 80
    assert a != b
