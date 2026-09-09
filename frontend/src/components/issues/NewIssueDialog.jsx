import { useState } from "react";
import Dialog from "../ui/Dialog";
import Select from "../ui/Select";
import Field from "../Field";
import api from "../../lib/api";
import useFetch from "../../lib/useFetch";
import { useAuth } from "../../context/auth-context";
import {
  ISSUE_TYPE_ORDER,
  ISSUE_TYPES,
  PRIORITIES,
  PRIORITY_ORDER,
  SEVERITIES,
  SEVERITY_ORDER,
} from "../../lib/constants";

const TITLE_MAX = 150;

function Area({
  id,
  label,
  optional,
  value,
  onChange,
  error,
  rows = 3,
  placeholder,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[13px] font-medium text-ink"
      >
        {label}
        {optional && (
          <span className="font-normal text-ink-muted"> (optional)</span>        )}
      </label>

      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm text-ink
                    placeholder:text-ink-muted transition focus:ring-4
                    ${
                      error
                        ? "border-danger focus:border-danger focus:ring-danger/10"
                        : "border-line hover:border-line-strong focus:border-brand focus:ring-brand/10"
                    }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}

export default function NewIssueDialog({
  open,
  projectId,
  onClose,
  onCreated,
}) {
  const { activeOrgId } = useAuth();
  const membersReq = useFetch(
    open && activeOrgId ? `/api/organizations/${activeOrgId}/members` : null,
  );
  const members = membersReq.data ?? [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [issueType, setIssueType] = useState("bug");
  const [priority, setPriority] = useState("no_priority");
  const [severity, setSeverity] = useState("low");
  const [assigneeId, setAssigneeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const dirty = Boolean(title || description || steps);

  function reset() {
    setTitle("");
    setDescription("");
    setSteps("");
    setIssueType("bug");
    setPriority("no_priority");
    setSeverity("low");
    setAssigneeId("");
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
      document.getElementById("issue-title")?.focus();
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
    if (!trimmedTitle) errs.title = "Give the issue a title.";
    else if (trimmedTitle.length > TITLE_MAX)
      errs.title = `Keep the title to ${TITLE_MAX} characters.`;
    if (!trimmedDescription) errs.description = "Describe what happens.";

    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      document
        .getElementById(errs.title ? "issue-title" : "issue-description")
        ?.focus();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post(`/api/projects/${projectId}/issues`, {
        title: trimmedTitle,
        description: trimmedDescription,
        steps_to_reproduce: steps.trim() || null,
        issue_type: issueType,
        priority,
        severity,
                assignee_id: assigneeId === "" ? null : Number(assigneeId),
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
      title="New issue"
      description="Everything except the title and description can change later."
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
          id="issue-title"
          label="Title"
          required
          value={title}
          error={fieldErrors.title}
          maxLength={TITLE_MAX}
          placeholder="Login button does nothing"
          onChange={(e) => setTitle(e.target.value)}
        />
        <Area
          id="issue-description"
          label="Description"
          value={description}
          error={fieldErrors.description}
          placeholder="What happens, and what did you expect instead?"
          onChange={(e) => setDescription(e.target.value)}
        />
        <Area
          id="issue-steps"
          label="Steps to reproduce"
          optional
          rows={4}
          value={steps}
          placeholder={"1. Open /login\n2. Click Sign in\n3. Nothing happens"}
          onChange={(e) => setSteps(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            id="issue-type"
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
            id="issue-priority"
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
            id="issue-severity"
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

          <Select
            id="issue-assignee"
            label="Assignee"
            value={assigneeId}
            disabled={members.length === 0}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.username}
              </option>
            ))}
          </Select>
        

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
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-3 py-2 text-[13px] font-medium text-white
                       transition-colors hover:bg-brand-hover
                       disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create issue"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
