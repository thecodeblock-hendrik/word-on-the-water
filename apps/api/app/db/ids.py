"""UUID v7 generation (time-ordered); Python 3.13 has no built-in."""

import os
import time
import uuid


def uuid7() -> uuid.UUID:
    millis = time.time_ns() // 1_000_000
    value = (millis << 80) | (int.from_bytes(os.urandom(10)) & ((1 << 80) - 1))
    value = (value & ~(0xF << 76)) | (0x7 << 76)
    value = (value & ~(0x3 << 62)) | (0x2 << 62)
    return uuid.UUID(int=value)
