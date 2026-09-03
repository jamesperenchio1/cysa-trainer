import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getQuestionsByIds } from "@/lib/queries";
import { DOMAIN_WEIGHTS, EXAM_QUESTION_COUNT, EXAM_DURATION_SECONDS } from "@/lib/scoring";

export const dynamic = "force-dynamic";

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export async function POST() {
  const domainRows = db.prepare("SELECT id, code FROM domains").all() as { id: number; code: string }[];

  let questionIds: number[] = [];
  const totalWeight = Object.values(DOMAIN_WEIGHTS).reduce((a, b) => a + b, 0);

  for (const d of domainRows) {
    const weight = DOMAIN_WEIGHTS[d.code] ?? 0;
    const target = Math.round((weight / totalWeight) * EXAM_QUESTION_COUNT);
    // Mock exam stays MCQ-only: ordering/matching PBQs are a drill-mode-only
    // learning tool for now, not built into the timed exam flow/scoring UI.
    const available = db
      .prepare("SELECT id FROM questions WHERE domain_id = ? AND type = 'mcq'")
      .all(d.id) as { id: number }[];
    const ids = available.map((r) => r.id);

    if (ids.length >= target) {
      questionIds = questionIds.concat(pickRandom(ids, target));
    } else {
      // Not enough unique questions in this domain yet — use all available,
      // then allow repeats to hit the target count (bank is still growing).
      questionIds = questionIds.concat(ids);
      const shortfall = target - ids.length;
      if (ids.length > 0) {
        const filler = Array.from({ length: shortfall }, () => ids[Math.floor(Math.random() * ids.length)]);
        questionIds = questionIds.concat(filler);
      }
    }
  }

  // Trim/pad to exact EXAM_QUESTION_COUNT in case of rounding drift.
  questionIds = pickRandom(questionIds, Math.min(questionIds.length, EXAM_QUESTION_COUNT));
  while (questionIds.length < EXAM_QUESTION_COUNT) {
    const all = db.prepare("SELECT id FROM questions WHERE type = 'mcq'").all() as { id: number }[];
    if (all.length === 0) break;
    questionIds.push(all[Math.floor(Math.random() * all.length)].id);
  }

  // Shuffle final order so domains aren't presented in blocks.
  questionIds = pickRandom(questionIds, questionIds.length);

  const info = db
    .prepare(
      "INSERT INTO exam_sessions (question_ids, duration_seconds) VALUES (?, ?)"
    )
    .run(JSON.stringify(questionIds), EXAM_DURATION_SECONDS);

  const questions = getQuestionsByIds(questionIds);

  return NextResponse.json({
    session_id: info.lastInsertRowid,
    duration_seconds: EXAM_DURATION_SECONDS,
    questions,
  });
}
