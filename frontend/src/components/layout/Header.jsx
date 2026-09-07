export default function Header({title, onOpenMenu, actions}){
    return(
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line
                       bg-surface/80 px-4 backdrop-blur lg:px-6">
            <button type="button"
                onClick={onOpenMenu}
                aria-label="Open navigation"
                className="-ml-1 rounded-lg p-2 text-ink-soft transition-colors
                   hover:bg-canvas hover:text-ink lg:hidden"
            >
                <svg className="h-5 w-5" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M3 6h14M3 10h14M3 14h14" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
            </button>

            <h1 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h1>
            <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>
    )
}