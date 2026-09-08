import { useMemo } from "react";
import { useAuth } from "./auth-context";
import useFetch from '../lib/useFetch';
import { ProjectContext } from "./projects-context";

export function ProjectsProvider({children}){
    const { activeOrgId} = useAuth();

    const {data, loading, error, errorStatus, refetch} = useFetch(
        activeOrgId ? `/api/organizations/${activeOrgId}/projects`:null
    );

    const value = useMemo(
        () => ({
            projects:data || [], loading, error, errorStatus, refetch
        }),
        [data, loading,error,errorStatus,refetch]
    );

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}
