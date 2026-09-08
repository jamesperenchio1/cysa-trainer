# CySA+ study

A study platform for CompTIA CySA+ (CS0-004). Lessons, flashcards, questions, guided labs,
and a coverage map that tells you what you haven't touched.

```bash
npm install
npm run validate && npm run seed
npm run dev                 # localhost:3000
```

For a production run outside Docker, `next build` emits a standalone server —
`npm run build && npm run start:prep && npm start`. Plain `next start` does not work with
`output: standalone`, which is why the start script points at the standalone server directly.

Deployed with `docker compose up -d --build`. See `docs/DEPLOY.md`.

## Start here

1. **`docs/GET-THE-BLUEPRINT.md`** — the objective list shipped here is provisional. Ten
   minutes and free to fix, and everything else depends on it.
2. `docs/ADDING-CONTENT.md` — how content gets written and committed, and what I can and
   can't guarantee about its accuracy.
3. `docs/CONTENT-STANDARD.md` — the authoring rules. Point Claude at this, don't re-explain.
4. `docs/DEPLOY.md` — Cloudflare Tunnel, Access, Guacamole, memory budget, backups.
5. `docs/WORK-ORDERS.md` — per-objective briefs: scope, artifacts, sources, and the trap.
6. `CLAUDE.md` — rules for coding agents.

## Surfaces

- **Today** — asks how long you have, then builds a session for that window. Mistakes first,
  then overdue reviews, then the next lesson by exam weight, then your weakest objective.
  A window over 100 minutes offers a mock exam instead.
- **Learn** — long-form lessons with annotated tool output, exam/trap/field callouts,
  per-objective notes, and source links on everything.
- **Drill** — spaced repetition. Keys 1-6 select, Enter checks, Enter again advances. Every
  wrong answer shows why that specific distractor was wrong.
- **Mistakes** — questions you got wrong and have not since got right, ordered by how often
  you have missed them. The highest-value queue in the app.
- **Cards** — flashcards on the same schedule.
- **Mock exam** — timed, drawn from a held-out pool drill never touches, with a per-domain
  breakdown, question-by-question review, and a jump into what you missed.
- **Labs** — guided Docker exercises with an embedded browser console to your lab host.
- **Progress** — per-objective coverage, distinguishing low accuracy from no content at all.

## What's in it now

Three objectives at the full standard:

- **1.2 Network indicators** — 25-minute lesson with annotated Zeek conn.log and DNS logs,
  10 flashcards, 6 questions, and a 45-minute Docker lab that generates beaconing traffic
  and makes you find it by measuring interval spread.
- **2.3 Prioritising vulnerabilities** — 30-minute lesson on reading CVSS vectors and the
  four things a base score cannot know, 12 flashcards, 10 questions.
- **3.2 Incident response activities** — 30-minute lesson on phase-driven decisions, order of
  volatility and containment strategy, 12 flashcards, 10 questions.

26 questions, 34 cards. Twelve objectives are empty. `/progress` lists them in exam-weight
order — that's the backlog, and `docs/ADDING-CONTENT.md` is the loop.

## What has been verified

Every page renders and returns 200. The drill API serves questions, shuffles choices on
every fetch, and grades them. A wrong answer reschedules to 20 minutes; notes, lesson
completion, streak and per-objective accuracy all persist to SQLite. The lab's jitter
maths and interval statistics were run against both beacon-shaped and human-shaped data.

Mock exams build from the held-out pool with per-domain composition, score correctly, and feed
missed questions into the mistakes queue — verified end to end.

Not verified: the Docker stack has never been brought up, and nothing has been viewed in a
real browser at phone width. Check both before you rely on them.

## Why the quality gate exists

The previous version of this project had 441 AI-generated questions. A solver that never
read the stem scored **83%** on them by picking the only option ending in a period. The
real exam pass mark is about 81%. The bank was grading writing style.

`npm run validate` runs six such solvers and fails the build if any beats 35%. It also
enforces that every distractor has a stated reason someone would pick it, that the correct
answer is never the longest or shortest option, and that questions cite sources.
