import { useCallback, useMemo, useState } from "react";
import { useAuth } from "./auth-context";
import { useNavigate } from "react-router-dom";
import useFetch from "../lib/useFetch";
import { ProjectContext } from "./projects-context";
import NewProjectDialog from "../components/projects/NewProjectDialog";

export function ProjectsProvider({ children }) {
  const { activeOrg, activeOrgId } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState();

  const { data, loading, error, errorStatus, refetch } = useFetch(
    activeOrgId ? `/api/organizations/${activeOrgId}/projects` : null,
  );

  const canCreateProject = activeOrg?.role === "admin";
  const openNewProject = useCallback(() => setCreating(true), []);

  const value = useMemo(
    () => ({
      projects: data || [],
      loading,
      error,
      errorStatus,
      refetch,
      canCreateProject,
      openNewProject,
    }),
    [
      data,
      loading,
      error,
      errorStatus,
      refetch,
      canCreateProject,
      openNewProject,
    ],
  );

  async function handleCreated(project) {
    setCreating(false);
    await refetch({ quiet: true });
    navigate(`/board/${project.id}`);
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
      <NewProjectDialog
        open={creating}
        orgId={activeOrgId}
        onClose={() => setCreating(false)}
        onCreated={handleCreated}
      />
    </ProjectContext.Provider>
  );
}
