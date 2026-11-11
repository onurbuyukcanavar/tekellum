/**
 * Word (.docx, Office Open XML) okuyucu → ortak belge modeli.
 * Stiller (docDefaults + basedOn zinciri), tema yazı tipleri, numaralandırma, sekme durakları, tablolar
 * (birleştirilmiş hücreler, kenarlıklar, dolgu), görseller, üst/alt bilgi, sayfa/sayı alanları ve bölüm ayarları desteklenir.
 */
import {
  ConvertError, defaultFont, defaultPage, emptyParagraph, sniffImage,
  type Align, type Block, type Border, type Cell, type Doc, type FontSpec, type Inline, type Paragraph, type Row,
  type Table, type TabStop,
} from './model';
import { attr, childElements, decodeUtf8, findEntry, firstChild, localName, num, parseXml, unzip } from './util';

const TWIP = 1 / 20; // pt
const EMU = 1 / 12700; // pt

type RunProps = Partial<Omit<FontSpec, 'vertical'>> & { vertical?: FontSpec['vertical'] | null; caps?: boolean };
type ParaProps = {
  align?: Align; indentLeft?: number; indentRight?: number; firstLine?: number; spaceBefore?: number; spaceAfter?: number;
  lineHeight?: number; lineExact?: number | null; tabs?: TabStop[]; clearTabs?: number[]; numId?: string; ilvl?: number; pageBreakBefore?: boolean;
};
type Style = { type: string; basedOn?: string; p: ParaProps; r: RunProps; tblBorders?: Element | null };

type Level = { fmt: string; text: string; start: number; indentLeft?: number; firstLine?: number; r: RunProps };

export function readDocx(bytes: Uint8Array): Doc {
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    throw new ConvertError('Eski Word biçimi (.doc) desteklenmiyor. Belgeyi Word\'de açıp "Farklı Kaydet → Word Belgesi (.docx)" ile kaydettikten sonra tekrar deneyin.');
  }
  const files = unzip(bytes, 'Word dosyası');
  const docXml = findEntry(files, 'word/document.xml');
  if (!docXml) throw new ConvertError('Bu dosya geçerli bir Word (.docx) belgesi değil.');
  return new DocxReader(files).read(decodeUtf8(docXml));
}

class DocxReader {
  private styles = new Map<string, Style>();
  private defaultParaStyle = 'Normal';
  private docDefaults: { p: ParaProps; r: RunProps } = { p: {}, r: {} };
  private theme: { major: string; minor: string } = { major: 'Times New Roman', minor: 'Times New Roman' };
  private rels = new Map<string, Map<string, string>>();
  private abstract = new Map<string, Level[]>();
  private nums = new Map<string, { abstractId: string; overrides: Map<number, number> }>();
  private counters = new Map<string, number[]>();
  private notes = new Set<string>();
  private currentPart = 'word/document.xml';

  constructor(private files: Record<string, Uint8Array>) {}

  private xml(path: string): Document | null {
    const f = findEntry(this.files, path);
    return f ? parseXml(decodeUtf8(f), 'Word içeriği') : null;
  }

  read(documentXml: string): Doc {
    this.readTheme();
    this.readStyles();
    this.readNumbering();
    const xml = parseXml(documentXml, 'Word içeriği');
    const body = firstChild(xml.documentElement as unknown as Element, 'body');
    if (!body) throw new ConvertError('Word belgesinin gövdesi boş.');

    const doc: Doc = { page: defaultPage(), body: [], notes: [] };
    doc.body = this.readBlocks(body);

    const sect = childElements(body, 'sectPr').pop() ?? null;
    if (sect) this.readSection(sect, doc);
    doc.notes = [...this.notes];
    return doc;
  }

  // ------------------------------------------------------------ tema, stiller, numaralandırma

  private readTheme() {
    const theme = this.xml('word/theme/theme1.xml');
    if (!theme) return;
    const font = (name: string) => {
      const el = theme.getElementsByTagName(`a:${name}`)[0];
      const latin = el ? firstChild(el as unknown as Element, 'latin') : null;
      return attr(latin, 'typeface') || undefined;
    };
    this.theme = { major: font('majorFont') ?? 'Times New Roman', minor: font('minorFont') ?? 'Times New Roman' };
  }

