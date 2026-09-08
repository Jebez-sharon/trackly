import { NavLink } from "react-router-dom";
import Logo from "../Logo";
import { useAuth } from "../../context/auth-context";

const NAV = [
    {to:"/board", label:"Board"},
    {to:"/team", label:"Team"},
];

export default function Sidebar({onNavigate}){
    const {user, activeOrg, activeOrgId, organizations, switchOrg, logout} = useAuth();

    return (
        <div className="flex h-full flex-col bg-surface">
            <div className="flex h-14 items-center gap-2 border-b border-line px-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
                    <Logo className="h-4 w-4"/>
                </span>
                <span className="text-[15px] font-semibold tracking-tight text-ink">Trackly</span>
            </div>

            <div className="px-3 pt-4">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Organization</p>

                    {organizations.length > 1 ?(
                        <div className="relative mt-1.5">
                        <select
                            aria-label="Switch organization"
                            value={activeOrgId ?? ""}
                            onChange={(e) => switchOrg(Number(e.target.value))} 
                            className="w-full appearance-none rounded-lg border border-line bg-surface
                         py-2 pl-2.5 pr-8 text-sm font-medium text-ink
                         hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/10">
                            {organizations.map((o) => (
                                <option value={o.id} key={o.id}>{o.name}</option>
                            ))}
                        </select>
                        <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                            viewBox="0 0 20 20" aria-hidden="true"
                        >
                            <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        </div>
                    ):(
                        <p className="mt-1.5 px-1 text-sm font-medium text-ink">{activeOrg?.name}</p>
                    )}

                    {
                        activeOrg && (
                            <p className="mt-1.5 px-1 text-xs capitalize text-ink-muted">{activeOrg.role}</p>
                        )
                    }
            </div>
            <nav className="mt-5 flex-1 px-3">
                <ul className="space-y-0.5">
                    {NAV.map((item)=>(
                        <li
                            key={item.to}>
                                <NavLink className={({isActive}) => `block rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-soft text-brand"
                      : "text-ink-soft hover:bg-canvas hover:text-ink"
                  }`}
                                    to={item.to}
                                    onClick={onNavigate}
                                >
                                    {item.label}
                                </NavLink>
                            </li>
                    ))}
                </ul>
            </nav>

            <div className="border-t border-line p-3">
                <div className="flex items-center gap-2.5 px-1">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                           bg-brand-soft text-[11px] font-semibold text-brand">
                        {user?.username?.slice(0,2).toUpperCase()}
                    </span>

                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                            {user?.username}
                        </span>
                        <span className="block truncate text-xs text-ink-muted">{user?.email}</span>
                    </span>
                </div>
                <button type="button"
                onClick={logout}
                className="mt-2 w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium
                     text-ink-soft transition-colors hover:bg-canvas hover:text-ink">
                    Sign out
                </button>
            </div>
        </div>
    )
}