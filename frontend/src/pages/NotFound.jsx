import { Link } from "react-router-dom"

export default function NotFound(){
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="text-center max-w-sm">
                <p className="text-body font-medium text-ink-muted">404</p>
                <h1 className="text-2xl font-semibold tracking-tight text-ink mt-2">Page not found</h1>
                <p className="text-ui text-ink-soft mt-2">
                    That page doesn't exist, or you don't have access to it.
                </p>
                
                <Link to="/board" className="inline-block mt-6 rounded-md bg-brand px-3 py-2 text-ui font-medium text-white transition-colors hover:bg-brand-hover">
                    Back to board
                </Link>
            </div>
        </div>
    )
}