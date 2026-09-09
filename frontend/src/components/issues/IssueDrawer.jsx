import useFocusTrap from "../../hooks/useFocusTrap";
import useFetch from "../../lib/useFetch";
import {
  statusMeta,
  priorityMeta,
  SEVERITIES,
  ISSUE_TYPES,
  STATUSES,
  STATUS_ORDER,
} from "../../lib/constants";
import { useMemo, useRef, useState } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/auth-context";

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
    default:
      return a.action.replace(/_/g, " ");
  }
}

function Avatar({ name }) {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                         bg-brand-soft text-micro font-semibold text-brand"
    >
      {(name || "?").slice(0, 2).toUpperCase()}
    </span>
  );
}

function Meta({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-micro font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 text-body text-ink">{children}</dd>
    </div>
  );
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

function Select({ label, value, onChange, disabled, children }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full appearance-none rounded-lg border border-line bg-surface py-1.5 pl-2.5 pr-8
                           text-body font-medium text-ink hover:border-line-strong
                           focus:border-brand focus:ring-4 focus:ring-brand/10
                           disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          d="M6 8l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
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
          // Escape backs out of the composer before it reaches the
          // drawer, so a stray keypress cannot throw away a draft.
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

export default function IssueDrawer({ issueId, onClose, onIssueChanged }) {
  const open = Boolean(issueId);
  const panelRef = useFocusTrap(open, onClose);
  const {
    data: issue,
    setData: setIssue,
    loading,
    error,
    refetch,
  } = useFetch(open ? `/api/issues/${issueId}` : null);
  const draftRef = useRef(false);

  const {user, activeOrg, activeOrgId} = useAuth();
  const memberReq = useFetch(
    open && activeOrgId ? `/api/organizations/${activeOrgId}/members`: null,
  );

  const [busy, setBusy] = useState(false);
  const[mutError, setMutError] = useState(null)

  const nameById = useMemo(() =>{
    const map = new Map();
    for (const m of memberReq.data ?? []) map.set(String(m.user.id),
    m.user.username);
    return map;
  }, [memberReq.data]);

  if (!open) return null;

  const s = issue ? statusMeta(issue.status) : null;
  const p = issue ? priorityMeta(issue.priority) : null;

  const members = memberReq.data??[];
  const nameOf = (id) => nameById.get(String(id)) || "someone";

  const canEdit= Boolean(issue) && (activeOrg?.role==="admin" || issue.assignee?.id === user?.id);

  async function  mutate(body) {
    setBusy(true)
    setMutError(null);
    try{
        const {data} = await api.patch(`/api/issues/${issue.id}`, body);
        onIssueChanged?.(issue.id, {status:data.status, assignee:data.assignee});
        await refetch({quiet:true});
    }catch(e){
        setMutError(e.message)
    }finally{
        setBusy(false)
    }
    
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink/20 animate-fade-in"
        onClick={() => {
          if (draftRef.current) {
            document.getElementById("new-comment")?.focus();
            return;
          }
          onClose();
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-y-0 right-0 flex w-full animate-slide-in-right flex-col border-l border-line
                           bg-surface shadow-xl sm:max-w-xl"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-5">
          <span className="font-mono text-meta font-medium text-ink-muted">
            {issue?.issue_key || "Issue"}
          </span>
          <button
            type="button"
            className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg
                                   text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            onClick={onClose}
            aria-label="Close issue"
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

        <div tabIndex={0} className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <p className="px-5 py-8 text-body text-ink-soft">
              Loading issue...
            </p>
          )}

          {!loading && error && (
            <div className="px-5 py-8">
              <p className="text-body text-danger-text">{error}</p>
              <button
                type="button"
                onClick={refetch}
                className="mt-3 rounded-lg border border-line px-3 py-1.5
                                                       text-body font-medium text-ink transition-colors
                                                       hover:bg-surface-hover"
              >
                Try again
              </button>
            </div>
          )}
          {!loading && !error && issue && (
            <>
              <div className="px-5 py-4">
                <h2
                  className="text-title font-semibold leading-snug tracking-tight text-ink"
                  id="drawer-title"
                >
                  {issue.title}
                </h2>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                  <Meta label="Status">
                  {canEdit ? (
                    <Select
                    label="Status"
                        value={issue.status}
                        disabled={busy}
                        onChange={(e) => mutate({ status: e.target.value })}>
                            {STATUS_ORDER.map((k)=>(
                        <option value={k} key={k}>
                            {STATUSES[k].label}
                        </option>
                    ))}
                    </Select>
                  ):(
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
                  </Meta>
                  <Meta label="Priority">
                    <span
                      className={`inline-flex items-center gap-1.5 text-meta font-medium ${p.text}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.dot}`}
                        aria-hidden="true"
                      />
                      {p.label}
                    </span>
                  </Meta>

                  <Meta label="Type">
                    {ISSUE_TYPES[issue.issue_type]?.label ||
                      issue.issue_type ||
                      "-"}
                  </Meta>

                  <Meta label="Severity">
                    {SEVERITIES[issue.severity]?.label || issue.severity || "-"}
                  </Meta>

                  <Meta label="Assignee">
                  {canEdit && members.length > 0 ? (
                    <Select label="Assignee"
                        disabled={busy}
                        value={issue.assignee?.id ?? ""}
                        onChange={(e) =>
                          mutate({
                            assignee_id:
                              e.target.value === "" ? null : Number(e.target.value),
                          })
                        }>
                        <option value="">Unassigned</option>
                        {members.map((m)=>(
                            <option value={m.user.id} key={m.user.id}>
                                {m.user.username}
                            </option>
                        ))}
                    </Select>
                  ):
                    issue.assignee ? (
                      <span className="flex items-center gap-2">
                        <Avatar name={issue.assignee.username} />
                        <span className="truncate">
                          {issue.assignee.username}
                        </span>
                      </span>
                    ) : (
                      <span className="text-ink-muted">Unassigned</span>
                    )}
                  </Meta>

                  <Meta label="Reporter">
                    <span className="flex items-center gap-2">
                      <Avatar name={issue.reporter?.username} />
                      <span className="truncate">
                        {issue.reporter?.username}
                      </span>
                    </span>
                  </Meta>
                </dl>
                {mutError && (
                    <p className="mt-3 text-meta text-danger-text" role="alert">{mutError}</p>
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

              <Section title={`Comments (${issue.comments?.length ?? 0})`}>
                {issue.comments?.length ? (
                  <ul className="space-y-4">
                    {issue.comments.map((c) => (
                      <li key={c.id} className="flex gap-2.5">
                        <Avatar name={c.author?.username} />
                        <div className="min-w-0 flex-1">
                          <p className="text-body">
                            <span className="font-medium text-ink">
                              {c.author?.username}
                            </span>
                            <span className="ml-2 text-meta text-ink-muted">
                              {formatDate(c.created_at)}
                            </span>
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap text-body leading-relaxed text-ink-soft">
                            {c.message}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body text-ink-muted">No comments yet.</p>
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

              <Section title="Activity">
                {issue.activities?.length ? (
                  <ol className="space-y-2.5">
                    {issue.activities.map((a) => (
                      <li key={a.id} className="text-body text-ink-soft">
                        <span className="font-medium text-ink">
                          {a.user?.username}
                        </span>{" "}
                        {activityText(a,nameOf)}
                        <span className="ml-2 text-meta text-ink-muted">
                          {formatDate(a.created_at)}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-body text-ink-muted">
                    No activity recorded
                  </p>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
