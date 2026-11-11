/**
 * UYAP Doküman Formatı (.udf) okuyucu.
 *
 * UDF bir ZIP arşividir; asıl içerik content.xml'dedir. Belgenin tüm metni <content> içinde tek bir CDATA
 * bloğunda durur; <elements> altındaki paragraf/tablo/üst bilgi öğeleri bu metne startOffset + length ile
 * (UTF-16 kod birimi, Java String) başvurur. Biçim öznitelikleri öğe → resolver stili → üst stil zinciriyle çözülür.
 */
import {
  ConvertError, defaultFont, defaultPage, emptyParagraph, sniffImage,
  type Align, type Block, type Border, type Cell, type Doc, type FontSpec, type Inline, type PageNumbering,
  type Paragraph, type Row, type Table, type TabStop,
} from './model';
import { argbToHex, attr, base64ToBytes, childElements, decodeUtf8, findEntry, localName, num, parseXml, unzip } from './util';

type StyleMap = Map<string, Element>;

const ALIGN: Align[] = ['left', 'center', 'right', 'justify'];
const PAPER: Record<string, [number, number]> = {
  '1': [595.28, 841.89], // A4
  '5': [612, 792], // Letter
  '6': [612, 1008], // Legal
  '11': [419.53, 595.28], // A5
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
};

export type UdfInfo = { verificationCode?: string; signed: boolean };

export function readUdf(bytes: Uint8Array): { doc: Doc; info: UdfInfo } {
  const files = unzip(bytes, 'UDF dosyası');
  const content = findEntry(files, 'content.xml');
  if (!content) throw new ConvertError('Bu dosya geçerli bir UYAP belgesi değil (content.xml bulunamadı).');
  const xml = parseXml(decodeUtf8(content), 'UDF içeriği');
  const root = xml.documentElement as unknown as Element;
  if (localName(root) !== 'template') throw new ConvertError('Bu dosya geçerli bir UYAP belgesi değil (template öğesi yok).');

  const info: UdfInfo = { signed: Boolean(findEntry(files, 'sign.sgn')?.length) };
  const props = findEntry(files, 'documentproperties.xml');
  if (props) {
    const m = /key="uyapdogrulamakodu"\s*>([^<]*)</.exec(decodeUtf8(props));
    if (m) info.verificationCode = m[1].trim();
  }

  const reader = new UdfReader(root);
  return { doc: reader.read(), info };
}

class UdfReader {
  private text = '';
  private styles: StyleMap = new Map();
  private rootResolver: string | null = null;
  private listCounters = new Map<string, number[]>();
  private notes = new Set<string>();

  constructor(private root: Element) {}

  read(): Doc {
    const contentEl = childElements(this.root, 'content')[0];
    this.text = contentEl?.textContent ?? '';

    for (const s of childElements(childElements(this.root, 'styles')[0], 'style')) {
      const name = attr(s, 'name');
      if (name) this.styles.set(name, s);
    }

    const doc: Doc = { page: this.readPage(), body: [], notes: [] };
    const elements = childElements(this.root, 'elements')[0];
    this.rootResolver = attr(elements, 'resolver');

    for (const el of childElements(elements)) {
      switch (localName(el)) {
        case 'header':
          doc.header = { blocks: this.readBlocks(el), startPage: Math.max(1, num(attr(el, 'startPage'), 1)) };
          break;
        case 'footer':
          doc.footer = { blocks: this.readBlocks(el), startPage: Math.max(1, num(attr(el, 'startPage'), 1)) };
          doc.pageNumbers = this.readPageNumbers(el);
          break;
        case 'page-break':
          doc.body.push({ type: 'pageBreak' });
          break;
        default: {
          const block = this.readBlock(el);
          if (block) doc.body.push(block);
        }
      }
    }

    const bg = this.readBackground();
    if (bg) doc.background = bg;
    if (doc.footer && !doc.footer.blocks.some(hasVisibleContent)) doc.footer.blocks = [];
    if (doc.header && !doc.header.blocks.some(hasVisibleContent)) doc.header = undefined;
    doc.notes = [...this.notes];
    return doc;
  }

