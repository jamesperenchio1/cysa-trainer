# Content standard

The authoring rules for lessons, flashcards, questions and labs in this repo. Point
Claude at this file when asking for new content rather than re-explaining it.

The v1 bank (441 questions in `data/questions.json`) failed for a measurable reason:
a solver that never reads the stem scores **83%** on it. Pick the only option that
ends in a period; if there isn't exactly one, pick the least absolutist option.
The real CS0-004 cut is 750/900, roughly 81%. The bank was grading writing style.

Underneath the style leak was a design problem. Of 421 multiple-choice items:

| Property | v1 bank | v2 target |
|---|---|---|
| Asks what to do first/next | 3 (1%) | ≥ 40% |
| Carries an artifact (log, scan, vector, code) | 37 (8%) | ≥ 40% |
| Contains an operational constraint | 53 (12%) | ≥ 50% |
| Multi-select | 10 (2%) | ≥ 10% |

Nearly every v1 item asks you to describe or explain a concept. That shape has a
difficulty ceiling: know the term, get the point. CS0-004 is an action-sequencing
exam. This spec exists to make the generator produce the other shape.

## The four difficulty mechanisms

Every question must use at least two of these. If it uses none, it is a flashcard.

1. **Competing defensible actions.** Two or more options are things a competent
   analyst would actually propose. Only one is correct *given the phase, scope, or
   constraint stated*. Preserving memory and isolating the host are both right; the
   question is which comes first and why.
2. **A constraint that invalidates the textbook answer.** Legal preservation notice,
   payroll window, EOL device with no vendor, single approver policy, unreachable
   application owners. The obvious answer is available and wrong because of a
   sentence in the stem. This is the highest-value mechanism and the cheapest to add.
3. **An artifact with plausible noise.** Four to six lines of real tool output where
   several look mildly suspicious and one is decisive. The candidate must read the
   fields, not the vibe.
4. **A correct conclusion reached for the wrong reason.** Include an option that
   lands on the right answer with reasoning that does not survive scrutiny (see
   `VM-V2-001` option C). This is a real exam device and it punishes pattern-matching
   harder than anything else.

## Required schema

Runtime DB columns are unchanged. `why_plausible` and `why_wrong` are authoring
fields; `scripts/seed.ts` folds `why_wrong` into the rendered explanation.

```jsonc
{
  "external_key": "SO-V2-001",        // unique, stable — upsert key
  "domain": "SO",                     // SO | VM | IR | RC
  "subtopic": "Network Traffic Analysis",
  "difficulty": 5,
  "is_multi": false,
  "select_n": 1,
  "type": "mcq",                      // mcq | ordering | matching | hotspot
  "stem": "...",
  "exhibit": "raw tool output, monospace, or null",
  "choices": [
    {
      "label": "A",
      "body": "Must end in a period. Same for every option.",
      "correct": true,
      "why_wrong": ""
    },
    {
      "label": "B",
      "body": "...",
      "correct": false,
      "why_plausible": "REQUIRED. Who would pick this, and what makes their reasoning defensible?",
      "why_wrong": "REQUIRED. The specific discriminator that rules it out here."
    }
  ],
  "explanation": "Why the correct answer wins on the facts in the stem."
}
```

**`why_plausible` is the load-bearing field.** If you cannot write a sentence
explaining why a competent analyst would argue for an option in a bridge call, the
option is a throwaway and the question is too easy. You cannot write a plausibility
rationale for "ignore the advisory entirely" — which is exactly the point. This
requirement kills the v1 distractor problem automatically, and `quality_check.py`
enforces it.

## Hard rules

- Every choice ends with a period. Uniformly. No exceptions.
- No absolutist language in distractors: *any, all, never, always, entirely,
  completely, inherently, purely, cannot, guarantees, irrelevant, pointless,
  regardless, simply, 100%*. A distractor that overreaches is a giveaway.
- The correct answer must not be the longest or the shortest option. Aim mid-pack.
- Distractors are actions or interpretations a working analyst has actually
  proposed. If the stem's own facts don't support an option, that option is a
  trap about staying inside the evidence — say so in `why_wrong` (see `RC-V2-003` F).
- Never state the concept being tested in the explanation's first clause. No
  "This tests…" — 189 v1 explanations open that way, which means the stem was
  written backwards from the concept.
- If the stem says "shown below", `exhibit` must be non-null. Four v1 questions
  fail this: `RC-063`, `VM-112`, `RC-066`, `RC-067`.

