import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { ArticleCard } from '@/components/article-card';
import { ARTICLE_CATEGORIES } from '@/lib/constants';
import { listPublishedArticles } from '@/lib/services/articles';

export const metadata: Metadata = {
  title: 'Makaleler',
  description: 'Hukuk, düşünce ve metin üzerine yazılar.',
  openGraph: { title: 'Makaleler · Müessir', description: 'Hukuk, düşünce ve metin üzerine yazılar.', siteName: 'Müessir', locale: 'tr_TR' },
  alternates: { canonical: '/makaleler' },
};

type Props = { searchParams: Promise<{ kategori?: string }> };

export default async function ArticlesPage({ searchParams }: Props) {
  await connection();
  const { kategori } = await searchParams;
  const category = ARTICLE_CATEGORIES.find((c) => c === kategori);
  const articles = await listPublishedArticles({ category });

  return (
    <div className="container-page pt-14">
      <p className="eyebrow">Arşiv</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">Makaleler</h1>

      <nav aria-label="Kategoriler" className="mt-8 flex flex-wrap gap-2">
        <CategoryLink href="/makaleler" active={!category}>Tümü</CategoryLink>
        {ARTICLE_CATEGORIES.map((c) => (
          <CategoryLink key={c} href={`/makaleler?kategori=${encodeURIComponent(c)}`} active={c === category}>
            {c}
          </CategoryLink>
        ))}
      </nav>

      {articles.length ? (
        <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      ) : (
        <p className="notice mt-12">{category ? `“${category}” kategorisinde henüz yazı yok.` : 'Henüz yayımlanmış makale bulunmuyor.'}</p>
      )}
    </div>
  );
}

function CategoryLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        active ? 'border-navy bg-navy text-paper' : 'border-line text-ink-soft hover:border-bronze hover:text-bronze'
      }`}
    >
      {children}
    </Link>
  );
}
