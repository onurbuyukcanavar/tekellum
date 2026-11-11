/**
 * Ortak belge modeli → Word (.docx). Biçim, sekme durakları, girintiler, tablolar, görseller,
 * üst/alt bilgi ve sayfa numaraları korunur.
 */
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeightRule, ImageRun, LineRuleType, Packer, PageNumber,
  PageOrientation, Paragraph as DocxParagraph, ShadingType, Tab, Table as DocxTable, TableCell, TableLayoutType,
  TableRow, TabStopType, TextRun, UnderlineType, VerticalAlign, WidthType,
  type IParagraphOptions, type ISectionOptions, type ParagraphChild,
} from 'docx';
import type { Block, Border, Doc, FontSpec, PageNumbering, Paragraph, Table } from './model';

const twip = (pt: number) => Math.round(pt * 20);
const px = (pt: number) => Math.max(1, Math.round((pt * 96) / 72));

const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED } as const;
const TAB = { left: TabStopType.LEFT, center: TabStopType.CENTER, right: TabStopType.RIGHT, decimal: TabStopType.DECIMAL } as const;

function runOptions(font: FontSpec) {
  return {
    font: font.family,
    size: Math.round(font.size * 2),
    bold: font.bold || undefined,
    italics: font.italic || undefined,
    underline: font.underline ? { type: UnderlineType.SINGLE } : undefined,
    strike: font.strike || undefined,
    color: font.color ? font.color.replace('#', '') : undefined,
    shading: font.background ? { type: ShadingType.CLEAR, color: 'auto', fill: font.background.replace('#', '') } : undefined,
    superScript: font.vertical === 'super' || undefined,
    subScript: font.vertical === 'sub' || undefined,
  };
}

function paragraph(p: Paragraph): DocxParagraph {
  const children: ParagraphChild[] = [];
  if (p.list) children.push(new TextRun({ text: p.list.text, ...runOptions(p.list.font) }), new TextRun({ children: [new Tab()], ...runOptions(p.list.font) }));
  for (const it of p.inlines) {
    switch (it.kind) {
      case 'text':
        children.push(new TextRun({ text: it.text, ...runOptions(it.font) }));
        break;
      case 'tab':
        children.push(new TextRun({ children: [new Tab()], ...runOptions(it.font) }));
        break;
      case 'break':
        children.push(new TextRun({ break: 1, ...runOptions(it.font) }));
        break;
      case 'field':
        children.push(new TextRun({ children: [it.field === 'page' ? PageNumber.CURRENT : PageNumber.TOTAL_PAGES], ...runOptions(it.font) }));
        break;
      case 'image':
        children.push(new ImageRun({
          type: it.image.mime === 'image/png' ? 'png' : 'jpg',
          data: it.image.bytes,
          transformation: { width: px(it.width), height: px(it.height) },
        }));
        break;
    }
  }
  // Madde etiketi için girinti yoksa küçük bir asılı girinti oluştur.
  const listIndent = p.list && p.indentLeft === 0 && p.firstLine === 0 ? 18 : 0;
  const opts: IParagraphOptions = {
    children,
    alignment: ALIGN[p.align],
    indent: {
      left: twip(p.indentLeft + listIndent),
      right: twip(p.indentRight),
      ...(p.firstLine - listIndent < 0 ? { hanging: twip(-(p.firstLine - listIndent)) } : { firstLine: twip(p.firstLine) }),
    },
    spacing: {
      before: twip(p.spaceBefore),
      after: twip(p.spaceAfter),
      ...(p.lineExact ? { line: twip(p.lineExact), lineRule: LineRuleType.EXACT } : { line: Math.round(240 * p.lineHeight), lineRule: LineRuleType.AUTO }),
    },
    tabStops: [
      ...p.tabs.map((t) => ({ type: TAB[t.align], position: twip(t.pos), leader: t.leader === 'dot' ? ('dot' as const) : t.leader === 'hyphen' ? ('hyphen' as const) : t.leader === 'underscore' ? ('underscore' as const) : undefined })),
      ...(listIndent ? [{ type: TabStopType.LEFT, position: twip(listIndent) }] : []),
    ],
    pageBreakBefore: p.pageBreakBefore || undefined,
    run: runOptions(p.font),
  };
  return new DocxParagraph(opts);
}

