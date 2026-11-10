/**
 * Eski Supabase sürümündeki makaleleri (public.articles) ve mevzuat kayıtlarını (public.laws)
 * yeni tablolara kopyalar. Eski tablolara dokunmaz; aynı kısa adlı kayıt varsa atlar.
 *   npm run veri:aktar
 * Eski veriler başka bir veritabanındaysa: LEGACY_DATABASE_URL="postgresql://..." npm run veri:aktar
 */
import 'dotenv/config';
import { Client } from 'pg';
import { pgConnectionConfig } from '../lib/db-ssl';
import { createPrismaClient } from '../lib/prisma-client';
import { sanitizeArticleHtml } from '../lib/sanitize';
import { slugify } from '../lib/slug';

type LegacyArticle = {
  title: string; slug: string; excerpt: string | null; content: string | null; category: string | null;
  author: string | null; status: string; featured: boolean | null; published_at: Date | null; created_at: Date | null;
};
type LegacyLaw = { title: string; slug: string; law_number: string | null; official_url: string | null; content: string | null };

const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Eski düz metin kayıtlarını paragraflara çevirir; HTML olanları temizler. */
function toHtml(value: string): string {
  if (/<\/?(p|br|h[1-6]|strong|em|ul|ol|li|blockquote|table)\b/i.test(value)) return sanitizeArticleHtml(value);
  return value.split(/\r?\n/).map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`).join('');
}

async function main() {
  const legacyUrl = process.env.LEGACY_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!legacyUrl) throw new Error('DATABASE_URL tanımlı değil.');
  const legacy = new Client(pgConnectionConfig(legacyUrl));
  const prisma = createPrismaClient(process.env.DIRECT_URL || process.env.DATABASE_URL);
  await legacy.connect();
  try {
    const { rows: tables } = await legacy.query<{ articles: string | null; laws: string | null }>(
      "select to_regclass('public.articles')::text as articles, to_regclass('public.laws')::text as laws",
    );
    let articleCount = 0;
    let lawCount = 0;

    if (tables[0]?.articles) {
      const { rows } = await legacy.query<LegacyArticle>('select * from public.articles order by created_at');
      for (const row of rows) {
        const slug = slugify(row.slug || row.title);
        if (!slug || (await prisma.article.findUnique({ where: { slug }, select: { id: true } }))) continue;
        await prisma.article.create({
          data: {
            title: row.title,
            slug,
            excerpt: row.excerpt ?? '',
            content: toHtml(row.content ?? ''),
            category: row.category || 'Hukuk',
            author: row.author || 'Müessir',
            status: row.status === 'published' ? 'YAYINDA' : 'TASLAK',
            featured: !!row.featured,
            publishedAt: row.published_at,
            createdAt: row.created_at ?? undefined,
          },
        });
        articleCount += 1;
      }
    }

    if (tables[0]?.laws) {
      const { rows } = await legacy.query<LegacyLaw>('select * from public.laws order by title');
      for (const row of rows) {
        const slug = slugify(row.slug || row.title);
        if (!slug) continue;
        const existing = await prisma.law.findUnique({ where: { slug }, select: { id: true, content: true } });
        if (existing) {
          // Katalog kaydı seed ile oluşmuş ve boşsa eski metni taşı.
          if (!existing.content && row.content?.trim()) {
            await prisma.law.update({ where: { id: existing.id }, data: { content: row.content.trim() } });
            lawCount += 1;
          }
          continue;
        }
        await prisma.law.create({
          data: {
            title: row.title,
            slug,
            lawNumber: row.law_number ?? '',
            officialUrl: row.official_url ?? '',
            content: row.content?.trim() ?? '',
            // Eski doğrulama işaretleri taşınmaz: yeni sistemde her metin yeniden doğrulanmalıdır.
            verificationStatus: 'DOGRULANMAYI_BEKLIYOR',
          },
        });
        lawCount += 1;
      }
    }

    if (!tables[0]?.articles && !tables[0]?.laws) {
      console.log('Eski Supabase tabloları (public.articles, public.laws) bulunamadı; aktarılacak veri yok.');
    } else {
      console.log(`Aktarım tamamlandı: ${articleCount} makale, ${lawCount} mevzuat kaydı.`);
    }
  } finally {
    await legacy.end();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
