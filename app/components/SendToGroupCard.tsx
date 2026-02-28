"use client";

type GroupRow = {
  chatId: number;
  chatTitle?: string;
};

export function SendToGroupCard({
  chatId,
  selectedChatId,
  groups,
  onSelect,
  onHaptic,
}: {
  chatId: number | null;
  selectedChatId: number | null;
  groups: GroupRow[] | undefined;
  onSelect: (chatId: number | null) => void;
  onHaptic?: () => void;
}) {
  const isLockedToCurrentChat = chatId !== null;

  return (
    <section className="score-card rounded-3xl border border-[var(--surface-border-strong)] bg-[var(--surface-1)] p-4 shadow-[var(--card-shadow)] backdrop-blur-xl">
      <div className="mb-3">
        <p className="score-kicker">Send To Group</p>
        <h2 className="score-title text-[1.75rem]">Posting target</h2>
      </div>

      {isLockedToCurrentChat ? (
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Current chat</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Messages save to this Telegram group.</p>
        </div>
      ) : !groups ? (
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text-secondary)]">
          Loading your groups...
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text-secondary)]">
          No linked groups yet. Open the app from a Telegram group to enable group posting.
        </div>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              onClick={() => {
                onHaptic?.();
                onSelect(null);
              }}
              className={`min-h-[48px] rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] transition ${
                selectedChatId === null
                  ? "border-[var(--action)] bg-[var(--action)]/20 text-[var(--text-primary)]"
                  : "border-[var(--surface-border)] bg-black/15 text-[var(--text-secondary)]"
              }`}
            >
              Solo only
            </button>

            {groups.map((group) => {
              const isSelected = selectedChatId === group.chatId;
              return (
                <button
                  key={group.chatId}
                  onClick={() => {
                    onHaptic?.();
                    onSelect(isSelected ? null : group.chatId);
                  }}
                  className={`min-h-[48px] rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] transition ${
                    isSelected
                      ? "border-[var(--action)] bg-[var(--action)]/20 text-[var(--text-primary)]"
                      : "border-[var(--surface-border)] bg-black/15 text-[var(--text-secondary)]"
                  }`}
                >
                  {group.chatTitle ?? `Group ${group.chatId}`}
                  {isSelected ? " ✓" : ""}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {selectedChatId === null
              ? "Logs save only to your own history."
              : "Logs save to your history and selected group leaderboard."}
          </p>
        </>
      )}
    </section>
  );
}
