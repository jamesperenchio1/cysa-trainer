# Copy-paste prompts

Two prompts. Use the first repeatedly, one objective per session. Use the second when you
finally have the official CompTIA objectives PDF.

---

## 1. Write one objective's content

Replace `[X]` with the objective number from the top of `/progress`. Nothing else changes.

```
Read CLAUDE.md, docs/CONTENT-STANDARD.md, and the brief for objective [X] in
docs/WORK-ORDERS.md. Then read content/lessons/ir-3.2-response-activities.json and
content/questions/ir-3.2.json — those are the quality bar, match them.

Write, for objective [X] only:
  content/lessons/<slug>.json     one long-form lesson, 25-30 minutes of reading,
                                  at least one artifact block with per-line annotations,
                                  and exam / trap / field callouts
  content/questions/<slug>.json   10 questions, 3-4 marked held_out: true
  content/flashcards/<slug>.json  12 cards

Rules I will check you on:
- Every lesson and every question cites a free public primary source with a section or
  page locator. If you cannot cite a claim, do not write it — tell me what source you
  would need instead. Do not invent a citation or a URL.
- Every distractor needs why_plausible (who would pick this and why that is defensible)
  and why_wrong (the specific discriminator). If you cannot write why_plausible for an
  option, it is a throwaway — replace it.
- Every choice ends with a period. The correct answer must be neither the longest nor
  the shortest option.
- Most questions ask what an analyst should do first or next, not what a term means.
- Do not touch content/blueprint.json, scripts/validate.ts, or any threshold in the gate.
  If a batch fails validation, fix the content, never the gate.

Then run: npm run validate && npm run seed
Fix anything it rejects and re-run until it passes. Show me the gate output.

Do this objective only. Stop when it passes.
```

---

## 2. Replace the provisional blueprint

Use once, with the official CS0-004 objectives PDF attached. Everything downstream depends
on this being right — see `docs/GET-THE-BLUEPRINT.md`.

```
Attached is CompTIA's official CS0-004 exam objectives PDF.

Rebuild content/blueprint.json from it, conforming to the Blueprint schema in
src/lib/schema.ts. Set provenance to "official" and write a source_note recording the
document version and date.

Include every domain with its weight, and every numbered objective with its title and
its bullet content.

Then:
1. Report any objective ID currently used in content/ that does not exist in the official
   list, and any official objective that has no content. Do not silently renumber
   anything — show me the diff and wait.
2. Run npm run validate && npm run seed.

Do not guess at an objective if the PDF is ambiguous. Flag it and ask.
```

---

## Why the prompts are shaped this way

Each constraint blocks a specific way this degrades:

- **One objective per session** — batching produces a strong first lesson and thin ones after.
- **Match the named example files** — "write a good lesson" drifts; "match this file" does not.
- **Never edit the gate** — the fastest way to make a failing batch pass is to lower the
  threshold, and an agent will do it if you leave the door open.
- **Cite or refuse** — the alternative is confident invention, and you cannot currently
  tell the difference. This is the rule that matters most.
- **Don't renumber the blueprint** — silent renumbering would orphan every existing
  question and you would not notice until coverage looked wrong.
