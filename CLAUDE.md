# CLAUDE.md

Rules for any coding agent in this repo (Claude Code, opencode). `AGENTS.md` points here.

## What this is

A single-user CompTIA CySA+ (CS0-004) study platform: long-form lessons, flashcards,
questions, and guided Docker labs. Runs on one Ubuntu host behind a Cloudflare Tunnel.
Not a product. Optimise for correctness and for being safely editable by agents.

## Invariants

1. **No hardcoded content.** Domain names, weights, objective numbers, exam parameters
   come from `content/blueprint.json` via the database. If a CompTIA blueprint change
   would require editing a `.ts` file, the design is wrong.
2. **Content is data, code is code.** Everything in `content/` is JSON validated by
   `src/lib/schema.ts`. Never hand-edit the database; re-seed instead.
3. **Every lesson and question cites a primary source.** Free, public, with a section
   locator. This is the only thing that makes the content checkable by a user who cannot
   yet tell right from wrong.
4. **The gate is law.** `npm run validate` must pass before `npm run seed`. Never lower a
   threshold to make content pass — fix the content.
5. **Choices shuffle at render, always.** Stored order must never be a signal.

## Boundaries

```
content/        JSON content. Edited by adding files, never by hand-patching the DB.
src/lib/        schema.ts (contracts) · db.ts (SQLite) · study.ts (coverage, SRS, planner)
src/app/        Next.js pages and API routes. Read the DB, know nothing about seeding.
src/components/ Client components. Drill, Cards, MarkNotes.
scripts/        seed · validate · backup. Standalone, independently runnable.
labs/           docker-compose files a lab references by path.
docs/           Deployment, content workflow, the authoring standard.
```

Dependency direction is one way: `content → scripts → db → app`. The app never reaches
back into content files.

## Rules

- One concern per commit. Files under 300 lines.
- Adding a lesson or question set is a file drop plus `npm run validate && npm run seed`.
  It should never require a code change.
- Never commit `.env`, `data/*.db`, or copyrighted study material. **This repo is public.**
- Don't add dependencies without saying why. This runs on a home server.
- Difficulty is measured from `reviews`, never declared by an author. Don't add a
  `difficulty` field back.

## Versioning

The root `VERSION` file is a single integer, shown in the app's footer (`src/app/layout.tsx`)
so James can tell at a glance whether the instance he's looking at matches the latest push.

- **Bump it by exactly 1** on every commit that changes app behavior — code, content, or
  config that affects what's running. Doc-only edits (README, docs/, this file) don't need a bump.
- Never reset it, skip a number, or bump by more than 1 in one commit.
- One bump per commit, even if the commit touches several files.

## Commands

```bash
npm run validate   # quality gate, exit 1 on failure
npm run seed       # content -> SQLite
npm run dev        # localhost:3000
npm run backup     # SQLite online backup, keeps 30 days
```
