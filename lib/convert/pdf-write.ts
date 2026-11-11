/**
 * Belge modelinden PDF üreten dizgi motoru (pdf-lib + fontkit).
 *
 * Hukuk belgelerinin düzeni için gereken davranışları birebir uygular: sekme durakları (sol/orta/sağ),
 * iki yana yaslama, ilk satır ve asılı girinti, paragraf aralıkları, satır aralığı, tablolar, görseller,
 * üst/alt bilgi ve "1/3" biçiminde sayfa numarası. Yazı tipleri Times New Roman / Arial / Courier New ile
 * aynı ölçülere sahip Liberation ailesidir; böylece satır kırılmaları özgün belgeye çok yakın olur.
 */
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage, LineCapStyle } from 'pdf-lib';
import type { Block, Border, Doc, FontSpec, ImageData, Inline, Paragraph, Table, TabStop } from './model';

export type FontLoader = (file: string) => Promise<Uint8Array>;

type Face = 'serif' | 'sans' | 'mono';
const FILES: Record<Face, Record<'r' | 'b' | 'i' | 'bi', string>> = {
  serif: { r: 'LiberationSerif-Regular.ttf', b: 'LiberationSerif-Bold.ttf', i: 'LiberationSerif-Italic.ttf', bi: 'LiberationSerif-BoldItalic.ttf' },
  sans: { r: 'LiberationSans-Regular.ttf', b: 'LiberationSans-Bold.ttf', i: 'LiberationSans-Italic.ttf', bi: 'LiberationSans-BoldItalic.ttf' },
  mono: { r: 'LiberationMono-Regular.ttf', b: 'LiberationMono-Bold.ttf', i: 'LiberationMono-Regular.ttf', bi: 'LiberationMono-Bold.ttf' },
};

export function faceOf(family: string): Face {
  const f = family.toLowerCase();
  if (/courier|mono|consol|dialoginput|lucida console/.test(f)) return 'mono';
  if (/arial|helvet|sans|dialog|tahoma|verdana|calibri|segoe|trebuchet|liberation sans|roboto|open sans|candara|century gothic|gill/.test(f)) return 'sans';
  return 'serif';
}

// ------------------------------------------------------------ yazı tipi yönetimi

type Metrics = { ascent: number; descent: number; gap: number; widths: Map<number, number>; has: (cp: number) => boolean; glyphWidth: (cp: number) => number };

type FontKitFont = {
  unitsPerEm: number; ascent: number; descent: number; lineGap: number;
  hasGlyphForCodePoint(cp: number): boolean; glyphForCodePoint(cp: number): { advanceWidth: number };
};

class Fonts {
  private pdfFonts = new Map<string, Promise<PDFFont>>();
  private metrics = new Map<string, Promise<Metrics>>();
  private bytes = new Map<string, Promise<Uint8Array>>();
  private ready = new Map<string, { pdf: PDFFont; m: Metrics }>();

  constructor(private pdf: PDFDocument, private load: FontLoader) {}

  static key(font: FontSpec): string {
    const face = faceOf(font.family);
    const v = font.bold && font.italic ? 'bi' : font.bold ? 'b' : font.italic ? 'i' : 'r';
    return FILES[face][v];
  }

  private file(file: string) {
    if (!this.bytes.has(file)) this.bytes.set(file, this.load(file));
    return this.bytes.get(file)!;
  }

  async prepare(font: FontSpec) {
    const file = Fonts.key(font);
    if (this.ready.has(file)) return;
    if (!this.pdfFonts.has(file)) {
      this.pdfFonts.set(file, this.file(file).then((b) => this.pdf.embedFont(b, { subset: true, features: { liga: false, kern: false, calt: false } })));
      this.metrics.set(file, this.file(file).then((b) => {
        const f = fontkit.create(b as never) as unknown as FontKitFont;
        const upm = f.unitsPerEm;
        const widths = new Map<number, number>();
        return {
          ascent: f.ascent / upm,
          descent: -f.descent / upm,
          gap: Math.max(0, f.lineGap) / upm,
          widths,
          has: (cp: number) => f.hasGlyphForCodePoint(cp),
          glyphWidth: (cp: number) => {
            let w = widths.get(cp);
            if (w === undefined) {
              w = f.glyphForCodePoint(cp).advanceWidth / upm;
              widths.set(cp, w);
            }
            return w;
          },
        };
      }));
    }
    const [pdf, m] = await Promise.all([this.pdfFonts.get(file)!, this.metrics.get(file)!]);
    this.ready.set(file, { pdf, m });
  }

