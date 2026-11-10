import Link from 'next/link';
import { formatDate } from '@/lib/format';

export type ArticleCardData = {
  id: string; title: string; slug: string; excerpt: string; category: string; author: string;
  featured: boolean; publishedAt: Date | null;
};

export function ArticleCard({ article }: { article: ArticleCardData }) {
  return (
    <article className="group relative flex flex-col border-t border-line pt-6">
      <div className="mb-3 flex items-center gap-3 text-xs">
        <span className="eyebrow">{article.category}</span>
        {article.featured && <span className="text-muted">· Öne çıkan</span>}
      </div>
      <h3 className="font-serif text-2xl leading-snug text-navy transition group-hover:text-bronze">
        <Link href={`/makaleler/${article.slug}`} className="after:absolute after:inset-0">
          {article.title}
        </Link>
      </h3>
      {article.excerpt && <p className="mt-3 line-clamp-3 text-[0.97rem] leading-relaxed text-ink-soft">{article.excerpt}</p>}
      <div className="mt-auto flex items-center gap-2 pt-5 text-xs text-muted">
        <span>{article.author}</span>
        {article.publishedAt && (
          <>
            <span aria-hidden>·</span>
            <time dateTime={new Date(article.publishedAt).toISOString()}>{formatDate(article.publishedAt)}</time>
          </>
        )}
      </div>
    </article>
  );
}