  private readStyles() {
    const xml = this.xml('word/styles.xml');
    if (!xml) return;
    const root = xml.documentElement as unknown as Element;
    const defaults = firstChild(root, 'docDefaults');
    this.docDefaults = {
      r: this.runProps(firstChild(firstChild(defaults, 'rPrDefault'), 'rPr')),
      p: this.paraProps(firstChild(firstChild(defaults, 'pPrDefault'), 'pPr')),
    };
    for (const s of childElements(root, 'style')) {
      const id = attr(s, 'styleId');
      if (!id) continue;
      const type = attr(s, 'type') ?? 'paragraph';
      if (type === 'paragraph' && attr(s, 'default') === '1') this.defaultParaStyle = id;
      this.styles.set(id, {
        type,
        basedOn: attr(firstChild(s, 'basedOn'), 'val') ?? undefined,
        p: this.paraProps(firstChild(s, 'pPr')),
        r: this.runProps(firstChild(s, 'rPr')),
        tblBorders: firstChild(firstChild(s, 'tblPr'), 'tblBorders'),
      });
    }
  }

  private styleChain(id: string | null | undefined): Style[] {
    const chain: Style[] = [];
    const seen = new Set<string>();
    while (id && !seen.has(id)) {
      seen.add(id);
      const s = this.styles.get(id);
      if (!s) break;
      chain.unshift(s);
      id = s.basedOn;
    }
    return chain;
  }

  private readNumbering() {
    const xml = this.xml('word/numbering.xml');
    if (!xml) return;
    const root = xml.documentElement as unknown as Element;
    for (const a of childElements(root, 'abstractNum')) {
      const levels: Level[] = [];
      for (const l of childElements(a, 'lvl')) {
        const ilvl = num(attr(l, 'ilvl'));
        const ind = firstChild(firstChild(l, 'pPr'), 'ind');
        levels[ilvl] = {
          fmt: attr(firstChild(l, 'numFmt'), 'val') ?? 'decimal',
          text: attr(firstChild(l, 'lvlText'), 'val') ?? '',
          start: num(attr(firstChild(l, 'start'), 'val'), 1),
          indentLeft: ind ? num(attr(ind, 'left') ?? attr(ind, 'start')) * TWIP : undefined,
          firstLine: ind ? (attr(ind, 'hanging') != null ? -num(attr(ind, 'hanging')) : num(attr(ind, 'firstLine'))) * TWIP : undefined,
          r: this.runProps(firstChild(l, 'rPr')),
        };
      }
      this.abstract.set(attr(a, 'abstractNumId') ?? '', levels);
    }
    for (const n of childElements(root, 'num')) {
      const overrides = new Map<number, number>();
      for (const o of childElements(n, 'lvlOverride')) {
        const so = firstChild(o, 'startOverride');
        if (so) overrides.set(num(attr(o, 'ilvl')), num(attr(so, 'val'), 1));
      }
      this.nums.set(attr(n, 'numId') ?? '', { abstractId: attr(firstChild(n, 'abstractNumId'), 'val') ?? '', overrides });
    }
  }

  // ------------------------------------------------------------ özellikler

  private onOff(el: Element | null): boolean | undefined {
    if (!el) return undefined;
    const v = attr(el, 'val');
    return v == null || !['0', 'false', 'off', 'none'].includes(v.toLowerCase());
  }

