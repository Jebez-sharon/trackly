import { useId } from "react";
import useFocusTrap from "../../hooks/useFocusTrap";

export default function Dialog({
  open,
  onClose,
  onDismiss,
  title,
  description,
  children,
}) {
  const titleId = useId();
  const dismiss = onDismiss || onClose;
  const panelRef = useFocusTrap(open, dismiss);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/20"
        onClick={dismiss}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-2xl
                   border border-line bg-surface shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[15px] font-semibold tracking-tight text-ink"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[13px] text-ink-soft">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center
                       rounded-lg text-ink-muted transition-colors
                       hover:bg-canvas hover:text-ink"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div tabIndex={0} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
