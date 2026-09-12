"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const SESSION_SIZE = 20;

const DOMAINS = [
  { code: "", name: "All domains" },
  { code: "SO", name: "Security Operations" },
  { code: "VM", name: "Vulnerability Management" },
  { code: "IR", name: "Incident Response" },
  { code: "RC", name: "Reporting & Communication" },
];

interface CardDTO {
  id: number;
  front: string;
  choices: string[];
  correct_index: number | null;
  back: string;
  chapter_title: string | null;
  domain_code: string | null;
  domain_name: string | null;
  source: string | null;
  due_at: string | null;
  times_seen: number;
  times_correct: number;
}

interface CardStats {
  total: number;
  due: number;
  seen: number;
  accuracy: number | null;
}

interface AnswerResult {
  correct: boolean;
  graded: boolean;
  correct_index: number | null;
  back: string;
  next_due_at: string;
  new_interval_days: number;
}

export default function CardsPage() {
  const [queue, setQueue] = useState<CardDTO[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [domain, setDomain] = useState("");
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<CardStats | null>(null);

  const loadBatch = useCallback(async (domainCode?: string) => {
    setLoading(true);
    setDone(false);
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setResult(null);
    setSessionCorrect(0);
    setSessionTotal(0);
    const d = domainCode !== undefined ? domainCode : domain;
    const params = new URLSearchParams({ count: String(SESSION_SIZE) });
    if (d) params.set("domain", d);
    const res = await fetch(`/api/cards/next?${params.toString()}`);
    const data = await res.json();
    setQueue(data.cards ?? []);
    if (data.stats) setStats(data.stats);
    setLoading(false);
    if ((data.cards ?? []).length === 0) setDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("domain") ?? "";
    if (["SO", "VM", "IR", "RC"].includes(requested)) setDomain(requested);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadBatch(domain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, ready]);

  const current = queue[index];

  const submit = async (body: { selected_index?: number; correct?: boolean }) => {
    if (!current || result) return;
    const res = await fetch("/api/cards/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: current.id, ...body }),
    });
    const data: AnswerResult = await res.json();
    setResult(data);
    setSessionTotal((t) => t + 1);
    if (data.correct) setSessionCorrect((c) => c + 1);
  };

  const handleNext = () => {
    setSelected(null);
    setRevealed(false);
    setResult(null);
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  const accuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;

  const choiceClass = (i: number) => {
    if (!result) return selected === i ? "choice choice-selected" : "choice";
    if (current?.correct_index === i) return "choice choice-correct";
    if (selected === i) return "choice choice-incorrect";
    return "choice";
  };

  return (
    <main>
      <div className="flex items-center justify-between mb-3">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-200">
          ← Dashboard
        </Link>
        <div className="text-sm text-gray-400">
          Session: <span className="text-gray-100 font-semibold">{sessionCorrect}</span>/{sessionTotal}
          {sessionTotal > 0 && <span className="ml-1 text-gray-500">({accuracy}%)</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {DOMAINS.map((d) => (
          <button
            key={d.code}
            onClick={() => setDomain(d.code)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              domain === d.code
                ? "bg-accent text-white border-accent"
                : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500"
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {stats && (
        <p className="text-xs text-gray-500 mb-4">
          {stats.due} due · {stats.total} cards
          {stats.accuracy !== null && <span> · {stats.accuracy}% recall</span>}
        </p>
      )}

      {loading && <p className="text-gray-400">Loading cards…</p>}

      {!loading && done && (
        <div className="card text-center">
          <h2 className="text-xl font-semibold mb-2">
            {sessionTotal > 0 ? "Session complete" : "No cards yet"}
          </h2>
          <p className="text-gray-400 mb-4">
            {sessionTotal > 0
              ? `${sessionCorrect} / ${sessionTotal} correct (${accuracy}%) this session.`
              : "No flashcards have been seeded. Run the extractor and seed-cards, then reload."}
          </p>
          <div className="flex gap-3 justify-center">
            {sessionTotal > 0 && (
              <button className="btn-primary" onClick={() => loadBatch(domain)}>
                Review another {SESSION_SIZE}
              </button>
            )}
            <Link href="/" className="btn-secondary">
              Back to dashboard
            </Link>
          </div>
        </div>
      )}

      {!loading && !done && current && (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="badge bg-panel2 text-gray-300">
                {current.domain_name ?? "Study Guide"}
              </span>
              <span className="text-xs text-gray-500">
                {index + 1} / {queue.length}
              </span>
            </div>

            {current.chapter_title && (
              <p className="text-xs text-gray-500 mb-2">
                {current.chapter_title}
                {current.source ? ` · ${current.source}` : ""}
              </p>
            )}

            <p className="text-lg leading-relaxed mb-4">{current.front}</p>

            {current.choices.length > 0 && (
              <div>
                {current.choices.map((c, i) => (
                  <button
                    key={i}
                    className={choiceClass(i)}
                    disabled={!!result}
                    onClick={() => {
                      if (result) return;
                      setSelected(i);
                      void submit({ selected_index: i });
                    }}
                  >
                    <span className="font-semibold mr-2 text-gray-400">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {c}
                  </button>
                ))}
              </div>
            )}

            {current.choices.length === 0 && !revealed && !result && (
              <button className="btn-primary w-full" onClick={() => setRevealed(true)}>
                Show answer
              </button>
            )}

            {(revealed || result) && (
              <div className="mt-3 rounded-lg border border-border bg-panel2 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Answer</p>
                <p className="leading-relaxed text-gray-200">{current.back}</p>
              </div>
            )}

            {revealed && !result && (
              <div className="flex gap-3 mt-4">
                <button className="btn-primary flex-1" onClick={() => submit({ correct: true })}>
                  Got it
                </button>
                <button className="btn-secondary flex-1" onClick={() => submit({ correct: false })}>
                  Missed it
                </button>
              </div>
            )}
          </div>

          {result && (
            <button className="btn-primary w-full mt-4" onClick={handleNext}>
              {index + 1 < queue.length ? "Next card" : "Finish session"}
            </button>
          )}
        </>
      )}
    </main>
  );
}
