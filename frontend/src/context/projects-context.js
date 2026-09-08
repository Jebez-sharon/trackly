import { createContext, useContext } from "react";

export const ProjectContext = createContext(null);

export function useProjects(){
    const ctx = useContext(ProjectContext)
    if (!ctx) throw new Error('useProjects must be used inside <ProjectProvider>')
        return ctx;
}