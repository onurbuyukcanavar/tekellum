import Link from 'next/link';
import { connection } from 'next/server';
import { ArticleCard } from '@/components/article-card';
import { formatDate } from '@/lib/format';
import { getFeaturedArticle, listPublishedArticles } from '@/lib/services/articles';
import { listLaws } from '@/lib/services/laws';

export default async function HomePage() {
  await connection();
  const [featured, latest, laws] = await Promise.all([getFeaturedArticle(), listPublishedArticles({ limit: 7 }), listLaws()]);
  const rest = latest.filter((a) => a.id !== featured?.id).slice(0, 6);
  const lead = featured ?? null;

  return (
    <>
      <section className="container-page pt-16 pb-14 sm:pt-24 sm:pb-20">
        <p className="eyebrow">Bağımsız hukuk ve düşünce yayını</p>
        <h1 className="mt-5 max-w-3xl text-4xl leading-[1.12] sm:text-6xl">
          Gelenek, Usul
          <br />
          ve <span className="italic text-bronze">Gelecek</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Müessir; hukuk, düşünce ve metin üzerine makalelerin, çalışma notlarının ve mevzuat kaynaklarının bir araya
          geldiği kişisel yayın platformudur.
        </p>
      </section>

      {lead && (
        <section className="container-page">
          <Link
            href={`/makaleler/${lead.slug}`}
            className="group block rounded-2xl border border-line bg-paper-raised p-8 transition hover:border-bronze/60 sm:p-12"
          >
            <p className="eyebrow">Öne çıkan · {lead.category}</p>
            <h2 className="mt-4 max-w-3xl text-3xl leading-tight transition group-hover:text-bronze sm:text-4xl">{lead.title}</h2>
            {lead.excerpt && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{lead.excerpt}</p>}
            <p className="mt-6 text-sm text-muted">
              {lead.author}
              {lead.publishedAt ? ` · ${formatDate(lead.publishedAt)}` : ''}
            </p>
          </Link>
        </section>
      )}

      <section className="container-page mt-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-3xl">Son yazılar</h2>
          <Link href="/makaleler" className="link-quiet text-sm text-ink-soft">Tüm makaleler →</Link>
        </div>
        {rest.length ? (
          <div className="grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        ) : (
          !lead && <p className="notice">Henüz yayımlanmış makale bulunmuyor.</p>
        )}
      </section>

      <section className="container-page mt-24">
        <div className="grid gap-10 rounded-2xl bg-navy px-8 py-12 text-paper sm:px-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow !text-bronze-soft">Mevzuat kütüphanesi</p>
            <h2 className="mt-4 text-3xl !text-paper">Temel kanunlar, resmî kaynaklarıyla.</h2>
            <p className="mt-4 leading-relaxed text-paper/75">
              Metinler yalnızca resmî kaynakla karşılaştırılıp doğrulandıktan sonra yayımlanır; doğrulama tarihi her
              kayıtta gösterilir.
            </p>
            <Link href="/mevzuat" className="mt-6 inline-flex rounded-md border border-paper/30 px-4 py-2 text-sm font-medium transition hover:border-bronze-soft hover:text-bronze-soft">
              Kütüphaneye git →
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 self-center text-sm sm:grid-cols-3">
            {laws.slice(0, 12).map((law) => (
              <li key={law.id}>
                <Link href={`/mevzuat/${law.slug}`} className="block truncate py-1 text-paper/80 transition hover:text-bronze-soft">
                  <span className="font-semibold text-paper">{law.shortName || law.lawNumber}</span>
                  <span className="text-paper/60"> · {law.lawNumber}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
