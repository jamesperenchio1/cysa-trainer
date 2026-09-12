import db from "./db";
import { schedule } from "./srs";
import { CHAPTERS, DOMAIN_NAMES, normalizeChapterKey, type DomainCode } from "./books";

export interface FlashcardRow {
  id: number;
  external_key: string | null;
  domain_id: number | null;
  subtopic_id: number | null;
  chapter_href: string | null;
  front: string;
  back: string;
  source: string | null;
  tags: string | null;
  choices: string | null;
  correct_index: number | null;
  created_at: string;
}

export interface CardSrsRow {
  card_id: number;
  repetitions: number;
  ease_factor: number;
  interval_days: number;
  due_at: string;
  last_result: number | null;
  last_seen_at: string | null;
  times_seen: number;
  times_correct: number;
}

export interface CardDTO {
  id: number;
  external_key: string | null;
  front: string;
  choices: string[];
  correct_index: number | null;
  back: string;
  chapter_href: string | null;
  chapter_title: string | null;
  domain_code: string | null;
  domain_name: string | null;
  source: string | null;
  due_at: string | null;
  times_seen: number;
  times_correct: number;
}

export interface CardStats {
  total: number;
  due: number;
  seen: number;
  accuracy: number | null;
}

function chapterMetaFor(href: string | null) {
  if (!href) return null;
  const key = normalizeChapterKey(href);
  return CHAPTERS.find((c) => c.file === key) ?? null;
}

function hydrate(row: FlashcardRow, srs?: CardSrsRow): CardDTO {
  const meta = chapterMetaFor(row.chapter_href);
  let choices: string[] = [];
  if (row.choices) {
    try {
      const parsed = JSON.parse(row.choices);
      if (Array.isArray(parsed)) choices = parsed.map((c) => String(c));
    } catch {
      choices = [];
    }
  }
  const domainCode = (meta?.domainCode ?? null) as DomainCode | null;
  return {
    id: row.id,
    external_key: row.external_key,
    front: row.front,
    choices,
    correct_index: row.correct_index,
    back: row.back,
    chapter_href: row.chapter_href,
    chapter_title: meta?.title ?? null,
    domain_code: domainCode,
    domain_name: domainCode ? DOMAIN_NAMES[domainCode] : null,
    source: row.source,
    due_at: srs?.due_at ?? null,
    times_seen: srs?.times_seen ?? 0,
    times_correct: srs?.times_correct ?? 0,
  };
}

export function getCard(id: number): CardDTO | null {
  const row = db.prepare("SELECT * FROM flashcards WHERE id = ?").get(id) as
    | FlashcardRow
    | undefined;
  if (!row) return null;
  const srs = db
    .prepare("SELECT * FROM card_srs_state WHERE card_id = ?")
    .get(id) as CardSrsRow | undefined;
  return hydrate(row, srs);
}

