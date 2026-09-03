import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { schedule } from "@/lib/srs";
import { isAnswerCorrect, getCorrectLabels, getExplanation } from "@/lib/queries";
import { scaleScore, PASSING_SCORE, DOMAIN_NAMES } from "@/lib/scoring";
import { updateStreak } from "@/lib/streak";

export const dynamic = "force-dynamic";

interface QRow {
  id: number;
  domain_code: string;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = Number(params.id);
  const row = db.prepare("SELECT question_ids, answers, answer_times FROM exam_sessions WHERE id = ?").get(sessionId) as
    | { question_ids: string; answers: string; answer_times: string }
    | undefined;
  if (!row) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const questionIds: number[] = JSON.parse(row.question_ids);
  const answers: Record<string, string[]> = JSON.parse(row.answers || "{}");
  const answerTimes: Record<string, number> = JSON.parse(row.answer_times || "{}");

  const qRows = db
    .prepare(
      `SELECT q.id, d.code as domain_code FROM questions q JOIN domains d ON d.id = q.domain_id
       WHERE q.id IN (${questionIds.map(() => "?").join(",")})`
    )
    .all(...questionIds) as QRow[];
  const domainByQ = new Map(qRows.map((r) => [r.id, r.domain_code]));

  let correctCount = 0;
  const perDomain: Record<string, { correct: number; total: number }> = {};
  const review: {
    question_id: number;
    correct: boolean;
    correct_labels: string[];
    selected_labels: string[];
    explanation: string;
    domain_code: string;
  }[] = [];

  for (const qid of questionIds) {
    const domain = domainByQ.get(qid) || "?";
    perDomain[domain] = perDomain[domain] || { correct: 0, total: 0 };
    perDomain[domain].total += 1;

    const selected = answers[String(qid)] || [];
    const correct = selected.length > 0 && isAnswerCorrect(qid, selected);
    if (correct) {
      correctCount += 1;
      perDomain[domain].correct += 1;
    }

    // Feed the result into the SRS scheduler too — a missed exam question should
    // come back around sooner in drill mode, same as a missed drill question.
    const state = db
      .prepare("SELECT repetitions, ease_factor, interval_days FROM srs_state WHERE question_id = ?")
      .get(qid) as { repetitions: number; ease_factor: number; interval_days: number } | undefined;
    if (state) {
      const result = schedule(state, correct);
      db.prepare(
        `UPDATE srs_state SET repetitions=?, ease_factor=?, interval_days=?, due_at=?,
         last_result=?, last_seen_at=datetime('now'),
         times_seen = times_seen + 1, times_correct = times_correct + ?
         WHERE question_id = ?`
      ).run(result.repetitions, result.ease_factor, result.interval_days, result.due_at, correct ? 1 : 0, correct ? 1 : 0, qid);
    }
    db.prepare(
      "INSERT INTO review_log (question_id, mode, correct, exam_session_id, time_seconds) VALUES (?, 'exam', ?, ?, ?)"
    ).run(qid, correct ? 1 : 0, sessionId, answerTimes[String(qid)] ?? null);

    review.push({
      question_id: qid,
      correct,
      correct_labels: getCorrectLabels(qid),
      selected_labels: selected,
      explanation: getExplanation(qid),
      domain_code: domain,
    });
  }

  const scaled = scaleScore(correctCount, questionIds.length);
  const passed = scaled >= PASSING_SCORE;

  db.prepare(
    "UPDATE exam_sessions SET finished_at = datetime('now'), scaled_score = ?, passed = ? WHERE id = ?"
  ).run(scaled, passed ? 1 : 0, sessionId);

  updateStreak();

  const domainBreakdown = Object.entries(perDomain).map(([code, v]) => ({
    domain_code: code,
    domain_name: DOMAIN_NAMES[code] || code,
    correct: v.correct,
    total: v.total,
    accuracy: v.total ? Math.round((v.correct / v.total) * 100) : 0,
  }));

  return NextResponse.json({
    correct: correctCount,
    total: questionIds.length,
    scaled_score: scaled,
    passing_score: PASSING_SCORE,
    passed,
    domain_breakdown: domainBreakdown,
    review,
  });
}
