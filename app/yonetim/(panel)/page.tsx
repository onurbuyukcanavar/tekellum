import Link from 'next/link';
import { PageHeader } from '@/components/admin/page-header';
import { ArticleStatusBadge } from '@/components/admin/status-badge';
import { db } from '@/lib/db';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Genel bakış' };

export default async function DashboardPage() {
  const [published, drafts, lawsTotal, lawsVerified, recent, unreadMessages] = await Promise.all([
    db.article.count({ where: { status: 'YAYINDA' } }),
    db.article.count({ where: { status: 'TASLAK' } }),
    db.law.count(),
    db.law.count({ where: { verificationStatus: 'DOGRULANDI' } }),
    db.article.findMany({ orderBy: { updatedAt: 'desc' }, take: 6, select: { id: true, title: true, status: true, updatedAt: true } }),
    db.contactMessage.count({ where: { readAt: null } }),
  ]);

  const stats = [
    { label: 'Yayındaki makale', value: published, href: '/yonetim/makaleler' },
    { label: 'Taslak', value: drafts, href: '/yonetim/makaleler' },
    { label: 'Mevzuat kaydı', value: lawsTotal, href: '/yonetim/mevzuat' },
    { label: 'Doğrulanmayı bekleyen', value: lawsTotal - lawsVerified, href: '/yonetim/mevzuat' },
  ];

  return (
    <>
      <PageHeader
        title="Genel bakış"
        actions={<Link href="/yonetim/makaleler/yeni" className="btn">+ Yeni makale</Link>}
      />
      {unreadMessages > 0 && (
        <Link href="/yonetim/mesajlar" className="notice mb-6 block border-bronze/50 transition hover:border-bronze">
          <strong className="text-navy">{unreadMessages} okunmamış mesaj</strong> var — iletişim formundan geldi. Görüntüle →
        </Link>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition hover:border-bronze/60">
            <p className="font-serif text-4xl text-navy">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-xl">Son düzenlenen makaleler</h2>
        {recent.length ? (
          <ul className="card divide-y divide-line">
            {recent.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <Link href={`/yonetim/makaleler/${a.id}`} className="link-quiet font-medium">{a.title}</Link>
                <span className="flex items-center gap-3 text-xs text-muted">
                  <ArticleStatusBadge status={a.status} />
                  {formatDateTime(a.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="notice">Henüz makale yok. <Link className="link-quiet" href="/yonetim/makaleler/yeni">İlk yazınızı oluşturun.</Link></p>
        )}
      </section>
    </>
  );
}
