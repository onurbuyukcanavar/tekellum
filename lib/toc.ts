import { htmlToPlainText } from './sanitize';
import { slugify } from './slug';

export type TocEntry = { id: string; text: string; level: 2 | 3 };

/**
 * Temizlenmiş makale HTML'indeki h2/h3 başlıklarına bağlantı kimliği ekler ve içindekiler listesini döndürür.
 * Girdi sanitizeArticleHtml çıktısı olmalıdır: orada başlıklarda id bulunmaz (en fazla hizalama stili olur).
 * h4 ve altı içindekilere alınmaz (liste kısa ve okunur kalsın diye).
 */
export function buildToc(html: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const used = new Set<string>();
  const out = html.replace(/<(h[23])((?:\s(?!id=)[^>]*)?)>([\s\S]*?)<\/\1>/g, (match, tag: string, attrs: string, inner: string) => {
    const text = htmlToPlainText(inner);
    if (!text) return match;
    const base = slugify(text, 60) || `bolum-${toc.length + 1}`;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    toc.push({ id, text, level: tag === 'h2' ? 2 : 3 });
    return `<${tag} id="${id}"${attrs ?? ''}>${inner}</${tag}>`;
  });
  return { html: out, toc };
}
