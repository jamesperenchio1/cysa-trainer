import db from "./db";
import { QuestionDTO } from "./types";

interface QuestionRow {
  id: number;
  stem: string;
  exhibit: string | null;
  difficulty: number;
  is_multi: number;
  select_n: number;
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
    "SELECT id, label, body FROM choices WHERE question_id = ? ORDER BY sort_order ASC"
  );
  return rows.map((r) => ({
    id: r.id,
    domain_code: r.domain_code,
    domain_name: r.domain_name,
    subtopic: r.subtopic ?? "",
    difficulty: r.difficulty,
    is_multi: !!r.is_multi,
    select_n: r.select_n,
    stem: r.stem,
    exhibit: r.exhibit,
    // Shuffled per fetch: the authored choice order (correct answer was almost
    // always written 2nd) is otherwise a trivially learnable "always pick B" exploit.
    choices: shuffle(choiceStmt.all(r.id) as { id: number; label: string; body: string }[]),
  }));
}

export function getQuestionsByIds(ids: number[]): QuestionDTO[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT q.id, q.stem, q.exhibit, q.difficulty, q.is_multi, q.select_n,
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
