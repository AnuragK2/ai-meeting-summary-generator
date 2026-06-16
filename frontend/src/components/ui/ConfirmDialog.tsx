import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { Spinner } from "./Spinner";

export type ConfirmTone = "primary" | "danger";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual tone of the confirm button. Defaults to "primary". */
  tone?: ConfirmTone;
  /** When true, the confirm button shows a spinner and the dialog cannot be dismissed. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Accessible confirmation modal. Renders into `document.body` via a portal
 * so it cannot be clipped by an overflow:hidden ancestor.
 *
 * Accessibility notes:
 *  - role="dialog" + aria-modal="true"
 *  - aria-labelledby / aria-describedby bind to internal ids
 *  - Escape and backdrop click close the dialog (disabled while `loading`)
 *  - Focus is moved to the confirm button on open; the previously-focused
 *    element is restored when the dialog closes
 *  - Body scroll is locked while the dialog is open
 *
 * For a reusable design system we'd reach for @radix-ui/react-dialog; this
 * tiny implementation is enough for the app's single destructive action.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Move focus into the dialog on open, restore on close.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Defer to let the modal mount before focusing.
    const t = window.setTimeout(() => confirmRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape to close (ignored while loading).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const confirmClass = clsx(
    "btn",
    tone === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-500 disabled:bg-rose-300"
      : "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500 disabled:bg-indigo-300",
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden={false}
    >
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={() => !loading && onCancel()}
        className="absolute inset-0 cursor-default bg-slate-900/50 backdrop-blur-sm transition"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/5 animate-[fadeIn_150ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {description && (
          <div id={descId} className="mt-2 text-sm text-slate-600">
            {description}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={confirmClass}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Spinner />}
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
