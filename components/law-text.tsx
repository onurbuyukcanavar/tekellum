import { parseLawText } from '@/lib/law-text';

/** Düz mevzuat metnini madde bağlantılı bloklar olarak gösterir (HTML yorumlanmaz). */
export function LawText({ content }: { content: string }) {
  const blocks = parseLawText(content);
  return (
    <div className="space-y-4 font-serif text-[1.08rem] leading-[1.8] text-ink">
      {blocks.map((block, i) => {
        if (block.kind === 'heading') {
          return (
            <h2 key={i} className="pt-6 text-center font-sans text-sm font-semibold uppercase tracking-[0.18em] text-navy">
              {block.text}
            </h2>
          );
        }
        if (block.kind === 'article') {
          return (
            <p key={i} id={block.anchor} className="law-article scroll-mt-28 -mx-3 px-3 py-1">
              <a href={`#${block.anchor}`} className="mr-2 font-sans text-sm font-semibold tracking-wide text-bronze no-underline">
                {block.label}
              </a>
              {block.text}
            </p>
          );
        }
        return <p key={i}>{block.text}</p>;
      })}
    </div>
  );
}
