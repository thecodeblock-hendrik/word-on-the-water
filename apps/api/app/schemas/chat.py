"""Request and reply models for the Ask the Word chat.

The server keeps nothing between requests: the browser sends the small context
below with every turn.
"""

from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

IdList = Annotated[list[str], Field(max_length=20)]


class ChatContext(BaseModel):
    """What the browser remembers: ids only, never text."""

    model_config = ConfigDict(extra="forbid")

    last_entry_id: str | None = None
    seen_entry_ids: IdList = []
    explained_entry_ids: IdList = []


class ChatTurn(BaseModel):
    """One visitor action: free text, a chip that names an entry, or a button."""

    model_config = ConfigDict(extra="forbid")

    message: str | None = None
    entry_id: str | None = None
    action: Literal["more", "related", "term"] | None = None
    term: str | None = None

    @model_validator(mode="after")
    def _exactly_one(self) -> Self:
        given = [self.message is not None, self.entry_id is not None, self.action is not None]
        if sum(given) != 1:
            raise ValueError("send exactly one of message, entry_id or action")
        if (self.action == "term") != (self.term is not None):
            raise ValueError("term goes with the term action and nothing else")
        return self


class ChatRequest(ChatTurn):
    """The body of POST /v1/chat/messages: a turn plus the context and the bot-check fields."""

    context: ChatContext = ChatContext()
    # The hidden field bots fill, and when the panel was rendered (ms since 1970).
    website: Annotated[str, Field(max_length=1000)] = ""
    rendered_at: Annotated[int, Field(strict=True, ge=0)]


class Option(BaseModel):
    id: str
    question: str


class TermView(BaseModel):
    term: str
    meaning: str
    key_verses: list[str]
    entries: list[Option]


class EntryView(BaseModel):
    id: str
    question: str
    short_answer: str
    explanation: str
    contested: bool
    contested_note: str | None
    key_verses: list[str]
    related: list[Option]
    glossary_terms: list[TermView]


ReplyKind = Literal["answer", "clarify", "no_answer", "crisis", "smalltalk", "rejected", "term"]


class ChatReply(BaseModel):
    kind: ReplyKind
    kb_version: str
    entry: EntryView | None = None
    term: TermView | None = None
    options: list[Option] = []
    text: str | None = None
    reason: str | None = None
    expand: bool = False