  get(font: FontSpec) {
    const r = this.ready.get(Fonts.key(font));
    if (!r) throw new Error('Yazı tipi hazırlanmadı');
    return r;
  }
}

const FALLBACK_CHARS: Record<string, string> = {
  '➢': '•', '➤': '•', '➔': '•', '◆': '•', '◊': '•', '▲': '•',
  '■': '•', '□': '•', '✓': 'v', '✔': 'v', '☐': '□', '☑': '□', '☒': '□',
  '': '•', '': '•', '': '•', '': '•', '': 'v',
};

// ------------------------------------------------------------ dizgi

type Piece = { text: string; font: FontSpec; size: number; rise: number; width: number };

type Token =
  | { t: 'word'; pieces: Piece[]; width: number }
  | { t: 'space'; piece: Piece; width: number }
  | { t: 'tab'; font: FontSpec }
  | { t: 'gap'; width: number }
  | { t: 'image'; image: ImageData; width: number; height: number }
  | { t: 'break' };

type LineItem =
  | { t: 'word'; pieces: Piece[]; width: number }
  | { t: 'space'; piece: Piece; width: number }
  | { t: 'tab'; width: number; leader: TabStop['leader']; font: FontSpec }
  | { t: 'gap'; width: number }
  | { t: 'image'; image: ImageData; width: number; height: number };

type Op =
  | { op: 'text'; x: number; y: number; text: string; font: FontSpec; size: number }
  | { op: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; color: string; dash?: number[] }
  | { op: 'rect'; x: number; y: number; w: number; h: number; color: string }
  | { op: 'image'; x: number; y: number; w: number; h: number; image: ImageData };

type FieldCtx = { page: number; pages: number };

const CELL_PAD_X = 5.4;
const CELL_PAD_Y = 1.5;
const DEFAULT_TAB = 36;
/** Yuvarlama farkları yüzünden satır kırılmasın diye tanınan pay (pt) */
const FIT_TOLERANCE = 0.75;

/** Sayfalara bölünmüş çizim komutları. */
class Flow {
  pages: Op[][] = [[]];
  y: number;
  private hasContent = false;

  constructor(private top: number, private bottom: number, private paginate: boolean) {
    this.y = top;
  }

  get ops() {
    return this.pages[this.pages.length - 1];
  }

  get atTop() {
    return !this.hasContent;
  }

  /** h yüksekliğinde bir parça sığmıyorsa yeni sayfaya geçer. */
  ensure(h: number) {
    if (this.paginate && this.hasContent && this.y + h > this.bottom + 0.01) this.newPage();
  }

  newPage() {
    if (!this.paginate) return;
    this.pages.push([]);
    this.y = this.top;
    this.hasContent = false;
  }

  mark() {
    this.hasContent = true;
  }
}

class Typesetter {
  constructor(private fonts: Fonts, private field: FieldCtx = { page: 1, pages: 1 }) {}

  withField(ctx: FieldCtx) {
    return new Typesetter(this.fonts, ctx);
  }

  // ---------------- ölçüm

  private sizeOf(font: FontSpec) {
    return font.vertical ? font.size * 0.66 : font.size;
  }

  private riseOf(font: FontSpec) {
    return font.vertical === 'super' ? -font.size * 0.33 : font.vertical === 'sub' ? font.size * 0.14 : 0;
  }

