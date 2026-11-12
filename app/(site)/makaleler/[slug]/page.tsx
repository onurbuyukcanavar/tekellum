import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import { ArticleView } from '@/components/article-view';
import { SITE_NAME, siteUrl } from '@/lib/constants';
import { getPublishedArticleBySlug } from '@/lib/services/articles';

type Props = { params: Promise<{ slug: string }> };

const load = cache((slug: string) => getPublishedArticleBySlug(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const article = await load(slug);
  if (!article) return { title: 'Makale bulunamadı' };
  return {
    title: article.title,
    description: article.excerpt || undefined,
    alternates: { canonical: `/makaleler/${article.slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt || undefined,
      siteName: SITE_NAME,
      locale: 'tr_TR',
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: [article.author],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const article = await load(slug);
  if (!article) notFound();
  return <ArticleView article={article} shareUrl={`${siteUrl()}/makaleler/${article.slug}`} />;
}
