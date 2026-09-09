import { useState } from "react";

export default function Field({id, label, hint,error, type='text', ...inputProps}){
    const[revealed, setRevealed] = useState(false)
    const isPassword = type === 'password';
    const actualType = isPassword && revealed ?'text':type;
    return(
        <div>
            <label htmlFor={id} className="block text-body font-medium text-ink mb-1.5">{label}</label>
            <div className="relative">
                <input id={id} {...inputProps} className={`w-full rounded-lg border bg-surface px-3 py-2 text-ui text-ink
                      placeholder:text-ink-muted transition
                      focus:ring-4
                      ${isPassword ? 'pr-16' : ''}
                      ${error
                        ? 'border-danger focus:border-danger focus:ring-danger/10'
                        : 'border-line hover:border-line-strong focus:border-brand focus:ring-brand/10'}`}
                   type={actualType}
                   aria-invalid={Boolean(error)}
                   aria-describedby={error ? `${id}-error` : hint ? `${id}-hint`: undefined}
                   />

                   {isPassword && (
                    <button
                        onClick={() => setRevealed((v) => !v)} 
                        type="button"
                        aria-label={revealed ? 'Hide password' : 'Show password'}
                        aria-pressed={revealed}
                        className="absolute inset-y-0 right-0 px-3 text-meta font-medium text-ink-soft
                       hover:text-ink transition-colors"
                        >
                            {revealed ? 'Hide' : 'Show'}
                    </button>
                   )}
            </div>
            {error ? (
                    <p id={`${id}-error`} className="mt-1.5 text-meta text-danger-text">{error}</p>
                   ): hint ?(
                    <p id={`${id}-hint`} className="mt-1.5 text-meta text-ink-muted">{hint}</p>
                   ): null
                }
        </div>
    );
}