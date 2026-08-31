# CySA+ Trainer — Handoff

Context for whoever (whatever agent) picks this up next: this was built by Claude
(chat) in a sandboxed container with no access to James's actual homelab, so it has
never been deployed or run outside that sandbox. Treat this as a complete, tested
*codebase* handed to you to deploy and continue, not as something already live.

## What this is

A self-hosted PWA for drilling CompTIA CySA+ (CS0-004) practice questions:
- **Drill mode** (`/drill`): SM-2 spaced-repetition queue, Duolingo-style one-question-
  at-a-time with instant feedback, running session accuracy, daily streak.
- **Mock exam mode** (`/exam`): 85 questions sampled at the real domain weights
  (Security Operations 34% / Vulnerability Management 26% / Incident Response 24% /
  Reporting & Communication 16%), 165-minute countdown, no per-question feedback until
  submit (matches real exam conditions), then a scaled score + per-domain breakdown +
  full review.
- Dashboard (`/`) with streak, per-domain mastery bars, recent exam history.
- No auth built in on purpose — see "Deployment target" below.

Stack: Next.js 14 (App Router, TypeScript), better-sqlite3 (single-file DB, chosen
over Postgres specifically because this is single-user and the target hardware is a
low-power N150 box — no need for a second DB container), Tailwind, vanilla service
worker for offline app-shell caching + PWA installability.

## Status as of handoff

Built and smoke-tested via `curl` inside the sandbox (no browser UI testing was done
— the actual React interactions in `/drill` and `/exam` have NOT been clicked through
in a real browser). Confirmed working via API:
- `npm run build` compiles clean, no type errors.
- Seeding (`npm run seed`) loads 76 questions correctly.
- `/api/drill/next` and `/api/drill/answer` — correct grading, SRS scheduling updates
  `due_at` as expected.
- `/api/exam/start` — samples ~85 questions at the right domain proportions (bank is
  smaller than 85 unique per domain right now, so it fills with repeats — see
  "Growing the question bank" below).
- `/api/exam/[id]/answer` and `/api/exam/[id]/finish` — scores correctly, updates SRS
  state and streak, writes to `exam_sessions`.
- `/api/stats` — **was broken, now fixed**: Next.js was statically pre-rendering this
  route at build time (no dynamic API used in the handler), so it served a frozen
  snapshot from build time forever. Fixed with `export const dynamic =
  "force-dynamic"` in `src/app/api/stats/route.ts`. If you see similar "data never
  updates" bugs anywhere else, check for the same static-optimization trap first —
  any route with no `searchParams`/`cookies`/`headers` usage is a candidate.

**Not yet done:**
1. Actual browser QA of `/drill` and `/exam` — click through both flows for real,
   check mobile viewport (this is meant to be installed on a phone), check the
   question-palette grid in `/exam` doesn't overflow on small screens, check the
   service worker actually registers and offline fallback works.
2. Docker build has never been run (no Docker available in the sandbox that built
   this). Dockerfile/docker-compose.yml are written but unverified — build the image
   and confirm `better-sqlite3` compiles correctly for your target platform (should
   be linux/amd64 on the N150, alpine base) and that the container actually starts
   and serves.
3. Deployment to the actual homelab: Cloudflare Tunnel route, and whatever the
   current auth/reverse-proxy layer actually is (see below).
4. Growing the question bank closer to the "big bank" James asked for — 76 is a solid
   *quality* starting point (every distractor was deliberately hand-crafted to be a
   near-miss, not a throwaway option — see design notes below) but is thin for the
   exam-mode question pool once you're doing repeat mock exams regularly.

## Deployment target — VERIFY BEFORE ASSUMING

James's homelab (per prior conversation, possibly stale — confirm live):
- Proxmox host, Ubuntu Server VM, low-power Intel N150 hardware.
- Cloudflare Tunnel for external access (this part was stated with confidence).
- Previously: Authentik as a forward-auth proxy in front of every self-hosted
  service. **James said in this conversation he doesn't think he has Authentik
  anymore.** Don't assume it's there. Check what's actually running in front of his
  other services right now (check the Cloudflare Tunnel config / whatever reverse
  proxy sits behind it) and wire this app into whatever that current setup actually
  is. If there's currently no auth layer on his services at all, flag that to James
  explicitly before exposing this — it's a personal app with no login screen of its
  own, so something upstream needs to gate access if it's reachable from the public
  tunnel.
