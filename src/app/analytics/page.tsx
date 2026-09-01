"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface SubtopicStat {
  domain_code: string;
  domain_name: string;
  subtopic: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
}
interface DifficultyStat {
  difficulty: number;
  attempts: number;
  correct: number;
  accuracy: number | null;
}
interface DailyStat {
  day: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
}
interface Analytics {
  overall: {
    total_questions: number;
    questions_attempted: number;
    total_attempts: number;
    total_correct: number;
    overall_accuracy: number | null;
    exams_taken: number;
    avg_scaled_score: number | null;
    best_scaled_score: number | null;
  };
  subtopics: SubtopicStat[];
  difficulty: DifficultyStat[];
  daily: DailyStat[];
  exam_score_history: { id: number; finished_at: string; scaled_score: number; passed: number }[];
}

function accuracyColor(acc: number | null) {
  if (acc === null) return "bg-gray-700";
  if (acc >= 75) return "bg-good";
  if (acc >= 50) return "bg-warn";
  return "bg-bad";
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <main>
        <p className="text-gray-400">Loading analytics…</p>
      </main>
    );
  }

  const weakestSubtopics = [...data.subtopics]
    .filter((s) => s.attempts >= 3 && s.accuracy !== null)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
    .slice(0, 8);

  const maxDailyAttempts = Math.max(1, ...data.daily.map((d) => d.attempts));

  return (
    <main>
      <div className="flex items-center justify-between mb-6 pt-2">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-200">
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold">Analytics</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Overall accuracy</p>
          <p className="text-2xl font-bold">
            {data.overall.overall_accuracy === null ? "—" : `${data.overall.overall_accuracy}%`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.overall.total_correct} / {data.overall.total_attempts} attempts
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Bank coverage</p>
          <p className="text-2xl font-bold">
            {data.overall.questions_attempted} / {data.overall.total_questions}
          </p>
          <p className="text-xs text-gray-500 mt-1">unique questions seen</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Mock exams taken</p>
          <p className="text-2xl font-bold">{data.overall.exams_taken}</p>
          <p className="text-xs text-gray-500 mt-1">
            {data.overall.avg_scaled_score !== null
              ? `avg ${data.overall.avg_scaled_score}`
              : "no exams yet"}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Best exam score</p>
          <p className="text-2xl font-bold">{data.overall.best_scaled_score ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1">scaled 100–900</p>
        </div>
      </div>

      {data.exam_score_history.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Exam score trend</h2>
          <div className="flex items-end gap-2 h-32">
            {data.exam_score_history.map((e) => {
              const heightPct = Math.max(4, ((e.scaled_score - 100) / (900 - 100)) * 100);
              return (
                <div key={e.id} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className={`w-full rounded-t ${e.passed ? "bg-good" : "bg-bad"}`}
                    style={{ height: `${heightPct}%` }}
                    title={`${e.scaled_score} on ${new Date(e.finished_at).toLocaleDateString()}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{new Date(data.exam_score_history[0].finished_at).toLocaleDateString()}</span>
            <span>
              {new Date(
                data.exam_score_history[data.exam_score_history.length - 1].finished_at
              ).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {data.daily.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-1">Activity, last 30 days</h2>
          <p className="text-xs text-gray-500 mb-4">bar height = questions answered, color = accuracy</p>
          <div className="flex items-end gap-[3px] h-24">
            {data.daily.map((d) => (
              <div
                key={d.day}
                className="flex-1 flex flex-col justify-end h-full"
                title={`${d.day}: ${d.attempts} answered, ${d.accuracy ?? "—"}% correct`}
              >
                <div
                  className={`w-full rounded-sm ${accuracyColor(d.accuracy)}`}
                  style={{ height: `${Math.max(6, (d.attempts / maxDailyAttempts) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mb-6">
        <h2 className="font-semibold mb-1">Accuracy by difficulty</h2>
        <p className="text-xs text-gray-500 mb-4">difficulty 4–5 questions are the deliberately hardest in the bank</p>
        {data.difficulty.map((d) => (
          <div key={d.difficulty} className="mb-3 last:mb-0">
            <div className="flex justify-between text-sm mb-1">
              <span>Difficulty {d.difficulty}</span>
              <span className="text-gray-400">
                {d.accuracy === null ? "—" : `${d.accuracy}%`}
                <span className="text-gray-600 ml-2 text-xs">({d.attempts} attempts)</span>
              </span>
            </div>
            <div className="h-2 bg-panel2 rounded-full overflow-hidden">
              <div
                className={`h-full ${accuracyColor(d.accuracy)}`}
                style={{ width: `${d.accuracy ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-1">Weakest subtopics</h2>
        <p className="text-xs text-gray-500 mb-4">lowest accuracy, min. 3 attempts — worth extra drill time</p>
        {weakestSubtopics.length === 0 && (
          <p className="text-sm text-gray-500">Not enough drill history yet to surface weak areas.</p>
        )}
        {weakestSubtopics.map((s) => (
          <div key={`${s.domain_code}-${s.subtopic}`} className="mb-3 last:mb-0">
            <div className="flex justify-between text-sm mb-1">
              <span>
                {s.subtopic} <span className="text-gray-600 text-xs">({s.domain_code})</span>
              </span>
              <span className="text-gray-400">
                {s.accuracy}%<span className="text-gray-600 ml-2 text-xs">({s.attempts} attempts)</span>
              </span>
            </div>
            <div className="h-2 bg-panel2 rounded-full overflow-hidden">
              <div className={`h-full ${accuracyColor(s.accuracy)}`} style={{ width: `${s.accuracy ?? 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
