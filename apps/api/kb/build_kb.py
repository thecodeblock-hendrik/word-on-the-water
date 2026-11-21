"""Convert the knowledge-base markdown export into chatbot JSON.

Usage: uv run python kb/build_kb.py kb/faith_kb.md app/data/faith_kb.json

Dev tool only (needs scikit-learn from the "kb" dependency group). The output
is reproducible: it carries no timestamp, so `make kb-check` can compare bytes.
"""
import json
import re
import sys
from collections import defaultdict

src, out = sys.argv[1], sys.argv[2]
text = open(src, encoding="utf-8").read()

FIELD_RE = re.compile(r"^\*\*(Also asked|Short answer|Explanation|Contested among evangelicals\.|Key verses|Tags):\*\*\s*(.*)$")
FIELD_RE2 = re.compile(r"^\*\*Contested among evangelicals\.\*\*\s*(.*)$")


def split_list(value, sep):
    return [v.strip() for v in value.split(sep) if v.strip()]


def split_verses(value):
    # "Matthew 13:10–17, 34–35; Luke 10" -> split on ';' only (commas stay within a book)
    return split_list(value, ";")


entries, glossary = [], []
theme_no, theme_name = None, None
current = None
in_glossary = False

for raw in text.splitlines():
    line = raw.strip()
    m = re.match(r"^## (\d+)\. (.+)$", line)
    if m:
        theme_no, theme_name = int(m.group(1)), m.group(2).strip()
        in_glossary = theme_name.startswith("Glossary")
        current = None
        continue
    if line.startswith("## "):  # Introduction / Sources
        theme_no, in_glossary, current = None, False, None
        continue

    if in_glossary and line.startswith("|") and not line.startswith("| Term") and not line.startswith("| ---"):
        cells = [c.strip() for c in line.strip("|").split("|")]
        term_cell, meaning, verses, full = cells
        tm = re.match(r"^(.*?)\s*\((.*?)\)$", term_cell)
        term, aliases = (tm.group(1), split_list(tm.group(2), ",")) if tm else (term_cell, [])
        glossary.append({
            "term": term,
            "aliases": aliases,
            "meaning": meaning,
            "key_verses": split_verses(verses),
            "entries": [] if full in ("–", "-") else [e for e in split_list(full, ",") if re.match(r"^\d+\.\d+$", e)],
            "see_also": [] if full in ("–", "-") or re.match(r"^[\d., ]+$", full) else [full],
        })
        continue

    m = re.match(r"^### (\d+\.\d+) (.+)$", line)
    if m and theme_no:
        current = {
            "id": m.group(1),
            "theme_number": theme_no,
            "theme": theme_name,
            "question": m.group(2).strip(),
            "also_asked": [],
            "short_answer": "",
            "explanation": "",
            "contested": False,
            "key_verses": [],
            "tags": [],
        }
        entries.append(current)
        continue
    if not current:
        continue
    m2 = FIELD_RE2.match(line)
    if m2:
        current["contested"] = True
        current["explanation"] = m2.group(1).strip()
        continue
    m = FIELD_RE.match(line)
    if m:
        key, val = m.group(1), m.group(2).strip()
        if key == "Also asked":
            current["also_asked"] = split_list(val, "·")
        elif key == "Short answer":
            current["short_answer"] = val
        elif key == "Explanation":
            current["explanation"] = val
        elif key == "Key verses":
            current["key_verses"] = split_verses(val)
        elif key == "Tags":
            current["tags"] = [t.lower() for t in split_list(val, ",")]

# ---- related entries -------------------------------------------------------
by_id = {e["id"]: e for e in entries}
tag_index = defaultdict(set)
for e in entries:
    for t in e["tags"]:
        tag_index[t].add(e["id"])
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

ids = [e["id"] for e in entries]
docs = [" ".join([e["question"], *e["also_asked"], " ".join(e["tags"]), e["short_answer"]]) for e in entries]
sim = cosine_similarity(TfidfVectorizer(stop_words=list(ENGLISH_STOP_WORDS | {"bible","say","does","christian","christians","evangelicals","evangelical","agree","differ","god","contested","mean","means","job"}), sublinear_tf=True).fit_transform(docs))

GENERIC_TAGS = {"apologetics", "god", "jesus", "salvation", "contested", "christian living", "ethics", "bible", "church", "end times", "holy spirit", "suffering", "afterlife"}

