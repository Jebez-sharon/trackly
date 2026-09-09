import { useState } from "react";
import Dialog from "../ui/Dialog";
import Select from "../ui/Select";
import Field from "../Field";
import api from "../../lib/api";
import {
  ISSUE_TYPE_ORDER,
  ISSUE_TYPES,
  PRIORITIES,
  PRIORITY_ORDER,
  SEVERITIES,
  SEVERITY_ORDER,
} from "../../lib/constants";

const TITLE_MAX = 150;

function Area({ id, label, optional, value, onChange, error, rows = 3, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-body font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full resize-y rounded-lg border bg-surface px-3 py-2 text-ui text-ink
                    placeholder:text-ink-muted transition focus:ring-4
                    ${
                      error
                        ? "border-danger focus:border-danger focus:ring-danger/10"
                        : "border-line hover:border-line-strong focus:border-brand focus:ring-brand/10"
                    }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-meta text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}

export default function EditIssueDialog({ open, issue, onClose, onSaved }) {
  // Seeded from the issue each time the dialog is opened, by the key on the
  // element in IssueDrawer - a remount is simpler than syncing seven fields.
  const [title, setTitle] = useState(issue?.title ?? "");
  const [description, setDescription] = useState(issue?.description ?? "");
  const [steps, setSteps] = useState(issue?.steps_to_reproduce ?? "");
  const [issueType, setIssueType] = useState(issue?.issue_type ?? "bug");
  const [priority, setPriority] = useState(issue?.priority ?? "no_priority");
  const [severity, setSeverity] = useState(issue?.severity ?? "low");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const dirty =
    title !== (issue?.title ?? "") ||
    description !== (issue?.description ?? "") ||
    steps !== (issue?.steps_to_reproduce ?? "") ||
    issueType !== (issue?.issue_type ?? "bug") ||
    priority !== (issue?.priority ?? "no_priority") ||
    severity !== (issue?.severity ?? "low");

  function requestClose() {
    if (saving) return;
    if (dirty) {
      document.getElementById("edit-title")?.focus();
      return;
    }
    onClose();
  }

  async function submit(e) {
    e.preventDefault();
    if (saving) return;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    const errs = {};
    if (!trimmedTitle) errs.title = "The title cannot be empty.";
    else if (trimmedTitle.length > TITLE_MAX)
      errs.title = `Keep the title to ${TITLE_MAX} characters.`;
    if (!trimmedDescription) errs.description = "The description cannot be empty.";

    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(errs.title ? "edit-title" : "edit-description")?.focus();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Send everything; the server compares against the current row and only
      // records the fields that actually moved.
      const { data } = await api.patch(`/api/issues/${issue.id}`, {
        title: trimmedTitle,
        description: trimmedDescription,
        steps_to_reproduce: steps.trim() || null,
        issue_type: issueType,
        priority,
        severity,
      });
      onSaved(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => {} : onClose}
      onDismiss={requestClose}
      title={`Edit ${issue?.issue_key ?? "issue"}`}
      description="Status and assignee are changed from the issue itself."
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
          id="edit-title"
          label="Title"
          required
          value={title}
          error={fieldErrors.title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Area
          id="edit-description"
          label="Description"
          value={description}
          error={fieldErrors.description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Area
          id="edit-steps"
          label="Steps to reproduce"
          optional
          rows={4}
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            id="edit-type"
            label="Type"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
          >
            {ISSUE_TYPE_ORDER.map((k) => (
              <option key={k} value={k}>
                {ISSUE_TYPES[k].label}
              </option>
            ))}
          </Select>

          <Select
            id="edit-priority"
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITY_ORDER.map((k) => (
              <option key={k} value={k}>
                {PRIORITIES[k].label}
              </option>
            ))}
          </Select>

          <Select
            id="edit-severity"
            label="Severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            {SEVERITY_ORDER.map((k) => (
              <option key={k} value={k}>
                {SEVERITIES[k].label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-line px-3 py-2 text-body font-medium
                       text-ink transition-colors hover:bg-surface-hover disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !dirty}
            className="rounded-lg bg-brand px-3 py-2 text-body font-medium text-white
                       transition-colors hover:bg-brand-hover
                       disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
