import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import { siteUrl } from '@/lib/constants';
import { listGazetteSitemap } from '@/lib/services/gazette';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();
  const [articles, laws, gazette] = await Promise.all([
    db.article.findMany({ where: { status: 'YAYINDA' }, select: { slug: true, updatedAt: true } }),
    db.law.findMany({ select: { slug: true, updatedAt: true } }),
    listGazetteSitemap(),
  ]);
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/makaleler`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/mevzuat`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/resmi-gazete`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/iletisim`, changeFrequency: 'yearly', priority: 0.3 },
    ...articles.map((a) => ({ url: `${base}/makaleler/${a.slug}`, lastModified: a.updatedAt, priority: 0.7 })),
    ...laws.map((l) => ({ url: `${base}/mevzuat/${l.slug}`, lastModified: l.updatedAt, priority: 0.5 })),
    ...gazette.flatMap((issue) => [
      { url: `${base}/resmi-gazete/${issue.slug}`, lastModified: issue.fetchedAt, priority: 0.4 },
      ...issue.items.map((item) => ({
        url: `${base}/resmi-gazete/${issue.slug}/${item.code}`,
        lastModified: item.contentFetchedAt ?? issue.fetchedAt,
        priority: 0.4,
      })),
    ]),
  ];
}
