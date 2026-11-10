/**
 * Düz metin olarak girilen mevzuatı paragraflara ayırır ve "MADDE 49-" gibi satırları
 * madde bağlantısı (#madde-49) verilebilecek bloklar olarak işaretler.
 */
export type LawBlock =
  | { kind: 'article'; anchor: string; label: string; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string };

const ARTICLE_RE = /^\s*((?:MADDE|Madde|GEÇİCİ MADDE|Geçici Madde|EK MADDE|Ek Madde)\s+(\d+(?:\/[A-Za-zÇĞİÖŞÜçğıöşü])?(?:\s*\/\s*\d+)?))\s*[-–—.:]?\s*(.*)$/;

export function provisionAnchor(provision: string): string | null {
  const match = provision.match(/\d+/);
  return match ? `madde-${match[0]}` : null;
}

export function parseLawText(content: string): LawBlock[] {
  const blocks: LawBlock[] = [];
  const seen = new Set<string>();
  for (const rawLine of content.replace(/\r\n?/g, '\n').split(/\n{1,}/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(ARTICLE_RE);
    if (match) {
      const [, label, number, rest] = match;
      const prefix = slugPrefix(label);
      const base = prefix === 'madde' ? `madde-${number.replace(/\D.*$/, '')}` : `${prefix}-${number.replace(/\D+/g, '-')}`;
      let anchor = base;
      for (let i = 2; seen.has(anchor); i += 1) anchor = `${base}-${i}`;
      seen.add(anchor);
      blocks.push({ kind: 'article', anchor, label: label.toLocaleUpperCase('tr-TR'), text: rest });
    } else if (line.length <= 90 && line === line.toLocaleUpperCase('tr-TR') && /[A-ZÇĞİÖŞÜ]/.test(line)) {
      blocks.push({ kind: 'heading', text: line });
    } else {
      blocks.push({ kind: 'paragraph', text: line });
    }
  }
  return blocks;
}

function slugPrefix(label: string): string {
  const first = label.toLocaleLowerCase('tr-TR').split(/\s+/)[0];
  return first === 'geçici' ? 'gecici-madde' : first === 'ek' ? 'ek-madde' : 'madde';
}
