import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { htmlToPlainText, sanitizeArticleHtml } from '@/lib/sanitize';
import type { ArticleInput } from '@/lib/validation';

export type SaveResult = { ok: true; id: string; slug: string } | { ok: false; errors: Record<string, string> };

const publicListSelect = {
  id: true, title: true, slug: true, excerpt: true, category: true, author: true, featured: true, publishedAt: true,
} satisfies Prisma.ArticleSelect;

export function listPublishedArticles(options: { category?: string; limit?: number } = {}) {
  return db.article.findMany({
    where: { status: 'YAYINDA', ...(options.category ? { category: options.category } : {}) },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: options.limit,
    select: publicListSelect,
  });
}

export function getFeaturedArticle() {
  return db.article.findFirst({
    where: { status: 'YAYINDA', featured: true },
    orderBy: { publishedAt: 'desc' },
    select: publicListSelect,
  });
}

export function getPublishedArticleBySlug(slug: string) {
  return db.article.findFirst({
    where: { slug, status: 'YAYINDA' },
    include: {
      lawRefs: {
        include: { law: { select: { title: true, slug: true, shortName: true, lawNumber: true } } },
        orderBy: { id: 'asc' },
      },
    },
  });
}

export function getArticleForAdmin(id: string) {
  return db.article.findUnique({
    where: { id },
    include: {
      lawRefs: {
        include: { law: { select: { title: true, slug: true, shortName: true, lawNumber: true } } },
        orderBy: { id: 'asc' },
      },
    },
  });
}

export function listArticlesForAdmin() {
  return db.article.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, slug: true, status: true, category: true, featured: true, updatedAt: true, publishedAt: true },
  });
}

function dedupeRefs(refs: ArticleInput['lawRefs']) {
  const seen = new Set<string>();
  return refs.filter((r) => {
    const key = `${r.lawId}|${r.provision}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function saveArticle(id: string | null, input: ArticleInput): Promise<SaveResult> {
  const content = sanitizeArticleHtml(input.content);
  if (!htmlToPlainText(content)) return { ok: false, errors: { content: 'Makale metni boş olamaz.' } };

  const refs = dedupeRefs(input.lawRefs);
  if (refs.length) {
    const found = await db.law.count({ where: { id: { in: [...new Set(refs.map((r) => r.lawId))] } } });
    if (found !== new Set(refs.map((r) => r.lawId)).size) {
      return { ok: false, errors: { lawRefs: 'Seçilen mevzuat kayıtlarından biri artık mevcut değil.' } };
    }
  }

  const existing = id ? await db.article.findUnique({ where: { id }, select: { publishedAt: true } }) : null;
  if (id && !existing) return { ok: false, errors: { _form: 'Makale bulunamadı; silinmiş olabilir.' } };

  // İlk yayın tarihi korunur; taslağa alınıp tekrar yayımlanan yazının tarihi değişmez.
  const publishedAt = input.status === 'YAYINDA' ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null);
  const data = {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    content,
    category: input.category,
    author: input.author,
    status: input.status,
    featured: input.featured,
    publishedAt,
  };

  try {
    const saved = await db.$transaction(async (tx) => {
      const article = id
        ? await tx.article.update({ where: { id }, data })
        : await tx.article.create({ data });
      await tx.articleLaw.deleteMany({ where: { articleId: article.id } });
      if (refs.length) {
        await tx.articleLaw.createMany({ data: refs.map((r) => ({ articleId: article.id, lawId: r.lawId, provision: r.provision })) });
      }
      return article;
    });
    return { ok: true, id: saved.id, slug: saved.slug };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, errors: { slug: 'Bu URL kısa adı başka bir makalede kullanılıyor.' } };
    }
    throw error;
  }
}

export async function deleteArticle(id: string): Promise<void> {
  await db.article.deleteMany({ where: { id } });
}