  private runProps(rPr: Element | null): RunProps {
    const r: RunProps = {};
    if (!rPr) return r;
    const fonts = firstChild(rPr, 'rFonts');
    if (fonts) {
      const theme = attr(fonts, 'asciiTheme') ?? attr(fonts, 'hAnsiTheme');
      const family = attr(fonts, 'ascii') ?? attr(fonts, 'hAnsi') ?? (theme ? (theme.startsWith('major') ? this.theme.major : this.theme.minor) : null);
      if (family) r.family = family;
    }
    const sz = attr(firstChild(rPr, 'sz'), 'val');
    if (sz) r.size = num(sz) / 2;
    const b = this.onOff(firstChild(rPr, 'b'));
    if (b !== undefined) r.bold = b;
    const i = this.onOff(firstChild(rPr, 'i'));
    if (i !== undefined) r.italic = i;
    const u = firstChild(rPr, 'u');
    if (u) r.underline = (attr(u, 'val') ?? 'single') !== 'none';
    const st = this.onOff(firstChild(rPr, 'strike')) ?? this.onOff(firstChild(rPr, 'dstrike'));
    if (st !== undefined) r.strike = st;
    const caps = this.onOff(firstChild(rPr, 'caps'));
    if (caps !== undefined) r.caps = caps;
    const color = attr(firstChild(rPr, 'color'), 'val');
    if (color && color !== 'auto' && /^[0-9a-f]{6}$/i.test(color)) r.color = `#${color.toLowerCase()}`;
    const hl = attr(firstChild(rPr, 'highlight'), 'val');
    const shd = attr(firstChild(rPr, 'shd'), 'fill');
    if (hl && hl !== 'none') r.background = HIGHLIGHT[hl] ?? '#ffff00';
    else if (shd && shd !== 'auto' && /^[0-9a-f]{6}$/i.test(shd) && shd.toLowerCase() !== 'ffffff') r.background = `#${shd.toLowerCase()}`;
    const va = attr(firstChild(rPr, 'vertAlign'), 'val');
    if (va) r.vertical = va === 'superscript' ? 'super' : va === 'subscript' ? 'sub' : null;
    return r;
  }

  private paraProps(pPr: Element | null): ParaProps {
    const p: ParaProps = {};
    if (!pPr) return p;
    const jc = attr(firstChild(pPr, 'jc'), 'val');
    if (jc) p.align = jc === 'center' ? 'center' : jc === 'right' || jc === 'end' ? 'right' : jc === 'both' || jc === 'distribute' ? 'justify' : 'left';
    const ind = firstChild(pPr, 'ind');
    if (ind) {
      const l = attr(ind, 'left') ?? attr(ind, 'start');
      const r = attr(ind, 'right') ?? attr(ind, 'end');
      if (l != null) p.indentLeft = num(l) * TWIP;
      if (r != null) p.indentRight = num(r) * TWIP;
      if (attr(ind, 'hanging') != null) p.firstLine = -num(attr(ind, 'hanging')) * TWIP;
      else if (attr(ind, 'firstLine') != null) p.firstLine = num(attr(ind, 'firstLine')) * TWIP;
    }
    const sp = firstChild(pPr, 'spacing');
    if (sp) {
      if (attr(sp, 'before') != null && attr(sp, 'beforeAutospacing') !== '1') p.spaceBefore = num(attr(sp, 'before')) * TWIP;
      if (attr(sp, 'after') != null && attr(sp, 'afterAutospacing') !== '1') p.spaceAfter = num(attr(sp, 'after')) * TWIP;
      const line = attr(sp, 'line');
      if (line != null) {
        const rule = attr(sp, 'lineRule') ?? 'auto';
        if (rule === 'auto') { p.lineHeight = num(line, 240) / 240; p.lineExact = null; }
        else if (rule === 'exact') p.lineExact = num(line) * TWIP;
        else { p.lineHeight = 1; p.lineExact = null; } // atLeast: doğal yükseklik çoğunlukla yeterli
      }
    }
    const tabs = firstChild(pPr, 'tabs');
    if (tabs) {
      p.tabs = [];
      p.clearTabs = [];
      for (const t of childElements(tabs, 'tab')) {
        const val = attr(t, 'val') ?? 'left';
        const pos = num(attr(t, 'pos')) * TWIP;
        if (val === 'clear') { p.clearTabs.push(pos); continue; }
        const leader = attr(t, 'leader') ?? 'none';
        p.tabs.push({
          pos,
          align: val === 'right' || val === 'end' ? 'right' : val === 'center' ? 'center' : val === 'decimal' ? 'decimal' : 'left',
          leader: leader === 'dot' || leader === 'middleDot' ? 'dot' : leader === 'hyphen' ? 'hyphen' : leader === 'underscore' || leader === 'heavy' ? 'underscore' : 'none',
        });
      }
    }
    const numPr = firstChild(pPr, 'numPr');
    if (numPr) {
      const id = attr(firstChild(numPr, 'numId'), 'val');
      if (id != null) p.numId = id;
      p.ilvl = num(attr(firstChild(numPr, 'ilvl'), 'val'));
    }
    const pb = this.onOff(firstChild(pPr, 'pageBreakBefore'));
    if (pb !== undefined) p.pageBreakBefore = pb;
    return p;
  }

