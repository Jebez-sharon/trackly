import { useState } from "react";
import Dialog from "../ui/Dialog";
import api from "../../lib/api";
import Field from "../Field";

function keyFromName(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const raw =
    words.length > 1 ? words.map((w) => w[0]).join("") : words[0] || "";
  return raw
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10)
    .toUpperCase();
}

export default function NewProjectDialog({ open, orgId, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const dirty = Boolean(name || key || description);

  function reset() {
    setName("");
    setKey("");
    setKeyTouched(false);
    setDescription("");
    setError(null);
    setFieldErrors({});
  }

  function closeAndDiscard() {
    if (saving) return;
    reset();
    onClose();
  }

  function requestClose() {
    if (saving) return;
    if (dirty) {
      document.getElementById("project-name")?.focus();
      return;
    }
    onClose();
  }

  async function submit(e) {
    e.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    const trimmedKey = key.trim().toUpperCase();

    const errs = {};
    if (!trimmedName) errs.name = "Give the project a name";
    if (!trimmedKey) errs.key = "A key is required";
    else if (!/^[A-Z0-9]{1,10}$/.test(trimmedKey))
      errs.key = "1 to 10 letters or digits , nothing else.";

    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      document
        .getElementById(errs.name ? "project-name" : "project-key")
        ?.focus();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post(`/api/organizations/${orgId}/projects`, {
        name: trimmedName,
        key: trimmedKey,
        description: description.trim() || null,
      });
      reset();
      onCreated(data);
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
      title="New project"
      description="Projects group issues and give them a key."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5"
          >
            <p className="text-[13px] text-danger-text">{error}</p>
          </div>
        )}

        <Field
          id="project-name"
          label="Name"
          required
          value={name}
          error={fieldErrors.name}
          placeholder="Marketing site"
          onChange={(e) => {
            setName(e.target.value);
            if (!keyTouched) setKey(keyFromName(e.target.value));
          }}
        />
        <Field
          id="project-key"
          label="Key"
          required
          value={key}
          error={fieldErrors.key}
          hint="Shown on every issue in this project, like WEB-1."
          placeholder="WEB"
          maxLength={10}
          onChange={(e) => {
            setKeyTouched(true);
            setKey(e.target.value.toUpperCase());
          }}
        />

        <div>
          <label
            htmlFor="project-description"
            className="mb-1.5 block text-[13px] font-medium text-ink"
          >
            Description{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="project-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What lives in this project?"
            className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2
                       text-sm text-ink placeholder:text-ink-muted transition
                       hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={closeAndDiscard}
            disabled={saving}
            className="rounded-lg border border-line px-3 py-2 text-[13px] font-medium
                       text-ink transition-colors hover:bg-canvas disabled:opacity-60"
          >
            Cancel
          </button>
          <button type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-3 py-2 text-[13px] font-medium text-white
                       transition-colors hover:bg-brand-hover
                       disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Creating..." : "Create project"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
