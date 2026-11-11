/**
 * PDF → ortak belge modeli (pdf.js ile metin çıkarma).
 *
 * PDF'de paragraf kavramı yoktur; metin parçaları konumlarına göre satırlara, satırlar aralık/girinti/
 * hizaya bakılarak paragraflara birleştirilir. Kalın/italik ve yazı ailesi yazı tipi adından, sütun düzeni
 * büyük boşluklardan (sekme) çıkarılır. Her sayfada tekrarlanan üst/alt bilgi ve sayfa numaraları gövdeden ayıklanır.
 * Taranmış (görüntü) PDF'lerde metin bulunmadığından dönüştürme yapılamaz.
 */
import { ConvertError, defaultFont, defaultPage, emptyParagraph, type Align, type Doc, type FontSpec, type Inline, type Paragraph, type TabStop } from './model';
import { sameFont } from './udf-read';

/** pdf.js modülünün kullandığımız kısmı (tarayıcıda ve Node'da farklı yüklenir). */
export type PdfJs = {
  getDocument(src: Record<string, unknown>): { promise: Promise<PdfDoc>; destroy(): Promise<void> };
};
type PdfDoc = { numPages: number; getPage(n: number): Promise<PdfPage> };
type PdfPage = {
  getViewport(o: { scale: number }): { width: number; height: number };
  getTextContent(o?: Record<string, unknown>): Promise<{ items: unknown[] }>;
  getOperatorList(): Promise<unknown>;
  commonObjs: { get(id: string): unknown; has?(id: string): boolean };
};
type TextItem = { str: string; transform: number[]; width: number; height: number; fontName: string; hasEOL?: boolean };

type Glyph = { text: string; x: number; y: number; w: number; size: number; font: FontSpec };
type Line = { y: number; x: number; end: number; size: number; parts: Glyph[]; page: number; pageH: number };

export async function readPdf(bytes: Uint8Array, pdfjs: PdfJs): Promise<Doc> {
  let pdf: PdfDoc;
  const task = pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, fontExtraProperties: true, verbosity: 0 });
  try {
    pdf = await task.promise;
  } catch (error) {
    const name = (error as { name?: string })?.name ?? '';
    if (name === 'PasswordException') throw new ConvertError('Bu PDF parola korumalı. Parolayı kaldırıp tekrar deneyin.');
    throw new ConvertError('PDF dosyası açılamadı: dosya bozuk ya da PDF değil.');
  }

  const doc: Doc = { page: defaultPage(), body: [], notes: [] };
  const lines: Line[] = [];
  let pageW = 0;
  let pageH = 0;
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const vp = page.getViewport({ scale: 1 });
      if (n === 1) { pageW = vp.width; pageH = vp.height; }
      try { await page.getOperatorList(); } catch { /* yazı tipi adları olmadan da devam edilir */ }
      const tc = await page.getTextContent({ disableNormalization: false });
      const glyphs: Glyph[] = [];
      for (const raw of tc.items) {
        const it = raw as TextItem;
        if (typeof it.str !== 'string' || !it.transform) continue;
        const [a, b, c, d, e, f] = it.transform;
        if (Math.abs(b) > 0.01 || Math.abs(c) > 0.01) continue; // döndürülmüş metin (damga vb.) atlanır
        const size = Math.abs(d) || Math.hypot(c, d) || Math.abs(a);
        if (!it.str && !it.width) continue;
        glyphs.push({ text: it.str, x: e, y: vp.height - f, w: it.width, size, font: fontFor(page, it.fontName, size) });
      }
      lines.push(...groupLines(glyphs, n, vp.height));
    }
  } finally {
    await task.destroy().catch(() => {});
  }

  const textChars = lines.reduce((s, l) => s + l.parts.reduce((t, p) => t + p.text.trim().length, 0), 0);
  if (textChars < 10) {
    throw new ConvertError('Bu PDF metin içermiyor (taranmış görüntü olabilir). Taranmış belgeler metne çevrilemez; önce bir OCR aracıyla metin tanıma yapılması gerekir.');
  }

  doc.page.width = pageW || doc.page.width;
  doc.page.height = pageH || doc.page.height;

  const body = stripRunningLines(lines, pdf.numPages);
  const left = percentile(body.map((l) => l.x), 0.05);
  const right = percentile(body.map((l) => l.end), 0.95);
  const top = percentile(body.map((l) => l.y - l.size), 0.02);
  const bottom = percentile(body.map((l) => l.y), 0.98);
  doc.page.margins = {
    left: clamp(left, 28, doc.page.width / 3),
    right: clamp(doc.page.width - right, 28, doc.page.width / 3),
    top: clamp(top - 4, 28, doc.page.height / 4),
    bottom: clamp(doc.page.height - bottom - 8, 28, doc.page.height / 4),
  };

  doc.body = buildParagraphs(body, doc.page.margins.left, doc.page.width - doc.page.margins.right);
  doc.notes.push('PDF\'deki metin, paragraf ve biçim yapısı tahmin edilerek yeniden oluşturuldu; tablolar sekmeli metin olarak, görseller ise aktarılmaz.');
  return doc;
}

