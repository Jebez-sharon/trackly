import { useState } from "react";
import Dialog from "./Dialog";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // While the request is in flight there is no safe way out: the row may or
  // may not be gone, so closing would leave the caller guessing.
  const guardedClose = () => {
    if (!busy) onClose();
  };

  return (
    <Dialog open={open} onClose={guardedClose} title={title}>
      <p className="text-body text-ink-soft">{description}</p>

      {error && (
        <p role="alert" className="mt-3 text-meta text-danger-text">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={guardedClose}
          disabled={busy}
          className="rounded-lg border border-line px-3 py-2 text-body font-medium
                     text-ink transition-colors hover:bg-surface-hover disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="rounded-lg bg-danger px-3 py-2 text-body font-medium text-white
                     transition-colors hover:bg-danger-text
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Deleting..." : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
