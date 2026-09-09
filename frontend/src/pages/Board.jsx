import { useState } from "react";
import IssueDrawer from "../components/issues/IssueDrawer";
import Header from "../components/layout/Header";
import { Navigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { useProjects } from "../context/projects-context";
import useFetch from "../lib/useFetch";
import { statusMeta, priorityMeta } from "../lib/constants";
import NewIssueDialog from "../components/issues/NewIssueDialog";

function IssueRow({ issue, onOpen }) {
  const s = statusMeta(issue.status);
  const p = priorityMeta(issue.priority);
  return (
    <tr
      onClick={() => onOpen(issue.id)}
      className="cursor-pointer border-b border-line last:border-b-0 hover:bg-canvas"
    >
      <td className="px-4 py-3 align-top">
        <span className="font-mono text-[12px] font-medium text-ink-muted">
          {issue.issue_key}
        </span>
      </td>

      <td className="px-4 py-3 align-top">
        <button
          type="button"
          onClick={() => onOpen(issue.id)}
          className="block rounded text-left text-[13px] font-medium text-ink hover:text-brand"
        >
          {issue.title}
        </button>
        {issue.comment_count > 0 && (
          <span className="mt-0.5 block text-xs text-ink-muted">
            {issue.comment_count} comment{issue.comment_count === 1 ? "" : "s"}
          </span>
        )}
      </td>

      <td className="hidden px-4 py-3 align-top sm:table-cell">
        <span
          className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${p.text}`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.dot}`}
            aria-hidden="true"
          />
          {p.label}
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${s.soft} ${s.text}`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`}
            aria-hidden="true"
          />
          {s.label}
        </span>
      </td>

      <td className="hidden px-4 py-3 align-top text-[13px] text-ink-soft md:table-cell">
        {issue.assignee ? (
          issue.assignee.username
        ) : (
          <span className="text-ink-muted">Unassigned</span>
        )}
      </td>
    </tr>
  );
}

function Message({ children, tone = "muted", action }) {
  const color = tone === "error" ? "text-danger-text" : "text-ink-soft";
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className={`text-[13px] ${color}`}>{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default function Board() {
  const { openMenu } = useOutletContext();
  const { activeOrg } = useAuth();
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    canCreateProject,
    openNewProject,
    refetch: refetchProjects,
  } = useProjects();
  const { projectId } = useParams();
  const [openIssueId, setOpenIssueId] = useState(null);
  const [creatingIssue, setCreatingIssue] = useState(false);

  const current = projectId
    ? projects.find((p) => String(p.id) === projectId)
    : null;

  const issues = useFetch(
    current ? `/api/projects/${current.id}/issues` : null,
  );

  const patchIssue = (id, patch) =>
    issues.setData((prev) =>
      prev ? prev.map((i) => (i.id === id ? { ...i, ...patch } : i)) : prev,
    );
  async function handleIssueCreated(issue) {
    setCreatingIssue(false);
    issues.setData((prev) => (prev ? [...prev, issue] : [issue]));
    await refetchProjects({ quiet: true });
  }

  if (!projectsLoading && !projectId && projects.length > 0) {
    return <Navigate to={`/board/${projects[0].id}`} replace />;
  }

  if (!projectsLoading && projectId && !current && projects.length > 0) {
    return <Navigate to={`/board/${projects[0].id}`} replace />;
  }

  return (
    <>
      <Header title={current ? current.name : "Board"} onOpenMenu={openMenu} />
      <div className="p-4 lg:p-6">
        {projectsLoading && <Message>Loading projects</Message>}

        {!projectsLoading && projectsError && (
          <Message tone="error">{projectsError}</Message>
        )}
        {!projectsLoading && !projectsError && projects.length === 0 && (
          <Message
            action={
              canCreateProject ? (
                <button
                  type="button"
                  onClick={openNewProject}
                  className="rounded-lg bg-brand px-3 py-2 text-[13px] font-medium text-white
                                       transition-colors hover:bg-brand-hover"
                >
                  New Project
                </button>
              ) : null
            }
          >
            {canCreateProject
              ? `No Projects in ${activeOrg?.name || "this organization"} yet. create the first one.`
              : `No Projects in ${activeOrg?.name || "this organization"} yet. An admin can create one.`}
          </Message>
        )}

        {current && (
          <>
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-[20px] font-semibold tracking-tight text-ink">
                {current.name}
              </h2>
              <span className="rounded-md bg-canvas px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-muted">
                {current.key}
              </span>
              <span className="text-[13px] text-ink-soft">
                {current.issue_count} issue
                {current.issue_count === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => setCreatingIssue(true)}
                className="ml-auto self-center rounded-lg bg-brand px-3 py-1.5 text-[13px]
                                       font-medium text-white transition-colors hover:bg-brand-hover"
              >
                New issue
              </button>
            </div>

            {current.description && (
              <p className="mb-4 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
                {current.description}
              </p>
            )}

            {issues.loading && <Message>Loading issues...</Message>}

            {!issues.loading && issues.error && (
              <Message tone="error">{issues.error}</Message>
            )}

            {!issues.loading &&
              !issues.error &&
              issues.data &&
              issues.data.length === 0 && (
                <Message
                action={
                    <button type="button"
                      onClick={() => setCreatingIssue(true)}
                      className="rounded-lg bg-brand px-3 py-2 text-[13px] font-medium text-white
                                 transition-colors hover:bg-brand-hover">
                        New Issue
                    </button>
                }
                >
                  Nothing has been reported in {current.name} yet.
                </Message>
              )}

            {!issues.loading &&
              !issues.error &&
              issues.data &&
              issues.data.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                  <table className="w-full min-w-[560px] border-collapse">
                    <thead className="border-b border-line">
                      <tr>
                        <th
                          scope="col"
                          className="w-24 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
                        >
                          Key
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
                        >
                          Title
                        </th>
                        <th
                          scope="col"
                          className="hidden w-32 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted sm:table-cell"
                        >
                          Priority
                        </th>
                        <th
                          scope="col"
                          className="w-36 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="hidden w-40 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted md:table-cell"
                        >
                          Assignee
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {issues.data.map((issue) => (
                        <IssueRow
                          key={issue.id}
                          issue={issue}
                          onOpen={setOpenIssueId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            <IssueDrawer
              issueId={openIssueId}
              onClose={() => setOpenIssueId(null)}
              onIssueChanged={patchIssue}
            />
            <NewIssueDialog 
            open={creatingIssue}
              projectId={current.id}
              onClose={() => setCreatingIssue(false)}
              onCreated={handleIssueCreated}
            />
          </>
        )}
      </div>
    </>
  );
}
