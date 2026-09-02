import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// DB_PATH is overridable via env for docker volume mounting.
const DB_PATH = process.env.CYSA_DB_PATH || path.join(process.cwd(), "data", "cysa.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,       -- 'SO' | 'VM' | 'IR' | 'RC'
  name TEXT NOT NULL,
  exam_weight_pct INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subtopics (
  id INTEGER PRIMARY KEY,
  domain_id INTEGER NOT NULL REFERENCES domains(id),
  name TEXT NOT NULL,
  UNIQUE(domain_id, name)
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY,
  external_key TEXT UNIQUE,        -- stable key from JSON seed, for safe re-import
  domain_id INTEGER NOT NULL REFERENCES domains(id),
  subtopic_id INTEGER REFERENCES subtopics(id),
  difficulty INTEGER NOT NULL DEFAULT 3,   -- 1 (easy) - 5 (brutal)
  is_multi INTEGER NOT NULL DEFAULT 0,     -- 0 = single answer, 1 = select-N
  select_n INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL DEFAULT 'mcq',        -- 'mcq' | 'ordering' | 'matching' | 'hotspot'
  stem TEXT NOT NULL,              -- question text (may include inline exhibit markdown/code block)
  exhibit TEXT,                    -- optional extra exhibit block (table/log/vector), rendered monospace
  explanation TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS choices (
  id INTEGER PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,             -- 'A','B','C','D',... (mcq/hotspot) or item id (ordering/matching)
  body TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,   -- mcq/hotspot: this choice is a correct answer
  sort_order INTEGER NOT NULL DEFAULT 0,
  correct_order INTEGER,           -- ordering: 1-based correct sequence position
  match_group TEXT,                -- matching: 'left' | 'right'
  pair_key TEXT                    -- matching: shared key linking a left item to its correct right item
);

-- Spaced repetition state, one row per question (single-user app: no user_id needed)
CREATE TABLE IF NOT EXISTS srs_state (
  question_id INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  repetitions INTEGER NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days REAL NOT NULL DEFAULT 0,
  due_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_result INTEGER,             -- 1 correct, 0 incorrect
  last_seen_at TEXT,
  times_seen INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS review_log (
  id INTEGER PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  mode TEXT NOT NULL,              -- 'drill' | 'exam'
  correct INTEGER NOT NULL,
  answered_at TEXT NOT NULL DEFAULT (datetime('now')),
  exam_session_id INTEGER,
  time_seconds INTEGER             -- seconds spent on this question before submitting
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id INTEGER PRIMARY KEY,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 9900, -- 165 min
  question_ids TEXT NOT NULL,      -- JSON array, fixed order for this attempt
  answers TEXT NOT NULL DEFAULT '{}', -- JSON map questionId -> selected label(s)
  answer_times TEXT NOT NULL DEFAULT '{}', -- JSON map questionId -> cumulative seconds spent
  scaled_score INTEGER,
  passed INTEGER
);

CREATE TABLE IF NOT EXISTS streak (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_practice_date TEXT
);
INSERT OR IGNORE INTO streak (id, current_streak, longest_streak, last_practice_date) VALUES (1, 0, 0, NULL);
`);

// Migrate existing DBs (the volume-mounted one on a running deployment) that predate
// the performance-based-question columns -- CREATE TABLE IF NOT EXISTS doesn't add
// columns to an already-existing table, so add them defensively if missing.
function ensureColumn(table: string, column: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureColumn("questions", "type", "type TEXT NOT NULL DEFAULT 'mcq'");
ensureColumn("choices", "correct_order", "correct_order INTEGER");
ensureColumn("choices", "match_group", "match_group TEXT");
ensureColumn("choices", "pair_key", "pair_key TEXT");
ensureColumn("review_log", "time_seconds", "time_seconds INTEGER");
ensureColumn("exam_sessions", "answer_times", "answer_times TEXT NOT NULL DEFAULT '{}'");

export default db;