  // ------------------------------------------------------------ sayfa

  private readPage() {
    const page = defaultPage();
    const pf = childElements(childElements(this.root, 'properties')[0], 'pageFormat')[0];
    if (!pf) return page;
    const [w, h] = PAPER[attr(pf, 'mediaSizeName') ?? '1'] ?? PAPER['1'];
    const landscape = attr(pf, 'paperOrientation') === '0' || attr(pf, 'paperOrientation') === 'landscape';
    page.width = landscape ? h : w;
    page.height = landscape ? w : h;
    page.margins = {
      top: num(attr(pf, 'topMargin'), page.margins.top),
      right: num(attr(pf, 'rightMargin'), page.margins.right),
      bottom: num(attr(pf, 'bottomMargin'), page.margins.bottom),
      left: num(attr(pf, 'leftMargin'), page.margins.left),
    };
    page.headerOffset = num(attr(pf, 'headerFOffset'), 20);
    page.footerOffset = num(attr(pf, 'footerFOffset'), 20);
    return page;
  }

  private readBackground(): Doc['background'] {
    const bg = childElements(childElements(this.root, 'properties')[0], 'bgImage')[0];
    const data = attr(bg, 'bgImageData');
    if (!bg || !data) return undefined;
    const bytes = base64ToBytes(data);
    const mime = sniffImage(bytes);
    if (!mime) {
      this.notes.add('Arka plan görseli desteklenmeyen bir biçimde olduğu için eklenmedi.');
      return undefined;
    }
    return {
      image: { bytes, mime },
      margins: {
        top: num(attr(bg, 'bgImageUpMargin')),
        right: num(attr(bg, 'bgImageRigtMargin') ?? attr(bg, 'bgImageRightMargin')),
        bottom: num(attr(bg, 'bgImageBottomMargin')),
        left: num(attr(bg, 'bgImageLeftMargin')),
      },
    };
  }

  private readPageNumbers(footer: Element): PageNumbering | undefined {
    const spec = attr(footer, 'pageNumber-spec');
    if (!spec) return undefined;
    // Belirteç bit alanı olarak görünür (ör. BSP32_2088 / BSP32_2120): 16 sol, 32 orta, 64 sağ; 4 üst, 8 alt.
    const flags = num(spec.split('_')[1], 0);
    const align = flags & 64 ? 'right' : flags & 16 ? 'left' : 'center';
    const position = flags & 4 && !(flags & 8) ? 'top' : 'bottom';
    const separator = attr(footer, 'pageNumber-seperator') ?? attr(footer, 'pageNumber-separator') ?? '';
    return {
      align,
      position,
      withTotal: separator !== '',
      separator,
      prefix: attr(footer, 'pageNumber-foreStr') ?? '',
      start: Math.max(1, num(attr(footer, 'pageNumber-pageStartNumStr'), 1)),
      font: defaultFont({
        family: attr(footer, 'pageNumber-fontFace') || 'Arial',
        size: num(attr(footer, 'pageNumber-fontSize'), 11),
        bold: attr(footer, 'pageNumber-fontBold') === 'true',
        italic: attr(footer, 'pageNumber-fontItalic') === 'true',
        color: argbToHex(attr(footer, 'pageNumber-color')),
      }),
    };
  }

  // ------------------------------------------------------------ stil çözümleme

