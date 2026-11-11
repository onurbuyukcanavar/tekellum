import Link from 'next/link';
import { formatGazetteDate, supplementLabel } from '@/lib/gazette/format';
import type { IssueSummary } from '@/lib/services/gazette';

/** Tarihe git formu ve son sayılar listesi. */
export function ArchivePanel({ issues, current, today }: { issues: IssueSummary[]; current?: string; today: string }) {
  const oldest = issues.at(-1)?.date;
  return (
    <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
      <form action="/resmi-gazete" method="get" className="card p-5">
        <label htmlFor="tarih" className="font-sans text-sm font-semibold text-navy">Tarihe git</label>
        <div className="mt-3 flex gap-2">
          <input id="tarih" name="tarih" type="date" required max={today} className="field-input min-w-0 flex-1" defaultValue={current?.slice(0, 10)} />
          <button type="submit" className="btn shrink-0">Git</button>
        </div>
        {oldest && <p className="mt-2 text-xs text-muted">Arşivde {formatGazetteDate(oldest, false)} tarihinden bu yana sayılar bulunur.</p>}
      </form>

      {issues.length > 0 && (
        <nav aria-label="Son sayılar">
          <h2 className="font-sans text-sm font-semibold text-navy">Son sayılar</h2>
          <ul className="mt-3 max-h-[28rem] space-y-0.5 overflow-y-auto pr-1 text-sm">
            {issues.map((i) => (
              <li key={i.slug}>
                <Link
                  href={`/resmi-gazete/${i.slug}`}
                  aria-current={i.slug === current ? 'page' : undefined}
                  className={`flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 transition ${
                    i.slug === current ? 'bg-paper-raised text-bronze' : 'text-ink-soft hover:text-navy'
                  }`}
                >
                  <span>
                    {formatGazetteDate(i.date, false)}
                    {i.supplement > 0 && <span className="ml-1 text-xs text-muted">({supplementLabel(i.supplement)})</span>}
                  </span>
                  <span className="text-xs tabular-nums text-muted">{i.number}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  );
}
