export default function Select({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
}) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-[13px] font-medium text-ink"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full appearance-none rounded-lg border border-line bg-surface py-2 pl-3 pr-8
                     text-sm text-ink transition hover:border-line-strong
                     focus:border-brand focus:ring-4 focus:ring-brand/10
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            d="M6 8l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