  /** Metni yazı tipinde bulunmayan karakterlerden arındırır. */
  private clean(text: string, font: FontSpec): string {
    const { m } = this.fonts.get(font);
    let out = '';
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      if (cp < 32) continue;
      if (m.has(cp)) out += ch;
      else if (FALLBACK_CHARS[ch] && m.has(FALLBACK_CHARS[ch].codePointAt(0)!)) out += FALLBACK_CHARS[ch];
      else if (cp === 0xa0) out += ' ';
      else if (/\p{M}/u.test(ch)) continue;
      else out += '?';
    }
    return out;
  }

  width(text: string, font: FontSpec): number {
    const { m } = this.fonts.get(font);
    const size = this.sizeOf(font);
    let w = 0;
    for (const ch of text) w += m.glyphWidth(ch.codePointAt(0)!);
    return w * size;
  }

  lineMetrics(font: FontSpec) {
    const { m } = this.fonts.get(font);
    return { ascent: m.ascent * font.size, descent: m.descent * font.size, gap: m.gap * font.size };
  }

  // ---------------- belirteçler

  private piece(text: string, font: FontSpec): Piece {
    const clean = this.clean(text, font);
    return { text: clean, font, size: this.sizeOf(font), rise: this.riseOf(font), width: this.width(clean, font) };
  }

  tokens(inlines: Inline[]): Token[] {
    const out: Token[] = [];
    let word: Piece[] | null = null;
    const endWord = () => {
      if (word && word.length) out.push({ t: 'word', pieces: word, width: word.reduce((s, p) => s + p.width, 0) });
      word = null;
    };
    for (const it of inlines) {
      if (it.kind === 'tab') { endWord(); out.push({ t: 'tab', font: it.font }); continue; }
      if (it.kind === 'break') { endWord(); out.push({ t: 'break' }); continue; }
      if (it.kind === 'image') { endWord(); out.push({ t: 'image', image: it.image, width: it.width, height: it.height }); continue; }
      const text = it.kind === 'field' ? String(it.field === 'page' ? this.field.page : this.field.pages) : it.text;
      const font = it.font;
      // Metni boşluklara göre parçala; boşluk olmayan ardışık parçalar (farklı biçimde olsa da) tek kelimedir.
      const parts = text.split(/( )/);
      for (const part of parts) {
        if (part === '') continue;
        if (part === ' ') {
          endWord();
          const p = this.piece(' ', font);
          out.push({ t: 'space', piece: p, width: p.width });
        } else {
          (word ??= []).push(this.piece(part, font));
        }
      }
    }
    endWord();
    return out;
  }

  // ---------------- paragraf

  paragraph(p: Paragraph, flow: Flow, x0: number, width: number) {
    if (p.pageBreakBefore && !flow.atTop) flow.newPage();
    if (!flow.atTop) flow.y += p.spaceBefore;

    const tokens = this.tokens(p.inlines);
    const left = x0 + p.indentLeft;
    const right = x0 + width - p.indentRight;
    const firstStart = left + p.firstLine;

    if (p.list) {
      const label = this.piece(p.list.text, p.list.font);
      const labelEnd = firstStart + label.width;
      const textStart = p.firstLine < 0 && left - labelEnd >= 2 ? left : labelEnd + Math.max(this.width(' ', p.list.font) * 1.5, 4);
      tokens.unshift({ t: 'word', pieces: [label], width: label.width }, { t: 'gap', width: textStart - labelEnd });
    }

    type Line = { start: number; items: LineItem[]; width: number; justify: boolean };
    const lines: Line[] = [];
    let line: Line = { start: firstStart, items: [], width: 0, justify: false };

    const finish = (justify: boolean) => {
      line.justify = justify;
      lines.push(line);
      line = { start: Math.max(x0, left), items: [], width: 0, justify: false };
    };

    const segmentWidth = (from: number) => {
      let w = 0;
      for (let k = from; k < tokens.length; k++) {
        const t = tokens[k];
        if (t.t === 'tab' || t.t === 'break') break;
        if (t.t === 'word' || t.t === 'space' || t.t === 'gap' || t.t === 'image') w += t.width;
      }
      return w;
    };

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      const avail = right - line.start;
      if (tok.t === 'break') {
        finish(false);
        continue;
      }
      if (tok.t === 'tab') {
        const absX = line.start + line.width;
        const stop = nextTabStop(p.tabs, absX - x0) ;
        let target = x0 + stop.pos;
        if (stop.align !== 'left') {
          const seg = segmentWidth(i + 1);
          target = stop.align === 'center' ? target - seg / 2 : target - seg;
        }
        // Sağa/ortaya hizalı metin durağa sığmıyorsa bulunduğu yerden başlar (Swing/Word davranışı).
        const w = Math.max(0, target - absX);
        if (absX + w > right + 0.01 && line.items.length) {
          finish(false);
          continue;
        }
        line.items.push({ t: 'tab', width: w, leader: stop.leader, font: tok.font });
        line.width += w;
        continue;
      }
      if (tok.t === 'space') {
        line.items.push(tok);
        line.width += tok.width;
        continue;
      }
      if (tok.t === 'gap') {
        line.items.push(tok);
        line.width += tok.width;
        continue;
      }
      let item: LineItem = tok;
      if (tok.t === 'image') {
        const max = Math.max(10, right - left);
        if (tok.width > max) item = { ...tok, width: max, height: (tok.height * max) / tok.width };
      }
      const w = item.width;
      const contentWidth = trimmedWidth(line.items);
      if (contentWidth > 0 && line.width + w > avail + FIT_TOLERANCE) {
        finish(true);
      }
      if (item.t === 'word' && item.width > right - line.start + FIT_TOLERANCE) {
        // Satırdan uzun kelime: karakter karakter böl.
        for (const part of this.splitWord(item, right - line.start, right - left)) {
          if (line.width + part.width > right - line.start + 0.01 && trimmedWidth(line.items) > 0) finish(true);
          line.items.push(part);
          line.width += part.width;
        }
        continue;
      }
      line.items.push(item);
      line.width += item.width;
    }
    lines.push(line);

    // Satırları yerleştir
    for (let li = 0; li < lines.length; li++) {
      const ln = lines[li];
      const isLast = li === lines.length - 1;
      let ascent = 0;
      let descent = 0;
      let gap = 0;
      for (const it of ln.items) {
        if (it.t === 'image') ascent = Math.max(ascent, it.height);
        else if (it.t === 'word' || it.t === 'space') {
          const pieces = it.t === 'word' ? it.pieces : [it.piece];
          for (const pc of pieces) {
            const lm = this.lineMetrics(pc.font);
            ascent = Math.max(ascent, lm.ascent);
            descent = Math.max(descent, lm.descent);
            gap = Math.max(gap, lm.gap);
          }
        }
      }
      if (ascent === 0) {
        const lm = this.lineMetrics(p.font);
        ascent = lm.ascent;
        descent = lm.descent;
        gap = lm.gap;
      }
      const natural = ascent + descent + gap;
      const lineH = p.lineExact ? p.lineExact : natural * p.lineHeight;
      flow.ensure(lineH);
      const top = flow.y;
      const baseline = top + (p.lineExact ? Math.min(ascent, p.lineExact * 0.8) : ascent);

      // Hizalama
      const items = trimTrailing(ln.items);
      const used = items.reduce((s, it) => s + it.width, 0);
      const extra = Math.max(0, right - ln.start - used);
      let x = ln.start;
      let spaceExtra = 0;
      let justifyFrom = 0;
      if (p.align === 'center') x += extra / 2;
      else if (p.align === 'right') x += extra;
      else if (p.align === 'justify' && ln.justify && !isLast) {
        let lastTab = -1;
        items.forEach((it, k) => { if (it.t === 'tab') lastTab = k; });
        justifyFrom = lastTab + 1;
        let firstContent = justifyFrom;
        while (firstContent < items.length && items[firstContent].t === 'space') firstContent++;
        const spaces = items.slice(firstContent).filter((it) => it.t === 'space').length;
        if (spaces > 0) spaceExtra = extra / spaces;
        justifyFrom = firstContent;
      }

      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        if (it.t === 'space') {
          const w = it.width + (k >= justifyFrom ? spaceExtra : 0);
          this.decorate(flow, [it.piece], x, baseline, w, items, k);
          x += w;
          continue;
        }
        if (it.t === 'tab') {
          if (it.leader !== 'none' && it.width > 6) this.leader(flow, it, x, baseline);
          else this.tabUnderline(flow, items, k, x, baseline);
          x += it.width;
          continue;
        }
        if (it.t === 'gap') {
          x += it.width;
          continue;
        }
        if (it.t === 'image') {
          flow.ops.push({ op: 'image', x, y: baseline - it.height, w: it.width, h: it.height, image: it.image });
          x += it.width;
          continue;
        }
        let px = x;
        for (const pc of it.pieces) {
          if (pc.font.background) flow.ops.push({ op: 'rect', x: px, y: baseline - pc.size * 0.9 + pc.rise, w: pc.width, h: pc.size * 1.15, color: pc.font.background });
          if (pc.text) flow.ops.push({ op: 'text', x: px, y: baseline + pc.rise, text: pc.text, font: pc.font, size: pc.size });
          this.decorate(flow, [pc], px, baseline, pc.width, items, k);
          px += pc.width;
        }
        x += it.width;
      }
      flow.y = top + lineH;
      flow.mark();
    }
    flow.y += p.spaceAfter;
  }

  private splitWord(item: Extract<LineItem, { t: 'word' }>, firstAvail: number, fullAvail: number): LineItem[] {
    const out: LineItem[] = [];
    let cur: Piece[] = [];
    let curW = 0;
    let avail = firstAvail;
    for (const pc of item.pieces) {
      let buf = '';
      for (const ch of pc.text) {
        const w = this.width(ch, pc.font);
        if (curW + this.width(buf, pc.font) + w > avail && (buf || cur.length)) {
          if (buf) cur.push(this.piece(buf, pc.font));
          out.push({ t: 'word', pieces: cur, width: cur.reduce((s, p) => s + p.width, 0) });
          cur = [];
          curW = 0;
          buf = '';
          avail = fullAvail;
        }
        buf += ch;
      }
      if (buf) {
        const piece = this.piece(buf, pc.font);
        cur.push(piece);
        curW += piece.width;
      }
    }
    if (cur.length) out.push({ t: 'word', pieces: cur, width: curW });
    return out;
  }

  /** Altı çizili / üstü çizili metin çizgileri. Boşluklar komşuları altı çiziliyse çizilir. */
  private decorate(flow: Flow, pieces: Piece[], x: number, baseline: number, w: number, items: LineItem[], k: number) {
    for (const pc of pieces) {
      const isSpace = items[k]?.t === 'space';
      if (pc.font.underline && (!isSpace || (neighbourUnderlined(items, k, -1) && neighbourUnderlined(items, k, 1)))) {
        const y = baseline + pc.size * 0.12;
        flow.ops.push({ op: 'line', x1: x, y1: y, x2: x + w, y2: y, width: Math.max(0.5, pc.size * 0.05), color: pc.font.color ?? '#000000' });
      }
      if (pc.font.strike && !isSpace) {
        const y = baseline - pc.size * 0.28;
        flow.ops.push({ op: 'line', x1: x, y1: y, x2: x + w, y2: y, width: Math.max(0.5, pc.size * 0.05), color: pc.font.color ?? '#000000' });
      }
    }
  }

  private tabUnderline(flow: Flow, items: LineItem[], k: number, x: number, baseline: number) {
    const it = items[k] as Extract<LineItem, { t: 'tab' }>;
    if (it.font.underline && neighbourUnderlined(items, k, -1)) {
      const y = baseline + it.font.size * 0.12;
      flow.ops.push({ op: 'line', x1: x, y1: y, x2: x + it.width, y2: y, width: Math.max(0.5, it.font.size * 0.05), color: it.font.color ?? '#000000' });
    }
  }

  private leader(flow: Flow, it: Extract<LineItem, { t: 'tab' }>, x: number, baseline: number) {
    const ch = it.leader === 'dot' ? '.' : it.leader === 'hyphen' ? '-' : '_';
    const unit = this.width(ch, it.font);
    if (unit <= 0) return;
    const count = Math.floor((it.width - unit) / unit);
    if (count > 0) flow.ops.push({ op: 'text', x: x + (it.width - count * unit) / 2, y: baseline, text: ch.repeat(count), font: it.font, size: it.font.size });
  }

  // ---------------- tablo

  table(t: Table, flow: Flow, x0: number, width: number) {
    const cols = Math.max(1, ...t.rows.map((r) => r.cells.reduce((s, c) => s + c.colSpan, 0)));
    let widths: number[];
    const given = t.columns.slice(0, cols);
    const sum = given.reduce((s, v) => s + v, 0);
    if (given.length === cols && sum > 0) {
      const scale = t.fullWidth || sum > width ? (width - t.indentLeft) / sum : 1;
      widths = given.map((w) => w * scale);
    } else {
      widths = Array.from({ length: cols }, () => (width - t.indentLeft) / cols);
    }
    const tableW = widths.reduce((s, v) => s + v, 0);
    let tx = x0 + t.indentLeft;
    if (t.align === 'center') tx = x0 + (width - tableW) / 2;
    else if (t.align === 'right') tx = x0 + width - tableW;

    // Dikey birleştirilmiş hücrelerin arasındaki yatay kenarlığı kaldır.
    const grid = t.rows.map((r) => {
      const map: number[] = [];
      let c = 0;
      r.cells.forEach((cell) => { map.push(c); c += cell.colSpan; });
      return map;
    });
    t.rows.forEach((r, ri) => {
      const next = t.rows[ri + 1];
      if (!next) return;
      r.cells.forEach((cell, ci) => {
        const start = grid[ri][ci];
        const below = next.cells.find((_, k) => grid[ri + 1][k] === start);
        if (below?.mergedAbove) cell.borders = { ...cell.borders, bottom: null };
      });
    });

    t.rows.forEach((row, ri) => {
      // Hücreleri ölç
      const laid = row.cells.map((cell, ci) => {
        const start = grid[ri][ci];
        const cx = tx + widths.slice(0, start).reduce((s, v) => s + v, 0);
        const cw = widths.slice(start, start + cell.colSpan).reduce((s, v) => s + v, 0);
        const inner = new Flow(0, Infinity, false);
        if (!cell.mergedAbove) this.blocks(cell.blocks, inner, cx + CELL_PAD_X, Math.max(4, cw - 2 * CELL_PAD_X));
        return { cell, cx, cw, flow: inner, h: inner.y + 2 * CELL_PAD_Y };
      });
      let rowH = Math.max(...laid.map((l) => l.h), 4);
      if (row.height) rowH = row.exactHeight ? row.height : Math.max(rowH, row.height);
      flow.ensure(rowH);
      const top = flow.y;
      for (const l of laid) {
        if (l.cell.fill) flow.ops.push({ op: 'rect', x: l.cx, y: top, w: l.cw, h: rowH, color: l.cell.fill });
        const contentH = l.flow.y;
        const dy = l.cell.vAlign === 'middle' ? (rowH - 2 * CELL_PAD_Y - contentH) / 2 : l.cell.vAlign === 'bottom' ? rowH - 2 * CELL_PAD_Y - contentH : 0;
        for (const op of l.flow.pages[0]) flow.ops.push(shift(op, top + CELL_PAD_Y + Math.max(0, dy)));
        const b = l.cell.borders;
        const edge = (bd: Border | null, x1: number, y1: number, x2: number, y2: number) => {
          if (!bd) return;
          flow.ops.push({ op: 'line', x1, y1, x2, y2, width: bd.width, color: bd.color, dash: bd.style === 'dashed' ? [3, 2] : bd.style === 'dotted' ? [1, 1.5] : undefined });
        };
        edge(l.cell.mergedAbove ? null : b.top, l.cx, top, l.cx + l.cw, top);
        edge(b.bottom, l.cx, top + rowH, l.cx + l.cw, top + rowH);
        edge(b.left, l.cx, top, l.cx, top + rowH);
        edge(b.right, l.cx + l.cw, top, l.cx + l.cw, top + rowH);
      }
      flow.y = top + rowH;
      flow.mark();
    });
  }

  blocks(blocks: Block[], flow: Flow, x0: number, width: number) {
    for (const b of blocks) {
      if (b.type === 'paragraph') this.paragraph(b, flow, x0, width);
      else if (b.type === 'table') this.table(b, flow, x0, width);
      else if (!flow.atTop) flow.newPage();
    }
  }
}

