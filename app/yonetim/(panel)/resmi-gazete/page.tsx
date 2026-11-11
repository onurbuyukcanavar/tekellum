import Link from 'next/link';
import { GazetteImportForm } from '@/components/admin/gazette-import-form';
import { PageHeader } from '@/components/admin/page-header';
import { formatDateTime } from '@/lib/format';
import { formatGazetteDate, supplementLabel } from '@/lib/gazette/format';
import { todayKey } from '@/lib/gazette/source';
import { gazetteAdminOverview } from '@/lib/services/gazette';

export const metadata = { title: 'Resmî Gazete' };
// Aktarım sunucu işlemi bu sayfadan çağrılır; birkaç dakika sürebilir.
export const maxDuration = 300;

export default async function AdminGazettePage() {
  const overview = await gazetteAdminOverview();
  return (
    <>
      <PageHeader
        title="Resmî Gazete"
        description="Sayılar her gece 01.07'de (Türkiye saati) otomatik aktarılır; bugün ve önceki iki gün yeniden kontrol edilir."
        actions={<Link href="/resmi-gazete" className="btn-secondary" target="_blank">Sitede gör ↗</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="font-serif text-4xl text-navy">{overview.issueCount}</p>
          <p className="mt-1 text-sm text-muted">Arşivdeki sayı</p>
        </div>
        <div className="card p-5">
          <p className="font-serif text-2xl text-navy">{overview.lastFetchedAt ? formatDateTime(overview.lastFetchedAt) : '—'}</p>
          <p className="mt-1 text-sm text-muted">Son aktarım</p>
        </div>
        <div className="card p-5">
          <p className={`font-serif text-4xl ${overview.failedTotal ? 'text-danger' : 'text-navy'}`}>{overview.failedTotal}</p>
          <p className="mt-1 text-sm text-muted">Alınamamış metin</p>
        </div>
      </div>

      <section className="card mt-10 p-6">
        <h2 className="text-xl">Elle aktar</h2>
        <p className="mt-1 mb-5 text-sm text-muted">Geçmiş bir dönemi arşive eklemek ya da bugünkü sayıyı hemen çekmek için.</p>
        <GazetteImportForm today={todayKey()} />
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl">Son sayılar</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr><th className="px-5 py-3 font-medium">Tarih</th><th className="px-5 py-3 font-medium">Sayı</th><th className="px-5 py-3 font-medium">İçerik</th><th className="px-5 py-3 font-medium">Aktarım</th><th className="px-5 py-3 font-medium">Durum</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {overview.issues.map((i) => (
                <tr key={i.slug}>
                  <td className="px-5 py-3"><Link href={`/resmi-gazete/${i.slug}`} target="_blank" className="link-quiet">{formatGazetteDate(i.date, false)}{i.supplement ? ` (${supplementLabel(i.supplement)})` : ''}</Link></td>
                  <td className="px-5 py-3 tabular-nums">{i.number}</td>
                  <td className="px-5 py-3 tabular-nums">{i.itemCount}</td>
                  <td className="px-5 py-3 text-muted">{formatDateTime(i.fetchedAt)}</td>
                  <td className="px-5 py-3">
                    {i.failedItems.length ? (
                      <span className="text-danger" title={i.failedItems.map((f) => `${f.title}: ${f.error}`).join('\n')}>{i.failedItems.length} metin alınamadı</span>
                    ) : <span className="text-muted">Tamam</span>}
                  </td>
                </tr>
              ))}
              {!overview.issues.length && <tr><td colSpan={5} className="px-5 py-6 text-center text-muted">Henüz aktarılmış sayı yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
