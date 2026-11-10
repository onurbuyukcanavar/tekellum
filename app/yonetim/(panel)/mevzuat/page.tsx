import Link from 'next/link';
import { PageHeader } from '@/components/admin/page-header';
import { VerificationBadge } from '@/components/verification-badge';
import { formatDateTime } from '@/lib/format';
import { listLaws } from '@/lib/services/laws';

export const metadata = { title: 'Mevzuat' };

type Props = { searchParams: Promise<{ silindi?: string }> };

export default async function AdminLawsPage({ searchParams }: Props) {
  const { silindi } = await searchParams;
  const laws = await listLaws();
  return (
    <>
      <PageHeader
        title="Mevzuat"
        description="Metni olmayan ya da doğrulanmamış kayıtlarda sitede yalnızca kanun adı ve resmî bağlantı görünür."
        actions={<Link href="/yonetim/mevzuat/yeni" className="btn">+ Mevzuat kaydı</Link>}
      />
      {silindi && <p className="notice-ok mb-6" role="status">Mevzuat kaydı silindi.</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Kanun</th>
              <th className="px-5 py-3 font-medium">Durum</th>
              <th className="hidden px-5 py-3 font-medium md:table-cell">Son düzenleme</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {laws.map((l) => (
              <tr key={l.id} className="hover:bg-paper">
                <td className="px-5 py-3.5">
                  <Link href={`/yonetim/mevzuat/${l.id}`} className="font-medium text-navy hover:text-bronze">{l.title}</Link>
                  <div className="mt-0.5 text-xs text-muted">{[l.shortName, l.lawNumber && `${l.lawNumber} sayılı`].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="px-5 py-3.5"><VerificationBadge status={l.verificationStatus} verifiedAt={l.verifiedAt} /></td>
                <td className="hidden px-5 py-3.5 text-muted md:table-cell">{formatDateTime(l.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
