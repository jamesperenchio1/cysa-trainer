import { NextResponse } from "next/server";
import db from "@/lib/db";
import { DOMAIN_NAMES, DOMAIN_WEIGHTS } from "@/lib/scoring";

// This route has no request-derived dynamic input (no searchParams/cookies/headers),
// so Next.js's App Router will otherwise statically prerender it ONCE at build time
// and cache that snapshot forever -- silently freezing streak/due-count/exam-history
// at whatever they were during `next build`. Force it to run per-request instead.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const domains = db.prepare("SELECT id, code FROM domains").all() as { id: number; code: string }[];

  const domainStats = domains.map((d) => {
    const row = db
      .prepare(
        `SELECT COUNT(*) as total,
                COALESCE(SUM(s.times_seen), 0) as times_seen,
                COALESCE(SUM(s.times_correct), 0) as times_correct,
                SUM(CASE WHEN s.due_at <= datetime('now') THEN 1 ELSE 0 END) as due_now
         FROM questions q JOIN srs_state s ON s.question_id = q.id
         WHERE q.domain_id = ?`
      )
      .get(d.id) as { total: number; times_seen: number; times_correct: number; due_now: number };

    const accuracy = row.times_seen > 0 ? Math.round((row.times_correct / row.times_seen) * 100) : null;
    return {
      domain_code: d.code,
      domain_name: DOMAIN_NAMES[d.code] || d.code,
      exam_weight_pct: DOMAIN_WEIGHTS[d.code] || 0,
      question_count: row.total,
      accuracy,
      due_now: row.due_now,
    };
  });

  const streak = db.prepare("SELECT current_streak, longest_streak, last_practice_date FROM streak WHERE id = 1").get();

  const totalDue = db
    .prepare("SELECT COUNT(*) as c FROM srs_state WHERE due_at <= datetime('now')")
    .get() as { c: number };

  const totalQuestions = db.prepare("SELECT COUNT(*) as c FROM questions").get() as { c: number };

  const examHistory = db
    .prepare(
      `SELECT id, started_at, finished_at, scaled_score, passed
       FROM exam_sessions WHERE finished_at IS NOT NULL
       ORDER BY finished_at DESC LIMIT 10`
    )
    .all();

  return NextResponse.json({
    domains: domainStats,
    streak,
    total_due: totalDue.c,
    total_questions: totalQuestions.c,
    exam_history: examHistory,
  });
}
