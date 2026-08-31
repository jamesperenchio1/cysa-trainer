import db from "./db";

export function updateStreak() {
  const row = db.prepare("SELECT * FROM streak WHERE id = 1").get() as {
    current_streak: number;
    longest_streak: number;
    last_practice_date: string | null;
  };
  const today = new Date().toISOString().slice(0, 10);
  if (row.last_practice_date === today) return; // already counted today

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  const newStreak = row.last_practice_date === yStr ? row.current_streak + 1 : 1;
  const newLongest = Math.max(newStreak, row.longest_streak);
  db.prepare(
    "UPDATE streak SET current_streak = ?, longest_streak = ?, last_practice_date = ? WHERE id = 1"
  ).run(newStreak, newLongest, today);
}