function nextTabStop(tabs: TabStop[], rel: number): TabStop {
  for (const t of tabs) if (t.pos > rel + 0.5) return t;
  const pos = (Math.floor((rel + 0.5) / DEFAULT_TAB) + 1) * DEFAULT_TAB;
  return { pos, align: 'left', leader: 'none' };
}

function trimmedWidth(items: LineItem[]): number {
  return trimTrailing(items).reduce((s, it) => s + it.width, 0);
}

function trimTrailing(items: LineItem[]): LineItem[] {
  let end = items.length;
  while (end > 0 && items[end - 1].t === 'space') end--;
  return end === items.length ? items : items.slice(0, end);
}

function neighbourUnderlined(items: LineItem[], k: number, dir: -1 | 1): boolean {
  for (let j = k + dir; j >= 0 && j < items.length; j += dir) {
    const it = items[j];
    if (it.t === 'word') return it.pieces.some((p) => p.font.underline);
    if (it.t === 'tab') return it.font.underline;
    if (it.t === 'space') continue;
    return false;
  }
  return false;
}

function shift(op: Op, dy: number): Op {
  switch (op.op) {
    case 'text': return { ...op, y: op.y + dy };
    case 'line': return { ...op, y1: op.y1 + dy, y2: op.y2 + dy };
    case 'rect': return { ...op, y: op.y + dy };
    case 'image': return { ...op, y: op.y + dy };
  }
}

