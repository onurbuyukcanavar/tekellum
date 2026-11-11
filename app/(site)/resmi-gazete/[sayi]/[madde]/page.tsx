import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/constants';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { formatGazetteDate, supplementLabel } from '@/lib/gazette/format';
import { getItem } from '@/lib/services/gazette';

type Props = { params: Promise<{ sayi: string; madde: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sayi, madde } = await params;
  const item = await getItem(sayi, madde);
  if (!item) return { title: 'Bulunamadı' };
  const description = `${formatGazetteDate(item.dateKey, false)} tarihli ve ${item.issue.number} sayılı Resmî Gazete${item.category ? ` · ${item.category}` : ''}`;
  return {
    title: item.title.length > 90 ? `${item.title.slice(0, 87)}…` : item.title,
    description,
    openGraph: { title: item.title, description, siteName: SITE_NAME, locale: 'tr_TR', type: 'article' },
    alternates: { canonical: `/resmi-gazete/${item.issueSlug}/${item.code}` },
  };
}

export default async function GazetteItemPage({ params }: Props) {
  await connection();
  const { sayi, madde } = await params;
  const item = await getItem(sayi, madde);
  if (!item) notFound();

  const issueLabel = `${formatGazetteDate(item.dateKey, false)} · Sayı ${item.issue.number}${item.issue.supplement ? ` (${supplementLabel(item.issue.supplement)})` : ''}`;

  return (
    <article className="container-page max-w-4xl pt-14">
      <nav aria-label="Konum" className="flex flex-wrap gap-x-2 text-sm text-muted">
        <Link href="/resmi-gazete" className="link-quiet">Resmî Gazete</Link>
        <span aria-hidden>›</span>
        <Link href={`/resmi-gazete/${item.issueSlug}`} className="link-quiet">{issueLabel}</Link>
      </nav>

      <p className="eyebrow mt-6">{[item.section, item.category].filter(Boolean).join(' · ')}</p>
      <h1 className="mt-4 text-3xl leading-tight sm:text-4xl">{item.title}</h1>

      <div className="notice mt-8 flex flex-wrap items-center justify-between gap-3">
        <span>
          {item.kind === 'PDF'
            ? 'Bu içerik Resmî Gazete’de PDF olarak yayımlanmıştır ve resmî kaynaktan görüntülenmektedir.'
            : 'Bu metin Resmî Gazete’nin resmî internet sitesinden otomatik olarak alınmıştır. Hukuki işlemlerde Resmî Gazete’de yayımlanan metin esastır.'}
        </span>
        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="link-quiet shrink-0 font-medium text-navy">Resmî kaynakta aç ↗</a>
      </div>

      {item.kind === 'PDF' ? (
        <div className="mt-8">
          <iframe
            src={item.sourceUrl}
            title={item.title}
            className="hidden h-[80vh] w-full rounded-lg border border-line bg-paper-raised sm:block"
            loading="lazy"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn">PDF’i tam ekranda aç ↗</a>
          </div>
          <p className="mt-3 text-sm text-muted sm:hidden">Mobil cihazlarda PDF, tarayıcının kendi görüntüleyicisinde açılır.</p>
        </div>
      ) : item.content ? (
        <div className="rg-body mt-10" dangerouslySetInnerHTML={{ __html: item.content }} />
      ) : (
        <p className="notice-warn mt-8">
          Bu metin henüz sitemize aktarılamadı. Metni resmî kaynaktan okuyabilirsiniz.
        </p>
      )}

      <nav aria-label="Aynı sayıdaki diğer içerikler" className="mt-16 grid gap-4 border-t border-line pt-6 text-sm sm:grid-cols-2">
        {item.prev ? (
          <Link href={`/resmi-gazete/${item.issueSlug}/${item.prev.code}`} className="group">
            <span className="text-muted">← Önceki</span>
            <span className="mt-1 block text-ink-soft transition group-hover:text-navy">{item.prev.title}</span>
          </Link>
        ) : <span />}
        {item.next && (
          <Link href={`/resmi-gazete/${item.issueSlug}/${item.next.code}`} className="group sm:text-right">
            <span className="text-muted">Sonraki →</span>
            <span className="mt-1 block text-ink-soft transition group-hover:text-navy">{item.next.title}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
