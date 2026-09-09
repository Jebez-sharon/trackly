import { Component } from "react";

export default class ErrorBoundary extends Component{
    constructor(props){
        super(props);
        this.state = {hasError : false};
    }

    static getDerivedStateFromError(){
        return {hasError:true}
    }

    componentDidCatch(error, info){
        console.error('Unhandled UI error',error,info?.componentStack)
    }

    render(){
        if (!this.state.hasError) return this.props.children;

        return(
            <div className="flex min-h-screen items-center justify-center px-4">
                <div className="w-full max-w-sm text-center">
                    <h1 className="text-display font-semibold tracking-tight text-ink">
                        Something went wrong
                    </h1>
                    <p className="mt-2 text-body leading-relaxed text-ink-soft">
                        The page hit an unexpected error. reloading usually clears it. If it keeps happening , sign  out and back in.
                    </p>

                    <button type="button"
                    onClick={()=>window.location.reload()}
                    className="mt-6 min-h-[44px] rounded-lg bg-brand px-4 text-ui font-medium text-white
                                   shadow-sm transition-all hover:bg-brand-hover hover:shadow active:scale-[0.99]"
                    >
                        Reload the page
                    </button>
                </div>
            </div>
        )
    }
}