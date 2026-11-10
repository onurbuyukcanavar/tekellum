import { notFound } from 'next/navigation';
import { ArticleView } from '@/components/article-view';
import { ArticleStatusBadge } from '@/components/admin/status-badge';
import { getArticleForAdmin } from '@/lib/services/articles';

export const metadata = { title: 'Önizleme' };

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const article = await getArticleForAdmin((await params).id);
  if (!article) notFound();
  return (
    <>
      <p className="notice-warn flex flex-wrap items-center gap-2">
        Önizleme: bu görünüm yalnızca size açıktır. <ArticleStatusBadge status={article.status} />
      </p>
      <div className="-mx-5 sm:-mx-8"><ArticleView article={article} /></div>
    </>
  );
}
