import db from "./db";

export interface ReadingState {
  material_key: string;
  cfi: string | null;
  percent: number;
  chapter_href: string | null;
  chapter_title: string | null;
  updated_at: string;
}

export interface ChapterProgress {
  material_key: string;
  chapter_href: string;
  chapter_title: string | null;
  domain_code: string | null;
  percent: number;
  completed: number;
  updated_at: string;
}

export interface Bookmark {
  id: number;
  material_key: string;
  cfi: string;
  label: string | null;
  chapter_href: string | null;
  created_at: string;
}

export function getReadingState(materialKey: string): ReadingState | null {
  const row = db
    .prepare("SELECT * FROM reading_state WHERE material_key = ?")
    .get(materialKey) as ReadingState | undefined;
  return row ?? null;
}

export function saveReadingState(input: {
  material_key: string;
  cfi: string;
  percent: number;
  chapter_href?: string | null;
  chapter_title?: string | null;
}): ReadingState {
  db.prepare(
    `INSERT INTO reading_state (material_key, cfi, percent, chapter_href, chapter_title, updated_at)
     VALUES (@material_key, @cfi, @percent, @chapter_href, @chapter_title, datetime('now'))
     ON CONFLICT(material_key) DO UPDATE SET
       cfi = excluded.cfi,
       percent = excluded.percent,
       chapter_href = excluded.chapter_href,
       chapter_title = excluded.chapter_title,
       updated_at = datetime('now')`
  ).run({
    material_key: input.material_key,
    cfi: input.cfi,
    percent: input.percent,
    chapter_href: input.chapter_href ?? null,
    chapter_title: input.chapter_title ?? null,
  });
  return getReadingState(input.material_key)!;
}

export function listReadingStates(): ReadingState[] {
  return db
    .prepare("SELECT * FROM reading_state ORDER BY updated_at DESC")
    .all() as ReadingState[];
}

export function getChapterProgress(materialKey: string): ChapterProgress[] {
  return db
    .prepare(
      "SELECT * FROM chapter_progress WHERE material_key = ? ORDER BY chapter_href"
    )
    .all(materialKey) as ChapterProgress[];
}

export function setChapterProgress(input: {
  material_key: string;
  chapter_href: string;
  chapter_title?: string | null;
  domain_code?: string | null;
  percent: number;
  completed?: boolean;
}): ChapterProgress {
  db.prepare(
    `INSERT INTO chapter_progress
       (material_key, chapter_href, chapter_title, domain_code, percent, completed, updated_at)
     VALUES (@material_key, @chapter_href, @chapter_title, @domain_code, @percent, @completed, datetime('now'))
     ON CONFLICT(material_key, chapter_href) DO UPDATE SET
       chapter_title = COALESCE(excluded.chapter_title, chapter_progress.chapter_title),
       domain_code = COALESCE(excluded.domain_code, chapter_progress.domain_code),
       percent = excluded.percent,
       completed = excluded.completed,
       updated_at = datetime('now')`
  ).run({
    material_key: input.material_key,
    chapter_href: input.chapter_href,
    chapter_title: input.chapter_title ?? null,
    domain_code: input.domain_code ?? null,
    percent: input.percent,
    completed: input.completed ? 1 : 0,
  });
  const row = db
    .prepare(
      "SELECT * FROM chapter_progress WHERE material_key = ? AND chapter_href = ?"
    )
    .get(input.material_key, input.chapter_href) as ChapterProgress;
  return row;
}

export function listBookmarks(materialKey: string): Bookmark[] {
  return db
    .prepare(
      "SELECT * FROM bookmarks WHERE material_key = ? ORDER BY created_at DESC"
    )
    .all(materialKey) as Bookmark[];
}

export function addBookmark(input: {
  material_key: string;
  cfi: string;
  label?: string | null;
  chapter_href?: string | null;
}): Bookmark {
  const info = db
    .prepare(
      `INSERT INTO bookmarks (material_key, cfi, label, chapter_href)
       VALUES (@material_key, @cfi, @label, @chapter_href)`
    )
    .run({
      material_key: input.material_key,
      cfi: input.cfi,
      label: input.label ?? null,
      chapter_href: input.chapter_href ?? null,
    });
  return db
    .prepare("SELECT * FROM bookmarks WHERE id = ?")
    .get(info.lastInsertRowid) as Bookmark;
}

export function removeBookmark(id: number): void {
  db.prepare("DELETE FROM bookmarks WHERE id = ?").run(id);
}
