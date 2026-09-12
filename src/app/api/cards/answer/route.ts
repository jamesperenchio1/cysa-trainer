import { NextRequest, NextResponse } from "next/server";
import { getCard, gradeCard } from "@/lib/flashcards";
import { updateStreak } from "@/lib/streak";

export const dynamic = "force-dynamic";

interface CardAnswerPayload {
  card_id?: number;
  selected_index?: number;
  correct?: boolean;
}

export async function POST(req: NextRequest) {
  let body: CardAnswerPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const cardId = Number(body.card_id);
  if (!Number.isFinite(cardId)) {
    return NextResponse.json({ error: "card_id required" }, { status: 400 });
  }

  const card = getCard(cardId);
  if (!card) {
    return NextResponse.json({ error: "card not found" }, { status: 404 });
  }

  // Grade in priority order: an explicit correct flag, then a multiple-choice
  // selection compared against the stored answer key, then a self-graded flip
  // (cards without a stored answer key can only be flipped).
  let correct: boolean;
  let graded: boolean;
  if (typeof body.correct === "boolean") {
    correct = body.correct;
    graded = true;
  } else if (typeof body.selected_index === "number" && card.correct_index !== null) {
    correct = body.selected_index === card.correct_index;
    graded = true;
  } else {
    correct = true;
    graded = false;
  }

  const result = gradeCard(cardId, correct);
  if (!result) {
    return NextResponse.json({ error: "card not found" }, { status: 404 });
  }

  updateStreak();

  return NextResponse.json({
    correct,
    graded,
    correct_index: card.correct_index,
    back: card.back,
    next_due_at: result.next_due_at,
    new_interval_days: result.new_interval_days,
  });
}
