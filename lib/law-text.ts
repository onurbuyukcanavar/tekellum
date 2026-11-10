/**
 * Mevzuat metni ayrıştırıcısı.
 *
 * Sade metin biçimi (scripts/mevzuat/donustur.mjs bu biçimi üretir; elle girilen metin de desteklenir):
 *   # BİRİNCİ KISIM — Genel Hükümler   → bölüm başlığı (içindekiler)
 *   ## A. Sözleşmenin kurulması         → madde başlığı (izleyen maddeye bağlanır)
 *   MADDE 1- …  /  Madde 68/a – …        → madde
 *   diğer satırlar                        → fıkra/paragraf ("# Dipnotlar" altında dipnot)
 * Önek kullanılmayan eski kayıtlarda tamamı büyük harfli kısa satırlar bölüm başlığı sayılır.
 */

export const ARTICLE_RE =
  /^((?:EK |GEÇİCİ |MÜKERRER |Ek |Geçici |Mükerrer )?(?:MADDE|Madde))\s*(\d+(?:\s*\/\s*[A-Za-zÇĞİÖŞÜçğıöşü])?(?:\s*\/\s*\d+)?)\s*[-–—.:]?\s*/;

export type LawArticle = { kind: 'article'; anchor: string; label: string; titles: string[]; paragraphs: string[] };
export type LawBlock =
  | { kind: 'section'; id: string; text: string }
  | { kind: 'heading'; text: string }
  | LawArticle
  | { kind: 'paragraph'; text: string }
  | { kind: 'note'; text: string };

const TR_MAP: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

function articleKind(label: string): 'madde' | 'gecici-madde' | 'ek-madde' | 'mukerrer-madde' {
  const first = label.toLocaleLowerCase('tr-TR').split(/\s+/)[0];
  if (first === 'geçici') return 'gecici-madde';
  if (first === 'ek') return 'ek-madde';
  if (first === 'mükerrer') return 'mukerrer-madde';
  return 'madde';
}

/** "68/a" → "68-a", "5/2" → "5-2" */
function numberSlug(num: string): string {
  return num
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, '')
    .replace(/[çğıöşü]/g, (c) => TR_MAP[c] ?? c)
    .replace(/\//g, '-');
}

/**
 * Atıftaki madde bilgisini çapaya çevirir: "49" → madde-49, "68/a" → madde-68-a,
 * "49/1" (fıkra) ve "49-52" (aralık) → madde-49, "geçici 1" → gecici-madde-1, "ek 2" → ek-madde-2.
 */
export function provisionAnchor(provision: string): string | null {
  const p = provision.toLocaleLowerCase('tr-TR');
  const m = p.match(/(\d+)(?:\s*\/\s*([a-zçğıöşü])(?![a-zçğıöşü]))?/);
  if (!m) return null;
  const prefix = /geçici|gecici/.test(p) ? 'gecici-madde' : /mükerrer|mukerrer/.test(p) ? 'mukerrer-madde' : /\bek\b/.test(p) ? 'ek-madde' : 'madde';
  return `${prefix}-${m[1]}${m[2] ? `-${TR_MAP[m[2]] ?? m[2]}` : ''}`;
}

const isLegacyUpperHeading = (line: string) =>
  line.length <= 90 && line === line.toLocaleUpperCase('tr-TR') && /[A-ZÇĞİÖŞÜ]{3}/.test(line) && !ARTICLE_RE.test(line);

export function parseLawText(content: string): LawBlock[] {
  const blocks: LawBlock[] = [];
  const seen = new Set<string>();
  let current: LawArticle | null = null;
  let pendingTitles: string[] = [];
  let sectionCount = 0;
  let inNotes = false;

  const flushTitles = () => {
    for (const text of pendingTitles) blocks.push({ kind: 'heading', text });
    pendingTitles = [];
  };
  const addSection = (text: string) => {
    current = null;
    flushTitles();
    sectionCount += 1;
    inNotes = /^dipnotlar$/i.test(text);
    blocks.push({ kind: 'section', id: `bolum-${sectionCount}`, text });
  };

  for (const raw of content.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('## ')) {
      current = null;
      pendingTitles.push(line.slice(3).trim());
      continue;
    }
    if (line.startsWith('# ')) {
      addSection(line.slice(2).trim());
      continue;
    }

    const match = inNotes ? null : line.match(ARTICLE_RE);
    if (match) {
      const label = `${match[1].toLocaleUpperCase('tr-TR')} ${match[2].replace(/\s+/g, '')}`;
      const base = `${articleKind(match[1])}-${numberSlug(match[2])}`;
      let anchor = base;
      for (let i = 2; seen.has(anchor); i += 1) anchor = `${base}-${i}`;
      seen.add(anchor);
      const rest = line.slice(match[0].length).trim();
      const article: LawArticle = { kind: 'article', anchor, label, titles: pendingTitles, paragraphs: rest ? [rest] : [] };
      pendingTitles = [];
      blocks.push(article);
      current = article;
      continue;
    }

    if (!inNotes && isLegacyUpperHeading(line) && !pendingTitles.length) {
      addSection(line);
      continue;
    }

    flushTitles();
    if (inNotes) blocks.push({ kind: 'note', text: line });
    else if (current) (current as LawArticle).paragraphs.push(line);
    else blocks.push({ kind: 'paragraph', text: line });
  }
  flushTitles();
  return blocks;
}

export type LawToc = { sections: { id: string; text: string }[]; articleCount: number };

export function buildLawToc(blocks: LawBlock[]): LawToc {
  return {
    sections: blocks.filter((b): b is { kind: 'section'; id: string; text: string } => b.kind === 'section').map(({ id, text }) => ({ id, text })),
    articleCount: blocks.filter((b) => b.kind === 'article').length,
  };
}
