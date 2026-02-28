"use client";

type ToastType = "success" | "error" | "info";

export type InlineToastMessage = {
  id: number;
  type: ToastType;
  message: string;
};

const TOAST_STYLE: Record<ToastType, string> = {
  success: "bg-emerald-500/90 border-emerald-300 text-white",
  error: "bg-rose-500/90 border-rose-300 text-white",
  info: "bg-sky-500/90 border-sky-300 text-white",
};

export function InlineToast({
  toast,
  onClose,
}: {
  toast: InlineToastMessage | null;
  onClose: () => void;
}) {
  if (!toast) return null;

  return (
    <div className="fixed inset-x-0 top-3 z-[70] flex justify-center px-4 pointer-events-none">
      <div
        role={toast.type === "error" ? "alert" : "status"}
        className={`pointer-events-auto w-full max-w-md rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-sm animate-[toast-in_180ms_ease-out] ${TOAST_STYLE[toast.type]}`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{toast.message}</p>
          <button
            onClick={onClose}
            className="rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-black/20 hover:bg-black/30 transition"
            aria-label="Dismiss notification"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