## Artifacts to draw from

Rotate these. Do not invent output formats — use the real ones.

- Zeek `conn.log` / `dns.log` / `http.log` field rows
- Sysmon Event IDs 1, 3, 7, 8, 10, 11, 22 with real field names
- Windows Security 4624 (with logon type), 4625, 4672, 4688, 4768, 4769 (with
  ticket encryption type), 4776
- `nmap -sV` output blocks
- Scanner findings tables with full CVSS v3.1 vector strings, EPSS, KEV status
- `tcpdump` / packet summaries, email headers with SPF/DKIM/DMARC results
- PowerShell and bash one-liners, encoded command blobs
- Firewall and proxy log rows, EDR process trees, `netstat` and `tasklist` output

## Harder than the real exam

Deliberate difficulty amplifiers, to be applied as a fraction of the bank:

- **Drop the cue word on ~30% of items.** CompTIA bolds BEST/FIRST. Removing it
  forces the candidate to infer what is being asked.
- **Six options, select two** on multi-select items. Combinatorially punishing and
  entirely legitimate practice.
- **Chained items.** Two or three questions sharing one exhibit, where the later
  question assumes the earlier reading was correct (`SO-V2-003` and `SO-V2-004`).
  Sharing an exhibit works today; true dependent scoring would need app work.
- **"None of these is appropriate"** as a live option on a small fraction, correct
  occasionally.
- **Tighter clock.** 85 questions in 130 minutes instead of 165.

## Generator prompt

> You are writing practice questions for CompTIA CySA+ (CS0-004) that must be
> harder than the real exam. Produce N questions for domain {SO|VM|IR|RC},
> subtopic {X}, as a JSON array matching `docs/QUESTION_SPEC.md`.
>
> Every question must use at least two of these mechanisms: competing defensible
> actions; a stated operational constraint that invalidates the textbook answer;
> a realistic artifact containing plausible noise; a distractor that reaches the
> correct conclusion by unsound reasoning.
>
> Requirements: at least 40% carry a non-null `exhibit` with real tool output.
> At least 40% ask what the analyst should do first or next, not what a term
> means. Every distractor needs a `why_plausible` naming who would choose it and
> why that is defensible, plus a `why_wrong` naming the specific discriminator.
> Every choice ends with a period. No absolutist language in distractors. The
> correct answer must be neither the longest nor the shortest option.
>
> Do not write any question whose answer is recoverable from the option wording
> alone.

## Adversarial review prompt

Run every generated batch through this as a second pass, with a different context
than the one that wrote it:

> You are trying to break these practice questions. For each one, answer:
> 1. Can it be answered correctly without reading the stem or the exhibit? How?
> 2. Is more than one option genuinely defensible? If so, does the stem contain
>    the fact that discriminates between them, or is the distinction unstated?
> 3. Is the correct answer identifiable by tone, length, hedging, or punctuation?
> 4. Is any distractor obviously wrong on inspection — could a candidate who knows
>    nothing about the topic still eliminate it?
> 5. Is the stated correct answer actually correct, and is the explanation's
>    reasoning sound?
>
> Reject any question failing 1, 3, or 4. Flag any failing 2 or 5 for rewrite with
> the specific fix.

## Tooling

```bash
npm run validate    # exit 1 on failure
npm run seed        # load content into SQLite
```

`scripts/validate.ts` runs six content-blind solvers and fails if any beats 35%. It also
enforces the composition targets above, the structural rules in this document, and checks
that every objective referenced actually exists in the blueprint.

Run it before every seed. The point is that "does this feel too easy" becomes a build
failure instead of a feeling.

## Lessons, cards and labs

Questions are covered above. The other three content types:

**Lessons** are long-form and built from three block types: `prose`, `artifact`, and
`callout`. The artifact block is the one that teaches — real tool output plus line-by-line
annotations explaining what each field tells you. Aim for at least one artifact block per
lesson and 20-30 minutes of reading. Callouts come in three tones: `exam` (how this gets
tested), `trap` (the mistake that costs marks), `field` (what's true beyond the exam).

**Flashcards** are for recall of things worth recalling: discriminators, thresholds,
sequences. Not definitions you'd never be asked to recite. Ten per objective is plenty.

**Labs** run in Docker on a 16 GB host with half already used, so declare `ram_mb`
honestly and keep it under about 1 GB. Every step needs an `expect` — a lab that doesn't
tell you what success looks like teaches nothing.