  /** Öznitelik değerini öğenin kendisinde, resolver zincirinde ve verilen yedek öğelerde arar. */
  private resolve(name: string, ...chain: (Element | null | undefined)[]): string | null {
    for (const el of chain) {
      if (!el) continue;
      const own = attr(el, name);
      if (own != null && own !== '') return own;
      let styleName = attr(el, 'resolver');
      const seen = new Set<string>();
      while (styleName && !seen.has(styleName)) {
        seen.add(styleName);
        const style = this.styles.get(styleName);
        if (!style) break;
        const v = attr(style, name);
        if (v != null && v !== '') return v;
        styleName = attr(style, 'resolver');
      }
    }
    // Belge düzeyi varsayılan stil (genellikle hvl-default) ve son çare "default"
    for (const styleName of [this.rootResolver, 'hvl-default']) {
      const style = styleName ? this.styles.get(styleName) : undefined;
      const v = style ? attr(style, name) : null;
      if (v != null && v !== '') return v;
    }
    return null;
  }

  private font(el: Element, paragraph?: Element): FontSpec {
    const get = (n: string) => this.resolve(n, el, paragraph);
    let family = get('family') || 'Times New Roman';
    if (family === 'Dialog') family = 'Times New Roman'; // UYAP'ın arayüz yazı tipi; belgelerde Times karşılığı kullanılır
    return defaultFont({
      family,
      size: num(get('size'), 12) || 12,
      bold: get('bold') === 'true',
      italic: get('italic') === 'true',
      underline: get('underline') === 'true',
      strike: get('strikethrough') === 'true',
      color: argbToHex(get('foreground')),
      background: bgColor(argbToHex(get('background'))),
      vertical: get('superscript') === 'true' ? 'super' : get('subscript') === 'true' ? 'sub' : undefined,
    });
  }

  // ------------------------------------------------------------ bloklar

  private readBlocks(container: Element): Block[] {
    const out: Block[] = [];
    for (const el of childElements(container)) {
      if (localName(el) === 'page-break') {
        out.push({ type: 'pageBreak' });
        continue;
      }
      const b = this.readBlock(el);
      if (b) out.push(b);
    }
    return out;
  }

  private readBlock(el: Element): Block | null {
    switch (localName(el)) {
      case 'paragraph':
        return this.readParagraph(el);
      case 'table':
        return this.readTable(el);
      default:
        return null;
    }
  }

  private readParagraph(p: Element): Paragraph {
    const get = (n: string) => this.resolve(n, p);
    const leftIndent = num(get('LeftIndent'));
    const firstLineIndent = num(get('FirstLineIndent'));
    const hanging = num(get('Hanging'));
    const para = emptyParagraph({
      align: ALIGN[num(get('Alignment'))] ?? 'left',
      // "Hanging": ilk satır dışındaki satırların ek girintisi (ör. "MÜŞTEKİ<tab>: …" düzeninde hizalama)
      indentLeft: leftIndent + hanging,
      firstLine: firstLineIndent - hanging,
      indentRight: num(get('RightIndent')),
      spaceBefore: num(get('SpaceAbove')),
      spaceAfter: num(get('SpaceBelow')),
      lineHeight: 1 + Math.max(0, num(get('LineSpacing'))),
      tabs: parseTabSet(get('TabSet')),
      font: this.font(p),
    });

    // Yaprak öğeler metin havuzunda sıralı aralıklara başvurur.
    const leaves = childElements(p)
      .map((el, i) => ({ el, i, start: num(attr(el, 'startOffset'), -1), len: num(attr(el, 'length')) }))
      .filter((l) => l.start >= 0)
      .sort((a, b) => a.start - b.start || a.i - b.i);

    let firstFontSet = false;
    for (const { el, start, len } of leaves) {
      const name = localName(el);
      if (name === 'image') {
        const data = attr(el, 'imageData');
        if (!data) continue;
        const bytes = base64ToBytes(data);
        const mime = sniffImage(bytes);
        if (!mime) {
          this.notes.add('Belgedeki bir görsel desteklenmeyen biçimde olduğu için atlandı.');
          continue;
        }
        para.inlines.push({ kind: 'image', image: { bytes, mime }, width: num(attr(el, 'width'), 100), height: num(attr(el, 'height'), 100) });
        continue;
      }
      const font = this.font(el, p);
      if (!firstFontSet) {
        para.font = font;
        firstFontSet = true;
      }
      if (name === 'tab') {
        para.inlines.push({ kind: 'tab', font });
        continue;
      }
      if (len <= 0) continue;
      pushText(para.inlines, this.text.slice(start, start + len), font);
    }

    // Paragrafın kendi satır sonu metne dahil gelir; sondaki tek \n atılır, aradakiler satır kesmesidir.
    trimTrailingBreak(para.inlines);

    const list = this.listLabel(p, para.font);
    if (list) para.list = list;
    return para;
  }

