"""Input guards for the chat: normalisation, crisis phrases, personal details.

Pure functions. They never raise, never keep the visitor's words in a result for
a rejected message (only a reason code), and every pattern is bounded so it runs
in linear time on input capped at MAX_LENGTH. The crisis check runs first and
errs on the side of caution: any mention of suicide or self-harm, including a
theology question, gets the crisis reply.
"""

import re
import unicodedata
from dataclasses import dataclass
from typing import Literal

MAX_LENGTH = 300
CRISIS_SCAN_LENGTH = 2000

Outcome = Literal["ok", "empty", "too_long", "personal_details", "crisis"]


@dataclass(frozen=True)
class GuardResult:
    outcome: Outcome
    text: str = ""
    reason: str | None = None


CRISIS = re.compile(
    r"\bsuicid(?:e|al)\b"
    r"|\bkill(?:ing)? myself\b"
    r"|\b(?:end|take) (?:my own life|my life|it all)\b"
    r"|\b(?:want|wanna|wish) to die\b"
    r"|\bbetter off dead\b"
    r"|\bno reason to (?:live|go on|keep going)\b"
    r"|\b(?:do not|dont) want to (?:be here|live|exist|go on)\b"
    r"|\b(?:hurt|hurting|harm|harming|cut|cutting) myself\b"
    r"|\bself ?harm\b"
    r"|\b(?:abuse[sd]? me|abusing me|being abused|beats me|beating me|hits me|hitting me)\b"
    r"|\b(?:hurting|threatening) me\b|\bbeing hurt\b"
    r"|\brape[sd]?\b|\bmolest(?:ed|s|ing)?\b"
    r"|\b(?:i am|im|my life is|we are) in (?:real |serious |immediate )?danger\b"
    r"|\b(?:not safe|unsafe) at home\b"
)

EMAIL = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")
URL = re.compile(
    r"https?://|\bwww\.|\b[a-z0-9-]+\.(?:com|net|org|co\.za|org\.za|za|io|info|edu|gov)\b"
)
NUMBER_RUN = re.compile(r"\+?\(?\d[\d\s().-]{7,}\d")
ADDRESS = re.compile(
    r"\b\d{1,5}\s+(?:[a-z]+\s+){0,3}"
    r"(?:street|road|rd|avenue|ave|drive|lane|crescent|boulevard|blvd)\b"
)
SELF_INTRO = re.compile(
    r"\bmy (?:full |first |last |real )?name is\b"
    r"|\bi live at\b"
    r"|\bmy (?:phone |cell |mobile |whatsapp |contact )?(?:number|email|e-mail|address) is\b"
    r"|\b(?:call|text|email|contact|whatsapp) me (?:on|at)\b"
    r"|\byou can (?:reach|contact|call|email) me\b"
)


def normalise(raw: str) -> str:
    """NFKC, drop control and zero-width characters, collapse whitespace."""
    text = unicodedata.normalize("NFKC", raw)
    kept = (
        " " if ch in "\t\n\r" else ch
        for ch in text
        if ch in "\t\n\r" or unicodedata.category(ch) not in {"Cc", "Cf", "Cs", "Co", "Cn"}
    )
    return " ".join("".join(kept).split())


def _luhn(digits: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(digits)):
        n = int(ch) * (2 if i % 2 else 1)
        total += n - 9 if n > 9 else n
    return total % 10 == 0


def _is_sa_id(digits: str) -> bool:
    return (
        len(digits) == 13
        and 1 <= int(digits[2:4]) <= 12
        and 1 <= int(digits[4:6]) <= 31
        and _luhn(digits)
    )


def _number_reason(run: str) -> str | None:
    digits = re.sub(r"\D", "", run)
    if len(digits) < 9:
        return None
    if _is_sa_id(digits):
        return "id_number"
    if 13 <= len(digits) <= 19 and _luhn(digits):
        return "card"
    if len(digits) <= 12 and (run.startswith("+") or digits.startswith(("0", "27"))):
        return "phone"
    return "long_number"


def _personal_reason(lower: str) -> str | None:
    """A reason code for personal details found in `lower`, or None."""
    if EMAIL.search(lower):
        return "email"
    if URL.search(lower):
        return "url"
    for run in NUMBER_RUN.findall(lower):
        if reason := _number_reason(run):
            return reason
    if ADDRESS.search(lower):
        return "address"
    if SELF_INTRO.search(lower):
        return "self_intro"
    return None


def _crisis_form(text: str) -> str:
    return re.sub(r"['’‘`]", "", text.lower()).replace("-", " ")


def check(raw: str) -> GuardResult:
    """Run every guard in order: empty, crisis, too long, personal details."""
    text = normalise(raw)
    if not text:
        return GuardResult("empty")
    if CRISIS.search(_crisis_form(text[:CRISIS_SCAN_LENGTH])):
        return GuardResult("crisis")
    if len(text) > MAX_LENGTH:
        return GuardResult("too_long")
    if reason := _personal_reason(text.lower()):
        return GuardResult("personal_details", reason=reason)
    return GuardResult("ok", text)
