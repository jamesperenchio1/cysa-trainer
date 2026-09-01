import db from "./db";
import { QuestionDTO, QuestionType } from "./types";

interface QuestionRow {
  id: number;
  stem: string;
  exhibit: string | null;
  difficulty: number;
  is_multi: number;
  select_n: number;
  type: QuestionType;
  subtopic: string | null;
  domain_code: string;
  domain_name: string;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function hydrateQuestions(rows: QuestionRow[]): QuestionDTO[] {
  const choiceStmt = db.prepare(
    "SELECT id, label, body, match_group FROM choices WHERE question_id = ? ORDER BY sort_order ASC"
  );
  return rows.map((r) => ({
    id: r.id,
    domain_code: r.domain_code,
    domain_name: r.domain_name,
    subtopic: r.subtopic ?? "",
    difficulty: r.difficulty,
    is_multi: !!r.is_multi,
    select_n: r.select_n,
    type: r.type || "mcq",
    stem: r.stem,
    exhibit: r.exhibit,
    // Shuffled per fetch: the authored choice order (correct answer was almost
    // always written 2nd) is otherwise a trivially learnable "always pick B" exploit.
    // For "ordering" questions this is what makes the puzzle work at all -- the
    // correct sequence can never just be read off the stored sort_order.
    choices: shuffle(
      choiceStmt.all(r.id) as { id: number; label: string; body: string; match_group: string | null }[]
    ).map((c) => ({
      id: c.id,
      label: c.label,
      body: c.body,
      match_group: (c.match_group as "left" | "right" | null) ?? undefined,
    })),
  }));
}

export function getQuestionsByIds(ids: number[]): QuestionDTO[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT q.id, q.stem, q.exhibit, q.difficulty, q.is_multi, q.select_n, q.type,
              s.name as subtopic, d.code as domain_code, d.name as domain_name
       FROM questions q
       JOIN domains d ON d.id = q.domain_id
       LEFT JOIN subtopics s ON s.id = q.subtopic_id
       WHERE q.id IN (${placeholders})`
    )
    .all(...ids) as QuestionRow[];
  // preserve requested order
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as QuestionRow[];
  return hydrateQuestions(ordered);
}

export function getQuestionType(questionId: number): QuestionType {
  const row = db.prepare("SELECT type FROM questions WHERE id = ?").get(questionId) as
    | { type: QuestionType }
    | undefined;
  return row?.type ?? "mcq";
}

export function getCorrectLabels(questionId: number): string[] {
  const rows = db
    .prepare("SELECT label FROM choices WHERE question_id = ? AND is_correct = 1")
    .all(questionId) as { label: string }[];
  return rows.map((r) => r.label);
}

export function getExplanation(questionId: number): string {
  const row = db.prepare("SELECT explanation FROM questions WHERE id = ?").get(questionId) as
    | { explanation: string }
    | undefined;
  return row?.explanation ?? "";
}

export function isAnswerCorrect(questionId: number, selected: string[]): boolean {
  const correct = getCorrectLabels(questionId).sort();
  const sel = [...selected].sort();
  return correct.length === sel.length && correct.every((c, i) => c === sel[i]);
}

// --- Ordering questions -----------------------------------------------------

export function getCorrectOrder(questionId: number): { id: number; label: string; body: string }[] {
  return db
    .prepare(
      "SELECT id, label, body FROM choices WHERE question_id = ? ORDER BY correct_order ASC"
    )
    .all(questionId) as { id: number; label: string; body: string }[];
}

export function isOrderingCorrect(questionId: number, orderedIds: number[]): boolean {
  const correct = getCorrectOrder(questionId).map((c) => c.id);
  return correct.length === orderedIds.length && correct.every((id, i) => id === orderedIds[i]);
}

// --- Matching questions ------------------------------------------------------

export function getCorrectPairs(
  questionId: number
): { left: { id: number; label: string; body: string }; right: { id: number; label: string; body: string } }[] {
  const rows = db
    .prepare(
      "SELECT id, label, body, match_group, pair_key FROM choices WHERE question_id = ?"
    )
    .all(questionId) as {
    id: number;
    label: string;
    body: string;
    match_group: string;
    pair_key: string;
  }[];
  const lefts = rows.filter((r) => r.match_group === "left");
  const rights = rows.filter((r) => r.match_group === "right");
  return lefts.map((l) => {
    const r = rights.find((x) => x.pair_key === l.pair_key)!;
    return {
      left: { id: l.id, label: l.label, body: l.body },
      right: { id: r.id, label: r.label, body: r.body },
    };
  });
}

export function isMatchingCorrect(questionId: number, pairs: Record<number, number>): boolean {
  const correctPairs = getCorrectPairs(questionId);
  if (Object.keys(pairs).length !== correctPairs.length) return false;
  return correctPairs.every((cp) => pairs[cp.left.id] === cp.right.id);
}
