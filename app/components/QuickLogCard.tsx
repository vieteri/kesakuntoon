"use client";

type ExerciseType = "pushup" | "squat" | "situp";

type ExerciseConfig = Record<ExerciseType, {
  label: string;
  accentHex: string;
}>;

export function QuickLogCard({
  values,
  onEdit,
  onSave,
  onClearAll,
  exerciseConfig,
  disabled,
  showInlineSave,
}: {
  values: Record<ExerciseType, number>;
  onEdit: (type: ExerciseType) => void;
  onSave: () => void;
  onClearAll: () => void;
  exerciseConfig: ExerciseConfig;
  disabled?: boolean;
  showInlineSave?: boolean;
}) {
  const exercises: ExerciseType[] = ["pushup", "squat", "situp"];
  const hasAnyAmount = exercises.some((type) => values[type] > 0);

  return (
    <section className="score-card rounded-3xl border border-[var(--surface-border-strong)] bg-[var(--surface-1)] p-4 shadow-[var(--card-shadow)] backdrop-blur-xl">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="score-kicker">Quick Log</p>
          <h2 className="score-title">Tap Exercise To Edit</h2>
        </div>
        <span className="score-badge">Batch Save</span>
      </div>

      <div className="space-y-2.5">
        {exercises.map((type) => (
          <button
            key={type}
            onClick={() => onEdit(type)}
            disabled={disabled}
            className="w-full rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-4 py-3 text-left transition hover:border-white/45 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex min-h-12 items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">{exerciseConfig[type].label}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Tap to edit amount</p>
              </div>
              <p className="score-number-sm" style={{ color: exerciseConfig[type].accentHex }}>
                {values[type]}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className={`mt-4 grid gap-2 ${showInlineSave ? "grid-cols-2" : "grid-cols-1"}`}>
        <button
          onClick={onClearAll}
          disabled={disabled || !hasAnyAmount}
          className="min-h-12 rounded-xl border border-[var(--surface-border)] bg-black/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear all
        </button>

        {showInlineSave && (
          <button
            onClick={onSave}
            disabled={disabled || !hasAnyAmount}
            className="min-h-12 rounded-xl bg-[var(--action)] px-4 py-3 text-xs font-black uppercase tracking-[0.13em] text-[var(--action-text)] shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition hover:brightness-105 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disabled ? "Saving..." : "Save workout"}
          </button>
        )}
      </div>
    </section>
  );
}