  private listLabel(p: Element, font: FontSpec): Paragraph['list'] {
    const numbered = attr(p, 'Numbered') === 'true';
    const bulleted = attr(p, 'Bulleted') === 'true';
    if (!numbered && !bulleted) return undefined;
    const level = Math.max(0, num(attr(p, 'ListLevel')));
    if (bulleted) {
      const type = attr(p, 'BulletType') ?? 'BULLET_TYPE_ELLIPSE';
      return { text: BULLETS[type] ?? '•', font: { ...font, bold: false, underline: false } };
    }
    const id = attr(p, 'ListId') ?? 'default';
    const counters = this.listCounters.get(id) ?? [];
    counters.length = level + 1;
    counters[level] = (counters[level] ?? 0) + 1;
    this.listCounters.set(id, counters);
    return { text: formatNumber(counters[level], attr(p, 'NumberType') ?? 'NUMBER_TYPE_NUMBER_DOT'), font };
  }

  private readTable(t: Element): Table {
    const tableBorder = attr(t, 'border') ?? 'borderCell';
    const spans = (attr(t, 'columnSpans') ?? '').split(',').map((v) => num(v)).filter((v) => v > 0);
    const rows: Row[] = [];
    for (const r of childElements(t, 'row')) {
      const cells: Cell[] = [];
      for (const c of childElements(r, 'cell')) {
        const cellBorder = attr(c, 'border') ?? tableBorder;
        const visible = cellBorder !== 'borderNone';
        const spec = num(attr(c, 'borderSpec'), 15);
        const style = (attr(c, 'borderStyle') ?? '').replace('borderStyle-', '');
        const border: Border | null = visible
          ? {
            width: num(attr(c, 'borderWidth'), 0.5) || 0.5,
            color: argbToHex(attr(c, 'borderColor')) ?? '#000000',
            style: style === 'dashed' || style === 'dotted' || style === 'double' ? style : 'solid',
          }
          : null;
        cells.push({
          blocks: this.readBlocks(c),
          colSpan: Math.max(1, num(attr(c, 'colspan') ?? attr(c, 'colSpan'), 1)),
          borders: {
            top: border && spec & 1 ? border : null,
            right: border && spec & 2 ? border : null,
            bottom: border && spec & 4 ? border : null,
            left: border && spec & 8 ? border : null,
          },
          fill: bgColor(argbToHex(attr(c, 'fillColor') ?? attr(c, 'background'))),
          vAlign: attr(c, 'align') === 'vcenter' || attr(c, 'align') === 'middle' ? 'middle' : attr(c, 'align') === 'bottom' ? 'bottom' : 'top',
        });
      }
      const height = num(attr(r, 'height'));
      rows.push({ cells, height: height > 0 ? height : undefined });
    }
    return { type: 'table', columns: spans, rows, indentLeft: 0, align: 'left', fullWidth: true };
  }
}

// ------------------------------------------------------------ yardımcılar

const BULLETS: Record<string, string> = {
  BULLET_TYPE_ELLIPSE: '•',
  BULLET_TYPE_RECTANGLE: '■',
  BULLET_TYPE_ARROW: '➢',
  BULLET_TYPE_DIAMOND: '◆',
  BULLET_TYPE_DIAMOND_2: '◊',
  BULLET_TYPE_TRIANGLE: '▲',
  BULLET_TYPE_RECTANGLE_D: '□',
};

