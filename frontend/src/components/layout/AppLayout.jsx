import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout(){
    const[drawerOpen, setDrawerOpen] = useState(false);
    const drawerRef = useRef(null);
    const lastFocused = useRef(null);

    function openDrawer(){
        lastFocused.current = document.activeElement;
        setDrawerOpen(true);
    }

    useEffect(() => {
        if(!drawerOpen) return;

        const node = drawerRef.current;
        const SELECTOR = 'a[href], button:not([disabled]), select,input, [tabindex]:not([tabindex="-1"])'
        const focusables = () => [...node.querySelectorAll(SELECTOR)];

        focusables()[0]?.focus();

        const onKey = (e) => {
            if (e.key === "Escape") {setDrawerOpen(false); return;}
        if(e.key !== "Tab")return;

            const items = focusables();
            if(!items.length) return;
            const first = items[0], last = items[items.length -1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
            };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
            lastFocused.current?.focus();
        };
    }, [drawerOpen]);

    return(
        <div className="min-h-screen lg:flex">
            <a href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50
                    focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm
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
                    <div className="fixed inset-0 z-30 bg-ink/20" onClick={() => setDrawerOpen(false)} aria-hidden="true"/>
                    <div ref={drawerRef} className="fixed inset-y-0 left-0 z-40 w-64 border-r border-line shadow-xl" role="dialog" aria-modal="true" aria-label="Navigation">
                        <Sidebar onNavigate={() => setDrawerOpen(false)} />
                    </div>
                </div>
            )}

            <main id="main" className="min-w-0 flex-1">
                <Outlet context={{ openMenu: openDrawer}}/>
            </main>
        </div>
    )
}