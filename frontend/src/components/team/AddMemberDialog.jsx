import { useState } from "react";
import Dialog from "../ui/Dialog";
import Select from "../ui/Select";
import Field from "../Field";
import api from "../../lib/api";

export default function AddMemberDialog({ open, orgId, onClose, onAdded }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState(null);

  const dirty = Boolean(email);

  function reset() {
    setEmail("");
    setRole("member");
    setError(null);
    setFieldError(null);
  }

  function closeAndDiscard() {
    if (saving) return;
    reset();
    onClose();
  }

  function requestClose() {
    if (saving) return;
    if (dirty) {
      document.getElementById("member-email")?.focus();
      return;
    }
    onClose();
  }

  async function submit(e) {
    e.preventDefault();
    if (saving) return;

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setFieldError("Enter their email address.");
      document.getElementById("member-email")?.focus();
      return;
    }

    setFieldError(null);
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post(
        `/api/organizations/${orgId}/members`,
        { email: trimmed, role },
      );
      reset();
      onAdded(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={closeAndDiscard}
      onDismiss={requestClose}
      title="Add a member"
      description="They need a Trackly account already. Emailed invitations are not built yet."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-danger-line bg-danger-soft px-3 py-2.5"
          >
            <p className="text-body text-danger-text">{error}</p>
          </div>
        )}

        <Field
          id="member-email"
          label="Email"
          type="email"
          required
          value={email}
          error={fieldError}
          placeholder="them@company.com"
          onChange={(e) => setEmail(e.target.value)}
        />

        <Select
          id="member-role"
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </Select>

        <p className="text-meta text-ink-muted">
          Members can read every project and file issues. Admins can also create
          and delete projects, and manage this list.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={closeAndDiscard}
            disabled={saving}
            className="rounded-lg border border-line px-3 py-2 text-body font-medium
                       text-ink transition-colors hover:bg-surface-hover disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-3 py-2 text-body font-medium text-white
                       transition-colors hover:bg-brand-hover
                       disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add member"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
