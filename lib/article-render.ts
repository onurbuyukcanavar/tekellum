import { sanitizeArticleHtml } from './sanitize';
import { buildToc, type TocEntry } from './toc';

export type RenderedArticle = { html: string; toc: TocEntry[]; footnoteCount: number };

/** Dipnot metnindeki adresleri bağlantıya çevirir (metin zaten HTML-kaçışlıdır). */
function linkify(escaped: string) {
  return escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

/**
 * Makale HTML'ini yayına hazırlar:
 * - temizler (sanitize),
 * - dipnotları sırayla numaralar ve yazının sonuna listeler,
 * - tabloları dar ekranda yatay kaydırılabilir bir kaba alır,
 * - görseli kalmamış figürleri atar,
 * - başlıklara bağlantı kimliği verip içindekileri üretir.
 */
export function renderArticleHtml(content: string | null | undefined): RenderedArticle {
  let html = sanitizeArticleHtml(content);

  html = html.replace(/<figure data-image(?:="")? data-size="[a-z]+">(?:(?!<img)[\s\S])*?<\/figure>/g, '');

  const notes: string[] = [];
  html = html.replace(/<sup data-footnote="([^"]*)">\s*<\/sup>/g, (_m, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return '';
    notes.push(trimmed);
    const n = notes.length;
    return `<sup class="fn-ref" id="dipnot-ref-${n}"><a href="#dipnot-${n}" aria-label="Dipnot ${n}">${n}</a></sup>`;
  });

  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');

  const { html: withIds, toc } = buildToc(html);
  html = withIds;

  if (notes.length) {
    const items = notes
      .map((t, i) => `<li id="dipnot-${i + 1}">${linkify(t)} <a href="#dipnot-ref-${i + 1}" class="fn-back" aria-label="Metne dön">↩</a></li>`)
      .join('');
    html += `<section class="footnotes" aria-labelledby="dipnotlar"><h2 id="dipnotlar">Dipnotlar</h2><ol>${items}</ol></section>`;
  }

  return { html, toc, footnoteCount: notes.length };
}
