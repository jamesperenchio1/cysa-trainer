"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface DomainStat {
  domain_code: string;
  domain_name: string;
  exam_weight_pct: number;
  question_count: number;
  accuracy: number | null;
  due_now: number;
}
interface Stats {
  domains: DomainStat[];
  streak: { current_streak: number; longest_streak: number; last_practice_date: string | null };
  total_due: number;
  total_questions: number;
  exam_history: { id: number; finished_at: string; scaled_score: number; passed: number }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <main>
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-xl font-bold">CySA+ Trainer</h1>
        {stats && (
          <div className="flex items-center gap-1.5 text-sm bg-panel2 border border-border rounded-full px-3 py-1.5">
            <span>🔥</span>
            <span className="font-semibold">{stats.streak.current_streak}</span>
            <span className="text-gray-500">day streak</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/drill" className="card hover:border-accent transition-colors">
          <p className="text-2xl mb-1">🎯</p>
          <p className="font-semibold">Drill</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats ? `${stats.total_due} due now` : "Spaced repetition"}
          </p>
        </Link>
        <Link href="/exam" className="card hover:border-accent transition-colors">
          <p className="text-2xl mb-1">⏱️</p>
          <p className="font-semibold">Mock Exam</p>
          <p className="text-xs text-gray-500 mt-1">85 Q · 165 min timed</p>
        </Link>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Domain mastery</h2>
        {!stats && <p className="text-sm text-gray-500">Loading…</p>}
        {stats?.domains.map((d) => (
          <div key={d.domain_code} className="mb-4 last:mb-0">
            <div className="flex justify-between text-sm mb-1">
              <span>
                {d.domain_name}{" "}
                <span className="text-gray-500 text-xs">({d.exam_weight_pct}% of exam)</span>
              </span>
              <span className="text-gray-400">
                {d.accuracy === null ? "not started" : `${d.accuracy}%`}
                {d.due_now > 0 && <span className="text-accent ml-2">{d.due_now} due</span>}
              </span>
            </div>
            <div className="h-2 bg-panel2 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  d.accuracy === null
                    ? "bg-gray-700"
                    : d.accuracy >= 75
                    ? "bg-good"
                    : d.accuracy >= 50
                    ? "bg-warn"
                    : "bg-bad"
                }`}
                style={{ width: `${d.accuracy ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {stats && stats.exam_history.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Recent mock exams</h2>
          <div className="space-y-2">
            {stats.exam_history.map((e) => (
              <div key={e.id} className="flex justify-between text-sm">
                <span className="text-gray-400">{new Date(e.finished_at).toLocaleDateString()}</span>
                <span className={e.passed ? "text-good font-semibold" : "text-bad font-semibold"}>
                  {e.scaled_score} {e.passed ? "PASS" : "FAIL"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
