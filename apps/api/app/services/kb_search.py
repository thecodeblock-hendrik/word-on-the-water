"""Keyword search over the knowledge base: BM25 with field weights.

Three signals decide the outcome:
- score: weighted BM25 plus a bonus when the whole question matches a stored
  question or paraphrase (so "who is jesus" wins although "jesus" is everywhere);
- coverage: the share of the question's meaningful words (weighted by rarity)
  found in the best entry; off-topic questions match one stray word at most;
- band: high (answer), medium (offer the top three as "did you mean") or low
  (no answer).

Thresholds, tuned on tests/chat_eval (2026-11-15): off-topic questions reach at
most coverage 0.54 and score 8.3 in the zone that matters; questions that should
be answered reach at least coverage 0.58 and score 12.8; the knowledge base's
own questions all score 15.5 or more with coverage 1.0. So medium needs score
10 and coverage 0.55, and high needs score 12 and coverage 0.7. Known limit:
matching is by words, so "is the bible true" needs "Is the Bible true?" as a
paraphrase in the knowledge base to find its entry.
"""

import difflib
import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from typing import Literal

from app.schemas.kb import KnowledgeBase

Band = Literal["high", "medium", "low"]

STOP_WORDS = frozenset(
    [
        "a",
        "an",
        "the",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "am",
        "do",
        "does",
        "did",
        "to",
        "of",
        "in",
        "on",
        "at",
        "and",
        "or",
        "it",
        "its",
        "that",
        "this",
        "these",
        "those",
        "for",
        "with",
        "by",
        "as",
        "from",
        "i",
        "me",
        "my",
        "we",
        "our",
        "you",
        "your",
        "should",
        "would",
        "could",
        "will",
        "who",
        "what",
        "whats",
        "ok",
        "okay",
        "im",
    ]
)
WEIGHTS = {"question": 3.0, "tags": 2.0, "glossary": 2.0, "short": 1.0, "explanation": 0.5}
K1, B = 1.5, 0.75
EXACT_BONUS = 15.0

HIGH_SCORE, HIGH_COVERAGE = 12.0, 0.7
MEDIUM_SCORE, MEDIUM_COVERAGE = 10.0, 0.55


def stem(word: str) -> str:
    """Strip common English endings so "prayers" and "praying" meet "pray"."""
    for suffix, keep in (("ies", "y"), ("ing", ""), ("ed", ""), ("es", ""), ("s", "")):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            if suffix in ("es", "s") and word.endswith("ss"):
                return word
            return word[: -len(suffix)] + keep
    return word


def tokens(text: str) -> list[str]:
    """Lowercase, drop apostrophes, split on non-letters, drop stop words, stem."""
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"['’‘`]", "", text)
    return [stem(w) for w in re.findall(r"[a-z0-9]+", text) if w not in STOP_WORDS]


@dataclass(frozen=True)
class SearchResult:
    ranked: tuple[str, ...]
    score: float
    coverage: float
    band: Band


NO_RESULT = SearchResult((), 0.0, 0.0, "low")


class SearchIndex:
    """Built once from the knowledge base; searching is a few milliseconds."""

    def __init__(self, kb: KnowledgeBase) -> None:
        self.ids = [e.id for e in kb.entries]
        fields: list[dict[str, list[str]]] = []
        self.variants: list[list[frozenset[str]]] = []
        by_term = {g.term: g for g in kb.glossary}
        for entry in kb.entries:
            glossary = [
                t for g in kb.glossary if entry.id in g.entries for t in (g.term, *g.aliases)
            ]
            glossary += [t for name in entry.glossary_terms for t in (name, *by_term[name].aliases)]
            fields.append(
                {
                    "question": tokens(" ".join((entry.question, *entry.also_asked))),
                    "tags": tokens(" ".join(entry.tags)),
                    "glossary": tokens(" ".join(glossary)),
                    "short": tokens(entry.short_answer),
                    "explanation": tokens(entry.explanation),
                }
            )
            self.variants.append(
                [frozenset(tokens(q)) for q in (entry.question, *entry.also_asked)]
            )
        self.weighted = [self._weighted(f) for f in fields]
        self.lengths = [sum(c.values()) for c in self.weighted]
        self.average_length = sum(self.lengths) / len(self.lengths)
        self.words = [set().union(*f.values()) for f in fields]
        document_frequency = Counter(w for words in self.words for w in words)
        count = len(self.ids)
        self.idf = {
            w: math.log(1 + (count - n + 0.5) / (n + 0.5)) for w, n in document_frequency.items()
        }
        self.unknown_idf = math.log(1 + (count + 0.5) / 0.5)

    @staticmethod
    def _weighted(fields: dict[str, list[str]]) -> dict[str, float]:
        total: dict[str, float] = {}
        for name, words in fields.items():
            for word in words:
                total[word] = total.get(word, 0.0) + WEIGHTS[name]
        return total

    def search(self, query: str) -> SearchResult:
        words = {self._correct(w) for w in tokens(query)}
        if not words:
            return NO_RESULT
        scores = [self._score(words, i) for i in range(len(self.ids))]
        order = sorted(range(len(scores)), key=lambda i: -scores[i])[:3]
        best = order[0]
        score = scores[best]
        coverage = self._coverage(words, best)
        return SearchResult(
            tuple(self.ids[i] for i in order), score, coverage, self._band(score, coverage)
        )

    def _correct(self, word: str) -> str:
        """Fix a likely typo by snapping an unknown word to a close known one."""
        if word in self.idf or len(word) < 5:
            return word
        close = difflib.get_close_matches(word, self.idf, n=1, cutoff=0.85)
        return close[0] if close else word

    def _score(self, words: set[str], i: int) -> float:
        counts, norm = self.weighted[i], 1 - B + B * self.lengths[i] / self.average_length
        total = 0.0
        for word in words:
            tf = counts.get(word, 0.0)
            if tf:
                total += self.idf[word] * tf * (K1 + 1) / (tf + K1 * norm)
        closest = max(2 * len(words & v) / (len(words) + len(v)) for v in self.variants[i])
        return total + EXACT_BONUS * closest**2

    def _coverage(self, words: set[str], i: int) -> float:
        weight = {w: self.idf.get(w, self.unknown_idf) for w in words}
        found = sum(weight[w] for w in words if w in self.words[i])
        return found / sum(weight.values())

    @staticmethod
    def _band(score: float, coverage: float) -> Band:
        if score >= HIGH_SCORE and coverage >= HIGH_COVERAGE:
            return "high"
        if score >= MEDIUM_SCORE and coverage >= MEDIUM_COVERAGE:
            return "medium"
        return "low"
