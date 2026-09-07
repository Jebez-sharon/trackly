export default function Button({children, loading, ...props}){
    return(
        <button
        {...props}
        disabled={loading || props.disabled}
        className="w-full min-h-[44px] rounded-lg bg-brand px-3 py-2.5 text-sm font-medium text-white
                 shadow-sm transition-all
                 hover:bg-brand-hover hover:shadow
                 active:scale-[0.99] active:shadow-sm
                 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
            {children}
        </button>
    );
}