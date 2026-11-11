/**
 * Resmî Gazete kaynağı: adresler, karakter kodlaması, fihrist ayrıştırma ve metin temizleme.
 * Veritabanına bağımlı değildir; içe aktarma (import.ts) ve testler tarafından kullanılır.
 */
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import sanitizeHtml from 'sanitize-html';

export const RG_ORIGIN = 'https://www.resmigazete.gov.tr';
export const RG_USER_AGENT = 'Mozilla/5.0 (compatible; MuessirResmiGazete/1.0; +https://muessir.vercel.app)';

// ---------------------------------------------------------------- tarih ve adresler

export type DateKey = string; // "2026-11-11"

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateKey(value: string): value is DateKey {
  const m = DATE_KEY_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Türkiye saatine göre bugünün tarihi. */
export function todayKey(now: Date = new Date()): DateKey {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(key: DateKey, days: number): DateKey {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function dateKeyToDate(key: DateKey): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function dateToKey(date: Date): DateKey {
  return date.toISOString().slice(0, 10);
}

function compact(key: DateKey): string {
  return key.replaceAll('-', '');
}

/** Fihrist adresi: …/eskiler/2026/11/20261111.htm, mükerrer için …/20261111M1.htm */
export function indexUrl(key: DateKey, supplement = 0): string {
  const [y, m] = key.split('-');
  return `${RG_ORIGIN}/eskiler/${y}/${m}/${compact(key)}${supplement ? `M${supplement}` : ''}.htm`;
}

/** Sitedeki sayı adresi parçası: "2026-11-11", "2026-11-11-mukerrer", "2026-11-11-mukerrer-2" */
export function issueSlug(key: DateKey, supplement = 0): string {
  if (!supplement) return key;
  return supplement === 1 ? `${key}-mukerrer` : `${key}-mukerrer-${supplement}`;
}

export function parseIssueSlug(slug: string): { date: DateKey; supplement: number } | null {
  const m = /^(\d{4}-\d{2}-\d{2})(?:-mukerrer(?:-(\d))?)?$/.exec(slug);
  if (!m || !isDateKey(m[1])) return null;
  const supplement = slug.includes('-mukerrer') ? (m[2] ? Number(m[2]) : 1) : 0;
  if (supplement === 1 && m[2]) return null; // "-mukerrer-1" yerine "-mukerrer" kullanılır
  return { date: m[1], supplement };
}

// ---------------------------------------------------------------- karakter kodlaması

/** Resmî Gazete sayfaları çoğunlukla windows-1254 kodludur; meta etiketine ve HTTP başlığına bakılır. */
export function decodeHtml(bytes: ArrayBuffer | Uint8Array, contentType = ''): string {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const head = new TextDecoder('latin1').decode(buf.subarray(0, 4096));
  const declared = /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ?? /charset=["']?([\w-]+)/i.exec(head)?.[1] ?? 'windows-1254';
  let label = declared.toLowerCase();
  if (label === 'iso-8859-9' || label === 'latin5') label = 'windows-1254';
  try {
    return new TextDecoder(label).decode(buf);
  } catch {
    return new TextDecoder('windows-1254').decode(buf);
  }
}

// ---------------------------------------------------------------- fihrist

export type IndexItem = {
  section: string;
  category: string;
  title: string;
  kind: 'METIN' | 'PDF' | 'ILAN';
  sourceUrl: string;
  code: string;
};

export type ParsedIndex = {
  /** O gün Resmî Gazete yayımlanmadıysa (ör. bayram) false */
  published: boolean;
  number: number | null;
  supplement: number;
  pdfUrl: string;
  items: IndexItem[];
};

const clean = (s: string) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const ACRONYMS = new Set(['TBMM', 'T.C.', 'KİT', 'YÖK', 'RTÜK', 'SPK', 'BDDK', 'EPDK', 'KVKK', 'AB', 'BM', 'NATO', 'OECD']);

/** "YÜRÜTME VE İDARE BÖLÜMÜ" → "Yürütme ve İdare Bölümü"; kısaltmalar (TBMM vb.) korunur. */
export function titleCaseTr(value: string): string {
  const small = new Set(['ve', 'ile', 'ya', 'veya', 'de', 'da']);
  return value
    .split(' ')
    .map((word, i) => {
      if (ACRONYMS.has(word)) return word;
      const w = word.toLocaleLowerCase('tr');
      return i > 0 && small.has(w) ? w : w.charAt(0).toLocaleUpperCase('tr') + w.slice(1);
    })
    .join(' ');
}

function isUpper(text: string): boolean {
  return /\p{L}/u.test(text) && text === text.toLocaleUpperCase('tr');
}

const FILE_RE = /(?:^|\/)(\d{8})(?:M(\d+))?-(\d+)\.(htm|html|pdf)$/i;

export function parseIndex(html: string, pageUrl: string): ParsedIndex {
  const $ = cheerio.load(html);
  const published = !/Resm[iî] Gazete yayımlanmamaktadır/i.test(clean($('body').text()));
  let number: number | null = null;
  let supplement = 0;
  let pdfUrl = '';
  let section = '';
  let category = '';
  const items: IndexItem[] = [];
  const seenCodes = new Set<string>();

  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') ?? '';
    if (!pdfUrl && /^\d{8}(M\d+)?\.pdf$/i.test(href)) pdfUrl = new URL(href, pageUrl).href;
  });

  $('p').each((_, p) => {
    const $p = $(p);
    const text = clean($p.text());
    if (!text) return;

    const head = /Tarihli ve (\d+) Sayılı Resm[iî] Gazete(?:\s*-\s*(?:(\d+)\.\s*)?Mükerrer)?/u.exec(text);
    if (head) {
      number = Number(head[1]);
      if (/Mükerrer/i.test(text)) supplement = head[2] ? Number(head[2]) : 1;
      return;
    }

    const link = $p.find('a[href]').toArray()
      .map((a) => $(a).attr('href') ?? '')
      .find((h) => /main\.aspx|\.(htm|html|pdf)(\?|#|$)/i.test(h));

    if (!link) {
      if (/BÖLÜMÜ$/u.test(text) && isUpper(text)) {
        section = titleCaseTr(text);
        category = '';
      } else if (isUpper(text) && text.length <= 120 && text !== 'MEVZUAT') {
        category = titleCaseTr(text);
      }
      return;
    }

    if (!section) return;
    let title = clean(text.replace(/^[–—-]+\s*/u, ''));
    if (/İlân/i.test(section)) title = title.replace(/^[a-zçğıöşü]\s*-\s*/u, '');
    if (!title) return;

    if (/main\.aspx/i.test(link)) {
      const target = /[?&]main=([^&]+)/i.exec(link)?.[1];
      const url = target ? new URL(decodeURIComponent(target), pageUrl) : new URL(link, pageUrl);
      url.protocol = 'https:';
      const n = /-(\d+)\.htm/i.exec(url.pathname)?.[1] ?? String(items.length);
      const code = `ilan-${n}`;
      if (seenCodes.has(code)) return;
      seenCodes.add(code);
      items.push({ section, category, title, kind: 'ILAN', sourceUrl: url.href, code });
      return;
    }

    const url = new URL(link, pageUrl);
    url.protocol = 'https:';
    const m = FILE_RE.exec(url.pathname);
    const code = m ? m[3] : `s${items.length + 1}`;
    if (seenCodes.has(code)) return;
    seenCodes.add(code);
    items.push({
      section,
      category,
      title,
      kind: /\.pdf$/i.test(url.pathname) ? 'PDF' : 'METIN',
      sourceUrl: url.href,
      code,
    });
  });

  return { published: published && items.length > 0, number, supplement, pdfUrl, items };
}

// ---------------------------------------------------------------- metin temizleme

const ALLOWED_CLASSES = ['rg-c', 'rg-r', 'rg-b', 'rg-j'];

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'sup', 'sub', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'img', 'a'],
  allowedAttributes: {
    p: ['class'],
    td: ['colspan', 'rowspan', 'class'],
    th: ['colspan', 'rowspan', 'class'],
    img: ['src', 'alt'],
    a: ['href', 'target', 'rel'],
  },
  allowedClasses: { p: ALLOWED_CLASSES, td: ALLOWED_CLASSES, th: ALLOWED_CLASSES },
  allowedSchemes: ['https'],
  allowedSchemesByTag: { img: ['https'] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  exclusiveFilter: (frame) => frame.tag === 'img' && !String(frame.attribs.src ?? '').startsWith(`${RG_ORIGIN}/`),
  transformTags: {
    a: (tagName, attribs) => {
      const out: sanitizeHtml.Attributes = {};
      if (attribs.href) Object.assign(out, { href: attribs.href, target: '_blank', rel: 'noopener noreferrer' });
      return { tagName, attribs: out };
    },
  },
};

function alignClasses($el: cheerio.Cheerio<Element>): string[] {
  const out: string[] = [];
  const cls = $el.attr('class') ?? '';
  const align = ($el.attr('align') ?? '').toLowerCase();
  const style = ($el.attr('style') ?? '').toLowerCase().replace(/\s+/g, '');
  if (/orta/i.test(cls) || align === 'center' || style.includes('text-align:center')) out.push('rg-c');
  else if (align === 'right' || style.includes('text-align:right')) out.push('rg-r');
  if (/bold|balk|baslik|başlık/i.test(cls)) out.push('rg-b');
  return out;
}

function isLayoutTable($: cheerio.CheerioAPI, table: Element): boolean {
  const rows = $(table).children('tbody, thead, tfoot').children('tr').add($(table).children('tr'));
  if (!rows.length) return true;
  return rows.toArray().every((tr) => $(tr).children('td, th').length <= 1);
}

/**
 * Word'den dışa aktarılmış madde sayfasını okunabilir, güvenli HTML'e çevirir:
 * baş bilgi satırı (tarih / Resmî Gazete / Sayı) ve tekrar eden kategori başlığı atılır,
 * tek hücreli yerleşim tabloları açılır, gerçek tablolar ve hizalamalar korunur.
 */
export function cleanItemHtml(html: string, pageUrl: string): string {
  const $ = cheerio.load(html);
  $('head, script, style, meta, link, title, xml, noscript, iframe, object').remove();
  $('*').each((_, el) => {
    if ('tagName' in el && el.tagName.includes(':')) $(el).replaceWith($(el).contents());
  });

  // Baş bilgi: "Sayı : 33427" içeren satır ve hemen ardından gelen büyük harfli kategori satırı.
  const sayi = $('p, td').filter((_, el) => /^Sayı\s*:\s*\d+/.test(clean($(el).text()))).first();
  const headerRow = sayi.closest('tr');
  if (headerRow.length) {
    const next = headerRow.next('tr');
    const nextText = clean(next.text());
    if (next.length && nextText && nextText.length <= 120 && isUpper(nextText) && next.find('p').length <= 2) next.remove();
    headerRow.remove();
  }

  // Hizalama ve vurgu bilgisini sınıflara taşı.
  $('p, td, th, div').each((_, el) => {
    const $el = $(el as Element);
    const classes = alignClasses($el);
    if (el.tagName === 'div') {
      if (classes.includes('rg-c')) $el.children('p').each((__, p) => { $(p).attr('data-rg', 'rg-c'); });
      return;
    }
    const inherited = $el.attr('data-rg');
    $el.attr('class', [...new Set([...classes, ...(inherited ? [inherited] : [])])].join(' '));
  });

  // Görsel adreslerini mutlak yap.
  $('img[src]').each((_, img) => {
    try {
      const url = new URL($(img).attr('src') ?? '', pageUrl);
      url.protocol = 'https:';
      $(img).attr('src', url.href);
    } catch {
      $(img).remove();
    }
  });

  // Tek sütunlu yerleşim tablolarını içten dışa doğru aç.
  for (let pass = 0; pass < 20; pass++) {
    const layout = $('table').toArray().filter((t) => isLayoutTable($, t as Element));
    if (!layout.length) break;
    for (const t of layout) {
      const cells = $(t).find('td, th').filter((_, c) => $(c).closest('table')[0] === t);
      $(t).replaceWith(cells.toArray().map((c) => $(c).html() ?? '').join(''));
    }
  }

  const body = $('body').length ? $('body').html() ?? '' : $.root().html() ?? '';
  const safe = sanitizeHtml(body, SANITIZE);

  // Boş paragrafları at, tabloları yatay kaydırılabilir kaba sar.
  const $out = cheerio.load(safe, null, false);
  $out('p').each((_, p) => {
    const $p = $out(p);
    if (!clean($p.text()) && !$p.find('img').length) $p.remove();
  });
  $out('a:not([href])').each((_, a) => {
    $out(a).replaceWith($out(a).contents());
  });
  $out('td, th').each((_, c) => {
    const $c = $out(c);
    if (!$c.attr('class')) $c.removeAttr('class');
  });
  $out('p').each((_, p) => {
    if (!$out(p).attr('class')) $out(p).removeAttr('class');
  });
  $out('table').each((_, t) => {
    $out(t).wrap('<div class="rg-table"></div>');
  });
  return ($out.root().html() ?? '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Temizlenmiş içeriğin düz metni (doğrulama ve boşluk kontrolü için). */
export function textOf(html: string): string {
  return clean(cheerio.load(html, null, false).root().text());
}

/** Kaynak sayfanın görünür gövde metni (kapsama denetimi için). */
export function sourceBodyText(html: string): string {
  const $ = cheerio.load(html);
  $('head, script, style').remove();
  return clean($('body').text());
}

