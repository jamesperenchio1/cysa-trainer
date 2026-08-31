import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { schedule } from "@/lib/srs";
import { getCorrectLabels, getExplanation, isAnswerCorrect } from "@/lib/queries";
import { updateStreak } from "@/lib/streak";
import { AnswerResultDTO } from "@/lib/types";


export async function POST(req: NextRequest) {
  const body = await req.json();
  const questionId: number = body.question_id;
  const selected: string[] = body.selected_labels || [];

  const correct = isAnswerCorrect(questionId, selected);
  const correctLabels = getCorrectLabels(questionId);
  const explanation = getExplanation(questionId);

  const state = db
    .prepare("SELECT repetitions, ease_factor, interval_days FROM srs_state WHERE question_id = ?")
    .get(questionId) as { repetitions: number; ease_factor: number; interval_days: number } | undefined;

  if (state) {
    const result = schedule(state, correct);
    db.prepare(
      `UPDATE srs_state SET repetitions=?, ease_factor=?, interval_days=?, due_at=?,
       last_result=?, last_seen_at=datetime('now'),
       times_seen = times_seen + 1, times_correct = times_correct + ?
       WHERE question_id = ?`
    ).run(
      result.repetitions,
      result.ease_factor,
      result.interval_days,
      result.due_at,
      correct ? 1 : 0,
      correct ? 1 : 0,
      questionId
    );

    db.prepare(
      "INSERT INTO review_log (question_id, mode, correct) VALUES (?, 'drill', ?)"
    ).run(questionId, correct ? 1 : 0);

    updateStreak();

    const payload: AnswerResultDTO = {
      correct,
      correct_labels: correctLabels,
      explanation,
      next_due_at: result.due_at,
      new_interval_days: result.interval_days,
    };
    return NextResponse.json(payload);
  }

  const payload: AnswerResultDTO = { correct, correct_labels: correctLabels, explanation };
  return NextResponse.json(payload);
}