explicit_refs = defaultdict(list)
for e in entries:
    body = e["short_answer"] + " " + e["explanation"]
    for chunk in re.findall(r"\bsee ((?:\d+\.\d+(?:\s*[–-]\s*\d+\.\d+)?(?:,\s*|\s+and\s+)?)+)", body):
        for start, end in re.findall(r"(\d+\.\d+)(?:\s*[–-]\s*(\d+\.\d+))?", chunk):
            if end:
                a, b = start.split("."), end.split(".")
                targets = [f"{a[0]}.{n}" for n in range(int(a[1]), int(b[1]) + 1)]
            else:
                targets = [start]
            for t in targets:
                explicit_refs[e["id"]].append(t)
                explicit_refs[t].append(e["id"])

for e in entries:
    body = e["short_answer"] + " " + e["explanation"]
    explicit = list(explicit_refs[e["id"]])

    idx = ids.index(e["id"])
    scores = {}
    for j, other in enumerate(ids):
        if other == e["id"]:
            continue
        s = sim[idx, j]
        shared = (set(e["tags"]) & set(by_id[other]["tags"])) - {"contested"}
        s += 0.05 * sum(1 if t in GENERIC_TAGS else 3 for t in shared)
        scores[other] = s
    ranked = [i for i, s in sorted(scores.items(), key=lambda kv: -kv[1]) if s > 0.15]

    same_theme = [i for i, _ in sorted(scores.items(), key=lambda kv: -kv[1]) if by_id[i]["theme_number"] == e["theme_number"]]
    related = []
    for i in explicit + ranked + same_theme:
        if i in by_id and i != e["id"] and i not in related:
            related.append(i)
    e["related"] = related[:5]

# ---- glossary terms used in each entry ---------------------------------------
SKIP_ALIASES = {"christ", "pastor"}  # appears in nearly every answer
COMMON = {"sin", "faith", "salvation", "evangelical", "lord"}  # too frequent to suggest everywhere
for e in entries:
    body = " ".join([e["question"], e["short_answer"], e["explanation"]]).lower()
    found = []
    for g in glossary:
        if e["id"] in g["entries"] or g["term"].lower() in COMMON:
            continue
        names = [g["term"]] + [a for a in g["aliases"] if a.lower() not in SKIP_ALIASES]
        if any(re.search(r"\b" + re.escape(n.lower()) + r"s?\b", body) for n in names):
            found.append(g["term"])
    e["glossary_terms"] = found

# ---- text for embeddings / search -------------------------------------------
for e in entries:
    e["search_text"] = " | ".join([e["question"], *e["also_asked"], ", ".join(e["tags"]), e["short_answer"]])
    if e["contested"]:
        e["answer_guidance"] = "Contested among evangelicals: present the views fairly, do not take a side, and suggest the user speak with their local pastor."

kb = {
    "meta": {
        "title": "Christian Faith Knowledge Base",
        "version": "0.1-draft",
        "status": "Maintained by Word on the Water.",
        "doctrinal_basis": "Broad evangelical, aligned with the GotQuestions.org Statement of Faith and the Bible.org Doctrinal Statement.",
        "scripture_note": "Answers give references, not long quotations. Use the public-domain World English Bible (eBible.org) for quoting.",
        "counts": {
            "entries": len(entries),
            "contested": sum(e["contested"] for e in entries),
            "glossary_terms": len(glossary),
            "themes": len({e["theme_number"] for e in entries}),
        },
    },
    "themes": [{"number": n, "name": name} for n, name in sorted({(e["theme_number"], e["theme"]) for e in entries})],
    "responses": {
        "no_answer": "I don't have an answer to that in my knowledge base. Please speak with your local pastor, who can help you with this question.",
        "contested_suffix": "Christians who hold to the Bible's authority disagree on this. Your local pastor can help you think it through.",
        "crisis": "If you are in danger or thinking about harming yourself, please reach out for help right away. In South Africa you can call the SADAG Suicide Crisis Helpline on 0800 567 567 (free from any network, 24 hours a day) or the LifeLine South Africa National Counselling Line on 0861 322 322 (24 hours a day). If your life is in immediate danger, contact emergency services. Outside South Africa, please call your local emergency number.",
    },
    "entries": entries,
    "glossary": glossary,
}

with open(out, "w", encoding="utf-8") as f:
    json.dump(kb, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(json.dumps(kb["meta"]["counts"]))
