import {STATUS_ORDER, PRIORITY_ORDER, statusMeta, priorityMeta} from './lib/constants';

export default function App() {
  return (
    <div className="min-h-screen p-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Design tokens</h1>
          <p className="text-sm text-ink-soft mt-1">
            Inter ,Semantic colors ,and the status and priority maps.
          </p>
        </div>

        <section className="bg-surface border border-line rounded-lg p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-3">Status</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((key) => {
              const s = statusMeta(key);
              return(
                <span key={key} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${s.soft} ${s.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
                  {s.label}
                </span>
              );
            })}
          </div>
        </section>

        <section className="bg-surface border border-line rounded-lg p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-3">Priority</h2>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_ORDER.map((key) => {
              const p = priorityMeta(key);
              return(
                <span key={key} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${p.soft} ${p.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`}/>
                  {p.label}
                </span>
              );
            })}
          </div>
        </section>

      <section className="bg-surface border border-line rounded-lg p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wid text-ink-muted">
          Brand and text
        </h2>

        <button className="px-3 py-1 5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors">
          Primary button
        </button>

        <p className="text-sm text-ink">Primary text at 14px</p>
        <p className="text-[13px] text-ink-soft">Secondary text at 13px</p>
        <p className="text-xs text-ink-muted">Metadata at 12px</p>
        <p className="text-xs text-ink-muted">Unknown value falls back safely:{statusMeta('nonsense').label}</p>
      </section>
      </div>
    </div>
  );
}