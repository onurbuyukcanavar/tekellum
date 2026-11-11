import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { ArchivePanel } from '@/components/gazette/archive-panel';
import { IssueContents } from '@/components/gazette/issue-contents';
import { formatGazetteDate, supplementLabel } from '@/lib/gazette/format';
import { isDateKey, todayKey } from '@/lib/gazette/source';
import { getLatestIssue, listRecentIssues } from '@/lib/services/gazette';

const DESCRIPTION = 'Günlük Resmî Gazete: yönetmelikler, tebliğler, kararlar ve diğer yayımlar; tam metinleriyle sitede okunabilir.';

export const metadata: Metadata = {
  title: 'Resmî Gazete',
  description: DESCRIPTION,
  openGraph: { title: 'Resmî Gazete · Müessir', description: DESCRIPTION, siteName: 'Müessir', locale: 'tr_TR' },
  alternates: { canonical: '/resmi-gazete' },
};

type Props = { searchParams: Promise<{ tarih?: string }> };

export default async function GazetteHomePage({ searchParams }: Props) {
  await connection();
  const { tarih } = await searchParams;
  if (tarih && isDateKey(tarih)) redirect(`/resmi-gazete/${tarih}`);

  const [latest, recent] = await Promise.all([getLatestIssue(), listRecentIssues(60)]);

  return (
    <div className="container-page pt-14">
      <p className="eyebrow">Günlük yayın</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">Resmî Gazete</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
        Her gün yayımlanan yönetmelik, tebliğ ve kararların fihristi; metinler sitede okunabilir, PDF olarak yayımlananlar
        resmî kaynaktan görüntülenir.
      </p>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          {latest ? (
            <>
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
                <div>
                  <p className="text-sm text-muted">En son sayı</p>
                  <h2 className="mt-1 font-serif text-2xl text-navy sm:text-3xl">
                    <Link href={`/resmi-gazete/${latest.slug}`} className="transition hover:text-bronze">
                      {formatGazetteDate(latest.dateKey)}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    Sayı {latest.number}
                    {latest.supplement > 0 && ` · ${supplementLabel(latest.supplement)}`}
                  </p>
                </div>
                <Link href={`/resmi-gazete/${latest.slug}`} className="btn-secondary">Sayı sayfası →</Link>
              </div>
              <IssueContents slug={latest.slug} items={latest.items} />
            </>
          ) : (
            <p className="notice">Henüz aktarılmış bir Resmî Gazete sayısı bulunmuyor.</p>
          )}
        </div>
        <ArchivePanel issues={recent} current={latest?.slug} today={todayKey()} />
      </div>
    </div>
  );
}
