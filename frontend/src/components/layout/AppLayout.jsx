import { useState } from "react";
import useFocusTrap from "../../hooks/useFocusTrap";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { ProjectsProvider } from "../../context/ProjectContext";


export default function AppLayout(){
    const[drawerOpen, setDrawerOpen] = useState(false);
    const drawerRef = useFocusTrap(drawerOpen, ()=> setDrawerOpen(false));

    return(
        <ProjectsProvider>
            <div className="min-h-screen lg:flex">
            <a href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50
                    focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-ui
                    focus:font-medium focus:text-white">
                Skip to content
            </a>
            <aside className="hidden lg:block lg:w-60 lg:shrink-0 lg:border-r lg:border-line">
                <div className="sticky top-0 h-screen">
                    <Sidebar />
                </div>
            </aside>

            {drawerOpen && (
                <div className="lg:hidden">
                    <div className="fixed inset-0 z-30 bg-ink/20 animate-fade-in" onClick={() => setDrawerOpen(false)} aria-hidden="true"/>
                    <div ref={drawerRef} tabIndex={-1} className="fixed inset-y-0 left-0 z-40 w-64 animate-slide-in-left border-r border-line shadow-xl" role="dialog" aria-modal="true" aria-label="Navigation">                        <Sidebar onNavigate={() => setDrawerOpen(false)} />
                    </div>
                </div>
            )}

            <main id="main" className="min-w-0 flex-1">
                <Outlet context={{ openMenu: ()=> setDrawerOpen(true)}}/>
            </main>
        </div>
        </ProjectsProvider>
    )
}