// ------------------------------------------------------------ yazı tipi

function fontFor(page: PdfPage, id: string, size: number): FontSpec {
  let name = '';
  try {
    const f = page.commonObjs.get(id) as { name?: string; fallbackName?: string; bold?: boolean; italic?: boolean } | undefined;
    name = `${f?.name ?? ''} ${f?.fallbackName ?? ''}`;
    if (f?.bold && !/bold/i.test(name)) name += ' Bold';
    if (f?.italic && !/italic|oblique/i.test(name)) name += ' Italic';
  } catch {
    name = '';
  }
  const n = name.replace(/^[A-Z]{6}\+/, '');
  const family = /courier|mono|consol/i.test(n) ? 'Courier New' : /arial|helvet|sans|calibri|verdana|tahoma|segoe|dejavusans|roboto|liberationsans/i.test(n) ? 'Arial' : 'Times New Roman';
  return defaultFont({
    family,
    size: Math.round(size * 2) / 2,
    bold: /bold|black|heavy|semibold|demi|,b\b/i.test(n),
    italic: /italic|oblique|,i\b/i.test(n),
  });
}

// ------------------------------------------------------------ satırlar

function groupLines(glyphs: Glyph[], page: number, pageH: number): Line[] {
  const sorted = glyphs.filter((g) => g.text !== '' || g.w > 0).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: Line[] = [];
  for (const g of sorted) {
    const line = lines.find((l) => Math.abs(l.y - g.y) < Math.max(1.5, Math.min(l.size, g.size) * 0.4));
    if (line) {
      line.parts.push(g);
      line.size = Math.max(line.size, g.size);
    } else lines.push({ y: g.y, x: g.x, end: g.x + g.w, size: g.size, parts: [g], page, pageH });
  }
  for (const l of lines) {
    l.parts.sort((a, b) => a.x - b.x);
    const visible = l.parts.filter((p) => p.text.trim());
    l.x = visible.length ? visible[0].x : l.parts[0].x;
    l.end = Math.max(...(visible.length ? visible : l.parts).map((p) => p.x + p.w));
  }
  return lines.filter((l) => l.parts.some((p) => p.text.trim())).sort((a, b) => a.y - b.y);
}

/** Sayfaların üst/alt kenarında tekrar eden satırları (antet, sayfa numarası) ayıklar. */
function stripRunningLines(lines: Line[], pages: number): Line[] {
  if (pages < 2) return lines.filter((l) => !isPageNumber(textOfLine(l)));
  const key = (l: Line) => textOfLine(l).replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
  const zone = (l: Line) => l.y < l.pageH * 0.1 || l.y > l.pageH * 0.9;
  const counts = new Map<string, Set<number>>();
  for (const l of lines) if (zone(l)) {
    const k = key(l);
    if (!counts.has(k)) counts.set(k, new Set());
    counts.get(k)!.add(l.page);
  }
  return lines.filter((l) => {
    if (!zone(l)) return true;
    const t = textOfLine(l);
    if (isPageNumber(t)) return false;
    return (counts.get(key(l))?.size ?? 0) < Math.max(2, Math.ceil(pages * 0.5));
  });
}