function border(b: Border | null) {
  if (!b) return { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const style = b.style === 'dashed' ? BorderStyle.DASHED : b.style === 'dotted' ? BorderStyle.DOTTED : b.style === 'double' ? BorderStyle.DOUBLE : BorderStyle.SINGLE;
  return { style, size: Math.max(2, Math.round(b.width * 8)), color: b.color.replace('#', '') };
}

function table(t: Table, availWidth: number): DocxTable {
  const cols = Math.max(1, ...t.rows.map((r) => r.cells.reduce((s, c) => s + c.colSpan, 0)));
  const sum = t.columns.slice(0, cols).reduce((s, v) => s + v, 0);
  let widths = t.columns.length >= cols && sum > 0 ? t.columns.slice(0, cols) : Array.from({ length: cols }, () => availWidth / cols);
  const total = widths.reduce((s, v) => s + v, 0);
  if (t.fullWidth || total > availWidth) widths = widths.map((w) => (w * availWidth) / total);

  return new DocxTable({
    layout: TableLayoutType.FIXED,
    width: { size: twip(widths.reduce((s, v) => s + v, 0)), type: WidthType.DXA },
    columnWidths: widths.map(twip),
    indent: t.indentLeft ? { size: twip(t.indentLeft), type: WidthType.DXA } : undefined,
    alignment: t.align === 'center' ? AlignmentType.CENTER : t.align === 'right' ? AlignmentType.RIGHT : undefined,
    rows: t.rows.map((r) => {
      let col = 0;
      return new TableRow({
        height: r.height ? { value: twip(r.height), rule: r.exactHeight ? HeightRule.EXACT : HeightRule.ATLEAST } : undefined,
        children: r.cells.map((c) => {
          const w = widths.slice(col, col + c.colSpan).reduce((s, v) => s + v, 0);
          col += c.colSpan;
          const children = blocks(c.blocks, Math.max(10, w - 10.8)).filter((b) => !(b instanceof PageBreakMarker)) as (DocxParagraph | DocxTable)[];
          return new TableCell({
            width: { size: twip(w), type: WidthType.DXA },
            columnSpan: c.colSpan > 1 ? c.colSpan : undefined,
            verticalAlign: c.vAlign === 'middle' ? VerticalAlign.CENTER : c.vAlign === 'bottom' ? VerticalAlign.BOTTOM : VerticalAlign.TOP,
            shading: c.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: c.fill.replace('#', '') } : undefined,
            borders: { top: border(c.borders.top), bottom: border(c.borders.bottom), left: border(c.borders.left), right: border(c.borders.right) },
            children: children.length ? children : [new DocxParagraph({})],
          });
        }),
      });
    }),
  });
}

class PageBreakMarker {}

function blocks(list: Block[], availWidth: number): (DocxParagraph | DocxTable | PageBreakMarker)[] {
  const out: (DocxParagraph | DocxTable | PageBreakMarker)[] = [];
  let pendingBreak = false;
  for (const b of list) {
    if (b.type === 'pageBreak') {
      pendingBreak = true;
      continue;
    }
    if (b.type === 'paragraph') {
      out.push(paragraph(pendingBreak ? { ...b, pageBreakBefore: true } : b));
    } else {
      if (pendingBreak) out.push(new DocxParagraph({ pageBreakBefore: true }));
      out.push(table(b, availWidth));
      // Word, belge veya hücre bir tabloyla bitemez; ardına boş paragraf gerekir.
      out.push(new DocxParagraph({ spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT } }));
    }
    pendingBreak = false;
  }
  return out;
}

function pageNumberParagraph(pn: PageNumbering): DocxParagraph {
  const font = runOptions(pn.font);
  const children: ParagraphChild[] = [];
  if (pn.prefix) children.push(new TextRun({ text: pn.prefix, ...font }));
  children.push(new TextRun({ children: [PageNumber.CURRENT], ...font }));
  if (pn.withTotal) children.push(new TextRun({ text: pn.separator, ...font }), new TextRun({ children: [PageNumber.TOTAL_PAGES], ...font }));
  return new DocxParagraph({ alignment: ALIGN[pn.align], children });
}

export async function writeDocx(doc: Doc, opts: { title?: string } = {}): Promise<Uint8Array> {
  const avail = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const landscape = doc.page.width > doc.page.height;
  const clean = (bs: Block[]) => blocks(bs, avail).filter((b) => !(b instanceof PageBreakMarker)) as (DocxParagraph | DocxTable)[];

  const bodyChildren = clean(doc.body);
  const headerChildren = doc.header ? clean(doc.header.blocks) : [];
  const footerChildren = doc.footer ? clean(doc.footer.blocks) : [];
  if (doc.pageNumbers?.position === 'top') headerChildren.unshift(pageNumberParagraph(doc.pageNumbers));
  if (doc.pageNumbers && doc.pageNumbers.position === 'bottom') footerChildren.push(pageNumberParagraph(doc.pageNumbers));
  const titlePage = (doc.header?.startPage ?? 1) > 1 || (doc.footer?.startPage ?? 1) > 1;

  const section: ISectionOptions = {
    properties: {
      titlePage,
      page: {
        size: {
          // docx kütüphanesi yatay sayfada genişlik/yüksekliği kendisi çevirir; dikey ölçüleri verilir.
          width: twip(landscape ? doc.page.height : doc.page.width),
          height: twip(landscape ? doc.page.width : doc.page.height),
          orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
        },
        margin: {
          top: twip(doc.page.margins.top),
          right: twip(doc.page.margins.right),
          bottom: twip(doc.page.margins.bottom),
          left: twip(doc.page.margins.left),
          header: twip(doc.page.headerOffset),
          footer: twip(doc.page.footerOffset),
        },
        pageNumbers: doc.pageNumbers && doc.pageNumbers.start > 1 ? { start: doc.pageNumbers.start } : undefined,
      },
    },
    headers: headerChildren.length ? { default: new Header({ children: headerChildren }), ...(titlePage ? { first: new Header({ children: [] }) } : {}) } : undefined,
    footers: footerChildren.length ? { default: new Footer({ children: footerChildren }), ...(titlePage ? { first: new Footer({ children: doc.footer?.startPage === 1 ? footerChildren : [] }) } : {}) } : undefined,
    children: bodyChildren.length ? bodyChildren : [new DocxParagraph({})],
  };

  const document = new Document({
    creator: 'Tekellüm',
    title: opts.title,
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
    sections: [section],
  });
  const buf = await Packer.toArrayBuffer(document);
  return new Uint8Array(buf);
}
