import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { provisionAnchor } from '@/lib/law-text';
import { renderArticleHtml } from '@/lib/article-render';
import { readingMinutes } from '@/lib/sanitize';
import { ArticleTocInline, ArticleTocSidebar } from './article-toc';
import { ShareButtons } from './share-buttons';

type LawRef = { id: string; provision: string; law: { title: string; slug: string; shortName: string; lawNumber: string } };
export type ArticleViewData = {
  title: string; excerpt: string; content: string; category: string; author: string;
  publishedAt: Date | null; updatedAt: Date; lawRefs: LawRef[];
};

/** Makale gövdesi: hem herkese açık sayfa hem de yönetimdeki önizleme kullanır. */
/** shareUrl verilmezse (ör. yönetim önizlemesi) paylaşım düğmeleri gösterilmez. */
export function ArticleView({ article, shareUrl }: { article: ArticleViewData; shareUrl?: string }) {
  const { html, toc } = renderArticleHtml(article.content);
  // Tek başlıklı ya da başlıksız yazılarda içindekiler gösterilmez.
  const hasToc = toc.length >= 2;
  const body = (
    <article className={hasToc ? 'min-w-0' : 'container-page max-w-3xl pt-14'}>
      <p className="eyebrow">{article.category}</p>
      <h1 className="mt-4 text-4xl leading-[1.15] sm:text-5xl">{article.title}</h1>
      {article.excerpt && <p className="mt-6 font-serif text-xl leading-relaxed text-ink-soft">{article.excerpt}</p>}
      <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-line py-4 text-sm text-muted">
        <span className="font-medium text-ink">{article.author}</span>
        {article.publishedAt && (
          <>
            <span aria-hidden>·</span>
            <time dateTime={new Date(article.publishedAt).toISOString()}>{formatDate(article.publishedAt)}</time>
          </>
        )}
        <span aria-hidden>·</span>
        <span>{readingMinutes(html)} dk okuma</span>
      </div>

      {shareUrl && <ShareButtons className="mt-4" url={shareUrl} title={article.title} text={article.excerpt} />}

      {hasToc && (
        <div className="mt-8 lg:hidden">
          <ArticleTocInline toc={toc} />
        </div>
      )}

      <div className="prose-tekellum mt-10" dangerouslySetInnerHTML={{ __html: html }} />

      {article.lawRefs.length > 0 && (
        <aside className="mt-14 rounded-xl border border-line bg-paper-raised p-6" aria-labelledby="ilgili-mevzuat">
          <h2 id="ilgili-mevzuat" className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            İlgili mevzuat
          </h2>
          <ul className="mt-4 space-y-2">
            {article.lawRefs.map((ref) => {
              const anchor = ref.provision ? provisionAnchor(ref.provision) : null;
              return (
                <li key={ref.id}>
                  <Link href={`/mevzuat/${ref.law.slug}${anchor ? `#${anchor}` : ''}`} className="link-quiet">
                    {ref.law.title}
                    {ref.provision ? `, m. ${ref.provision}` : ''}
                  </Link>
                  {ref.law.lawNumber && <span className="text-sm text-muted"> ({ref.law.lawNumber} s.)</span>}
                </li>
              );
            })}
          </ul>
        </aside>
      )}

      {shareUrl && (
        <ShareButtons
          className="mt-14 border-t border-line pt-6"
          heading="Bu yazıyı paylaş"
          url={shareUrl}
          title={article.title}
          text={article.excerpt}
        />
      )}

      <p className="notice mt-8">
        Bu yazı genel bilgilendirme ve düşünce paylaşımı amacı taşır; somut olaylara ilişkin hukuki danışmanlık yerine geçmez.
      </p>
    </article>
  );

  if (!hasToc) return body;
  return (
    <div className="container-page pt-14 lg:grid lg:grid-cols-[minmax(0,48rem)_14rem] lg:justify-center lg:gap-12 xl:grid-cols-[minmax(0,48rem)_16rem] xl:gap-16">
      {body}
      <div className="hidden lg:block">
        <ArticleTocSidebar toc={toc} />
      </div>
    </div>
  );
}