function isPageNumber(text: string): boolean {
  return /^\s*(sayfa\s*)?[-–(]?\s*\d{1,4}\s*([/–-]|\s+of\s+|\s*\/\s*)?\s*\d{0,4}\s*[-–)]?\s*$/i.test(text);
}

function textOfLine(l: Line): string {
  return l.parts.map((p) => p.text).join(' ');
}

// ------------------------------------------------------------ paragraflar

type Run = { inlines: Inline[]; tabs: number[] };

function lineInlines(l: Line, left: number, right = Infinity): Run {
  // İki yana yaslı (tam dolu) satırlarda kelime araları açılır; sekme saymak için daha geniş boşluk aranır.
  const full = l.end >= right - 6;
  const inlines: Inline[] = [];
  const tabs: number[] = [];
  let prevEnd: number | null = null;
  let prevText = '';
  const push = (text: string, font: FontSpec) => {
    const last = inlines[inlines.length - 1];
    if (last && last.kind === 'text' && sameFont(last.font, font)) last.text += text;
    else inlines.push({ kind: 'text', text, font });
  };
  let pendingTab = false;
  for (const p of l.parts) {
    const tabWidth = full ? p.size * 3 : Math.max(p.size * 1.2, p.size * 0.25 * 4);
    // pdf.js sekme boşluklarını tek bir geniş boşluk öğesi olarak verir.
    if (!p.text.trim()) {
      if (p.w > tabWidth) pendingTab = true;
      else if (p.text && !/\s$/.test(prevText)) { push(' ', p.font); prevText = ' '; }
      prevEnd = p.x + p.w;
      continue;
    }
    if (prevEnd !== null) {
      const gap = p.x - prevEnd;
      if (pendingTab || gap > tabWidth) {
        const last = inlines[inlines.length - 1];
        if (last && last.kind === 'text') last.text = last.text.replace(/\s+$/, '');
        inlines.push({ kind: 'tab', font: p.font });
        tabs.push(p.x - left);
        prevText = '';
      } else if (gap > p.size * 0.1 && !/\s$/.test(prevText) && !/^\s/.test(p.text)) push(' ', p.font);
    }
    pendingTab = false;
    const text = normalizeGlyphs(p.text);
    push(text, p.font);
    prevText = text;
    prevEnd = p.x + p.w;
  }
  // Satır sonundaki fazla boşluklar
  const last = inlines[inlines.length - 1];
  if (last && last.kind === 'text') last.text = last.text.replace(/\s+$/, '');
  return { inlines, tabs };
}

/** Sembol yazı tiplerinin özel alan karakterleri (madde işaretleri) → standart karakter */
function normalizeGlyphs(text: string): string {
  return text.replace(/[\uF0B7\uF0A7\uF0FC\uF0D8\uF076\uF06E\uF0A8]/g, '•').replace(/[\uE000-\uF8FF]/g, '•');
}

const LIST_START = /^\s*([•●▪■◦\-–*]|\(?\d{1,3}[.)-]|\(?[a-zçğıöşü][.)]|[IVXLC]{1,5}[.)-])\s/i;

