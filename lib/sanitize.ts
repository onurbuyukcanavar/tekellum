import sanitizeHtml from 'sanitize-html';

/** Tiptap editörünün ürettiği biçimlere izin veren, geri kalan her şeyi atan beyaz liste. */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'ul', 'ol', 'li',
    'a', 'code', 'pre', 'hr', 'table', 'colgroup', 'col', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
    ol: ['start'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    // Sayfa başlığı h1 olduğundan metin içindeki h1'ler h2'ye indirilir.
    h1: 'h2',
    h5: 'h4',
    h6: 'h4',
    a: (tagName, attribs) => {
      const href = attribs.href ?? '';
      const out: sanitizeHtml.Attributes = {};
      if (href) out.href = href;
      if (/^https?:\/\//i.test(href)) {
        out.target = '_blank';
        out.rel = 'noopener noreferrer';
      }
      return { tagName, attribs: out };
    },
  },
};

export function sanitizeArticleHtml(value: string | null | undefined): string {
  return sanitizeHtml(value ?? '', OPTIONS).trim();
}

/** HTML içeriğindeki düz metin (boşluk kontrolü ve okuma süresi için). */
export function htmlToPlainText(value: string): string {
  // Blok sonlarına boşluk eklenir; aksi hâlde ardışık paragrafların kelimeleri birleşir.
  const spaced = value.replace(/<\/(?:p|h[1-6]|li|blockquote|td|th|pre|div)>|<br\s*\/?>/gi, '$& ');
  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function readingMinutes(html: string): number {
  const words = htmlToPlainText(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