  private mergeRun(base: RunProps, over: RunProps): RunProps {
    const out = { ...base };
    for (const [k, v] of Object.entries(over)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
    return out;
  }

  private mergePara(base: ParaProps, over: ParaProps): ParaProps {
    const out = { ...base };
    for (const [k, v] of Object.entries(over)) {
      if (v === undefined || k === 'tabs' || k === 'clearTabs') continue;
      (out as Record<string, unknown>)[k] = v;
    }
    if (over.tabs) {
      const kept = (out.tabs ?? []).filter((t) => !(over.clearTabs ?? []).some((c) => Math.abs(c - t.pos) < 0.5) && !over.tabs!.some((n) => Math.abs(n.pos - t.pos) < 0.5));
      out.tabs = [...kept, ...over.tabs].sort((a, b) => a.pos - b.pos);
    }
    return out;
  }

  private toFont(r: RunProps): FontSpec {
    return defaultFont({
      family: r.family ?? this.theme.minor ?? 'Times New Roman',
      size: r.size ?? 10,
      bold: !!r.bold,
      italic: !!r.italic,
      underline: !!r.underline,
      strike: !!r.strike,
      color: r.color,
      background: r.background,
      vertical: r.vertical ?? undefined,
    });
  }

  // ------------------------------------------------------------ bloklar

  private readBlocks(container: Element): Block[] {
    const out: Block[] = [];
    for (const el of childElements(container)) {
      const name = localName(el);
      if (name === 'p') this.readParagraph(el, out);
      else if (name === 'tbl') out.push(this.readTable(el));
      else if (name === 'sdt') out.push(...this.readBlocks(firstChild(el, 'sdtContent') ?? el));
      else if (name === 'customXml' || name === 'ins' || name === 'smartTag') out.push(...this.readBlocks(el));
      else if (name === 'AlternateContent') out.push(...this.readBlocks(firstChild(el, 'Fallback') ?? firstChild(el, 'Choice') ?? el));
    }
    return out;
  }

  private readParagraph(p: Element, out: Block[]) {
    const pPr = firstChild(p, 'pPr');
    const styleId = attr(firstChild(pPr, 'pStyle'), 'val') ?? this.defaultParaStyle;
    const chain = this.styleChain(styleId);

    let pp: ParaProps = { ...this.docDefaults.p };
    let rp: RunProps = { ...this.docDefaults.r };
    for (const s of chain) {
      pp = this.mergePara(pp, s.p);
      rp = this.mergeRun(rp, s.r);
    }
    const own = this.paraProps(pPr);

    // Numaralandırma (stil veya paragraf düzeyinde)
    const numId = own.numId ?? pp.numId;
    const ilvl = own.ilvl ?? pp.ilvl ?? 0;
    let label: Paragraph['list'];
    if (numId && numId !== '0') {
      const lvl = this.level(numId, ilvl);
      if (lvl) {
        pp = this.mergePara(pp, { indentLeft: lvl.indentLeft, firstLine: lvl.firstLine });
        const text = this.listText(numId, ilvl);
        if (text) label = { text, font: this.toFont(this.mergeRun(rp, lvl.r)) };
      }
    }
    pp = this.mergePara(pp, own);
    const paraRun = this.mergeRun(rp, this.runProps(firstChild(pPr, 'rPr')));

    const para = emptyParagraph({
      align: pp.align ?? 'left',
      indentLeft: pp.indentLeft ?? 0,
      indentRight: pp.indentRight ?? 0,
      firstLine: pp.firstLine ?? 0,
      spaceBefore: pp.spaceBefore ?? 0,
      spaceAfter: pp.spaceAfter ?? 0,
      lineHeight: pp.lineHeight ?? 1,
      lineExact: pp.lineExact ?? undefined,
      tabs: pp.tabs ?? [],
      pageBreakBefore: pp.pageBreakBefore,
      font: this.toFont(paraRun),
      list: label,
    });

    // Satır içi öğeler; sayfa sonları paragrafı böler.
    let current = para;
    const field = { depth: 0, instr: '', showResult: true, result: [] as Inline[] };
    const emit = (inl: Inline) => {
      if (field.depth > 0) {
        if (field.showResult) field.result.push(inl);
        return;
      }
      current.inlines.push(inl);
    };
    const breakPage = () => {
      out.push(current, { type: 'pageBreak' });
      current = { ...para, list: undefined, firstLine: 0, spaceBefore: 0, pageBreakBefore: false, inlines: [] };
    };

    const walk = (el: Element, runBase: RunProps) => {
      for (const c of childElements(el)) {
        const n = localName(c);
        if (n === 'r') this.readRun(c, runBase, emit, breakPage, field);
        else if (n === 'hyperlink' || n === 'smartTag' || n === 'customXml' || n === 'ins' || n === 'bdo' || n === 'dir') walk(c, runBase);
        else if (n === 'sdt') walk(firstChild(c, 'sdtContent') ?? c, runBase);
        else if (n === 'fldSimple') {
          const instr = (attr(c, 'instr') ?? '').trim().toUpperCase();
          const font = this.toFont(runBase);
          if (/^PAGE\b/.test(instr)) emit({ kind: 'field', field: 'page', font });
          else if (/^(NUMPAGES|SECTIONPAGES)\b/.test(instr)) emit({ kind: 'field', field: 'pages', font });
          else walk(c, runBase);
        } else if (n === 'AlternateContent') walk(firstChild(c, 'Fallback') ?? firstChild(c, 'Choice') ?? c, runBase);
      }
    };
    walk(p, paraRun);
    out.push(current);

    if (attr(firstChild(firstChild(pPr, 'sectPr'), 'type'), 'val') !== 'continuous' && firstChild(pPr, 'sectPr')) {
      out.push({ type: 'pageBreak' });
    }
  }

  private readRun(
    r: Element, base: RunProps, emit: (i: Inline) => void, breakPage: () => void,
    field: { depth: number; instr: string; showResult: boolean; result: Inline[] },
  ) {
    const rPr = firstChild(r, 'rPr');
    let props = base;
    const rStyle = attr(firstChild(rPr, 'rStyle'), 'val');
    if (rStyle) for (const s of this.styleChain(rStyle)) props = this.mergeRun(props, s.r);
    props = this.mergeRun(props, this.runProps(rPr));
    const font = this.toFont(props);
    const text = (t: string) => emit({ kind: 'text', text: props.caps ? t.toLocaleUpperCase('tr') : t, font });

    for (const c of childElements(r)) {
      switch (localName(c)) {
        case 't':
          text(c.textContent ?? '');
          break;
        case 'tab':
          emit({ kind: 'tab', font });
          break;
        case 'br':
          if (attr(c, 'type') === 'page') breakPage();
          else emit({ kind: 'break', font });
          break;
        case 'cr':
          emit({ kind: 'break', font });
          break;
        case 'noBreakHyphen':
          text('-');
          break;
        case 'sym': {
          const ch = attr(c, 'char');
          if (ch) text(String.fromCharCode(parseInt(ch, 16)));
          break;
        }
        case 'drawing':
        case 'pict':
        case 'object': {
          const img = this.image(c);
          if (img) emit(img);
          break;
        }
        case 'fldChar': {
          const type = attr(c, 'fldCharType');
          if (type === 'begin') { field.depth++; field.instr = ''; field.showResult = false; field.result = []; }
          else if (type === 'separate') {
            const instr = field.instr.trim().toUpperCase();
            if (/^PAGE\b/.test(instr) || /^(NUMPAGES|SECTIONPAGES)\b/.test(instr)) {
              field.showResult = false;
              const kind = /^PAGE\b/.test(instr) ? 'page' : 'pages';
              field.depth--;
              emit({ kind: 'field', field: kind, font });
              field.depth++;
            } else field.showResult = true;
          } else if (type === 'end') {
            field.depth = Math.max(0, field.depth - 1);
            const result = field.result;
            field.result = [];
            if (field.showResult) for (const inl of result) emit(inl);
          }
          break;
        }
        case 'instrText':
          field.instr += c.textContent ?? '';
          break;
        case 'AlternateContent': {
          const inner = firstChild(c, 'Fallback') ?? firstChild(c, 'Choice');
          const img = inner ? this.image(inner) : null;
          if (img) emit(img);
          break;
        }
        default:
          break;
      }
    }
  }

  private image(el: Element): Inline | null {
    // DrawingML: a:blip r:embed; VML: v:imagedata r:id
    const blip = el.getElementsByTagName('a:blip')[0] as unknown as Element | undefined;
    const vml = el.getElementsByTagName('v:imagedata')[0] as unknown as Element | undefined;
    const rid = attr(blip ?? null, 'embed') ?? attr(vml ?? null, 'id');
    if (!rid) return null;
    const target = this.relTarget(rid);
    const bytes = target ? findEntry(this.files, target) : undefined;
    if (!bytes) return null;
    const mime = sniffImage(bytes);
    if (!mime) {
      this.notes.add('Belgedeki bazı görseller (ör. EMF/WMF çizimleri) desteklenmediği için atlandı.');
      return null;
    }
    let width = 100;
    let height = 100;
    const extent = el.getElementsByTagName('wp:extent')[0] as unknown as Element | undefined;
    if (extent) {
      width = num(attr(extent, 'cx')) * EMU;
      height = num(attr(extent, 'cy')) * EMU;
    } else {
      const shape = el.getElementsByTagName('v:shape')[0] as unknown as Element | undefined;
      const style = attr(shape ?? null, 'style') ?? '';
      const w = /width:([\d.]+)pt/.exec(style);
      const h = /height:([\d.]+)pt/.exec(style);
      if (w) width = num(w[1]);
      if (h) height = num(h[1]);
    }
    if (el.getElementsByTagName('wp:anchor').length) this.notes.add('Metnin etrafına yerleştirilmiş (kayan) görseller satır içine alındı.');
    return { kind: 'image', image: { bytes, mime }, width: Math.max(1, width), height: Math.max(1, height) };
  }

  private relTarget(rid: string): string | undefined {
    const part = this.currentPart;
    if (!this.rels.has(part)) {
      const map = new Map<string, string>();
      const dir = part.slice(0, part.lastIndexOf('/'));
      const relsPath = `${dir}/_rels/${part.slice(part.lastIndexOf('/') + 1)}.rels`;
      const xml = this.xml(relsPath);
      if (xml) {
        for (const rel of childElements(xml.documentElement as unknown as Element, 'Relationship')) {
          const target = attr(rel, 'Target') ?? '';
          const id = attr(rel, 'Id');
          if (!id) continue;
          map.set(id, target.startsWith('/') ? target.slice(1) : normalize(`${dir}/${target}`));
        }
      }
      this.rels.set(part, map);
    }
    return this.rels.get(part)!.get(rid);
  }

  // ------------------------------------------------------------ numaralandırma

  private level(numId: string, ilvl: number): Level | undefined {
    const n = this.nums.get(numId);
    return n ? this.abstract.get(n.abstractId)?.[ilvl] : undefined;
  }

  private listText(numId: string, ilvl: number): string {
    const n = this.nums.get(numId);
    const levels = n ? this.abstract.get(n.abstractId) : undefined;
    const lvl = levels?.[ilvl];
    if (!n || !levels || !lvl) return '';
    const key = n.abstractId;
    const counters = this.counters.get(key) ?? [];
    for (let i = 0; i <= ilvl; i++) {
      if (counters[i] === undefined) counters[i] = (n.overrides.get(i) ?? levels[i]?.start ?? 1) - 1;
    }
    counters[ilvl] += 1;
    counters.length = ilvl + 1;
    this.counters.set(key, counters);
    if (lvl.fmt === 'bullet') {
      const ch = lvl.text || '•';
      return /[-]/.test(ch) || ch === 'o' ? '•' : ch;
    }
    if (lvl.fmt === 'none') return lvl.text.replace(/%\d/g, '');
    return lvl.text.replace(/%(\d)/g, (_, d) => {
      const i = Number(d) - 1;
      return formatCounter(counters[i] ?? levels[i]?.start ?? 1, levels[i]?.fmt ?? 'decimal');
    });
  }

  // ------------------------------------------------------------ tablolar

  private readTable(tbl: Element): Table {
    const tblPr = firstChild(tbl, 'tblPr');
    const styleId = attr(firstChild(tblPr, 'tblStyle'), 'val');
    const styleBorders = this.styleChain(styleId).map((s) => s.tblBorders).filter(Boolean).pop() ?? null;
    const own = firstChild(tblPr, 'tblBorders');
    const tb = (side: string) => borderOf(firstChild(own, side) ?? firstChild(styleBorders, side));
    const tableBorders = {
      top: tb('top'), bottom: tb('bottom'), left: tb('left') ?? tb('start'), right: tb('right') ?? tb('end'),
      insideH: tb('insideH'), insideV: tb('insideV'),
    };
    const columns = childElements(firstChild(tbl, 'tblGrid'), 'gridCol').map((c) => num(attr(c, 'w')) * TWIP);
    const jc = attr(firstChild(tblPr, 'jc'), 'val');
    const rowsEl = childElements(tbl, 'tr');
    const rows: Row[] = rowsEl.map((tr, ri) => {
      const trPr = firstChild(tr, 'trPr');
      const trH = firstChild(trPr, 'trHeight');
      const cellsEl = childElements(tr, 'tc');
      const cells: Cell[] = cellsEl.map((tc, ci) => {
        const tcPr = firstChild(tc, 'tcPr');
        const span = Math.max(1, num(attr(firstChild(tcPr, 'gridSpan'), 'val'), 1));
        const vMerge = firstChild(tcPr, 'vMerge');
        const merged = vMerge != null && (attr(vMerge, 'val') ?? 'continue') === 'continue';
        const tcb = firstChild(tcPr, 'tcBorders');
        const side = (name: string, alt: string | null, fallback: Border | null) => {
          const el = firstChild(tcb, name) ?? (alt ? firstChild(tcb, alt) : null);
          return el ? borderOf(el) : fallback;
        };
        const isFirstRow = ri === 0;
        const isLastRow = ri === rowsEl.length - 1;
        const isFirstCol = ci === 0;
        const isLastCol = ci === cellsEl.length - 1;
        const fill = attr(firstChild(tcPr, 'shd'), 'fill');
        const va = attr(firstChild(tcPr, 'vAlign'), 'val');
        return {
          blocks: merged ? [] : this.readBlocks(tc),
          colSpan: span,
          mergedAbove: merged || undefined,
          borders: {
            top: side('top', null, isFirstRow ? tableBorders.top : tableBorders.insideH),
            bottom: side('bottom', null, isLastRow ? tableBorders.bottom : tableBorders.insideH),
            left: side('left', 'start', isFirstCol ? tableBorders.left : tableBorders.insideV),
            right: side('right', 'end', isLastCol ? tableBorders.right : tableBorders.insideV),
          },
          fill: fill && fill !== 'auto' && /^[0-9a-f]{6}$/i.test(fill) && fill.toLowerCase() !== 'ffffff' ? `#${fill.toLowerCase()}` : undefined,
          vAlign: va === 'center' ? 'middle' : va === 'bottom' ? 'bottom' : 'top',
        };
      });
      return {
        cells,
        height: trH ? num(attr(trH, 'val')) * TWIP : undefined,
        exactHeight: attr(trH, 'hRule') === 'exact',
      };
    });
    return {
      type: 'table', columns, rows,
      indentLeft: num(attr(firstChild(tblPr, 'tblInd'), 'w')) * TWIP,
      align: jc === 'center' ? 'center' : jc === 'right' || jc === 'end' ? 'right' : 'left',
      fullWidth: false,
    };
  }

  // ------------------------------------------------------------ bölüm, üst/alt bilgi

  private readSection(sect: Element, doc: Doc) {
    const pgSz = firstChild(sect, 'pgSz');
    if (pgSz) {
      doc.page.width = num(attr(pgSz, 'w'), 11906) * TWIP;
      doc.page.height = num(attr(pgSz, 'h'), 16838) * TWIP;
    }
    const m = firstChild(sect, 'pgMar');
    if (m) {
      doc.page.margins = {
        top: Math.abs(num(attr(m, 'top'), 1417)) * TWIP,
        right: num(attr(m, 'right'), 1417) * TWIP,
        bottom: Math.abs(num(attr(m, 'bottom'), 1417)) * TWIP,
        left: num(attr(m, 'left'), 1417) * TWIP,
      };
      doc.page.headerOffset = num(attr(m, 'header'), 708) * TWIP;
      doc.page.footerOffset = num(attr(m, 'footer'), 708) * TWIP;
    }
    const titlePg = this.onOff(firstChild(sect, 'titlePg')) ?? false;
    const part = (kind: 'headerReference' | 'footerReference') => {
      const refs = childElements(sect, kind);
      const def = refs.find((r) => (attr(r, 'type') ?? 'default') === 'default');
      const first = refs.find((r) => attr(r, 'type') === 'first');
      return { def, first };
    };
    const load = (ref: Element | undefined): Block[] | null => {
      const rid = attr(ref ?? null, 'id');
      if (!rid) return null;
      const target = this.relTarget(rid);
      const xml = target ? this.xml(target) : null;
      if (!xml || !target) return null;
      const prev = this.currentPart;
      this.currentPart = target;
      const blocks = this.readBlocks(xml.documentElement as unknown as Element);
      this.currentPart = prev;
      return blocks;
    };
    const h = part('headerReference');
    const f = part('footerReference');
    const header = load(h.def);
    const footer = load(f.def);
    if (header && header.some(visible)) doc.header = { blocks: header, startPage: titlePg ? 2 : 1 };
    if (footer && footer.some(visible)) doc.footer = { blocks: footer, startPage: titlePg ? 2 : 1 };
    if (titlePg && ((load(h.first) ?? []).some(visible) || (load(f.first) ?? []).some(visible))) {
      this.notes.add('İlk sayfaya özel üst/alt bilgi, diğer sayfalarınkiyle aynı biçimde gösterilemedi.');
    }
  }
}

const HIGHLIGHT: Record<string, string> = {
  yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff', red: '#ff0000',
  darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000',
  darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0', black: '#000000', white: '#ffffff',
};

function borderOf(el: Element | null): Border | null {
  if (!el) return null;
  const val = attr(el, 'val') ?? 'single';
  if (['nil', 'none'].includes(val)) return null;
  const color = attr(el, 'color');
  return {
    width: Math.max(0.25, num(attr(el, 'sz'), 4) / 8),
    color: color && color !== 'auto' && /^[0-9a-f]{6}$/i.test(color) ? `#${color.toLowerCase()}` : '#000000',
    style: val === 'dashed' || val.startsWith('dash') ? 'dashed' : val === 'dotted' ? 'dotted' : val === 'double' ? 'double' : 'solid',
  };
}

function formatCounter(n: number, fmt: string): string {
  switch (fmt) {
    case 'lowerLetter': return letters(n);
    case 'upperLetter': return letters(n).toUpperCase();
    case 'lowerRoman': return roman(n).toLowerCase();
    case 'upperRoman': return roman(n);
    case 'decimalZero': return String(n).padStart(2, '0');
    default: return String(n);
  }
}

function letters(n: number): string {
  let out = '';
  while (n > 0) { n -= 1; out = String.fromCharCode(97 + (n % 26)) + out; n = Math.floor(n / 26); }
  return out;
}

function roman(n: number): string {
  const map: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

function normalize(path: string): string {
  const parts: string[] = [];
  for (const seg of path.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function visible(b: Block): boolean {
  if (b.type === 'paragraph') return b.inlines.some((i) => (i.kind === 'text' ? i.text.trim() !== '' : i.kind !== 'tab' && i.kind !== 'break'));
  if (b.type === 'table') return b.rows.some((r) => r.cells.some((c) => c.blocks.some(visible)));
  return false;
}
