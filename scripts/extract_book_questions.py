#!/usr/bin/env python3
"""
One-off extractor: pulls every question from the CompTIA CySA+ Practice Tests
(4th Edition, CS0-004) EPUB into data/questions.json in the shape scripts/seed.ts
expects, and copies referenced exhibit images into public/exhibits/.

Source of truth is the EPUB (clean semantic HTML: <ol class="decimal"> questions,
nested <ol class="upper-alpha"> choices, per-chapter answer list at the bottom)
because the PDF strips list numbering/letters and is far less reliable.

Usage:
  python3 scripts/extract_book_questions.py
"""
import glob
import json
import os
import re
import shutil
import zipfile
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOKS_DIR = os.path.join(ROOT, "cysa books")
OUT_JSON = os.path.join(ROOT, "data", "questions.json")
EXHIBIT_DIR = os.path.join(ROOT, "public", "exhibits")

# chapter file -> (external-key prefix, domain code, subtopic, is_practice_test)
CHAPTERS = [
    ("OEBPS/c001.xhtml", "SO", "SO", "Domain 1.0: Security Operations", False),
    ("OEBPS/c002.xhtml", "VM", "VM", "Domain 2.0: Vulnerability Management", False),
    ("OEBPS/c003.xhtml", "IR", "IR", "Domain 3.0: Incident Response and Management", False),
    ("OEBPS/c004.xhtml", "RC", "RC", "Domain 4.0: Reporting and Communication", False),
    ("OEBPS/c005.xhtml", "PT1", "PT1", "Practice Test 1", True),
    ("OEBPS/c006.xhtml", "PT2", "PT2", "Practice Test 2", True),
]

# Keyword vocab for classifying practice-test questions into a domain (the book
# does not label them). Imperfect by nature; highest score wins, ties -> SO.
DOMAIN_KEYWORDS = {
    "SO": [
        "threat intel", "threat intelligence", "siem", "soc ", "security operations",
        "edr", "xdr", "ids", "ips", "snort", "suricata", "zeek", "wireshark", "netflow",
        "packet", "honeypot", "honeynet", "deception", "zero trust", "ztna", "sase",
        "firewall", "network scan", "monitoring", "endpoint", "sandbox", "osint",
        "indicator of compromise", "ioc", "mitre", "att&ck", "log source", "syslog",
        "network flow", "port scan", "dns", "tls", "certificate", "proxy", "nac",
        "threat hunt", "threat feed", "dark web", "osint", "soar", "playbook automation",
    ],
    "VM": [
        "vulnerability", "vulnerabilities", "scan", "scanner", "cvss", "patch",
        "remediation", "asset inventory", "asset management", "exposure", "nessus",
        "qualys", "openvas", "credentialed scan", "false positive", "cve", "hardening",
        "configuration baseline", "benchmark", "cis ", "risk score", "prioritiz",
        "attack surface", "misconfiguration", "outdated", "end of life", "eol",
        "software inventory", "agent-based", "unauthenticated scan", "risk assessment",
    ],
    "IR": [
        "incident", "response", "forensic", "containment", "eradication", "recovery",
        "breach", "compromise", "ransomware", "phishing", "playbook", "chain of custody",
        "memory", "disk image", "volatility", "timeline", "root cause", "escalation",
        "triage", "quarantine", "isolat", "malware", "backdoor", "c2 ", "command and control",
        "data exfiltration", "lateral movement", "persistence", "indicator", "infection",
        "eradicated", "lessons learned", "post-incident", "evidence", "acquisition",
    ],
    "RC": [
        "report", "reporting", "communicat", "metric", "kpi", "sla", "stakeholder",
        "executive", "dashboard", "compliance", "audit", "documentation", "policy",
        "governance", "briefing", "notification", "disclosure", "retention", "privacy",
        "gdpr", "legal", "regulat", "scorecard", "benchmark", "trend", "maturity",
        "risk register", "business continuity", "tabletop", "training", "awareness",
    ],
}


def find_epub():
    matches = [f for f in glob.glob(os.path.join(BOOKS_DIR, "*.epub"))
               if "Practice Tests" in os.path.basename(f)]
    if not matches:
        raise SystemExit("Could not find the Practice Tests EPUB in 'cysa books/'")
    return matches[0]


