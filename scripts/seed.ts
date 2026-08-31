import db from "../src/lib/db";
import fs from "fs";
import path from "path";
import { DOMAIN_NAMES, DOMAIN_WEIGHTS } from "../src/lib/scoring";

type SeedChoice = { label: string; body: string; correct: boolean };
type SeedQuestion = {
  external_key: string;
  domain: string;
  subtopic: string;
  difficulty: number;
  is_multi: boolean;
  select_n: number;
  stem: string;
  exhibit: string | null;
  choices: SeedChoice[];
  explanation: string;
};

function upsertDomain(code: string) {
  const existing = db.prepare("SELECT id FROM domains WHERE code = ?").get(code) as { id: number } | undefined;
  if (existing) return existing.id;
  const info = db
    .prepare("INSERT INTO domains (code, name, exam_weight_pct) VALUES (?, ?, ?)")
    .run(code, DOMAIN_NAMES[code] ?? code, DOMAIN_WEIGHTS[code] ?? 0);
  return info.lastInsertRowid as number;
}

function upsertSubtopic(domainId: number, name: string) {
  const existing = db
    .prepare("SELECT id FROM subtopics WHERE domain_id = ? AND name = ?")
    .get(domainId, name) as { id: number } | undefined;
  if (existing) return existing.id;
  const info = db.prepare("INSERT INTO subtopics (domain_id, name) VALUES (?, ?)").run(domainId, name);
  return info.lastInsertRowid as number;
}

function main() {
  const argPath = process.argv.find((a) => a.startsWith("--file="))?.split("=")[1];
  const file = argPath ? path.resolve(argPath) : path.join(process.cwd(), "data", "questions.json");
  const items: SeedQuestion[] = JSON.parse(fs.readFileSync(file, "utf-8"));

  const insertQuestion = db.prepare(`
    INSERT INTO questions (external_key, domain_id, subtopic_id, difficulty, is_multi, select_n, stem, exhibit, explanation)
    VALUES (@external_key, @domain_id, @subtopic_id, @difficulty, @is_multi, @select_n, @stem, @exhibit, @explanation)
    ON CONFLICT(external_key) DO UPDATE SET
      domain_id=excluded.domain_id, subtopic_id=excluded.subtopic_id, difficulty=excluded.difficulty,
      is_multi=excluded.is_multi, select_n=excluded.select_n, stem=excluded.stem,
      exhibit=excluded.exhibit, explanation=excluded.explanation
  `);
  const clearChoices = db.prepare("DELETE FROM choices WHERE question_id = ?");
  const insertChoice = db.prepare(`
    INSERT INTO choices (question_id, label, body, is_correct, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  const getQuestionId = db.prepare("SELECT id FROM questions WHERE external_key = ?");
  const ensureSrs = db.prepare(`
    INSERT OR IGNORE INTO srs_state (question_id, due_at) VALUES (?, datetime('now'))
  `);

  const tx = db.transaction((items: SeedQuestion[]) => {
    let count = 0;
    for (const item of items) {
      const domainId = upsertDomain(item.domain);
      const subtopicId = upsertSubtopic(domainId, item.subtopic);
      insertQuestion.run({
        external_key: item.external_key,
        domain_id: domainId,
        subtopic_id: subtopicId,
        difficulty: item.difficulty,
        is_multi: item.is_multi ? 1 : 0,
        select_n: item.select_n,
        stem: item.stem,
        exhibit: item.exhibit,
        explanation: item.explanation,
      });
      const row = getQuestionId.get(item.external_key) as { id: number };
      clearChoices.run(row.id);
      item.choices.forEach((c, i) => {
        insertChoice.run(row.id, c.label, c.body, c.correct ? 1 : 0, i);
      });
      ensureSrs.run(row.id);
      count++;
    }
    return count;
  });

  const count = tx(items);
  console.log(`Seeded/updated ${count} questions.`);
}

main();