- Other self-hosted services for reference/pattern-matching: Nextcloud (being
  replaced by ownCloud Infinite Scale), Immich, Grafana, various Docker services. His
  other web project (a crowdsourced Thailand toilet-review PWA) uses this same
  self-hosted-over-Vercel pattern with Next.js — this app follows that precedent.

Suggested deployment flow once you have real access:
```
git clone <this repo>
cd cysa-trainer
docker compose build
docker compose up -d
# app listens on 127.0.0.1:3477 (see docker-compose.yml) -- point your tunnel/
# reverse proxy config at that, however that's actually configured today.
```

## Repo layout

```
src/lib/db.ts          SQLite schema + connection (CYSA_DB_PATH env var overrides path)
src/lib/srs.ts          SM-2 spaced repetition scheduler
src/lib/scoring.ts      Exam scaling (100-900 linear approximation -- NOT CompTIA's
                        real IRT formula, which isn't public; treat as directional)
src/lib/streak.ts       Shared daily-streak update logic
src/lib/queries.ts      Shared question-hydration helpers
src/app/api/...         All backend routes (drill/exam/stats)
src/app/{page,drill,exam}/page.tsx   The three screens, all client components
src/components/         QuestionCard (shared renderer), Timer
data/questions.json     The 76-question seed bank (source of truth, upserted by key)
data/new-questions.json Empty array -- drop additions here, see below
scripts/seed.ts         Loads data/questions.json into SQLite (idempotent upsert)
scripts/import-questions.ts   Same, but against an arbitrary file path
scripts/gen_questions.py      The Python generator used to WRITE data/questions.json
                        originally -- not needed at runtime, kept for provenance/
                        editing convenience if more Python-side generation is wanted
Dockerfile, docker-compose.yml   Multi-stage build; see inline comments for why
                        /app/data (question JSON, baked into image) and /app/db-data
                        (the live SQLite file, volume-mounted) are kept separate --
                        a rebuild with updated questions.json should never get
                        shadowed by a stale volume, while SRS/streak/exam history
                        must survive rebuilds untouched.
```

## Growing the question bank

Two ways:
1. Edit `data/questions.json` directly (or extend `scripts/gen_questions.py` and
   re-run `python3 scripts/gen_questions.py` to regenerate it) — this is the primary
   bank, matched to CS0-004's domain weights.
2. Drop a JSON array of new question objects (same shape, see any entry in
   `data/questions.json` for the schema) into `data/new-questions.json` and run
   `npm run add-questions`. Upserts by `external_key`, so re-running is always safe.

**Design principle that made the difficulty jump work** (James explicitly said the
first PDF-based attempt was too easy): every wrong answer must be a *true statement
about something real* — just not the best fit for the specific scenario — not an
obviously-absurd throwaway option. Distractors work by being near-misses: a
technically-correct-sounding claim about the wrong tool/phase/metric, a common
analyst misconception, or a detail that's true in general but not decisive here. If
you add more questions, hold that bar — it's the entire reason the second attempt
landed and the first didn't.

## Things worth double-checking as you continue

- `EXAM_QUESTION_COUNT` / domain-weighted sampling in `src/lib/scoring.ts` and
  `src/app/api/exam/start/route.ts` allows repeats when a domain's unique pool is
  smaller than its target count — currently true for all four domains at 76 total
  questions. Worth surfacing in the UI ("some questions may repeat") once the bank
  is still this size, or just grow the bank past ~150-200 to make repeats rare.
- The SM-2 quality mapping (`src/lib/srs.ts`) is deliberately simplified to binary
  correct/incorrect (quality 4 or 1) rather than a self-rated 0-5 scale, to keep the
  UI dead simple. This is a reasonable tradeoff but means the algorithm can't
  distinguish "barely got it right" from "instant confident recall" — fine for exam
  cramming, worth knowing if retention behavior ever seems off.
- No tests exist. Given this is a personal single-user tool, that's a defensible call,
  but the scoring/SRS logic in `src/lib/` would be cheap to unit test if bugs show up
  after real usage.

## Immediate next steps, roughly in order

1. `npm install && npm run seed && npm run dev` locally, click through `/drill` and
   `/exam` end to end in an actual browser (desktop and mobile viewport).
2. `docker compose build && docker compose up` — confirm the container builds and
   `better-sqlite3` works inside Alpine on your actual deploy target.
3. Figure out the real current state of James's reverse-proxy/auth setup (don't trust
   the Authentik assumption above) and wire this in behind it.
4. Push this repo to James's GitHub (I had no `gh` auth / credentials in my sandbox
   to do this myself — this was handed off as a local git repo + zip instead).
5. Grow the question bank per the design principle above, as time allows.