function collectFonts(blocks: Block[], out: FontSpec[]) {
  for (const b of blocks) {
    if (b.type === 'paragraph') {
      out.push(b.font);
      if (b.list) out.push(b.list.font);
      for (const i of b.inlines) if (i.kind !== 'image') out.push(i.font);
    } else if (b.type === 'table') for (const r of b.rows) for (const c of r.cells) collectFonts(c.blocks, out);
  }
}

function hexColor(hex: string | undefined) {
  const v = parseInt((hex ?? '#000000').replace('#', ''), 16) || 0;
  return rgb(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
}

// ------------------------------------------------------------ ana işlev

export type PdfOptions = { title?: string; fonts: FontLoader };

export async function writePdf(doc: Doc, opts: PdfOptions): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setProducer('Tekellüm Dönüştürücü');
  pdf.setCreator('Tekellüm');
  if (opts.title) pdf.setTitle(opts.title);

  const fonts = new Fonts(pdf, opts.fonts);
  const used: FontSpec[] = [];
  collectFonts(doc.body, used);
  if (doc.header) collectFonts(doc.header.blocks, used);
  if (doc.footer) collectFonts(doc.footer.blocks, used);
  if (doc.pageNumbers) used.push(doc.pageNumbers.font);
  used.push({ family: 'Times New Roman', size: 12, bold: false, italic: false, underline: false, strike: false });
  const seen = new Set<string>();
  await Promise.all(used.filter((f) => { const k = Fonts.key(f); if (seen.has(k)) return false; seen.add(k); return true; }).map((f) => fonts.prepare(f)));

  const { page } = doc;
  const x0 = page.margins.left;
  const width = page.width - page.margins.left - page.margins.right;
  const ts = new Typesetter(fonts);

  // Gövde
  const flow = new Flow(page.margins.top, page.height - page.margins.bottom, true);
  ts.blocks(doc.body, flow, x0, width);
  const pages = flow.pages;
  if (pages.length > 1 && pages[pages.length - 1].length === 0) pages.pop();
  const total = pages.length;

  const images = new Map<Uint8Array, Promise<PDFImage>>();
  const embed = (img: ImageData) => {
    if (!images.has(img.bytes)) images.set(img.bytes, img.mime === 'image/png' ? pdf.embedPng(img.bytes) : pdf.embedJpg(img.bytes));
    return images.get(img.bytes)!;
  };

  for (let i = 0; i < total; i++) {
    const pdfPage = pdf.addPage([page.width, page.height]);
    const ops: Op[] = [];
    const ctx = { page: i + (doc.pageNumbers?.start ?? 1), pages: total + (doc.pageNumbers?.start ?? 1) - 1 };
    const pageTs = ts.withField(ctx);

    if (doc.background) {
      const m = doc.background.margins;
      const img = await embed(doc.background.image);
      const boxW = page.width - m.left - m.right;
      const boxH = page.height - m.top - m.bottom;
      const scale = Math.min(boxW / img.width, boxH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ops.push({ op: 'image', x: m.left + (boxW - w) / 2, y: m.top, w, h, image: doc.background.image });
    }

    if (doc.header && i + 1 >= doc.header.startPage) {
      const hf = new Flow(page.headerOffset, Infinity, false);
      pageTs.blocks(doc.header.blocks, hf, x0, width);
      ops.push(...hf.pages[0]);
    }

    const pn = doc.pageNumbers;
    let pnHeight = 0;
    if (pn) {
      const lm = pageTs.lineMetrics(pn.font);
      pnHeight = lm.ascent + lm.descent + lm.gap;
      const text = `${pn.prefix}${ctx.page}${pn.withTotal ? `${pn.separator}${ctx.pages}` : ''}`;
      const w = pageTs.width(text, pn.font);
      const x = pn.align === 'left' ? x0 : pn.align === 'right' ? x0 + width - w : x0 + (width - w) / 2;
      const baseline = pn.position === 'top' ? page.headerOffset + lm.ascent : page.height - page.footerOffset - lm.descent;
      ops.push({ op: 'text', x, y: baseline, text, font: pn.font, size: pn.font.size });
    }

    if (doc.footer && doc.footer.blocks.length && i + 1 >= doc.footer.startPage) {
      const measure = new Flow(0, Infinity, false);
      pageTs.blocks(doc.footer.blocks, measure, x0, width);
      const h = measure.y;
      const top = page.height - page.footerOffset - (pn?.position === 'bottom' ? pnHeight : 0) - h;
      for (const op of measure.pages[0]) ops.push(shift(op, top));
    }

    ops.push(...pages[i]);
    await drawOps(pdfPage, ops, page.height, fonts, embed);
  }

  return pdf.save({ useObjectStreams: true });
}

async function drawOps(p: PDFPage, ops: Op[], H: number, fonts: Fonts, embed: (i: ImageData) => Promise<PDFImage>) {
  for (const op of ops) {
    switch (op.op) {
      case 'text':
        p.drawText(op.text, { x: op.x, y: H - op.y, size: op.size, font: fonts.get(op.font).pdf, color: hexColor(op.font.color) });
        break;
      case 'line':
        p.drawLine({ start: { x: op.x1, y: H - op.y1 }, end: { x: op.x2, y: H - op.y2 }, thickness: op.width, color: hexColor(op.color), dashArray: op.dash, lineCap: LineCapStyle.Butt });
        break;
      case 'rect':
        p.drawRectangle({ x: op.x, y: H - op.y - op.h, width: op.w, height: op.h, color: hexColor(op.color) });
        break;
      case 'image': {
        const img = await embed(op.image);
        p.drawImage(img, { x: op.x, y: H - op.y - op.h, width: op.w, height: op.h });
        break;
      }
    }
  }
}
