import { NextResponse } from "next/server";
import db from "@/lib/db";
import { DOMAIN_NAMES } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // Per-subtopic accuracy, from all-time review history (drill + exam combined).
  const subtopicRows = db
    .prepare(
      `SELECT d.code as domain_code, s.name as subtopic,
              COUNT(*) as attempts,
              SUM(rl.correct) as correct
       FROM review_log rl
       JOIN questions q ON q.id = rl.question_id
       JOIN domains d ON d.id = q.domain_id
       LEFT JOIN subtopics s ON s.id = q.subtopic_id
       GROUP BY d.code, s.name
       ORDER BY d.code, s.name`
    )
    .all() as { domain_code: string; subtopic: string | null; attempts: number; correct: number }[];

  const subtopics = subtopicRows.map((r) => ({
    domain_code: r.domain_code,
    domain_name: DOMAIN_NAMES[r.domain_code] || r.domain_code,
    subtopic: r.subtopic || "(uncategorized)",
    attempts: r.attempts,
    correct: r.correct,
    accuracy: r.attempts > 0 ? Math.round((r.correct / r.attempts) * 100) : null,
  }));

  // Accuracy by difficulty tier (1-5) -- shows whether harder-rated questions are
  // actually harder in practice, and where the SRS is spending the most repetitions.
  const difficultyRows = db
    .prepare(
      `SELECT q.difficulty as difficulty, COUNT(*) as attempts, SUM(rl.correct) as correct
       FROM review_log rl JOIN questions q ON q.id = rl.question_id
       GROUP BY q.difficulty ORDER BY q.difficulty ASC`
    )
    .all() as { difficulty: number; attempts: number; correct: number }[];

  const difficulty = difficultyRows.map((r) => ({
    difficulty: r.difficulty,
    attempts: r.attempts,
    correct: r.correct,
    accuracy: r.attempts > 0 ? Math.round((r.correct / r.attempts) * 100) : null,
  }));

  // Daily activity for the last 30 days -- attempts + accuracy per day, drill + exam combined.
  const dailyRows = db
    .prepare(
      `SELECT date(answered_at) as day, COUNT(*) as attempts, SUM(correct) as correct
       FROM review_log
       WHERE answered_at >= datetime('now', '-30 days')
       GROUP BY date(answered_at)
       ORDER BY day ASC`
    )
    .all() as { day: string; attempts: number; correct: number }[];

  const daily = dailyRows.map((r) => ({
    day: r.day,
    attempts: r.attempts,
    correct: r.correct,
    accuracy: r.attempts > 0 ? Math.round((r.correct / r.attempts) * 100) : null,
  }));

  // Overall summary numbers.
  const totalQuestions = (db.prepare("SELECT COUNT(*) as c FROM questions").get() as { c: number }).c;
  const attemptedDistinct = (
    db.prepare("SELECT COUNT(DISTINCT question_id) as c FROM review_log").get() as { c: number }
  ).c;
  const totalAttempts = (db.prepare("SELECT COUNT(*) as c FROM review_log").get() as { c: number }).c;
  const totalCorrect = (
    db.prepare("SELECT COALESCE(SUM(correct), 0) as c FROM review_log").get() as { c: number }
  ).c;
  const examsTaken = (
    db.prepare("SELECT COUNT(*) as c FROM exam_sessions WHERE finished_at IS NOT NULL").get() as {
      c: number;
    }
  ).c;
  const avgScaledScoreRow = db
    .prepare("SELECT AVG(scaled_score) as a FROM exam_sessions WHERE finished_at IS NOT NULL")
    .get() as { a: number | null };
  const bestScaledScoreRow = db
    .prepare("SELECT MAX(scaled_score) as m FROM exam_sessions WHERE finished_at IS NOT NULL")
    .get() as { m: number | null };

  const examScoreHistory = db
    .prepare(
      `SELECT id, finished_at, scaled_score, passed FROM exam_sessions
       WHERE finished_at IS NOT NULL ORDER BY finished_at ASC`
    )
    .all();

  return NextResponse.json({
    overall: {
      total_questions: totalQuestions,
      questions_attempted: attemptedDistinct,
      total_attempts: totalAttempts,
      total_correct: totalCorrect,
      overall_accuracy: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null,
      exams_taken: examsTaken,
      avg_scaled_score: avgScaledScoreRow.a ? Math.round(avgScaledScoreRow.a) : null,
      best_scaled_score: bestScaledScoreRow.m ?? null,
    },
    subtopics,
    difficulty,
    daily,
    exam_score_history: examScoreHistory,
  });
}
