"use client";
import { useState, useEffect } from "react";
import { QuestionDTO, ChoiceDTO } from "@/lib/types";
import OrderingQuestion from "./OrderingQuestion";
import MatchingQuestion from "./MatchingQuestion";

const DOMAIN_COLORS: Record<string, string> = {
  SO: "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50",
  VM: "bg-amber-900/50 text-amber-300 border border-amber-700/50",
  IR: "bg-rose-900/50 text-rose-300 border border-rose-700/50",
  RC: "bg-blue-900/50 text-blue-300 border border-blue-700/50",
};

export interface SubmitPayload {
  selected_labels?: string[];
  ordered_ids?: number[];
  pairs?: Record<number, number>;
  time_seconds: number;
}

interface Feedback {
  correct: boolean;
  correct_labels: string[];
  explanation: string;
  correct_order?: { id: number; label: string; body: string }[];
  correct_pairs?: { left: { id: number; label: string; body: string }; right: { id: number; label: string; body: string } }[];
}

interface Props {
  question: QuestionDTO;
  onSubmit: (payload: SubmitPayload) => void;
  // If provided, shows immediate correct/incorrect styling + explanation (drill mode).
  // If null, just collects the answer with no feedback (exam mode).
  feedback?: Feedback | null;
  disabled?: boolean;
  questionNumber?: number;
  totalQuestions?: number;
  // Review mode: show the answer state immediately (no click needed), pre-populated
  // with what the user actually selected during the exam.
  revealed?: boolean;
  initialSelected?: string[];
  // Review mode, ordering/matching: what the user actually submitted during the exam.
  initialOrderedIds?: number[];
  initialPairs?: Record<number, number>;
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
  initialOrderedIds,
  initialPairs,
}: Props) {
  const [selected, setSelected] = useState<string[]>(revealed ? initialSelected || [] : []);
  const initialOrderState =
    revealed && initialOrderedIds && initialOrderedIds.length > 0
      ? (initialOrderedIds
          .map((id) => question.choices.find((c) => c.id === id))
          .filter(Boolean) as ChoiceDTO[])
      : question.choices;
  const [orderState, setOrderState] = useState<ChoiceDTO[]>(initialOrderState);
  const [pairsState, setPairsState] = useState<Record<number, number>>(revealed ? initialPairs || {} : {});
  const [submitted, setSubmitted] = useState(!!revealed);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!revealed) {
      setSelected([]);
      setOrderState(question.choices);
      setPairsState({});
      setSubmitted(false);
      setElapsed(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, revealed]);

  useEffect(() => {
    if (revealed || submitted) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [question.id, revealed, submitted]);

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

  const canSubmit =
    question.type === "ordering"
      ? orderState.length > 0
      : question.type === "matching"
      ? question.choices.filter((c) => c.match_group === "left").every((l) => pairsState[l.id] !== undefined)
      : question.is_multi
      ? selected.length === question.select_n
      : selected.length === 1;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitted(true);
    if (question.type === "ordering") {
      onSubmit({ ordered_ids: orderState.map((o) => o.id), time_seconds: elapsed });
    } else if (question.type === "matching") {
      onSubmit({ pairs: pairsState, time_seconds: elapsed });
    } else {
      onSubmit({ selected_labels: selected, time_seconds: elapsed });
    }
  };

  const showFeedback = feedback !== undefined && feedback !== null && submitted;

  // Choices arrive pre-shuffled per fetch; display letters reflect that render order
  // rather than the fixed authored label, so position can't be pattern-matched.
  const displayLetterByLabel = new Map(
    question.choices.map((c, i) => [c.label, String.fromCharCode(65 + i)])
  );
  const correctDisplayLetters = feedback?.correct_labels
    .map((l) => displayLetterByLabel.get(l) || l)
    .sort();

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`badge ${DOMAIN_COLORS[question.domain_code] || "bg-gray-800"}`}>
            {question.domain_name}
          </span>
          {question.type !== "mcq" && (
            <span className="badge bg-purple-900/50 text-purple-300 border border-purple-700/50">
              {question.type === "ordering" ? "SEQUENCE" : question.type === "matching" ? "MATCH" : "HOTSPOT"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {question.difficulty >= 5 && (
            <span className="badge bg-rose-900/60 text-rose-300 border border-rose-700/50">
              BRUTAL
            </span>
          )}
          {!revealed && (
            <span className="font-mono text-xs px-2 py-1 rounded-md bg-panel2 text-gray-400">
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
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
        {question.is_multi && question.type === "mcq" && (
          <span className="text-accent font-semibold">(Select {question.select_n}) </span>
        )}
        {question.stem}
      </p>

      {question.exhibit && <pre className="exhibit-block">{question.exhibit}</pre>}

      <div className="mt-4">
        {question.type === "ordering" && (
          <OrderingQuestion
            items={initialOrderState}
            disabled={submitted || disabled}
            onChange={setOrderState}
            correctOrder={showFeedback ? feedback!.correct_order : null}
          />
        )}

        {question.type === "matching" && (
          <MatchingQuestion
            choices={question.choices}
            disabled={submitted || disabled}
            onChange={setPairsState}
            correctPairs={showFeedback ? feedback!.correct_pairs : null}
            initialPairs={revealed ? initialPairs : undefined}
          />
        )}

        {(question.type === "mcq" || question.type === "hotspot") &&
          question.choices.map((c, i) => {
            const isSelected = selected.includes(c.label);
            const isCorrectChoice = feedback?.correct_labels.includes(c.label);
            let cls = "choice";
            if (question.type === "hotspot") cls += " font-mono text-[13px]";
            if (showFeedback) {
              if (isCorrectChoice) cls += " choice-correct";
              else if (isSelected && !isCorrectChoice) cls += " choice-incorrect";
            } else if (isSelected) {
              cls += " choice-selected";
            }
            return (
              <button key={c.id} className={cls} onClick={() => toggle(c.label)} disabled={submitted || disabled}>
                {question.type === "mcq" && (
                  <span className="font-semibold text-gray-400 mr-2">{String.fromCharCode(65 + i)}.</span>
                )}
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
            {feedback.correct
              ? "Correct"
              : question.type === "mcq" || question.type === "hotspot"
              ? `Incorrect — correct answer: ${(correctDisplayLetters || []).join(", ")}`
              : "Incorrect — see the highlighted correct answer above"}
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">{feedback.explanation}</p>
        </div>
      )}
    </div>
  );
}
