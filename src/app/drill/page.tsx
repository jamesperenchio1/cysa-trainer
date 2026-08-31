"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import QuestionCard from "@/components/QuestionCard";
import { QuestionDTO, AnswerResultDTO } from "@/lib/types";

const SESSION_SIZE = 15;

export default function DrillPage() {
  const [queue, setQueue] = useState<QuestionDTO[]>([]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<AnswerResultDTO | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  const loadBatch = useCallback(async () => {
    setLoading(true);
    setDone(false);
    setIndex(0);
    setFeedback(null);
    const res = await fetch(`/api/drill/next?count=${SESSION_SIZE}`);
    const data = await res.json();
    setQueue(data.questions);
    setLoading(false);
    if (data.questions.length === 0) setDone(true);
  }, []);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  const current = queue[index];

  const handleSubmit = async (selected: string[]) => {
    if (!current) return;
    const res = await fetch("/api/drill/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: current.id, selected_labels: selected }),
    });
    const result: AnswerResultDTO = await res.json();
    setFeedback(result);
    setSessionTotal((t) => t + 1);
    if (result.correct) setSessionCorrect((c) => c + 1);
  };

  const handleNext = () => {
    setFeedback(null);
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  const accuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;

  return (
    <main>
      <div className="flex items-center justify-between mb-5">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-200">
          ← Dashboard
        </Link>
        <div className="text-sm text-gray-400">
          Session: <span className="text-gray-100 font-semibold">{sessionCorrect}</span>/{sessionTotal}
          {sessionTotal > 0 && <span className="ml-1 text-gray-500">({accuracy}%)</span>}
        </div>
      </div>

      {loading && <p className="text-gray-400">Loading due questions…</p>}

      {!loading && done && (
        <div className="card text-center">
          <h2 className="text-xl font-semibold mb-2">Session complete</h2>
          <p className="text-gray-400 mb-4">
            {sessionCorrect} / {sessionTotal} correct ({accuracy}%) this session.
          </p>
          <div className="flex gap-3 justify-center">
            <button className="btn-primary" onClick={loadBatch}>
              Drill another {SESSION_SIZE}
            </button>
            <Link href="/" className="btn-secondary">
              Back to dashboard
            </Link>
          </div>
        </div>
      )}

      {!loading && !done && current && (
        <>
          <QuestionCard
            question={current}
            onSubmit={handleSubmit}
            feedback={feedback}
            questionNumber={index + 1}
            totalQuestions={queue.length}
          />
          {feedback && (
            <button className="btn-primary w-full mt-4" onClick={handleNext}>
              {index + 1 < queue.length ? "Next question" : "Finish session"}
            </button>
          )}
        </>
      )}
    </main>
  );
}
