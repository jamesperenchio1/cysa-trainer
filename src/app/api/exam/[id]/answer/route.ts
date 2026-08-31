import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = Number(params.id);
  const body = await req.json();
  const questionId: number = body.question_id;
  const selected: string[] = body.selected_labels || [];

  const row = db.prepare("SELECT answers FROM exam_sessions WHERE id = ?").get(sessionId) as
    | { answers: string }
    | undefined;
  if (!row) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const answers = JSON.parse(row.answers || "{}");
  answers[questionId] = selected;
  db.prepare("UPDATE exam_sessions SET answers = ? WHERE id = ?").run(JSON.stringify(answers), sessionId);

  // Real exam conditions: no correctness feedback mid-exam, just acknowledge it was saved.
  return NextResponse.json({ saved: true });
}
