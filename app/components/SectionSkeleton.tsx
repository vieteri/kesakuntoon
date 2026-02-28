"use client";

export function SectionSkeleton({
  rows = 3,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-4 ${className}`}>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded-full skeleton"
            style={{ width: i === rows - 1 ? "70%" : "100%" }}
          />
        ))}
      </div>
    </div>
  );
}
