import { SITE_NAME } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { OG_CONTENT_TYPE, OG_SIZE, renderCard } from '@/lib/og/card';
import { getPublishedArticleBySlug } from '@/lib/services/articles';

export const alt = `${SITE_NAME} makalesi`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) return renderCard({ title: SITE_NAME, subtitle: 'Hukuk, düşünce, metin' });
  return renderCard({
    eyebrow: article.category,
    title: article.title,
    meta: [article.author, article.publishedAt ? formatDate(article.publishedAt) : null].filter(Boolean).join(' · '),
  });
}
