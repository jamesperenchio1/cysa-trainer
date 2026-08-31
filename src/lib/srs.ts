/**
 * SM-2 style spaced repetition scheduler.
 * Quality scale we use (derived from a binary correct/incorrect answer,
 * since this app doesn't ask the user to self-rate confidence):
 *   correct   -> quality 4  (good, but not "trivially easy")
 *   incorrect -> quality 1  (fail, resets repetitions)
 *
 * This keeps the UI dead simple (just answer the question) while still
 * getting real spaced-repetition benefits: missed questions come back
 * fast (next day), well-known ones stretch out to weeks/months.
 */

export interface SrsState {
  repetitions: number;
  ease_factor: number;
  interval_days: number;
}

export interface SrsResult {
  repetitions: number;
  ease_factor: number;
  interval_days: number;
  due_at: string; // ISO date
}

export function schedule(state: SrsState, correct: boolean): SrsResult {
  const quality = correct ? 4 : 1;
  let { repetitions, ease_factor, interval_days } = state;

  if (quality < 3) {
    // Failed recall: reset repetitions, come back tomorrow.
    repetitions = 0;
    interval_days = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval_days = 1;
    } else if (repetitions === 2) {
      interval_days = 3; // slightly tighter than classic SM-2's 6, good for exam-cramming timelines
    } else {
      interval_days = Math.round(interval_days * ease_factor * 10) / 10;
    }
  }

  // Update ease factor (classic SM-2 formula), clamped to a sane floor.
  ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease_factor < 1.3) ease_factor = 1.3;
  if (ease_factor > 3.2) ease_factor = 3.2;

  const due = new Date();
  due.setUTCDate(due.getUTCDate() + Math.max(1, Math.round(interval_days)));

  return {
    repetitions,
    ease_factor: Math.round(ease_factor * 100) / 100,
    interval_days,
    due_at: due.toISOString(),
  };
}
