import { useMemo, useRef, useState } from "react";
import useFocusTrap from "../../hooks/useFocusTrap";
import useFetch from "../../lib/useFetch";
import api from "../../lib/api";
import { useAuth } from "../../context/auth-context";
import Select from "../ui/Select";
import Avatar from "../ui/Avatar";
import ConfirmDialog from "../ui/ConfirmDialog";
import EditIssueDialog from "./EditIssueDialog";
import {
  statusMeta,
  priorityMeta,
  SEVERITIES,
  ISSUE_TYPES,
  STATUSES,
  STATUS_ORDER,
} from "../../lib/constants";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const FIELD_LABELS = {
  title: "title",
  description: "description",
  steps_to_reproduce: "steps to reproduce",
  issue_type: "type",
  priority: "priority",
  severity: "severity",
};

// "title", "title and priority", "title, priority and severity"
function joinFields(list) {
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

function activityText(a, nameOf) {
  switch (a.action) {
    case "created":
      return "created this issue";
    case "status_changed":
      return `moved this from ${statusMeta(a.old_value).label} to ${statusMeta(a.new_value).label}`;
    case "assigned":
      return `assigned this to ${nameOf(a.new_value)}`;
    case "unassigned":
      return `unassigned this from ${nameOf(a.old_value)}`;
    case "edited": {
      // old_value and new_value are String(100), so the server records which
      // fields moved rather than a diff.
      const fields = (a.extra_data?.fields ?? []).map(
        (f) => FIELD_LABELS[f] || f.replace(/_/g, " "),
      );
      return fields.length
        ? `edited the ${joinFields(fields)}`
        : "edited this issue";
    }
    default:
      return a.action.replace(/_/g, " ");
  }
}

function Section({ title, children }) {
  return (
    <section className="border-t border-line px-5 py-4">
      <h3 className="text-micro font-semibold uppercase tracking-wider text-ink-muted">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

// When the cell holds a control, the caption has to be a real <label> bound to
// it - ui/Select only renders its own label when given one, so a <p> here
// leaves the select with no accessible name.
function MetaCell({ label, htmlFor, children }) {
  const Caption = htmlFor ? "label" : "p";
  return (
    <div className="min-w-0">
      <Caption
        {...(htmlFor ? { htmlFor } : {})}
        className="block text-micro font-semibold uppercase tracking-wider text-ink-muted"
      >
        {label}
      </Caption>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function StepButton({ label, onClick, disabled, path }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted
                 transition-colors hover:bg-surface-hover hover:text-ink
                 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function CommentForm({ issueId, onAdded, onDraftChange }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const boxRef = useRef(null);

  async function submit(e) {
    e.preventDefault();
    const text = message.trim();
    if (!text || saving) return;

    setSaving(true);
    setErr(null);
    try {
      const { data } = await api.post(`/api/issues/${issueId}/comments`, {
        message: text,
      });
      setMessage("");
      onDraftChange?.(false);
      onAdded(data);
      // The button is about to disable itself, and a disabled element cannot
      // hold focus - without this, focus falls to <body>, outside the trap.
      boxRef.current?.focus();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <label htmlFor="new-comment" className="sr-only">
        Add a comment
      </label>
      <textarea
        ref={boxRef}
        rows={3}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          onDraftChange?.(Boolean(e.target.value.trim()));
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
            return;
          }
          // Escape backs out of the composer before it reaches the drawer, so
          // a stray keypress cannot throw away a draft.
          if (e.key === "Escape" && message) {
            e.stopPropagation();
            e.currentTarget.blur();
          }
        }}
        placeholder="Add a comment"
        id="new-comment"
        className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2
                   text-body text-ink placeholder:text-ink-muted
                   hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/10"
      />
      {err && (
        <p role="alert" className="mt-1.5 text-meta text-danger-text">
          {err}
        </p>
      )}

      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={!message.trim() || saving}
          className="rounded-lg bg-brand px-3 py-1.5 text-body font-medium text-white
                     transition-colors hover:bg-brand-hover
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Posting..." : "Comment"}
        </button>
      </div>
    </form>
  );
}

export default function IssueDrawer({
  issueId,
  onClose,
  onIssueChanged,
  onIssueDeleted,
  siblingIds = [],
  onNavigate,
}) {
  const open = Boolean(issueId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // The drawer and any dialog it opens all listen for Escape on document, so a
  // single keypress would close both. While one is open, it owns Escape.
  const panelRef = useFocusTrap(open, () => {
    if (!confirmOpen && !editOpen) onClose();
  });
  const {
    data: issue,
    setData: setIssue,
    loading,
    error,
    refetch,
  } = useFetch(open ? `/api/issues/${issueId}` : null);
  const draftRef = useRef(false);

  const { user, activeOrg, activeOrgId } = useAuth();
  const memberReq = useFetch(
    open && activeOrgId ? `/api/organizations/${activeOrgId}/members` : null,
  );

  const [busy, setBusy] = useState(false);
  const [mutError, setMutError] = useState(null);

  const nameById = useMemo(() => {
    const map = new Map();
    for (const m of memberReq.data ?? [])
      map.set(String(m.user.id), m.user.username);
    return map;
  }, [memberReq.data]);

  // One chronological stream. Kept apart, you cannot see that someone changed
  // the status and then explained why - which is most of the value of a history.
  const feed = useMemo(() => {
    const items = [
      ...(issue?.activities ?? []).map((a) => ({
        kind: "activity",
        key: `a-${a.id}`,
        at: a.created_at,
        data: a,
      })),
      ...(issue?.comments ?? []).map((c) => ({
        kind: "comment",
        key: `c-${c.id}`,
        at: c.created_at,
        data: c,
      })),
    ];
    items.sort((x, y) => new Date(x.at) - new Date(y.at));
    return items;
  }, [issue]);

  if (!open) return null;

  const s = issue ? statusMeta(issue.status) : null;
  const p = issue ? priorityMeta(issue.priority) : null;

  const members = memberReq.data ?? [];
  const nameOf = (id) => nameById.get(String(id)) || "someone";

  const canEdit =
    Boolean(issue) &&
    (activeOrg?.role === "admin" || issue.assignee?.id === user?.id);

  // Deliberately stricter than canEdit, matching delete_issue on the server:
  // an assignee moves an issue along, an admin destroys it.
  const canDelete = Boolean(issue) && activeOrg?.role === "admin";

  // Mirrors _may_edit_content: the reporter can correct what their own issue
  // says, even though they cannot reassign or close it.
  const canEditContent =
    canEdit || (Boolean(issue) && issue.reporter?.id === user?.id);

  const position = siblingIds.indexOf(Number(issueId));
  const prevId = position > 0 ? siblingIds[position - 1] : null;
  const nextId =
    position >= 0 && position < siblingIds.length - 1
      ? siblingIds[position + 1]
      : null;

  function handleSaved(updated) {
    setEditOpen(false);
    // The PATCH response is to_dict_detailed, so it already carries the new
    // activity row and the comments - no refetch needed.
    setIssue(updated);
    onIssueChanged?.(updated.id, {
      title: updated.title,
      priority: updated.priority,
      issue_type: updated.issue_type,
      severity: updated.severity,
    });
  }

  async function deleteIssue() {
    await api.delete(`/api/issues/${issue.id}`);
    setConfirmOpen(false);
    onIssueDeleted?.(issue.id);
  }

  async function mutate(body) {
    setBusy(true);
    setMutError(null);
    try {
      const { data } = await api.patch(`/api/issues/${issue.id}`, body);
      onIssueChanged?.(issue.id, {
        status: data.status,
        assignee: data.assignee,
      });
      await refetch({ quiet: true });
    } catch (e) {
      setMutError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink/20 animate-fade-in"
        onClick={() => {
          // A click outside must not discard a typed comment. Pulling focus to
          // the composer shows the user why it stayed open.
          if (draftRef.current) {
            document.getElementById("new-comment")?.focus();
            return;
          }
          onClose();
        }}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="absolute inset-y-0 right-0 flex w-full animate-slide-in-right flex-col
                   border-l border-line bg-surface shadow-xl sm:max-w-2xl"
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-mono text-meta font-medium text-ink-muted">
              {issue?.issue_key || "Issue"}
            </span>
            {siblingIds.length > 1 && (
              <span className="flex items-center">
                <StepButton
                  label="Previous issue"
                  path="M12 5l-5 5 5 5"
                  disabled={!prevId}
                  onClick={() => onNavigate?.(prevId)}
                />
                <StepButton
                  label="Next issue"
                  path="M8 5l5 5-5 5"
                  disabled={!nextId}
                  onClick={() => onNavigate?.(nextId)}
                />
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {canEditContent && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="rounded-lg px-2.5 py-1.5 text-body font-medium text-ink-soft
                           transition-colors hover:bg-surface-hover hover:text-ink"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                aria-label="Delete issue"
                className="flex h-9 w-9 items-center justify-center rounded-lg
                           text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger-text"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M4 6h12M8 6V4.5h4V6M6.5 6l.5 9h6l.5-9M8.5 8.5v4M11.5 8.5v4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close issue"
              className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg
                         text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
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
        </div>

        <div tabIndex={0} className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <p className="px-5 py-8 text-body text-ink-soft">Loading issue...</p>
          )}

          {!loading && error && (
            <div className="px-5 py-8">
              <p className="text-body text-danger-text">{error}</p>
              <button
                type="button"
                onClick={refetch}
                className="mt-3 rounded-lg border border-line px-3 py-1.5 text-body
                           font-medium text-ink transition-colors hover:bg-surface-hover"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && issue && (
            <>
              <div className="px-5 py-4">
                <h2
                  id="drawer-title"
                  className="text-title font-semibold leading-snug tracking-tight text-ink"
                >
                  {issue.title}
                </h2>

                {/* Only the three fields anyone acts on. Type, severity and
                    reporter are reference data and sit below the description. */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MetaCell
                    label="Status"
                    htmlFor={canEdit ? "drawer-status" : undefined}
                  >
                    {canEdit ? (
                      <Select
                        id="drawer-status"
                        value={issue.status}
                        disabled={busy}
                        onChange={(e) => mutate({ status: e.target.value })}
                      >
                        {STATUS_ORDER.map((k) => (
                          <option key={k} value={k}>
                            {STATUSES[k].label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-meta font-medium ${s.soft} ${s.text}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`}
                          aria-hidden="true"
                        />
                        {s.label}
                      </span>
                    )}
                  </MetaCell>

                  <MetaCell label="Priority">
                    <span
                      className={`inline-flex items-center gap-1.5 py-1.5 text-body font-medium ${p.text}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.dot}`}
                        aria-hidden="true"
                      />
                      {p.label}
                    </span>
                  </MetaCell>

                  <MetaCell
                    label="Assignee"
                    htmlFor={
                      canEdit && members.length > 0 ? "drawer-assignee" : undefined
                    }
                  >
                    {canEdit && members.length > 0 ? (
                      <Select
                        id="drawer-assignee"
                        value={issue.assignee?.id ?? ""}
                        disabled={busy}
                        onChange={(e) =>
                          mutate({
                            assignee_id:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.user.id} value={m.user.id}>
                            {m.user.username}
                          </option>
                        ))}
                      </Select>
                    ) : issue.assignee ? (
                      <span className="flex items-center gap-2 py-1.5">
                        <Avatar name={issue.assignee.username} />
                        <span className="truncate text-body">
                          {issue.assignee.username}
                        </span>
                      </span>
                    ) : (
                      <span className="block py-1.5 text-body text-ink-muted">
                        Unassigned
                      </span>
                    )}
                  </MetaCell>
                </div>

                {mutError && (
                  <p role="alert" className="mt-3 text-meta text-danger-text">
                    {mutError}
                  </p>
                )}
              </div>

              <Section title="Description">
                {issue.description ? (
                  <p className="whitespace-pre-wrap text-body leading-relaxed text-ink-soft">
                    {issue.description}
                  </p>
                ) : (
                  <p className="text-body text-ink-muted">No description</p>
                )}
              </Section>

              {issue.steps_to_reproduce && (
                <Section title="Steps to reproduce">
                  <p className="whitespace-pre-wrap text-body leading-relaxed text-ink-soft">
                    {issue.steps_to_reproduce}
                  </p>
                </Section>
              )}

              {/* Reference data, one line, out of the way. */}
              <div className="border-t border-line px-5 py-3 text-meta text-ink-muted">
                {ISSUE_TYPES[issue.issue_type]?.label || issue.issue_type} &middot;{" "}
                {SEVERITIES[issue.severity]?.label || issue.severity} severity
                &middot; reported by {issue.reporter?.username} on{" "}
                {formatDay(issue.created_at)}
              </div>

              <Section title="Activity">
                {feed.length ? (
                  <ol className="space-y-4">
                    {feed.map((item) =>
                      item.kind === "comment" ? (
                        <li key={item.key} className="flex gap-2.5">
                          <Avatar name={item.data.author?.username} />
                          <div className="min-w-0 flex-1">
                            <p className="text-body">
                              <span className="font-medium text-ink">
                                {item.data.author?.username}
                              </span>
                              <span className="ml-2 text-meta text-ink-muted">
                                {formatDate(item.at)}
                              </span>
                            </p>
                            <p className="mt-0.5 whitespace-pre-wrap text-body leading-relaxed text-ink-soft">
                              {item.data.message}
                            </p>
                          </div>
                        </li>
                      ) : (
                        <li
                          key={item.key}
                          className="flex gap-2.5 text-meta text-ink-muted"
                        >
                          <span
                            className="mt-1.5 ml-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium text-ink-soft">
                              {item.data.user?.username}
                            </span>{" "}
                            {activityText(item.data, nameOf)}
                            <span className="ml-2">{formatDate(item.at)}</span>
                          </span>
                        </li>
                      ),
                    )}
                  </ol>
                ) : (
                  <p className="text-body text-ink-muted">Nothing yet.</p>
                )}

                <CommentForm
                  issueId={issue.id}
                  onDraftChange={(has) => {
                    draftRef.current = has;
                  }}
                  onAdded={(c) => {
                    setIssue((prev) => ({
                      ...prev,
                      comments: [...(prev.comments || []), c],
                      comment_count: (prev.comment_count || 0) + 1,
                    }));
                    onIssueChanged?.(issue.id, {
                      comment_count: (issue.comment_count || 0) + 1,
                    });
                  }}
                />
              </Section>
            </>
          )}
        </div>
      </div>

      {issue && (
        <EditIssueDialog
          // Remount on open so the form re-seeds from the current issue rather
          // than holding whatever was typed the last time it was cancelled.
          key={`${issue.id}-${editOpen}`}
          open={editOpen}
          issue={issue}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this issue?"
        description={
          issue
            ? `${issue.issue_key} and its ${issue.comments?.length ?? 0} comment${
                (issue.comments?.length ?? 0) === 1 ? "" : "s"
              } and full activity history will be removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete issue"
        onConfirm={deleteIssue}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
