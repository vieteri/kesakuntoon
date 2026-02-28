"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ExerciseType = "pushup" | "squat" | "situp";

const QUICK_CHIPS = [5, 10, 20, 50];
const MIN_VALUE = 0;
const MAX_VALUE = 9999;

function clamp(value: number) {
  return Math.max(MIN_VALUE, Math.min(MAX_VALUE, value));
}

export function AmountEntrySheet({
  open,
  type,
  label,
  value,
  accentColor,
  onClose,
  onApply,
  onHaptic,
}: {
  open: boolean;
  type: ExerciseType;
  label: string;
  value: number;
  accentColor: string;
  onClose: () => void;
  onApply: (next: number) => void;
  onHaptic?: () => void;
}) {
  const [draftInput, setDraftInput] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;

    setDraftInput(String(value));

    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 60);

    return () => clearTimeout(timer);
  }, [open, value]);

  useEffect(() => {
    return () => {
      if (holdRef.current) clearInterval(holdRef.current);
    };
  }, []);

  const parsedDraft = useMemo(() => {
    const n = Number.parseInt(draftInput || "0", 10);
    if (!Number.isFinite(n)) return 0;
    return clamp(n);
  }, [draftInput]);

  const step = (delta: number) => {
    setDraftInput((prev) => {
      const current = Number.parseInt(prev || "0", 10) || 0;
      return String(clamp(current + delta));
    });
    onHaptic?.();
  };

  const startHold = (delta: number) => {
    step(delta);
    if (holdRef.current) clearInterval(holdRef.current);
    holdRef.current = setInterval(() => {
      setDraftInput((prev) => {
        const current = Number.parseInt(prev || "0", 10) || 0;
        return String(clamp(current + delta));
      });
    }, 120);
  };

  const stopHold = () => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-[var(--surface-border-strong)] bg-[var(--sheet-surface)] p-4 shadow-2xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="score-kicker">Edit Amount</p>
            <h3 className="score-title text-2xl">{label}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--surface-border)] bg-black/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]"
          >
            Close
          </button>
        </div>

        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--sheet-surface-2)] p-3">
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]" htmlFor={`amount-input-${type}`}>
            Reps
          </label>
          <input
            id={`amount-input-${type}`}
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draftInput}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "");
              setDraftInput(next === "" ? "0" : String(clamp(Number.parseInt(next, 10))));
            }}
            className="h-16 w-full rounded-xl border border-[var(--surface-border)] bg-black/35 px-3 text-center text-4xl font-black tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--action)]"
            style={{ color: accentColor }}
          />

          <div className="mt-3 grid grid-cols-4 gap-2">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => step(chip)}
                className="min-h-12 rounded-xl border border-[var(--surface-border)] bg-black/30 px-2 py-2 text-sm font-bold text-[var(--text-primary)] active:scale-[0.98]"
              >
                +{chip}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onPointerDown={() => startHold(-1)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              className="min-h-12 rounded-xl border border-[var(--surface-border)] bg-black/30 px-2 py-2 text-xl font-black text-[var(--text-primary)] active:scale-[0.98]"
            >
              -1
            </button>
            <button
              onPointerDown={() => startHold(1)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              className="min-h-12 rounded-xl border border-[var(--surface-border)] bg-black/30 px-2 py-2 text-xl font-black text-[var(--text-primary)] active:scale-[0.98]"
            >
              +1
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="min-h-12 rounded-xl border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(parsedDraft)}
            className="min-h-12 rounded-xl bg-[var(--action)] px-3 py-2 text-sm font-black uppercase tracking-[0.1em] text-[var(--action-text)]"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
