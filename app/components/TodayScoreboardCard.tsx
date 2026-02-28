"use client";

type ExerciseType = "pushup" | "squat" | "situp";

type ExerciseConfig = Record<ExerciseType, {
  label: string;
  accentHex: string;
}>;

export function TodayScoreboardCard({
  stats,
  targets,
  exerciseConfig,
}: {
  stats: Record<ExerciseType, number>;
  targets: Record<ExerciseType, number>;
  exerciseConfig: ExerciseConfig;
}) {
  const exercises: ExerciseType[] = ["pushup", "squat", "situp"];
  const completed = exercises.filter((type) => stats[type] >= targets[type]).length;

  return (
    <section className="score-card rounded-3xl border border-[var(--surface-border-strong)] bg-[var(--surface-1)] p-4 shadow-[var(--card-shadow)] backdrop-blur-xl">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="score-kicker">Today Scoreboard</p>
          <h2 className="score-title">{completed}/3 Goals Complete</h2>
        </div>
        <span className="score-badge">Daily Targets</span>
      </div>

      <div className="space-y-3">
        {exercises.map((type) => {
          const count = stats[type];
          const target = targets[type];
          const pct = Math.min(100, target > 0 ? Math.round((count / target) * 100) : 100);
          const done = count >= target;

          return (
            <div key={type} className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  {exerciseConfig[type].label}
                </p>
                <p className="text-xs font-semibold text-[var(--text-muted)]">target {target}</p>
              </div>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="score-number" style={{ color: exerciseConfig[type].accentHex }}>
                  {count}
                </p>
                <p className={`text-xs font-bold uppercase tracking-[0.14em] ${done ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>
                  {done ? "Goal hit" : `${pct}%`}
                </p>
              </div>
              <div className="h-2 rounded-full bg-black/30">
                <div
                  className="h-2 rounded-full transition-[width] duration-300"
                  style={{ width: `${pct}%`, backgroundColor: exerciseConfig[type].accentHex }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