def clean(s):
    s = s.replace("\xa0", " ")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def clean_pre(s):
    s = s.replace("\xa0", " ")
    lines = [ln.rstrip() for ln in s.split("\n")]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    out, blank = [], 0
    for ln in lines:
        if not ln.strip():
            blank += 1
            if blank >= 2:
                continue
        else:
            blank = 0
        out.append(ln)
    return "\n".join(out)


def split_questions_answers(data):
    m = re.search(r"<h2[^>]*>\s*Answers to", data)
    if not m:
        raise SystemExit("Could not locate the 'Answers to' header")
    return data[:m.start()], data[m.start():]


def parse_questions(soup):
    """Return list of question dicts in document order."""
    questions = []
    for ol in soup.find_all("ol", class_="decimal"):
        # Only top-level question containers; nested decimal lists are part of a stem.
        if ol.parent is not None and ol.parent.name == "li":
            continue
        for li in ol.find_all("li", recursive=False):
            questions.append(li)
    return questions


def extract_question(li):
    """Parse a single question <li> into stem/choices/exhibits/images."""
    # Choices are the question's DIRECT-child upper-alpha list. (Some questions
    # embed a nested upper-alpha "scenario options" list inside a <ul>/<li>; that
    # belongs in the stem, not the answer choices.)
    choices = []
    for o in [o for o in li.find_all("ol", recursive=False)
              if "upper-alpha" in (o.get("class") or [])]:
        for c in o.find_all("li", recursive=False):
            choices.append(clean(c.get_text(" ")))

    work = BeautifulSoup(str(li), "html.parser")
    work = work.find("li") or work

    # Remove the real choice list(s) from the stem copy.
    for o in [o for o in work.find_all("ol", recursive=False)
              if "upper-alpha" in (o.get("class") or [])]:
        o.decompose()

    # Any remaining (nested) upper-alpha lists are scenario options -> inline text.
    for o in work.find_all("ol", class_="upper-alpha"):
        items = [clean(c.get_text(" ")) for c in o.find_all("li", recursive=False)]
        o.replace_with(" (" + " ".join(f"({chr(65+i)}) {t}" for i, t in enumerate(items)) + ") ")

    # Images -> exhibit images
    images = [img.get("src") for img in work.find_all("img") if img.get("src")]
    for f in work.find_all("figure"):
        f.decompose()

    # Pre blocks -> text exhibit
    pre_blocks = [clean_pre(p.get_text("\n")) for p in work.find_all("pre")]
    for p in work.find_all("pre"):
        p.decompose()

    # Tables -> text exhibit
    table_blocks = []
    for t in work.find_all("table"):
        rows = []
        for tr in t.find_all("tr"):
            cells = [clean(td.get_text(" ")) for td in tr.find_all(["td", "th"])]
            rows.append(" | ".join(cells))
        table_blocks.append("\n".join(rows))
        t.decompose()

    # Remaining nested decimal lists are scenario bullets -> inline numbered text.
    for o in work.find_all("ol", class_="decimal"):
        items = [clean(c.get_text(" ")) for c in o.find_all("li", recursive=False)]
        o.replace_with(" (" + " ".join(f"({i+1}) {t}" for i, t in enumerate(items)) + ") ")

    stem = clean(work.get_text(" "))

    exhibits = pre_blocks + table_blocks
    exhibit = "\n\n".join(exhibits) if exhibits else None
    return {"stem": stem, "choices": choices, "images": images, "exhibit": exhibit}


def parse_answers(soup):
    """Return list of (letter, explanation) from the answers list."""
    ols = soup.find_all("ol", class_="decimal")
    if not ols:
        raise SystemExit("No answer list found")
    answers = []
    for li in ols[0].find_all("li", recursive=False):
        txt = clean(li.get_text(" "))
        m = re.match(r"^([A-Fa-f])\s*[\.\)]\s*(.*)$", txt, re.S)
        if not m:
            answers.append((None, txt))
        else:
            answers.append((m.group(1).upper(), m.group(2).strip()))
    return answers


