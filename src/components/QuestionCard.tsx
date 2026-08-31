"use client";
import { useState, useEffect } from "react";
import { QuestionDTO } from "@/lib/types";

const DOMAIN_COLORS: Record<string, string> = {
  SO: "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50",
  VM: "bg-amber-900/50 text-amber-300 border border-amber-700/50",
  IR: "bg-rose-900/50 text-rose-300 border border-rose-700/50",
  RC: "bg-blue-900/50 text-blue-300 border border-blue-700/50",
};

interface Props {
  question: QuestionDTO;
  onSubmit: (selectedLabels: string[]) => void;
  // If provided, shows immediate correct/incorrect styling + explanation (drill mode).
  // If null, just collects the answer with no feedback (exam mode).
  feedback?: { correct: boolean; correct_labels: string[]; explanation: string } | null;
  disabled?: boolean;
  questionNumber?: number;
  totalQuestions?: number;
  // Review mode: show the answer state immediately (no click needed), pre-populated
  // with what the user actually selected during the exam.
  revealed?: boolean;
  initialSelected?: string[];
}

export default function QuestionCard({
  question,
  onSubmit,
  feedback,
  disabled,
  questionNumber,
  totalQuestions,
  revealed,
  initialSelected,
}: Props) {
  const [selected, setSelected] = useState<string[]>(revealed ? initialSelected || [] : []);
  const [submitted, setSubmitted] = useState(!!revealed);

  useEffect(() => {
    if (!revealed) {
      setSelected([]);
      setSubmitted(false);
    }
  }, [question.id, revealed]);

  const toggle = (label: string) => {
    if (submitted || disabled) return;
    if (question.is_multi) {
      setSelected((prev) =>
        prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
      );
    } else {
      setSelected([label]);
    }
  };

  const canSubmit = question.is_multi
    ? selected.length === question.select_n
    : selected.length === 1;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitted(true);
    onSubmit(selected);
  };

  const showFeedback = feedback !== undefined && feedback !== null && submitted;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className={`badge ${DOMAIN_COLORS[question.domain_code] || "bg-gray-800"}`}>
          {question.domain_name}
        </span>
        <div className="flex items-center gap-2">
          {question.difficulty >= 5 && (
            <span className="badge bg-rose-900/60 text-rose-300 border border-rose-700/50">
              BRUTAL
            </span>
          )}
          {questionNumber && totalQuestions && (
            <span className="text-xs text-gray-500">
              {questionNumber} / {totalQuestions}
            </span>
          )}
        </div>
      </div>

      <p className="text-[15px] leading-relaxed mb-1">
        {question.is_multi && (
          <span className="text-accent font-semibold">(Select {question.select_n}) </span>
        )}
        {question.stem}
      </p>

      {question.exhibit && <pre className="exhibit-block">{question.exhibit}</pre>}

      <div className="mt-4">
        {question.choices.map((c) => {
          const isSelected = selected.includes(c.label);
          const isCorrectChoice = feedback?.correct_labels.includes(c.label);
          let cls = "choice";
          if (showFeedback) {
            if (isCorrectChoice) cls += " choice-correct";
            else if (isSelected && !isCorrectChoice) cls += " choice-incorrect";
          } else if (isSelected) {
            cls += " choice-selected";
          }
          return (
            <button key={c.id} className={cls} onClick={() => toggle(c.label)} disabled={submitted || disabled}>
              <span className="font-semibold text-gray-400 mr-2">{c.label}.</span>
              {c.body}
            </button>
          );
        })}
      </div>

      {!submitted && (
        <button
          className="btn-primary mt-2 w-full disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!canSubmit || disabled}
          onClick={handleSubmit}
        >
          Submit answer
        </button>
      )}

      {showFeedback && feedback && (
        <div
          className={`mt-4 rounded-lg p-4 border ${
            feedback.correct ? "border-good bg-good/10" : "border-bad bg-bad/10"
          }`}
        >
          <p className={`font-semibold mb-1 ${feedback.correct ? "text-good" : "text-bad"}`}>
            {feedback.correct ? "Correct" : `Incorrect — correct answer: ${feedback.correct_labels.join(", ")}`}
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">{feedback.explanation}</p>
        </div>
      )}
    </div>
  );
}
