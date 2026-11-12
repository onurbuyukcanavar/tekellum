import sanitizeHtml from 'sanitize-html';

/** Tiptap editörünün ürettiği biçimlere izin veren, geri kalan her şeyi atan beyaz liste. */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'ul', 'ol', 'li',
    'a', 'code', 'pre', 'hr', 'table', 'colgroup', 'col', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub',
    'mark', 'figure', 'figcaption', 'img', 'aside',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    th: ['colspan', 'rowspan', 'style'],
    td: ['colspan', 'rowspan', 'style'],
    ol: ['start'],
    p: ['style'],
    h2: ['style'],
    h3: ['style'],
    h4: ['style'],
    // Dipnot: metni öznitelikte taşınır, yayında numaralanır.
    sup: ['data-footnote'],
    figure: ['data-image', 'data-size'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    aside: ['data-callout'],
  },
  // Satır içi stillerden yalnızca hizalamaya izin verilir.
  allowedStyles: {
    '*': { 'text-align': [/^(left|right|center|justify)$/] },
  },
  // Görseller yalnızca sitenin kendi görsel adresinden yüklenebilir (dış kaynaklı izleme yapılamaz).
  exclusiveFilter: (frame) => frame.tag === 'img' && !/^\/gorsel\/[a-z0-9]{20,40}$/.test(frame.attribs.src ?? ''),
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    // Sayfa başlığı h1 olduğundan metin içindeki h1'ler h2'ye indirilir.
    h1: 'h2',
    h5: 'h4',
    h6: 'h4',
    figure: (tagName, attribs) => ({
      tagName,
      attribs: { 'data-image': '', 'data-size': ['tam', 'orta', 'kucuk'].includes(attribs['data-size'] ?? '') ? attribs['data-size'] : 'tam' },
    }),
    aside: (tagName, attribs) => ({ tagName, attribs: { 'data-callout': attribs['data-callout'] === 'onemli' ? 'onemli' : 'not' } }),
    img: (tagName, attribs) => {
      const out: sanitizeHtml.Attributes = { src: attribs.src ?? '', alt: attribs.alt ?? '', loading: 'lazy' };
      for (const k of ['width', 'height'] as const) if (/^\d{1,5}$/.test(attribs[k] ?? '')) out[k] = attribs[k];
      return { tagName, attribs: out };
    },
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
  const spaced = value.replace(/<\/(?:p|h[1-6]|li|blockquote|td|th|pre|div|figcaption|aside)>|<br\s*\/?>/gi, '$& ');
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