def classify_domain(text):
    low = text.lower()
    scores = {d: sum(low.count(k) for k in kws) for d, kws in DOMAIN_KEYWORDS.items()}
    best = max(scores, key=lambda d: (scores[d], -list(DOMAIN_KEYWORDS).index(d)))
    if scores[best] == 0:
        return "SO"
    return best


def main():
    epub = find_epub()
    print(f"Reading {os.path.basename(epub)}")
    z = zipfile.ZipFile(epub)

    if os.path.isdir(EXHIBIT_DIR):
        shutil.rmtree(EXHIBIT_DIR)
    os.makedirs(EXHIBIT_DIR, exist_ok=True)

    all_questions = []
    report = []

    for path, key_prefix, domain, subtopic, is_pt in CHAPTERS:
        data = z.read(path).decode("utf-8", "replace")
        qsec, asec = split_questions_answers(data)
        q_soup = BeautifulSoup(qsec, "html.parser")
        a_soup = BeautifulSoup(asec, "html.parser")

        q_lis = parse_questions(q_soup)
        answers = parse_answers(a_soup)

        if len(q_lis) != len(answers):
            raise SystemExit(
                f"{path}: question/answer count mismatch {len(q_lis)} vs {len(answers)}"
            )

        bad_choices = 0
        bad_answers = 0
        img_count = 0

        for i, (li, (letter, explanation)) in enumerate(zip(q_lis, answers), start=1):
            q = extract_question(li)
            if len(q["choices"]) != 4:
                bad_choices += 1
            if letter is None:
                bad_answers += 1
                letter = "A"

            external_key = f"{key_prefix}-{i:04d}"
            choices = []
            for ci, body in enumerate(q["choices"]):
                lab = chr(65 + ci)
                choices.append({"label": lab, "body": body, "correct": lab == letter})

            # Copy exhibit images
            image_paths = []
            for n, src in enumerate(dict.fromkeys(q["images"]), start=1):
                ext = os.path.splitext(src)[1].lower() or ".png"
                fname = f"{external_key}-{n}{ext}"
                try:
                    blob = z.read("OEBPS/" + src)
                except KeyError:
                    continue
                with open(os.path.join(EXHIBIT_DIR, fname), "wb") as fh:
                    fh.write(blob)
                image_paths.append(f"/exhibits/{fname}")
                img_count += 1

            q_domain = domain
            q_subtopic = subtopic
            if is_pt:
                q_domain = classify_domain(q["stem"] + " " + explanation + " " +
                                           " ".join(q["choices"]))

            all_questions.append({
                "external_key": external_key,
                "domain": q_domain,
                "subtopic": q_subtopic,
                "difficulty": 3,
                "is_multi": False,
                "select_n": 1,
                "type": "mcq",
                "stem": q["stem"],
                "exhibit": q["exhibit"],
                "exhibit_image": (json.dumps(image_paths) if len(image_paths) > 1
                                  else (image_paths[0] if image_paths else None)),
                "explanation": explanation,
                "choices": choices,
            })

        report.append({
            "chapter": path, "questions": len(q_lis), "answers": len(answers),
            "bad_choices": bad_choices, "bad_answers": bad_answers, "images": img_count,
        })

    with open(OUT_JSON, "w") as fh:
        json.dump(all_questions, fh, indent=2, ensure_ascii=False)

    print("\n=== Extraction report ===")
    total = 0
    for r in report:
        total += r["questions"]
        print(f"  {r['chapter']}: {r['questions']} Q  ({r['answers']} answers, "
              f"{r['images']} imgs, badChoices={r['bad_choices']}, badAnswers={r['bad_answers']})")
    print(f"  TOTAL: {total}")

    from collections import Counter
    print("\nDomain distribution:")
    for d, c in Counter(q["domain"] for q in all_questions).most_common():
        print(f"  {d}: {c}")
    print("\nImage exhibits:", sum(1 for q in all_questions if q["exhibit_image"]))
    print("Text exhibits:", sum(1 for q in all_questions if q["exhibit"]))
    no_correct = [q["external_key"] for q in all_questions
                  if sum(1 for c in q["choices"] if c["correct"]) != 1]
    print("Questions without exactly one correct choice:", len(no_correct), no_correct[:10])
    print(f"\nWrote {len(all_questions)} questions -> {OUT_JSON}")


if __name__ == "__main__":
    main()