function buildParagraphs(lines: Line[], left: number, right: number): Paragraph[] {
  const width = right - left;
  const out: Paragraph[] = [];
  let group: Line[] = [];
  let gapBefore = 0;

  const flush = () => {
    if (!group.length) return;
    out.push(makeParagraph(group, left, right, gapBefore));
    group = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const prev = group[group.length - 1];
    if (!prev) {
      group.push(l);
      gapBefore = 0;
      continue;
    }
    const samePage = prev.page === l.page;
    const lineGap = samePage ? l.y - prev.y : prev.size * 1.2;
    const normal = Math.max(prev.size, l.size) * 1.45;
    const prevFull = prev.end >= right - Math.max(12, width * 0.04);
    const sameSize = Math.abs(prev.size - l.size) < 1.2;
    const text = textOfLine(l);
    const hasTab = lineInlines(l, left, right).tabs.length > 0;
    const continues = sameSize && lineGap <= normal && !LIST_START.test(text) && !hasTab
      && prevFull
      && (l.x <= Math.max(group[0].x, group.length > 1 ? group[1].x : group[0].x) + 2 || isHangingContinuation(group, l, left, right))
      // Sağa yaslı / sayfanın sağında başlayan satırlar (imza bloğu, tarih) birleştirilmez.
      && !(group[0].x > left + width * 0.25 && Math.abs(l.x - group[0].x) > 2)
      && (samePage || /[a-zçğıöşü,;(]/.test(text.trim()[0] ?? ''));
    if (continues) {
      group.push(l);
      continue;
    }
    flush();
    gapBefore = samePage ? Math.max(0, lineGap - l.size * 1.2) : 0;
    group.push(l);
  }
  flush();
  return out;
}

/** "ETİKET<sekme>: metin" düzeninde alt satırlar sekmenin hizasından devam eder (asılı girinti). */
function isHangingContinuation(group: Line[], l: Line, left: number, right: number): boolean {
  const tabs = lineInlines(group[0], left, right).tabs;
  if (!tabs.length) return false;
  const anchor = left + tabs[tabs.length - 1];
  return Math.abs(l.x - anchor) < 14 || (group.length > 1 && Math.abs(l.x - group[1].x) < 2);
}

function makeParagraph(group: Line[], left: number, right: number, gapBefore: number): Paragraph {
  const width = right - left;
  const center = (left + right) / 2;
  const first = group[0];
  const rest = group.slice(1);
  const restX = rest.length ? Math.min(...rest.map((l) => l.x)) : first.x;

  let align: Align = 'left';
  const fullLines = group.slice(0, -1).filter((l) => l.end >= right - Math.max(6, width * 0.02)).length;
  if (group.length > 1 && fullLines >= group.length - 1) align = 'justify';
  else if (group.every((l) => Math.abs((l.x + l.end) / 2 - center) < 6) && first.x > left + 18) align = 'center';
  else if (group.every((l) => Math.abs(l.end - right) < 4) && first.x > left + width * 0.3) align = 'right';

  const inlines: Inline[] = [];
  const tabSet = new Set<number>();
  group.forEach((l, k) => {
    const run = lineInlines(l, left, right);
    run.tabs.forEach((t) => tabSet.add(Math.round(t)));
    if (k > 0) {
      const prev = inlines[inlines.length - 1];
      const firstNew = run.inlines[0];
      // Satır sonu tirelemesi birleştirilir; aksi hâlde satırlar boşlukla birleşir.
      if (prev && prev.kind === 'text' && /[a-zçğıöşü]-$/i.test(prev.text) && firstNew?.kind === 'text' && /^[a-zçğıöşü]/.test(firstNew.text)) prev.text = prev.text.slice(0, -1);
      else if (prev && prev.kind === 'text') prev.text += ' ';
    }
    for (const it of run.inlines) {
      const last = inlines[inlines.length - 1];
      if (it.kind === 'text' && last && last.kind === 'text' && sameFont(last.font, it.font)) last.text += it.text;
      else inlines.push(it);
    }
  });

  const font = (inlines.find((i) => i.kind === 'text') as Extract<Inline, { kind: 'text' }> | undefined)?.font ?? defaultFont({ size: first.size });
  const centeredOrRight = align === 'center' || align === 'right';
  const indentLeft = centeredOrRight ? 0 : Math.max(0, Math.round(restX - left));
  const tabs: TabStop[] = [...tabSet].sort((a, b) => a - b).map((pos) => ({ pos, align: 'left', leader: 'none' }));
  return emptyParagraph({
    align,
    indentLeft,
    firstLine: centeredOrRight ? 0 : Math.round(first.x - left) - indentLeft,
    spaceBefore: Math.min(24, Math.round(gapBefore)),
    tabs,
    font,
    inlines,
  });
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
