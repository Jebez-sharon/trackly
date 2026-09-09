import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import Header from "../components/layout/Header";
import Avatar from "../components/ui/Avatar";
import Select from "../components/ui/Select";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import AddMemberDialog from "../components/team/AddMemberDialog";
import { useAuth } from "../context/auth-context";
import useFetch from "../lib/useFetch";
import api from "../lib/api";

function formatJoined(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Message({ children, tone = "muted" }) {
  const color = tone === "error" ? "text-danger-text" : "text-ink-soft";
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className={`text-body ${color}`}>{children}</p>
    </div>
  );
}

export default function Team() {
  const { openMenu } = useOutletContext();
  const { user, activeOrg, activeOrgId } = useAuth();

  const members = useFetch(
    activeOrgId ? `/api/organizations/${activeOrgId}/members` : null,
  );

  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState(null);

  const isAdmin = activeOrg?.role === "admin";
  const rows = members.data ?? [];
  // created_by rides along on every membership's organization payload.
  const ownerId = rows[0]?.organization?.created_by ?? null;

  async function changeRole(member, role) {
    setBusyId(member.id);
    setRowError(null);
    try {
      const { data } = await api.patch(
        `/api/organizations/${activeOrgId}/members/${member.id}`,
        { role },
      );
      members.setData((prev) =>
        prev ? prev.map((m) => (m.id === data.id ? data : m)) : prev,
      );
    } catch (e) {
      setRowError({ id: member.id, message: e.message });
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember() {
    await api.delete(
      `/api/organizations/${activeOrgId}/members/${removing.id}`,
    );
    members.setData((prev) =>
      prev ? prev.filter((m) => m.id !== removing.id) : prev,
    );
    setRemoving(null);
  }

  function handleAdded(member) {
    setAdding(false);
    members.setData((prev) => (prev ? [...prev, member] : [member]));
  }

  return (
    <>
      <Header title="Team" onOpenMenu={openMenu} />
      <div className="p-4 lg:p-6">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-display font-semibold tracking-tight text-ink">
            {activeOrg?.name || "Team"}
          </h2>
          {!members.loading && !members.error && (
            <span className="text-body text-ink-soft">
              {rows.length} member{rows.length === 1 ? "" : "s"}
            </span>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="ml-auto self-center rounded-lg bg-brand px-3 py-1.5 text-body
                         font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Add member
            </button>
          )}
        </div>

        {members.loading && <Message>Loading members...</Message>}

        {!members.loading && members.error && (
          <Message tone="error">{members.error}</Message>
        )}

        {!members.loading && !members.error && rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[520px] border-collapse">
              <thead className="border-b border-line">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-micro font-semibold uppercase tracking-wider text-ink-muted"
                  >
                    Member
                  </th>
                  <th
                    scope="col"
                    className="w-44 px-4 py-2.5 text-left text-micro font-semibold uppercase tracking-wider text-ink-muted"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="hidden w-36 px-4 py-2.5 text-left text-micro font-semibold uppercase tracking-wider text-ink-muted sm:table-cell"
                  >
                    Joined
                  </th>
                  {isAdmin && (
                    <th scope="col" className="w-24 px-4 py-2.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {rows.map((m) => {
                  const isOwner = m.user.id === ownerId;
                  const isSelf = m.user.id === user?.id;
                  // The owner cannot be demoted or removed - change_role and
                  // remove_member both reject it - so offering the control
                  // would only produce a 400.
                  const editable = isAdmin && !isOwner;
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-line last:border-b-0"
                    >
                      <td className="px-4 py-3 align-middle">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={m.user.username} size="md" />
                          <span className="min-w-0">
                            <span className="block truncate text-body font-medium text-ink">
                              {m.user.username}
                              {isSelf && (
                                <span className="ml-1.5 font-normal text-ink-muted">
                                  (you)
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-meta text-ink-muted">
                              {m.user.email}
                            </span>
                          </span>
                        </span>
                        {rowError?.id === m.id && (
                          <p
                            role="alert"
                            className="mt-1.5 text-meta text-danger-text"
                          >
                            {rowError.message}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 align-middle">
                        {editable ? (
                          <Select
                            label={null}
                            value={m.role}
                            disabled={busyId === m.id}
                            onChange={(e) => changeRole(m, e.target.value)}
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </Select>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-body capitalize text-ink-soft">
                            {m.role}
                            {isOwner && (
                              <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-micro font-medium capitalize text-brand">
                                Owner
                              </span>
                            )}
                          </span>
                        )}
                      </td>

                      <td className="hidden px-4 py-3 align-middle text-body text-ink-soft sm:table-cell">
                        {formatJoined(m.joined_at)}
                      </td>

                      {isAdmin && (
                        <td className="px-4 py-3 text-right align-middle">
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => setRemoving(m)}
                              className="rounded-lg px-2 py-1 text-body font-medium
                                         text-ink-soft transition-colors
                                         hover:bg-danger-soft hover:text-danger-text"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <AddMemberDialog
          open={adding}
          orgId={activeOrgId}
          onClose={() => setAdding(false)}
          onAdded={handleAdded}
        />

        <ConfirmDialog
          open={Boolean(removing)}
          title="Remove this member?"
          description={
            removing
              ? `${removing.user.username} will lose access to ${activeOrg?.name}. Their issues, comments and history stay.`
              : ""
          }
          confirmLabel="Remove member"
          onConfirm={removeMember}
          onClose={() => setRemoving(null)}
        />
      </div>
    </>
  );
}
