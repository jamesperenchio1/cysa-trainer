import fs from "fs";
import path from "path";
import db from "../src/lib/db";
import { downloadStorageText, usingSupabase } from "../src/lib/materials";

interface DerivedCard {
  front: string;
  choices: string[];
  back: string;
  answer_label?: string;
  correct_index?: number | null;
  external_key: string;
  chapter_href: string;
  chapter_title?: string;
  domain_code?: string;
}

const DERIVED_PATH =
  process.env.CYSA_CARDS_PATH ||
  path.join(process.cwd(), "data", "derived", "study-guide", "flashcards.json");

// When Supabase Storage is configured (production), the derived flashcards are
// read from the bucket instead of the local disk. Local dev falls back to the
// file produced by scripts/extract_study_guide.py.
const DERIVED_OBJECT =
  process.env.SUPABASE_CARDS_OBJECT || "derived/study-guide/flashcards.json";

async function loadCards(): Promise<DerivedCard[] | null> {
  if (usingSupabase()) {
    const text = await downloadStorageText(DERIVED_OBJECT);
    if (text) {
      return JSON.parse(text) as DerivedCard[];
    }
    console.log(
      `No derived flashcards in storage at ${DERIVED_OBJECT} -- falling back to local file.`
    );
  }
  if (!fs.existsSync(DERIVED_PATH)) return null;
  return JSON.parse(fs.readFileSync(DERIVED_PATH, "utf8")) as DerivedCard[];
}

function domainIdFor(code: string | undefined): number | null {
  if (!code) return null;
  const row = db
    .prepare("SELECT id FROM domains WHERE code = ?")
    .get(code) as { id: number } | undefined;
  return row?.id ?? null;
}

async function main() {
  const wipe = process.argv.includes("--wipe-cards");

  const cards = await loadCards();
  if (!cards) {
    console.log(
      `No derived flashcards at ${DERIVED_PATH} -- skipping (this is normal on a fresh clone; run scripts/extract_study_guide.py first).`
    );
    return;
  }
  if (!Array.isArray(cards)) {
    throw new Error("flashcards.json is not an array");
  }

  if (wipe) {
    db.exec("DELETE FROM card_review_log; DELETE FROM card_srs_state; DELETE FROM flashcards;");
  }

  const upsertCard = db.prepare(
    `INSERT INTO flashcards
       (external_key, domain_id, chapter_href, front, back, source, tags, choices, correct_index)
     VALUES
       (@external_key, @domain_id, @chapter_href, @front, @back, @source, @tags, @choices, @correct_index)
     ON CONFLICT(external_key) DO UPDATE SET
       domain_id = excluded.domain_id,
       chapter_href = excluded.chapter_href,
       front = excluded.front,
       back = excluded.back,
       source = excluded.source,
       tags = excluded.tags,
       choices = excluded.choices,
       correct_index = excluded.correct_index`
  );

  const ensureSrs = db.prepare(
    "INSERT OR IGNORE INTO card_srs_state (card_id, due_at) VALUES (?, datetime('now'))"
  );

  let count = 0;
  const tx = db.transaction((items: DerivedCard[]) => {
    for (const c of items) {
      if (!c.external_key || !c.front) continue;
      const source = c.chapter_title
        ? `Review Questions: ${c.chapter_title}`
        : "Study Guide review questions";
      const tags = JSON.stringify([
        ...(c.chapter_title ? [`chapter:${c.chapter_title}`] : []),
        ...(c.domain_code ? [`domain:${c.domain_code}`] : []),
      ]);
      upsertCard.run({
        external_key: c.external_key,
        domain_id: domainIdFor(c.domain_code),
        chapter_href: c.chapter_href ?? null,
        front: c.front,
        back: c.back ?? "",
        source,
        tags,
        choices: JSON.stringify(c.choices ?? []),
        correct_index:
          typeof c.correct_index === "number" ? c.correct_index : null,
      });
      const row = db
        .prepare("SELECT id FROM flashcards WHERE external_key = ?")
        .get(c.external_key) as { id: number };
      ensureSrs.run(row.id);
      count++;
    }
  });

  tx(cards);

  const total = (
    db.prepare("SELECT COUNT(*) AS n FROM flashcards").get() as { n: number }
  ).n;
  const origin = usingSupabase() ? `storage:${DERIVED_OBJECT}` : DERIVED_PATH;
  console.log(`Seeded ${count} cards from ${origin} (${total} total in bank).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
