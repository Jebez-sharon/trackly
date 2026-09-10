import { useState } from "react";
import IssueDrawer from "../components/issues/IssueDrawer";
import Header from "../components/layout/Header";
import {
  Navigate,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { useProjects } from "../context/projects-context";
import useFetch from "../lib/useFetch";
import { statusMeta, priorityMeta } from "../lib/constants";
import NewIssueDialog from "../components/issues/NewIssueDialog";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import api from "../lib/api";

// Below sm the table becomes cards. A five-column table inside a horizontal
// scroller is the worst thing you can hand someone on a phone, and three of
// the five columns were hidden at that width anyway.
function IssueCard({ issue, onOpen }) {
  const s = statusMeta(issue.status);
  const p = priorityMeta(issue.priority);
  return (
    <li
      onClick={() => onOpen(issue.id)}
      className="cursor-pointer px-4 py-3 transition-colors hover:bg-surface-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-meta font-medium text-ink-muted">
          {issue.issue_key}
        </span>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-meta font-medium ${s.soft} ${s.text}`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`}
            aria-hidden="true"
          />
          {s.label}
        </span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          // The card also handles clicks; without this the issue opens twice
          // and pushes two history entries.
          e.stopPropagation();
          onOpen(issue.id);
        }}
        className="mt-1 block rounded text-left text-body font-medium text-ink hover:text-brand"
      >
        {issue.title}
      </button>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-muted">
        <span className={`inline-flex items-center gap-1.5 font-medium ${p.text}`}>
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.dot}`}
            aria-hidden="true"
          />
          {p.label}
        </span>
        <span>
          {issue.assignee ? issue.assignee.username : "Unassigned"}
        </span>
        {issue.comment_count > 0 && (
          <span>
            {issue.comment_count} comment{issue.comment_count === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </li>
  );
}

function IssueRow({ issue, onOpen }) {
  const s = statusMeta(issue.status);
  const p = priorityMeta(issue.priority);
  return (
    <tr
      onClick={() => onOpen(issue.id)}
      className="cursor-pointer border-b border-line last:border-b-0 hover:bg-surface-hover"
    >
      <td className="px-4 py-3 align-top">
        <span className="font-mono text-meta font-medium text-ink-muted">
          {issue.issue_key}
        </span>
      </td>

      <td className="px-4 py-3 align-top">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(issue.id);
          }}
          className="block rounded text-left text-body font-medium text-ink hover:text-brand"
        >
          {issue.title}
        </button>
        {issue.comment_count > 0 && (
          <span className="mt-0.5 block text-meta text-ink-muted">
            {issue.comment_count} comment{issue.comment_count === 1 ? "" : "s"}
          </span>
        )}
      </td>

      <td className="hidden px-4 py-3 align-top sm:table-cell">
        <span
          className={`inline-flex items-center gap-1.5 whitespace-nowrap text-meta font-medium ${p.text}`}
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
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-meta font-medium ${s.soft} ${s.text}`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`}
            aria-hidden="true"
          />
          {s.label}
        </span>
      </td>

      <td className="hidden px-4 py-3 align-top text-body text-ink-soft md:table-cell">
        {issue.assignee ? (
          issue.assignee.username
        ) : (
          <span className="text-ink-muted">Unassigned</span>
        )}
      </td>
    </tr>
  );
}

// The server derives pages from total; optimistic updates have to do the same
// or the pager keeps offering a page that has stopped existing.
const pagesFor = (total, perPage) =>
  Math.max(1, Math.ceil(total / (perPage || 1)));

function Pager({ page, pages, total, perPage, onPage }) {
  if (!pages || pages <= 1) return null;
  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);
  return (
    <nav
      aria-label="Issue pages"
      className="mt-3 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-meta text-ink-muted" aria-live="polite">
        {first}&ndash;{last} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-line px-3 py-1.5 text-body font-medium
                     text-ink transition-colors hover:bg-surface-hover
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-meta text-ink-muted">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="rounded-lg border border-line px-3 py-1.5 text-body font-medium
                     text-ink transition-colors hover:bg-surface-hover
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

function Message({ children, tone = "muted", action }) {
  const color = tone === "error" ? "text-danger-text" : "text-ink-soft";
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className={`text-body ${color}`}>{children}</p>
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
  const { projectId, issueId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const navigate = useNavigate();

  const isAdmin = activeOrg?.role === "admin";

  const openIssue = (id) => navigate(`/board/${projectId}/issues/${id}`);
  // replace, so closing does not leave the issue sitting in history where Back
  // would immediately reopen it.
  const closeIssue = () => navigate(`/board/${projectId}`, { replace: true });

  const current = projectId
    ? projects.find((p) => String(p.id) === projectId)
    : null;

  // The page lives in the URL, so a paged view is shareable and Back works,
  // the same reason the open issue does.
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const issues = useFetch(
    current ? `/api/projects/${current.id}/issues?page=${page}` : null,
  );

  // The response is { items, page, per_page, total, pages }, so every read and
  // every optimistic update goes through .items rather than the body itself.
  const rows = issues.data?.items ?? [];

  const goToPage = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    setSearchParams(params);
  };

  const patchIssue = (id, patch) =>
    issues.setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === id ? { ...i, ...patch } : i,
            ),
          }
        : prev,
    );

  async function handleIssueCreated(issue) {
    setCreatingIssue(false);
    // Appending is only right on the last page, and only while it has room.
    // On an earlier page, or a last page already at per_page, the new issue
    // belongs on a page we are not looking at - so refetch instead of
    // rendering a 51st row in a 50-row page.
    const onLastPage = issues.data && page >= (issues.data.pages || 1);
    const hasRoom =
      issues.data && issues.data.items.length < issues.data.per_page;
    if (onLastPage && hasRoom) {
      issues.setData((prev) => {
        const total = (prev.total || 0) + 1;
        return {
          ...prev,
          items: [...prev.items, issue],
          total,
          pages: pagesFor(total, prev.per_page),
        };
      });
    } else {
      await issues.refetch({ quiet: true });
    }
    await refetchProjects({ quiet: true });
  }

  async function handleIssueDeleted(id) {
    issues.setData((prev) => {
      if (!prev) return prev;
      const total = Math.max((prev.total || 1) - 1, 0);
      return {
        ...prev,
        items: prev.items.filter((i) => i.id !== id),
        total,
        // pages is derived from total, so leaving it alone strands a Next
        // button pointing at a page that no longer exists.
        pages: pagesFor(total, prev.per_page),
      };
    });
    // Close before refetching: the drawer is reading an issue that no longer
    // exists, and leaving it mounted would show "Issue not found".
    closeIssue();

    // Removing the only issue on a later page empties it, which unmounts the
    // list and the pager with it - leaving "nothing has been reported here"
    // on a project that has plenty, and no control to get back.
    if (rows.length === 1 && page > 1) goToPage(page - 1);

    await refetchProjects({ quiet: true });
  }

  async function deleteProject() {
    await api.delete(`/api/projects/${current.id}`);
    setConfirmDeleteProject(false);
    await refetchProjects({ quiet: true });
    // /board redirects to whichever project is now first, or shows the empty
    // state if that was the last one.
    navigate("/board", { replace: true });
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
                  className="rounded-lg bg-brand px-3 py-2 text-body font-medium text-white
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
              <h2 className="text-display font-semibold tracking-tight text-ink">
                {current.name}
              </h2>
              <span className="rounded-md bg-canvas px-1.5 py-0.5 font-mono text-micro font-medium text-ink-muted">
                {current.key}
              </span>
              <span className="text-body text-ink-soft">
                {current.issue_count} issue
                {current.issue_count === 1 ? "" : "s"}
              </span>
              <div className="ml-auto flex items-center gap-2 self-center">
                <button
                  type="button"
                  onClick={() => setCreatingIssue(true)}
                  className="rounded-lg bg-brand px-3 py-1.5 text-body
                             font-medium text-white transition-colors hover:bg-brand-hover"
                >
                  New issue
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteProject(true)}
                    className="rounded-lg border border-line px-3 py-1.5 text-body
                               font-medium text-ink-soft transition-colors
                               hover:border-danger-line hover:bg-danger-soft hover:text-danger-text"
                  >
                    Delete project
                  </button>
                )}
              </div>
            </div>

            {current.description && (
              <p className="mb-4 max-w-2xl text-body leading-relaxed text-ink-soft">
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
              rows.length === 0 && (
                <Message
                action={
                    <button type="button"
                      onClick={() => setCreatingIssue(true)}
                      className="rounded-lg bg-brand px-3 py-2 text-body font-medium text-white
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
              rows.length > 0 && (
                <>
                <ul className="divide-y divide-line rounded-xl border border-line bg-surface sm:hidden">
                  {rows.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} onOpen={openIssue} />
                  ))}
                </ul>

                <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface sm:block">
                  <table className="w-full border-collapse">
                    <thead className="border-b border-line">
                      <tr>
                        <th
                          scope="col"
                          className="w-24 px-4 py-2.5 text-left text-micro font-semibold uppercase tracking-wider text-ink-muted"
                        >
                          Key
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-2.5 text-left text-micro font-semibold uppercase tracking-wider text-ink-muted"
                        >
                          Title
                        </th>
                        <th
                          scope="col"
                          className="hidden w-32 px-4 py-2.5 text-left text-micro font-semibold uppercase tracking-wider text-ink-muted sm:table-cell"
                        >
                          Priority
                        </th>
                        <th
                          scope="col"
                          className="w-36 px-4 py-2.5 text-left text-micro font-semibold uppercase tracking-wider text-ink-muted"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="hidden w-40 px-4 py-2.5 text-left text-micro font-semibold uppercase tracking-wider text-ink-muted md:table-cell"
                        >
                          Assignee
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((issue) => (
                        <IssueRow
                          key={issue.id}
                          issue={issue}
                          onOpen={openIssue}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pager
                  page={issues.data.page}
                  pages={issues.data.pages}
                  total={issues.data.total}
                  perPage={issues.data.per_page}
                  onPage={goToPage}
                />
                </>
              )}
            <IssueDrawer
              issueId={issueId}
              onClose={closeIssue}
              onIssueChanged={patchIssue}
              onIssueDeleted={handleIssueDeleted}
              // Prev/next walks the list in the order it is displayed.
              siblingIds={rows.map((i) => i.id)}
              onNavigate={openIssue}
            />
            <ConfirmDialog
              open={confirmDeleteProject}
              title="Delete this project?"
              description={`${current.name} and all ${current.issue_count} of its issues, with their comments and history, will be removed. This cannot be undone.`}
              confirmLabel="Delete project"
              onConfirm={deleteProject}
              onClose={() => setConfirmDeleteProject(false)}
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
