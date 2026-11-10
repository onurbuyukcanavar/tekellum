import Link from 'next/link';
import { PageHeader } from '@/components/admin/page-header';
import { ArticleStatusBadge } from '@/components/admin/status-badge';
import { formatDateTime } from '@/lib/format';
import { listArticlesForAdmin } from '@/lib/services/articles';

export const metadata = { title: 'Makaleler' };

type Props = { searchParams: Promise<{ silindi?: string }> };

export default async function AdminArticlesPage({ searchParams }: Props) {
  const { silindi } = await searchParams;
  const articles = await listArticlesForAdmin();
  return (
    <>
      <PageHeader
        title="Makaleler"
        description={`${articles.length} makale`}
        actions={<Link href="/yonetim/makaleler/yeni" className="btn">+ Yeni makale</Link>}
      />
      {silindi && <p className="notice-ok mb-6" role="status">Makale silindi.</p>}
      {articles.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Başlık</th>
                <th className="px-5 py-3 font-medium">Durum</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Kategori</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Son düzenleme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {articles.map((a) => (
                <tr key={a.id} className="hover:bg-paper">
                  <td className="px-5 py-3.5">
                    <Link href={`/yonetim/makaleler/${a.id}`} className="font-medium text-navy hover:text-bronze">{a.title}</Link>
                    {a.featured && <span className="ml-2 text-xs text-bronze">★ öne çıkan</span>}
                    <div className="mt-0.5 font-mono text-xs text-muted">/makaleler/{a.slug}</div>
                  </td>
                  <td className="px-5 py-3.5"><ArticleStatusBadge status={a.status} /></td>
                  <td className="hidden px-5 py-3.5 text-ink-soft md:table-cell">{a.category}</td>
                  <td className="hidden px-5 py-3.5 text-muted md:table-cell">{formatDateTime(a.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="notice">Henüz makale yok.</p>
      )}
    </>
  );
}
