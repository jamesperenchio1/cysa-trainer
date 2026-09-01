"use client";
import { useState } from "react";
import { ChoiceDTO } from "@/lib/types";

interface Props {
  choices: ChoiceDTO[];
  disabled?: boolean;
  onChange: (pairs: Record<number, number>) => void;
  // Review mode: which left->right pairs were actually correct.
  correctPairs?: { left: { id: number }; right: { id: number } }[] | null;
  initialPairs?: Record<number, number>;
}

const CONNECTOR_COLORS = [
  "border-sky-500 text-sky-400",
  "border-amber-500 text-amber-400",
  "border-emerald-500 text-emerald-400",
  "border-pink-500 text-pink-400",
  "border-purple-500 text-purple-400",
  "border-teal-500 text-teal-400",
];

export default function MatchingQuestion({ choices, disabled, onChange, correctPairs, initialPairs }: Props) {
  const lefts = choices.filter((c) => c.match_group === "left");
  const rights = choices.filter((c) => c.match_group === "right");

  const [pairs, setPairs] = useState<Record<number, number>>(initialPairs || {});
  const [activeLeft, setActiveLeft] = useState<number | null>(null);

  const pairIndex = (leftId: number) => {
    const idx = Object.keys(pairs).indexOf(String(leftId));
    return idx;
  };

  const rightTakenBy = (rightId: number) =>
    Object.entries(pairs).find(([, r]) => r === rightId)?.[0];

  const clickLeft = (leftId: number) => {
    if (disabled) return;
    setActiveLeft((cur) => (cur === leftId ? null : leftId));
  };

  const clickRight = (rightId: number) => {
    if (disabled) return;
    if (activeLeft === null) return;
    const next = { ...pairs };
    // Un-pair anything else already using this right item.
    const existingLeftForRight = rightTakenBy(rightId);
    if (existingLeftForRight) delete next[Number(existingLeftForRight)];
    next[activeLeft] = rightId;
    setPairs(next);
    setActiveLeft(null);
    onChange(next);
  };

  const isRowCorrect = (leftId: number) => {
    if (!correctPairs) return null;
    const cp = correctPairs.find((p) => p.left.id === leftId);
    return cp ? pairs[leftId] === cp.right.id : false;
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {lefts.map((l) => {
            const idx = pairIndex(l.id);
            const color = idx >= 0 ? CONNECTOR_COLORS[idx % CONNECTOR_COLORS.length] : "";
            const correctness = isRowCorrect(l.id);
            let cls = "rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors";
            if (correctPairs) {
              cls += correctness ? " border-good bg-good/10" : " border-bad bg-bad/10";
            } else if (activeLeft === l.id) {
              cls += " border-accent bg-accent/10";
            } else if (idx >= 0) {
              cls += ` ${color} bg-panel2`;
            } else {
              cls += " border-border bg-panel2 hover:border-gray-500";
            }
            return (
              <div key={l.id} className={cls} onClick={() => clickLeft(l.id)}>
                {idx >= 0 && !correctPairs && (
                  <span className="font-mono text-xs mr-1.5 opacity-70">{idx + 1}</span>
                )}
                {l.body}
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          {rights.map((r) => {
            const takenByLeft = rightTakenBy(r.id);
            const idx = takenByLeft ? pairIndex(Number(takenByLeft)) : -1;
            const color = idx >= 0 ? CONNECTOR_COLORS[idx % CONNECTOR_COLORS.length] : "";
            let cls = "rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors";
            if (correctPairs) {
              const correctLeftForThisRight = correctPairs.find((p) => p.right.id === r.id)?.left.id;
              const userLeftForThisRight = takenByLeft ? Number(takenByLeft) : null;
              cls += userLeftForThisRight === correctLeftForThisRight ? " border-good bg-good/10" : " border-bad bg-bad/10";
            } else if (idx >= 0) {
              cls += ` ${color} bg-panel2`;
            } else {
              cls += " border-border bg-panel2 hover:border-gray-500";
            }
            return (
              <div key={r.id} className={cls} onClick={() => clickRight(r.id)}>
                {idx >= 0 && !correctPairs && (
                  <span className="font-mono text-xs mr-1.5 opacity-70">{idx + 1}</span>
                )}
                {r.body}
              </div>
            );
          })}
        </div>
      </div>
      {!correctPairs && (
        <p className="text-xs text-gray-500 pt-3">
          Tap an item on the left, then tap its match on the right.
        </p>
      )}
    </div>
  );
}
