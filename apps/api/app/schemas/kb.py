"""Models for the Got Questions knowledge base (`app/data/faith_kb.json`).

The whole file is validated when it loads: references resolve, counts match the
meta block and no answer text contains HTML.
"""

from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)


class Counts(Strict):
    entries: int
    contested: int
    glossary_terms: int
    themes: int


class Meta(Strict):
    title: str
    version: str
    status: str
    doctrinal_basis: str
    scripture_note: str
    counts: Counts


class Theme(Strict):
    number: int
    name: Text


class Responses(Strict):
    no_answer: Text
    contested_suffix: Text
    crisis: Text


class Entry(Strict):
    id: Text
    theme_number: int
    theme: Text
    question: Text
    also_asked: list[Text]
    short_answer: Text
    explanation: Text
    contested: bool
    key_verses: list[Text]
    tags: list[Text]
    related: list[Text]
    glossary_terms: list[Text]
    search_text: Text
    answer_guidance: Text | None = None

    @model_validator(mode="after")
    def _no_html_and_guidance_matches(self) -> Self:
        texts = [self.question, self.short_answer, self.explanation, *self.also_asked]
        if any("<" in t or ">" in t for t in texts):
            raise ValueError(f"entry {self.id} contains html")
        if self.contested != (self.answer_guidance is not None):
            raise ValueError(f"entry {self.id}: answer_guidance must match contested")
        return self


class GlossaryTerm(Strict):
    term: Text
    aliases: list[Text]
    meaning: Text
    key_verses: list[Text]
    entries: list[Text]
    see_also: list[Text]


class KnowledgeBase(Strict):
    meta: Meta
    themes: list[Theme]
    responses: Responses
    entries: list[Entry]
    glossary: list[GlossaryTerm]

    @property
    def version(self) -> str:
        return self.meta.version

    @property
    def entries_by_id(self) -> dict[str, Entry]:
        return {e.id: e for e in self.entries}

    @model_validator(mode="after")
    def _consistent(self) -> Self:
        ids = [e.id for e in self.entries]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate entry id")
        known, terms = set(ids), {g.term for g in self.glossary}
        for entry in self.entries:
            bad = (set(entry.related) - known) | ({entry.id} & set(entry.related))
            if bad:
                raise ValueError(f"entry {entry.id}: bad related ids {sorted(bad)}")
            if missing := set(entry.glossary_terms) - terms:
                raise ValueError(f"entry {entry.id}: unknown glossary terms {sorted(missing)}")
        for term in self.glossary:
            if missing := set(term.entries) - known:
                raise ValueError(f"glossary {term.term}: unknown entry ids {sorted(missing)}")
        counts = self.meta.counts
        actual = (
            len(self.entries),
            sum(e.contested for e in self.entries),
            len(self.glossary),
            len(self.themes),
        )
        if actual != (counts.entries, counts.contested, counts.glossary_terms, counts.themes):
            raise ValueError("meta counts do not match the file")
        return self
