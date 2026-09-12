#!/usr/bin/env python3
"""Extract private study content from materials/study-guide.epub.

Pulls the high-value end-of-chapter sections (Exam Essentials, Lab Exercises,
Review Questions, and their Answers) out of each of the 12 chapters and writes
them to data/derived/ -- which is gitignored and never shipped in the Docker
image. This content is copyrighted and stays local to this host.

Usage:
    python3 scripts/extract_study_guide.py [--epub PATH] [--out DIR]

No third-party dependencies; uses only the standard library.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import zipfile
from pathlib import Path

# Chapter file -> (index, title, domain code). Must match src/lib/books.ts.
CHAPTERS: dict[str, tuple[int, str, str]] = {
    "c001.xhtml": (1, "Today's Cybersecurity Analyst", "SO"),
    "c002.xhtml": (2, "System and Network Architecture", "SO"),
    "c003.xhtml": (3, "Malicious Activity", "SO"),
    "c004.xhtml": (4, "Threat Intelligence", "SO"),
    "c005.xhtml": (5, "Reconnaissance and Intelligence Gathering", "SO"),
    "c006.xhtml": (6, "Designing a Vulnerability Management Program", "VM"),
    "c007.xhtml": (7, "Analyzing Vulnerability Scans", "VM"),
    "c008.xhtml": (8, "Managing Risk", "VM"),
    "c009.xhtml": (9, "Building an Incident Response Program", "IR"),
    "c010.xhtml": (10, "Evidence and Analysis", "IR"),
    "c011.xhtml": (11, "Containment, Eradication, and Recovery", "IR"),
    "c012.xhtml": (12, "Reporting and Communication", "RC"),
}

SECTION_TITLES = [
    "Exam Essentials",
    "Lab Exercises",
    "Review Questions",
    "Answers to Review Questions",
    "Answers to Lab Exercises",
]


def strip_tags(fragment: str) -> str:
    fragment = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", fragment)
    fragment = re.sub(r"(?i)<br\s*/?>", " ", fragment)
    text = re.sub(r"<[^>]+>", " ", fragment)
    text = html.unescape(text)
    text = text.replace("\u00a0", " ").replace("\u2009", " ").replace("\u200b", "")
    return re.sub(r"\s+", " ", text).strip()


def to_lines(xhtml: str) -> list[str]:
    """Flatten XHTML into a list of non-empty text lines (for section slicing)."""
    text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", xhtml)
    text = re.sub(r"(?i)</(p|div|li|h[1-6]|tr|table|section|blockquote)>", "\n", text)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = text.replace("\u00a0", " ").replace("\u2009", " ").replace("\u200b", "")
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.split("\n")]
    return [ln for ln in lines if ln]


def slice_sections(lines: list[str]) -> dict[str, list[str]]:
    """Return {section title: lines} for the recognised end-of-chapter sections."""
    marks: list[tuple[int, str]] = []
    for i, ln in enumerate(lines):
        for title in SECTION_TITLES:
            if ln == title or ln.startswith(title + " "):
                marks.append((i, title))
                break

    out: dict[str, list[str]] = {}
    for pos, (start, title) in enumerate(marks):
        end = marks[pos + 1][0] if pos + 1 < len(marks) else len(lines)
        body = lines[start + 1 : end]
        if body:
            out[title] = body
    return out


def _top_level_items(fragment: str) -> list[str]:
    """Return the inner HTML of each top-level <li> of the first <ol> in fragment."""
    items: list[str] = []
    depth = 0
    li_start = -1
    for m in re.finditer(r"(?i)<(/?)(ol|li)\b[^>]*>", fragment):
        closing = bool(m.group(1))
        tag = m.group(2).lower()
        if tag == "ol":
            if not closing:
                depth += 1
            elif depth > 0:
                depth -= 1
        elif tag == "li":
            if depth == 1 and not closing:
                li_start = m.end()
            elif closing and depth == 1 and li_start >= 0:
                items.append(fragment[li_start : m.start()])
                li_start = -1
    return items


def parse_review_questions(fragment: str) -> list[dict[str, object]]:
    """Parse an <ol class="decimal"> of questions with nested upper-alpha choices."""
    questions: list[dict[str, object]] = []
    for li in _top_level_items(fragment):
        nested = re.search(r"(?is)<ol\b[^>]*>", li)
        if nested:
            stem = strip_tags(li[: nested.start()])
            choices = [strip_tags(c) for c in _top_level_items(li[nested.start() :])]
        else:
            stem = strip_tags(li)
            choices = []
        if stem:
            questions.append({"stem": stem, "choices": choices})
    return questions


def parse_answers(fragment: str) -> list[dict[str, str]]:
    """Parse an <ol class="decimal"> of answers into {label, text}.

    The book prints each answer as 'B. explanation...'; the leading letter is the
    correct choice, so keep it -- it lets the cards be graded like the question bank.
    """
    out: list[dict[str, str]] = []
    for li in _top_level_items(fragment):
        text = strip_tags(li)
        m = re.match(r"^([A-Z])[.)]\s*(.*)$", text, re.S)
        if m:
            label, body = m.group(1), m.group(2).strip()
        else:
            label, body = "", text.strip()
        if body:
            out.append({"label": label, "text": body})
    return out


def region(xhtml: str, start_title: str, end_titles: list[str]) -> str:
    """Return the raw HTML between a body heading and the next recognised heading.

    Uses rfind for the start so we skip the per-chapter navigation list and land
    on the actual body heading (the last occurrence in the document).
    """
    start = xhtml.rfind(f">{start_title}<")
    if start < 0:
        start = xhtml.rfind(start_title)
    if start < 0:
        return ""
    start += len(start_title)
    ends = [xhtml.find(f">{t}<", start) for t in end_titles]
    ends = [e for e in ends if e >= 0]
    end = min(ends) if ends else len(xhtml)
    return xhtml[start:end]


def build_flashcards(
    questions: list[dict[str, object]], answers: list[dict[str, str]]
) -> list[dict[str, object]]:
    cards: list[dict[str, object]] = []
    for i, q in enumerate(questions):
        answer = answers[i] if i < len(answers) else {"label": "", "text": ""}
        if not answer["text"]:
            continue
        front = str(q["stem"])
        label = answer["label"]
        correct_index = ord(label) - ord("A") if len(label) == 1 and "A" <= label <= "Z" else None
        cards.append(
            {
                "front": front,
                "choices": q["choices"],
                "back": answer["text"],
                "answer_label": label,
                "correct_index": correct_index,
            }
        )
    return cards


def main() -> None:
    here = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--epub", default=str(here / "materials" / "study-guide.epub"))
    ap.add_argument("--out", default=str(here / "data" / "derived" / "study-guide"))
    args = ap.parse_args()

    epub = Path(args.epub)
    if not epub.exists():
        raise SystemExit(f"EPUB not found: {epub}")
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    chapters_out: list[dict] = []
    all_cards: list[dict] = []

    with zipfile.ZipFile(epub) as z:
        names = {Path(n).name: n for n in z.namelist() if n.endswith(".xhtml")}
        for file, (index, title, domain) in CHAPTERS.items():
            member = names.get(file)
            if not member:
                print(f"  ! missing {file}")
                continue
            xhtml = z.read(member).decode("utf-8", "replace")
            sections = slice_sections(to_lines(xhtml))

            rq_html = region(xhtml, "Review Questions", ["Answers to Review Questions"])
            ar_html = region(
                xhtml,
                "Answers to Review Questions",
                ["Answers to Lab Exercises", "Lab Exercises"],
            )
            questions = parse_review_questions(rq_html)
            answers = parse_answers(ar_html)

            chapters_out.append(
                {
                    "file": file,
                    "index": index,
                    "title": title,
                    "domain": domain,
                    "sections": sections,
                    "reviewQuestions": questions,
                    "answers": answers,
                }
            )

            cards = build_flashcards(questions, answers)
            for i, card in enumerate(cards, start=1):
                card["external_key"] = f"SG-{domain}-{index:02d}-{i:03d}"
                card["chapter_href"] = file
                card["chapter_title"] = title
                card["domain_code"] = domain
            all_cards.extend(cards)
            print(
                f"  {file}: {len(questions)} questions, {len(answers)} answers, "
                f"{len(cards)} cards, sections={list(sections)}"
            )

    (out_dir / "chapters.json").write_text(
        json.dumps(chapters_out, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (out_dir / "flashcards.json").write_text(
        json.dumps(all_cards, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"\nWrote {len(chapters_out)} chapters and {len(all_cards)} cards to {out_dir}")


if __name__ == "__main__":
    main()
