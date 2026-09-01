"use client";
import { useRef, useState } from "react";
import { ChoiceDTO } from "@/lib/types";

interface Props {
  items: ChoiceDTO[];
  disabled?: boolean;
  onChange: (order: ChoiceDTO[]) => void;
  // Review mode: highlight each row green/red once the correct order is known.
  correctOrder?: { id: number }[] | null;
}

export default function OrderingQuestion({ items, disabled, onChange, correctOrder }: Props) {
  const [order, setOrder] = useState<ChoiceDTO[]>(items);
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const commit = (next: ChoiceDTO[]) => {
    setOrder(next);
    onChange(next);
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= order.length) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
  };

  // Pointer-based drag: works on both mouse and touch, unlike native HTML5
  // draggable (which most mobile browsers don't support) -- this app is meant
  // to be installed and used on a phone, so touch drag has to actually work.
  const handlePointerDown = (index: number) => {
    if (disabled) return;
    dragIndex.current = index;
  };
  const handlePointerEnter = (index: number) => {
    if (disabled || dragIndex.current === null) return;
    setDragOverIndex(index);
  };
  const handlePointerUp = () => {
    if (dragIndex.current !== null && dragOverIndex !== null) {
      move(dragIndex.current, dragOverIndex);
    }
    dragIndex.current = null;
    setDragOverIndex(null);
  };

  const correctIdAt = (i: number) => correctOrder?.[i]?.id;

  return (
    <div className="space-y-2" onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      {order.map((item, i) => {
        let cls = "flex items-center gap-3 rounded-lg border px-3 py-2.5 select-none";
        if (correctOrder) {
          cls += correctIdAt(i) === item.id ? " border-good bg-good/10" : " border-bad bg-bad/10";
        } else {
          cls += dragOverIndex === i ? " border-accent bg-accent/10" : " border-border bg-panel2";
        }
        return (
          <div
            key={item.id}
            className={cls}
            onPointerDown={() => handlePointerDown(i)}
            onPointerEnter={() => handlePointerEnter(i)}
          >
            <span className="text-gray-500 font-mono text-sm w-5 text-center">{i + 1}</span>
            <span className="flex-1 text-[15px]">{item.body}</span>
            {!disabled && !correctOrder && (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  aria-label="Move up"
                  className="text-gray-400 hover:text-gray-100 disabled:opacity-20 leading-none px-1"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  className="text-gray-400 hover:text-gray-100 disabled:opacity-20 leading-none px-1"
                  disabled={i === order.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        );
      })}
      {!correctOrder && (
        <p className="text-xs text-gray-500 pt-1">Drag to reorder, or use the arrow buttons.</p>
      )}
    </div>
  );
}
