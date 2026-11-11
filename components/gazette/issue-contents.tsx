import Link from 'next/link';
import type { GazetteListItem } from '@/lib/services/gazette';

type Group = { section: string; categories: { category: string; items: GazetteListItem[] }[] };

function group(items: GazetteListItem[]): Group[] {
  const out: Group[] = [];
  for (const item of items) {
    let section = out.at(-1);
    if (!section || section.section !== item.section) out.push((section = { section: item.section, categories: [] }));
    let category = section.categories.at(-1);
    if (!category || category.category !== item.category) section.categories.push((category = { category: item.category, items: [] }));
    category.items.push(item);
  }
  return out;
}

/** Bir sayının fihristi: bölüm → kategori → madde. */
export function IssueContents({ slug, items }: { slug: string; items: GazetteListItem[] }) {
  if (!items.length) return <p className="notice">Bu sayının fihristi boş görünüyor.</p>;
  return (
    <div className="space-y-12">
      {group(items).map((g) => (
        <section key={g.section} aria-labelledby={`b-${g.section}`}>
          <h2 id={`b-${g.section}`} className="eyebrow">{g.section}</h2>
          <div className="mt-4 space-y-7">
            {g.categories.map((c, ci) => (
              <div key={`${c.category}-${ci}`}>
                {c.category && <h3 className="font-serif text-xl text-navy">{c.category}</h3>}
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {c.items.map((item) => (
                    <li key={item.code}>
                      {item.kind === 'ILAN' ? (
                        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="group flex items-baseline justify-between gap-4 py-3">
                          <span className="text-ink-soft transition group-hover:text-navy">{item.title}</span>
                          <span className="shrink-0 text-xs text-muted">Resmî kaynak ↗</span>
                        </a>
                      ) : (
                        <Link href={`/resmi-gazete/${slug}/${item.code}`} className="group flex items-baseline justify-between gap-4 py-3">
                          <span className="leading-snug text-ink transition group-hover:text-bronze">{item.title}</span>
                          {item.kind === 'PDF' && <span className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[0.68rem] font-semibold tracking-wide text-muted">PDF</span>}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
