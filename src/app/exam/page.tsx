"use client";
import { useState } from "react";
import Link from "next/link";
import QuestionCard, { SubmitPayload } from "@/components/QuestionCard";
import Timer from "@/components/Timer";
import { QuestionDTO } from "@/lib/types";

interface StoredAnswer {
  selected_labels?: string[];
  ordered_ids?: number[];
  pairs?: Record<number, number>;
}

interface DomainBreakdown {
  domain_code: string;
  domain_name: string;
  correct: number;
  total: number;
  accuracy: number;
}
interface ReviewItem {
  question_id: number;
  correct: boolean;
  correct_labels: string[];
  selected_labels: string[];
  explanation: string;
  domain_code: string;
  ordered_ids?: number[];
  correct_order?: { id: number; label: string; body: string }[];
  pairs?: Record<number, number>;
  correct_pairs?: { left: { id: number; label: string; body: string }; right: { id: number; label: string; body: string } }[];
}
interface FinishResult {
  correct: number;
  total: number;
  scaled_score: number;
  passing_score: number;
  passed: boolean;
  domain_breakdown: DomainBreakdown[];
  review: ReviewItem[];
}

type Stage = "intro" | "running" | "result";

export default function ExamPage() {
  const [stage, setStage] = useState<Stage>("intro");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuestionDTO[]>([]);
  const [duration, setDuration] = useState(9900);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, StoredAnswer>>({});
  const [result, setResult] = useState<FinishResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const startExam = async () => {
    setStarting(true);
    const res = await fetch("/api/exam/start", { method: "POST" });
    const data = await res.json();
    setSessionId(data.session_id);
    setQuestions(data.questions);
    setDuration(data.duration_seconds);
    setAnswers({});
    setIndex(0);
    setStage("running");
    setStarting(false);
  };

  const selectAnswer = async (qid: number, payload: SubmitPayload) => {
    const stored: StoredAnswer = {
      ...(payload.selected_labels && { selected_labels: payload.selected_labels }),
      ...(payload.ordered_ids && { ordered_ids: payload.ordered_ids }),
      ...(payload.pairs && { pairs: payload.pairs }),
    };
    setAnswers((prev) => ({ ...prev, [qid]: stored }));
    if (!sessionId) return;
    fetch(`/api/exam/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: qid, ...payload }),
    }).catch(() => {});
  };

  const finishExam = async () => {
    if (!sessionId) return;
    const res = await fetch(`/api/exam/${sessionId}/finish`, { method: "POST" });
    const data: FinishResult = await res.json();
    setResult(data);
    setStage("result");
  };

  const current = questions[index];
  const answeredCount = Object.keys(answers).length;

  if (stage === "intro") {
    return (
      <main>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-200">
          ← Dashboard
        </Link>
        <div className="card mt-5">
          <h1 className="text-xl font-semibold mb-3">Full Mock Exam</h1>
          <ul className="text-sm text-gray-300 space-y-1.5 mb-5 list-disc list-inside">
            <li>85 questions, domain-weighted (34% / 26% / 24% / 16%) like the real CS0-004</li>
            <li>Includes performance-based items (ordering, matching, hotspot) alongside multiple-choice, matching the real exam&apos;s mixed format</li>
            <li>165 minute timer, matching the real exam — auto-submits when time runs out</li>
            <li>Passing score set to 800/900, above the real exam&apos;s 750 — a pass here means real margin</li>
            <li>No per-question feedback during the exam, matching real conditions</li>
            <li>Full scoring, domain breakdown, and explanations shown at the end</li>
          </ul>
          <button className="btn-primary w-full" onClick={startExam} disabled={starting}>
            {starting ? "Starting…" : "Start timed exam"}
          </button>
        </div>
      </main>
    );
  }

  if (stage === "running" && current) {
    return (
      <main>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400">
            Answered {answeredCount}/{questions.length}
          </span>
          <Timer totalSeconds={duration} onExpire={finishExam} />
        </div>

        <QuestionCard
          key={current.id}
          question={current}
          onSubmit={(payload) => selectAnswer(current.id, payload)}
          feedback={null}
          questionNumber={index + 1}
          totalQuestions={questions.length}
        />

        <div className="flex justify-between mt-4 gap-3">
          <button
            className="btn-secondary flex-1 disabled:opacity-30"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            ← Previous
          </button>
          {index + 1 < questions.length ? (
            <button className="btn-secondary flex-1" onClick={() => setIndex((i) => i + 1)}>
              Next →
            </button>
          ) : (
            <button className="btn-primary flex-1" onClick={finishExam}>
              Submit exam
            </button>
          )}
        </div>

        {/* Question palette for jumping around, like the real exam's review screen */}
        <div className="grid grid-cols-10 gap-1.5 mt-6">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setIndex(i)}
              className={`h-8 rounded text-xs font-mono border ${
                i === index
                  ? "border-accent bg-accent/20 text-accent"
                  : answers[q.id]
                  ? "border-good/50 bg-good/10 text-good"
                  : "border-border bg-panel2 text-gray-500"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button className="btn-secondary w-full mt-4" onClick={finishExam}>
          Submit exam now
        </button>
      </main>
    );
  }

  if (stage === "result" && result) {
    return (
      <main>
        <div className="card text-center mb-5">
          <p className="text-sm text-gray-400 mb-1">Scaled score (approximate)</p>
          <p className={`text-5xl font-bold mb-2 ${result.passed ? "text-good" : "text-bad"}`}>
            {result.scaled_score}
          </p>
          <p className={`font-semibold mb-1 ${result.passed ? "text-good" : "text-bad"}`}>
            {result.passed ? "PASS" : "FAIL"} — passing score {result.passing_score}
          </p>
          <p className="text-sm text-gray-400">
            {result.correct} / {result.total} correct ({Math.round((result.correct / result.total) * 100)}%)
          </p>
        </div>

        <div className="card mb-5">
          <h3 className="font-semibold mb-3">Domain breakdown</h3>
          {result.domain_breakdown.map((d) => (
            <div key={d.domain_code} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>{d.domain_name}</span>
                <span className="text-gray-400">
                  {d.correct}/{d.total} ({d.accuracy}%)
                </span>
              </div>
              <div className="h-2 bg-panel2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${d.accuracy >= 75 ? "bg-good" : d.accuracy >= 50 ? "bg-warn" : "bg-bad"}`}
                  style={{ width: `${d.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-5">
          <button className="btn-secondary flex-1" onClick={() => setReviewOpen((o) => !o)}>
            {reviewOpen ? "Hide" : "Show"} full review
          </button>
          <Link href="/" className="btn-primary flex-1 text-center">
            Back to dashboard
          </Link>
        </div>

        {reviewOpen && (
          <div className="space-y-4">
            {result.review.map((r, i) => {
              const q = questions.find((qq) => qq.id === r.question_id);
              if (!q) return null;
              return (
                <QuestionCard
                  key={r.question_id}
                  question={q}
                  onSubmit={() => {}}
                  disabled
                  revealed
                  initialSelected={r.selected_labels}
                  initialOrderedIds={r.ordered_ids}
                  initialPairs={r.pairs}
                  feedback={{
                    correct: r.correct,
                    correct_labels: r.correct_labels,
                    explanation: r.explanation,
                    correct_order: r.correct_order,
                    correct_pairs: r.correct_pairs,
                  }}
                  questionNumber={i + 1}
                  totalQuestions={result.review.length}
                />
              );
            })}
          </div>
        )}
      </main>
    );
  }

  return null;
}
