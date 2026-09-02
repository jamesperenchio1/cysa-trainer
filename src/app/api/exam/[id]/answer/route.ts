import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = Number(params.id);
  const body = await req.json();
  const questionId: number = body.question_id;
  const selected: string[] = body.selected_labels || [];
  const timeSeconds: number = body.time_seconds || 0;

  const row = db.prepare("SELECT answers, answer_times FROM exam_sessions WHERE id = ?").get(sessionId) as
    | { answers: string; answer_times: string }
    | undefined;
  if (!row) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const answers = JSON.parse(row.answers || "{}");
  answers[questionId] = selected;

  // Accumulate rather than overwrite: the exam lets you revisit a question via
  // Previous/Next/palette, and QuestionCard's stopwatch restarts from 0 on each visit.
  const answerTimes = JSON.parse(row.answer_times || "{}");
  answerTimes[questionId] = (answerTimes[questionId] || 0) + timeSeconds;

  db.prepare("UPDATE exam_sessions SET answers = ?, answer_times = ? WHERE id = ?").run(
    JSON.stringify(answers),
    JSON.stringify(answerTimes),
    sessionId
  );

  // Real exam conditions: no correctness feedback mid-exam, just acknowledge it was saved.
  return NextResponse.json({ saved: true });
}
