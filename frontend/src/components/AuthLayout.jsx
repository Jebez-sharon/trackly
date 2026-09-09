import Logo from "./Logo";

export default function AuthLayout({title, subtitle, children, footer}){
    return(
        <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
        <div className="pointer-events-none absolute inset-0 auth-grid" aria-hidden="true" />
            <main className="relative w-full max-w-[400px]">
                <div className="flex items-center justify-center gap-2 mb-7">
                    <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-brand text-white shadow-sm">
                        <Logo className="w-[18px] h-[18px]"/>
                    </span>
                    <span className="text-ui font-semibold tracking-tight text-ink">Trackly</span>
                </div>

                {/* Two-layer shadow: a tight one for the edge, a wide soft one for
            lift. A single blunt shadow reads as a generic bootstrap card. */}
            <div className="rounded-xl border border-line bg-surface p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.18)]">
                <h1 className="text-display font-semibold tracking-tight text-ink">{title}</h1>
                <p className="mt-2 text-ui leading-relaxed text-ink-soft">{subtitle}</p>                <div className="mt-6">{children}</div>
            </div>

            <p className="mt-5 text-center text-body text-ink-soft">{footer}</p>
            </main>
        
    </div>
    )
}