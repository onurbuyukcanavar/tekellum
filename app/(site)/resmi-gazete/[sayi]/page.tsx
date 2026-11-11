import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/constants';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { ArchivePanel } from '@/components/gazette/archive-panel';
import { IssueContents } from '@/components/gazette/issue-contents';
import { formatGazetteDate, supplementLabel } from '@/lib/gazette/format';
import { indexUrl, parseIssueSlug, todayKey } from '@/lib/gazette/source';
import { getIssue, listRecentIssues } from '@/lib/services/gazette';

type Props = { params: Promise<{ sayi: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sayi } = await params;
  const ref = parseIssueSlug(sayi);
  if (!ref) return { title: 'Bulunamadı' };
  const issue = await getIssue(sayi);
  const title = `${formatGazetteDate(ref.date, false)} tarihli Resmî Gazete${ref.supplement ? ` (${supplementLabel(ref.supplement)})` : ''}`;
  if (!issue) return { title, robots: { index: false } };
  const description = `${formatGazetteDate(ref.date, false)} tarihli ve ${issue.number} sayılı Resmî Gazete fihristi: ${issue.items.slice(0, 3).map((i) => i.title).join('; ')}`.slice(0, 300);
  return {
    title,
    description,
    openGraph: { title: `${title} · ${SITE_NAME}`, description, siteName: SITE_NAME, locale: 'tr_TR' },
    alternates: { canonical: `/resmi-gazete/${issue.slug}` },
  };
}

export default async function IssuePage({ params }: Props) {
  await connection();
  const { sayi } = await params;
  const ref = parseIssueSlug(sayi);
  if (!ref) notFound();
  const [issue, recent] = await Promise.all([getIssue(sayi), listRecentIssues(60)]);

  if (!issue) {
    return (
      <div className="container-page max-w-3xl pt-14">
        <p className="eyebrow">Resmî Gazete</p>
        <h1 className="mt-4 text-3xl sm:text-4xl">{formatGazetteDate(ref.date)}</h1>
        <p className="notice mt-8">
          Bu tarihe ait {ref.supplement ? `${supplementLabel(ref.supplement).toLocaleLowerCase('tr')} ` : ''}sayı arşivimizde bulunmuyor.
          O gün Resmî Gazete yayımlanmamış olabilir ya da sayı henüz aktarılmamıştır.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={indexUrl(ref.date, ref.supplement)} target="_blank" rel="noopener noreferrer" className="btn-secondary">Resmî kaynakta ara ↗</a>
          <Link href="/resmi-gazete" className="btn-secondary">En son sayıya dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page pt-14">
      <nav aria-label="Konum" className="text-sm text-muted">
        <Link href="/resmi-gazete" className="link-quiet">Resmî Gazete</Link>
      </nav>
      <p className="eyebrow mt-6">Sayı {issue.number}{issue.supplement > 0 && ` · ${supplementLabel(issue.supplement)}`}</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">{formatGazetteDate(issue.dateKey)}</h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a href={issue.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">Resmî kaynakta aç ↗</a>
        {issue.pdfUrl && <a href={issue.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">Sayının tamamı (PDF) ↗</a>}
        {issue.sameDay.length > 1 && (
          <span className="flex flex-wrap gap-2 text-sm">
            {issue.sameDay.filter((s) => s.supplement !== issue.supplement).map((s) => (
              <Link key={s.slug} href={`/resmi-gazete/${s.slug}`} className="link-quiet">
                {s.supplement ? supplementLabel(s.supplement) : 'Asıl sayı'}
              </Link>
            ))}
          </span>
        )}
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <IssueContents slug={issue.slug} items={issue.items} />
          <nav aria-label="Sayılar arasında gezinme" className="mt-14 flex justify-between gap-4 border-t border-line pt-6 text-sm">
            {issue.prev ? (
              <Link href={`/resmi-gazete/${issue.prev.slug}`} className="link-quiet">← {formatGazetteDate(issue.prev.date, false)}{issue.prev.supplement ? ` (${supplementLabel(issue.prev.supplement)})` : ''}</Link>
            ) : <span />}
            {issue.next && (
              <Link href={`/resmi-gazete/${issue.next.slug}`} className="link-quiet text-right">{formatGazetteDate(issue.next.date, false)}{issue.next.supplement ? ` (${supplementLabel(issue.next.supplement)})` : ''} →</Link>
            )}
          </nav>
        </div>
        <ArchivePanel issues={recent} current={issue.slug} today={todayKey()} />
      </div>
    </div>
  );
}