function toRoman(n: number): string {
  const map: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

function toLetters(n: number): string {
  let out = '';
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

export function formatNumber(n: number, type: string): string {
  let core = String(n);
  if (type.includes('CHAR_SMALL')) core = toLetters(n);
  else if (type.includes('CHAR_BIG')) core = toLetters(n).toUpperCase();
  else if (type.includes('ROMAN_SMALL')) core = toRoman(n).toLowerCase();
  else if (type.includes('ROMAN_BIG')) core = toRoman(n);
  if (/PAREN|PARANT/.test(type)) return `${core})`;
  if (type.endsWith('TRE')) return `${core}-`;
  return `${core}.`;
}

/**
 * "36.0:0:0,69.0:2:0" → sekme durakları (konum:hizalama:öncü). Kodlar Java Swing TabStop sabitleridir:
 * hizalama 0 sol, 1 sağ, 2 orta, 4 ondalık, 5 çubuk; öncü 0 yok, 1 nokta, 2 tire, 3/4 alt çizgi, 5 eşittir.
 */
export const TAB_ALIGN_CODES: Record<number, TabStop['align']> = { 0: 'left', 1: 'right', 2: 'center', 4: 'decimal', 5: 'left' };
export const TAB_LEADER_CODES: Record<number, TabStop['leader']> = { 0: 'none', 1: 'dot', 2: 'hyphen', 3: 'underscore', 4: 'underscore', 5: 'hyphen' };

export function parseTabSet(value: string | null): TabStop[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => {
      const [pos, a, l] = part.split(':');
      return { pos: num(pos), align: TAB_ALIGN_CODES[num(a)] ?? 'left', leader: TAB_LEADER_CODES[num(l)] ?? 'none' };
    })
    .filter((t) => t.pos > 0)
    .sort((a, b) => a.pos - b.pos);
}

function bgColor(hex: string | undefined): string | undefined {
  return hex && hex.toLowerCase() !== '#ffffff' ? hex : undefined;
}

/** Metni sekme ve satır sonlarına bölerek satır içi öğelere ekler; aynı biçimli komşu metinleri birleştirir. */
function pushText(inlines: Inline[], raw: string, font: FontSpec) {
  const text = raw.replace(/[​￼\r]/g, '');
  let buf = '';
  const flush = () => {
    if (!buf) return;
    const last = inlines[inlines.length - 1];
    if (last && last.kind === 'text' && sameFont(last.font, font)) last.text += buf;
    else inlines.push({ kind: 'text', text: buf, font });
    buf = '';
  };
  for (const ch of text) {
    if (ch === '\t') {
      flush();
      inlines.push({ kind: 'tab', font });
    } else if (ch === '\n') {
      flush();
      inlines.push({ kind: 'break', font });
    } else buf += ch;
  }
  flush();
}

function trimTrailingBreak(inlines: Inline[]) {
  for (let i = inlines.length - 1; i >= 0; i--) {
    const it = inlines[i];
    if (it.kind === 'break') {
      inlines.splice(i, 1);
      return;
    }
    if (it.kind === 'text' && it.text === '') continue;
    return;
  }
}

export function sameFont(a: FontSpec, b: FontSpec): boolean {
  return a.family === b.family && a.size === b.size && a.bold === b.bold && a.italic === b.italic && a.underline === b.underline
    && a.strike === b.strike && a.color === b.color && a.background === b.background && a.vertical === b.vertical;
}

function hasVisibleContent(b: Block): boolean {
  if (b.type === 'paragraph') return b.inlines.some((i) => (i.kind === 'text' ? i.text.trim() !== '' : i.kind === 'image' || i.kind === 'field'));
  if (b.type === 'table') return b.rows.some((r) => r.cells.some((c) => c.blocks.some(hasVisibleContent)));
  return false;
}
