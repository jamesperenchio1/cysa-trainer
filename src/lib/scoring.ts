/**
 * CompTIA does not publish its exact IRT-based scaling formula, so this is a
 * transparent linear approximation for practice purposes: 0% correct -> 100,
 * 100% correct -> 900, matching the published scale bounds. The real exam
 * almost certainly weights questions unevenly (IRT), so treat this as a
 * directional signal, not a guarantee of your real scaled score.
 */
export function scaleScore(correct: number, total: number): number {
  if (total === 0) return 100;
  const pct = correct / total;
  const score = Math.round(100 + pct * 800);
  return Math.min(900, Math.max(100, score));
}

// Set above the real CS0-003 bar (750/900, 165 min for 85 Qs) so a pass here
// means comfortable headroom on test day, not a photo finish.
export const PASSING_SCORE = 800;
export const EXAM_QUESTION_COUNT = 85;
export const EXAM_DURATION_SECONDS = 150 * 60;

export const DOMAIN_WEIGHTS: Record<string, number> = {
  SO: 34,
  VM: 26,
  IR: 24,
  RC: 16,
};

export const DOMAIN_NAMES: Record<string, string> = {
  SO: "Security Operations",
  VM: "Vulnerability Management",
  IR: "Incident Response and Management",
  RC: "Reporting and Communication",
};
