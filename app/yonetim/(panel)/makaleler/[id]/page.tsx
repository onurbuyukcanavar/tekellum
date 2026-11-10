import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deleteArticleAction } from '@/app/yonetim/actions';
import { ArticleForm } from '@/components/admin/article-form';
import { DeleteButton } from '@/components/admin/delete-button';
import { PageHeader } from '@/components/admin/page-header';
import { ArticleStatusBadge } from '@/components/admin/status-badge';
import { formatDateTime } from '@/lib/format';
import { getArticleForAdmin } from '@/lib/services/articles';
import { listLawOptions } from '@/lib/services/laws';

export const metadata = { title: 'Makaleyi düzenle' };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ kaydedildi?: string }> };

export default async function EditArticlePage({ params, searchParams }: Props) {
  const [{ id }, { kaydedildi }] = await Promise.all([params, searchParams]);
  const [article, lawOptions] = await Promise.all([getArticleForAdmin(id), listLawOptions()]);
  if (!article) notFound();

  return (
    <>
      <PageHeader
        title="Makaleyi düzenle"
        description={`Son düzenleme: ${formatDateTime(article.updatedAt)}`}
        actions={
          <>
            {article.status === 'YAYINDA' && (
              <Link href={`/makaleler/${article.slug}`} target="_blank" className="btn-secondary">Sitede görüntüle ↗</Link>
            )}
            <Link href="/yonetim/makaleler" className="btn-secondary">← Makaleler</Link>
          </>
        }
      />
      {kaydedildi && (
        <p className="notice-ok mb-6 flex items-center gap-3" role="status">
          Makale kaydedildi. <ArticleStatusBadge status={article.status} />
        </p>
      )}
      <ArticleForm
        key={article.updatedAt.toISOString()}
        lawOptions={lawOptions}
        initial={{
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          content: article.content,
          category: article.category,
          author: article.author,
          status: article.status,
          featured: article.featured,
          lawRefs: article.lawRefs.map((r) => ({ lawId: r.lawId, provision: r.provision })),
        }}
      />
      <section className="mt-16 border-t border-line pt-8">
        <h2 className="text-lg">Tehlikeli bölge</h2>
        <p className="mt-1 mb-4 text-sm text-muted">Silinen makale geri getirilemez.</p>
        <DeleteButton action={deleteArticleAction} id={article.id} label="Makaleyi sil" confirmText="Bu makale kalıcı olarak silinecek." />
      </section>
    </>
  );
}