export function listDueCards(input: {
  domain?: DomainCode | null;
  limit?: number;
}): CardDTO[] {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const domain = input.domain ?? null;
  const picked = new Set<number>();

  const dueRows = db
    .prepare(
      `SELECT f.*, s.due_at AS s_due_at, s.times_seen AS s_times_seen, s.times_correct AS s_times_correct,
              s.repetitions AS s_repetitions, s.ease_factor AS s_ease_factor, s.interval_days AS s_interval_days,
              s.last_result AS s_last_result, s.last_seen_at AS s_last_seen_at
       FROM flashcards f
       JOIN card_srs_state s ON s.card_id = f.id
       ${domain ? "JOIN domains d ON d.id = f.domain_id AND d.code = ?" : ""}
       WHERE s.due_at <= datetime('now')
       ORDER BY s.due_at ASC
       LIMIT ?`
    )
    .all(...(domain ? [domain, limit] : [limit])) as (FlashcardRow & {
    s_due_at: string;
    s_times_seen: number;
    s_times_correct: number;
    s_repetitions: number;
    s_ease_factor: number;
    s_interval_days: number;
    s_last_result: number | null;
    s_last_seen_at: string | null;
  })[];

  const out: CardDTO[] = [];
  for (const r of dueRows) {
    picked.add(r.id);
    out.push(
      hydrate(r, {
        card_id: r.id,
        due_at: r.s_due_at,
        times_seen: r.s_times_seen,
        times_correct: r.s_times_correct,
        repetitions: r.s_repetitions,
        ease_factor: r.s_ease_factor,
        interval_days: r.s_interval_days,
        last_result: r.s_last_result,
        last_seen_at: r.s_last_seen_at,
      })
    );
  }

  if (out.length < limit) {
    const exclude = [...picked];
    const placeholders = exclude.map(() => "?").join(",");
    const topUp = db
      .prepare(
        `SELECT f.*, s.due_at AS s_due_at, s.times_seen AS s_times_seen, s.times_correct AS s_times_correct,
                s.repetitions AS s_repetitions, s.ease_factor AS s_ease_factor, s.interval_days AS s_interval_days,
                s.last_result AS s_last_result, s.last_seen_at AS s_last_seen_at
         FROM flashcards f
         JOIN card_srs_state s ON s.card_id = f.id
         ${domain ? "JOIN domains d ON d.id = f.domain_id AND d.code = ?" : ""}
         ${exclude.length ? `WHERE f.id NOT IN (${placeholders})` : ""}
         ORDER BY s.times_seen ASC, (CAST(s.times_correct AS REAL) / MAX(s.times_seen, 1)) ASC
         LIMIT ?`
      )
      .all(
        ...(domain ? [domain] : []),
        ...exclude,
        limit - out.length
      ) as (FlashcardRow & {
      s_due_at: string;
      s_times_seen: number;
      s_times_correct: number;
      s_repetitions: number;
      s_ease_factor: number;
      s_interval_days: number;
      s_last_result: number | null;
      s_last_seen_at: string | null;
    })[];
    for (const r of topUp) {
      out.push(
        hydrate(r, {
          card_id: r.id,
          due_at: r.s_due_at,
          times_seen: r.s_times_seen,
          times_correct: r.s_times_correct,
          repetitions: r.s_repetitions,
          ease_factor: r.s_ease_factor,
          interval_days: r.s_interval_days,
          last_result: r.s_last_result,
          last_seen_at: r.s_last_seen_at,
        })
      );
    }
  }

  // Fisher-Yates shuffle so review order is not deterministic.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function gradeCard(
  cardId: number,
  correct: boolean
): { card: CardDTO; next_due_at: string; new_interval_days: number } | null {
  const card = getCard(cardId);
  if (!card) return null;

  const state =
    (db
      .prepare("SELECT * FROM card_srs_state WHERE card_id = ?")
      .get(cardId) as CardSrsRow | undefined) ??
    ({
      card_id: cardId,
      repetitions: 0,
      ease_factor: 2.5,
      interval_days: 0,
      due_at: new Date().toISOString(),
      last_result: null,
      last_seen_at: null,
      times_seen: 0,
      times_correct: 0,
    } as CardSrsRow);

  const next = schedule(
    {
      repetitions: state.repetitions,
      ease_factor: state.ease_factor,
      interval_days: state.interval_days,
    },
    correct
  );

  db.prepare(
    `INSERT INTO card_srs_state
       (card_id, repetitions, ease_factor, interval_days, due_at, last_result, last_seen_at, times_seen, times_correct)
     VALUES (@card_id, @repetitions, @ease_factor, @interval_days, @due_at, @last_result, datetime('now'), 1, @times_correct)
     ON CONFLICT(card_id) DO UPDATE SET
       repetitions = @repetitions,
       ease_factor = @ease_factor,
       interval_days = @interval_days,
       due_at = @due_at,
       last_result = @last_result,
       last_seen_at = datetime('now'),
       times_seen = card_srs_state.times_seen + 1,
       times_correct = card_srs_state.times_correct + @times_correct`
  ).run({
    card_id: cardId,
    repetitions: next.repetitions,
    ease_factor: next.ease_factor,
    interval_days: next.interval_days,
    due_at: next.due_at,
    last_result: correct ? 1 : 0,
    times_correct: correct ? 1 : 0,
  });

  db.prepare(
    "INSERT INTO card_review_log (card_id, correct) VALUES (?, ?)"
  ).run(cardId, correct ? 1 : 0);

  const updated = getCard(cardId)!;
  return {
    card: updated,
    next_due_at: next.due_at,
    new_interval_days: next.interval_days,
  };
}

export function cardStats(): CardStats {
  const total = (
    db.prepare("SELECT COUNT(*) AS n FROM flashcards").get() as { n: number }
  ).n;
  const due = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM card_srs_state WHERE due_at <= datetime('now')`
      )
      .get() as { n: number }
  ).n;
  const agg = db
    .prepare(
      `SELECT COALESCE(SUM(times_seen), 0) AS seen, COALESCE(SUM(times_correct), 0) AS correct
       FROM card_srs_state`
    )
    .get() as { seen: number; correct: number };
  return {
    total,
    due,
    seen: agg.seen,
    accuracy: agg.seen > 0 ? Math.round((agg.correct / agg.seen) * 100) : null,
  };
}
