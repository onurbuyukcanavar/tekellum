/**
 * Ortak belge modeli → UYAP Doküman Formatı (.udf).
 *
 * Gerçek UYAP Doküman Editörü çıktısındaki kurallar izlenir:
 *  - format_id 1.8, BOM'suz UTF-8; arşivde content.xml.
 *  - Metin havuzu: önce üst bilgi, sonra gövde, en son alt bilgi; her paragrafın kendi \n karakteri
 *    o paragrafın son öğesinin aralığına dahildir; havuzun sonunda hiçbir öğenin kapsamadığı tek bir \n bulunur.
 *  - Aralıklar boşluksuz ve çakışmasızdır (yazmadan önce validateUdf ile denetlenir).
 *  - Sekme hizalama kodları Java Swing TabStop sabitleridir (0 sol, 1 sağ, 2 orta, 4 ondalık).
 */
import { ConvertError, type Block, type Doc, type FontSpec, type Paragraph, type Table } from './model';
import { bytesToBase64, escapeXml, hexToArgb, round, stripInvalidXml, zip } from './util';

const ALIGN_CODE = { left: 0, center: 1, right: 2, justify: 3 } as const;
const TAB_CODE = { left: 0, right: 1, center: 2, decimal: 4 } as const;
const LEADER_CODE = { none: 0, dot: 1, hyphen: 2, underscore: 3 } as const;

class Pool {
  text = '';
  add(s: string) {
    const start = this.text.length;
    this.text += s;
    return start;
  }
}

function fontAttrs(f: FontSpec): string {
  const a = [`family="${escapeXml(f.family || 'Times New Roman')}"`, `size="${round(f.size, 1)}"`];
  if (f.bold) a.push('bold="true"');
  if (f.italic) a.push('italic="true"');
  if (f.underline) a.push('underline="true"');
  if (f.strike) a.push('strikethrough="true"');
  if (f.vertical === 'super') a.push('superscript="true"');
  if (f.vertical === 'sub') a.push('subscript="true"');
  if (f.color && f.color.toLowerCase() !== '#000000') a.push(`foreground="${hexToArgb(f.color)}"`);
  if (f.background) a.push(`background="${hexToArgb(f.background)}"`);
  return a.join(' ');
}

function paragraphXml(p: Paragraph, pool: Pool): string {
  // Asılı girinti: UDF'de LeftIndent ilk satırın, Hanging sonraki satırların ek girintisidir.
  let leftIndent = p.indentLeft;
  let firstLine = p.firstLine;
  let hanging = 0;
  if (p.firstLine < 0) {
    hanging = -p.firstLine;
    leftIndent = p.indentLeft - hanging;
    firstLine = 0;
    if (leftIndent < 0) {
      hanging += leftIndent;
      leftIndent = 0;
    }
  }
  const lineSpacing = p.lineExact ? 0 : Math.max(0, p.lineHeight - 1);
  const attrs = [
    `Alignment="${ALIGN_CODE[p.align]}"`,
    `LeftIndent="${round(leftIndent)}"`,
    `RightIndent="${round(p.indentRight)}"`,
    `FirstLineIndent="${round(firstLine)}"`,
    `Hanging="${round(hanging)}"`,
    `LineSpacing="${round(lineSpacing, 3)}"`,
    `SpaceAbove="${round(p.spaceBefore)}"`,
    `SpaceBelow="${round(p.spaceAfter)}"`,
  ];
  if (p.tabs.length) attrs.push(`TabSet="${p.tabs.map((t) => `${round(t.pos, 2)}:${TAB_CODE[t.align]}:${LEADER_CODE[t.leader]}`).join(',')}"`);
  attrs.push('resolver="hvl-default"');

  const leaves: string[] = [];
  let lastFont = p.font;
  const content = (text: string, font: FontSpec) => {
    if (!text) return;
    const start = pool.add(text);
    leaves.push(`<content ${fontAttrs(font)} startOffset="${start}" length="${text.length}" />`);
    lastFont = font;
  };

  if (p.list) content(`${p.list.text}\t`.replace('\t', ' '), p.list.font);
  for (const it of p.inlines) {
    switch (it.kind) {
      case 'text':
        content(stripInvalidXml(it.text.replace(/[\t\n\r​￼]/g, ' ')), it.font);
        break;
      case 'tab': {
        const start = pool.add('\t');
        leaves.push(`<tab ${fontAttrs(it.font)} startOffset="${start}" length="1" />`);
        lastFont = it.font;
        break;
      }
      case 'break':
      case 'field':
        // Satır kesmeleri paragraf bölünerek, sayfa alanları alt bilgi numaralandırmasıyla karşılanır (bkz. splitBreaks, writeUdf).
        break;
      case 'image': {
        const start = pool.add('￼');
        leaves.push(`<image imageData="${bytesToBase64(it.image.bytes)}" width="${round(it.width)}" height="${round(it.height)}" startOffset="${start}" length="1" />`);
        break;
      }
    }
  }
  // Paragrafın satır sonu: son öğenin biçimiyle ayrı bir içerik öğesi.
  const nl = pool.add('\n');
  leaves.push(`<content ${fontAttrs(lastFont)} startOffset="${nl}" length="1" />`);
  return `<paragraph ${attrs.join(' ')}>${leaves.join('')}</paragraph>`;
}

function tableXml(t: Table, pool: Pool, avail: number): string {
  const cols = Math.max(1, ...t.rows.map((r) => r.cells.reduce((s, c) => s + c.colSpan, 0)));
  const sum = t.columns.slice(0, cols).reduce((s, v) => s + v, 0);
  let widths = t.columns.length >= cols && sum > 0 ? t.columns.slice(0, cols) : Array.from({ length: cols }, () => avail / cols);
  const total = widths.reduce((s, v) => s + v, 0);
  if (t.fullWidth || total > avail) widths = widths.map((w) => (w * avail) / total);
  const anyBorder = t.rows.some((r) => r.cells.some((c) => c.borders.top || c.borders.bottom || c.borders.left || c.borders.right));

  const rows = t.rows.map((r, ri) => {
    let col = 0;
    const cells = r.cells.map((c) => {
      const w = widths.slice(col, col + c.colSpan).reduce((s, v) => s + v, 0);
      col += c.colSpan;
      const visible = c.borders.top || c.borders.bottom || c.borders.left || c.borders.right;
      const spec = (c.borders.top ? 1 : 0) | (c.borders.right ? 2 : 0) | (c.borders.bottom ? 4 : 0) | (c.borders.left ? 8 : 0);
      const b = c.borders.top ?? c.borders.bottom ?? c.borders.left ?? c.borders.right;
      const attrs = [`colspan="${c.colSpan}"`, `align="${c.vAlign === 'middle' ? 'vcenter' : c.vAlign}"`];
      if (visible && b) attrs.push('border="borderCell"', `borderSpec="${spec}"`, `borderWidth="${round(b.width, 2)}"`, `borderColor="${hexToArgb(b.color)}"`, `borderStyle="borderStyle-${b.style}"`);
      else attrs.push('border="borderNone"');
      if (c.fill) attrs.push(`fillColor="${hexToArgb(c.fill)}"`);
      const inner = c.blocks.filter((x) => x.type !== 'pageBreak');
      const body = inner.length ? blocksXml(inner, pool, Math.max(10, w - 10.8)) : paragraphXml(emptyCellParagraph(), pool);
      return `<cell ${attrs.join(' ')}>${body}</cell>`;
    });
    return `<row rowName="row${ri + 1}" rowType="dataRow"${r.height ? ` height="${round(r.height)}"` : ''}>${cells.join('')}</row>`;
  });
  return `<table tableName="Sabit" columnCount="${cols}" columnSpans="${widths.map((w) => round(w, 1)).join(',')}" border="${anyBorder ? 'borderCell' : 'borderNone'}">${rows.join('')}</table>`;
}

function emptyCellParagraph(): Paragraph {
  return {
    type: 'paragraph', align: 'left', indentLeft: 0, indentRight: 0, firstLine: 0, spaceBefore: 0, spaceAfter: 0, lineHeight: 1, tabs: [],
    font: { family: 'Times New Roman', size: 12, bold: false, italic: false, underline: false, strike: false }, inlines: [],
  };
}

/** UDF'de paragraf içi satır kesmesi olmadığından, kesmeli paragraf aynı biçimli ardışık paragraflara bölünür. */
function splitBreaks(p: Paragraph): Paragraph[] {
  if (!p.inlines.some((i) => i.kind === 'break')) return [p];
  const parts: Paragraph[] = [];
  let cur: Paragraph['inlines'] = [];
  const push = (last: boolean) => {
    const first = parts.length === 0;
    parts.push({
      ...p,
      inlines: cur,
      list: first ? p.list : undefined,
      firstLine: first ? p.firstLine : Math.max(0, p.firstLine),
      spaceBefore: first ? p.spaceBefore : 0,
      spaceAfter: last ? p.spaceAfter : 0,
      pageBreakBefore: first ? p.pageBreakBefore : false,
    });
    cur = [];
  };
  for (const it of p.inlines) {
    if (it.kind === 'break') push(false);
    else cur.push(it);
  }
  push(true);
  return parts;
}

function blocksXml(blocks: Block[], pool: Pool, avail: number): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === 'paragraph') {
      if (b.pageBreakBefore) out.push(pageBreakXml(pool, b.font));
      for (const part of splitBreaks({ ...b, pageBreakBefore: false })) out.push(paragraphXml(part, pool));
    } else if (b.type === 'table') out.push(tableXml(b, pool, avail));
    else out.push(pageBreakXml(pool));
  }
  return out.join('\n');
}

function pageBreakXml(pool: Pool, font?: FontSpec): string {
  const nl = pool.add('\n');
  const f = font ?? emptyCellParagraph().font;
  return `<page-break><paragraph Alignment="0" LeftIndent="0.0" RightIndent="0.0" resolver="hvl-default"><content ${fontAttrs(f)} startOffset="${nl}" length="1" /></paragraph></page-break>`;
}

const PAGE_SIZES: [string, number, number][] = [['1', 595.28, 841.89], ['11', 419.53, 595.28], ['5', 612, 792], ['6', 612, 1008]];

/** Sayfa alanı içeren üst/alt bilgi paragrafını sayfa numarası ayarına dönüştürür ("Sayfa 1 / 3" → önek "Sayfa ", ayraç " / "). */
function extractPageNumbers(doc: Doc): Doc['pageNumbers'] {
  for (const which of ['footer', 'header'] as const) {
    const part = doc[which];
    if (!part) continue;
    const idx = part.blocks.findIndex((b) => b.type === 'paragraph' && b.inlines.some((i) => i.kind === 'field' && i.field === 'page'));
    if (idx < 0) continue;
    const p = part.blocks[idx] as Paragraph;
    const pageAt = p.inlines.findIndex((i) => i.kind === 'field' && i.field === 'page');
    const totalAt = p.inlines.findIndex((i) => i.kind === 'field' && i.field === 'pages');
    const textOf = (from: number, to: number) => p.inlines.slice(from, to).map((i) => (i.kind === 'text' ? i.text : '')).join('');
    const prefix = textOf(0, pageAt);
    const separator = totalAt > pageAt ? textOf(pageAt + 1, totalAt) : '';
    const rest = textOf(Math.max(pageAt, totalAt) + 1, p.inlines.length);
    const field = p.inlines[pageAt];
    // Paragrafta numaradan başka anlamlı metin yoksa paragraf kaldırılır.
    if (!rest.trim() && prefix.length < 40) {
      part.blocks = part.blocks.filter((_, k) => k !== idx);
      doc[which] = { ...part };
    } else {
      part.blocks[idx] = { ...p, inlines: p.inlines.filter((i) => i.kind !== 'field') };
    }
    return {
      align: p.align === 'justify' ? 'left' : p.align,
      position: which === 'header' ? 'top' : 'bottom',
      withTotal: totalAt > pageAt,
      separator: separator || '/',
      prefix,
      start: 1,
      font: field.kind === 'field' ? field.font : p.font,
    };
  }
  return undefined;
}

function hasField(blocks: Block[], field: 'page' | 'pages'): boolean {
  return blocks.some((b) => (b.type === 'paragraph' ? b.inlines.some((i) => i.kind === 'field' && i.field === field)
    : b.type === 'table' ? b.rows.some((r) => r.cells.some((c) => hasField(c.blocks, field))) : false));
}

export function writeUdf(input: Doc): Uint8Array {
  const doc: Doc = {
    ...input,
    header: input.header ? { ...input.header, blocks: [...input.header.blocks] } : undefined,
    footer: input.footer ? { ...input.footer, blocks: [...input.footer.blocks] } : undefined,
  };
  // Word'deki "Sayfa X / Y" alanları UDF'nin kendi sayfa numarası özelliğine çevrilir; alanı taşıyan metin alt bilgiden çıkarılır.
  const hf = [...(doc.header?.blocks ?? []), ...(doc.footer?.blocks ?? [])];
  if (!doc.pageNumbers && hasField(hf, 'page')) {
    const extracted = extractPageNumbers(doc);
    if (extracted) doc.pageNumbers = extracted;
  }
  const pool = new Pool();
  const avail = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const parts: string[] = [];

  if (doc.header && doc.header.blocks.length) {
    const startPage = doc.header.startPage > 1 ? ` startPage="${doc.header.startPage}"` : '';
    parts.push(`<header background="-1" foreground="-16777216"${startPage}>${blocksXml(doc.header.blocks, pool, avail)}</header>`);
  }
  const body = doc.body.length ? doc.body : [emptyCellParagraph()];
  parts.push(blocksXml(body, pool, avail));
  if ((doc.footer && doc.footer.blocks.length) || doc.pageNumbers) {
    const pn = doc.pageNumbers;
    const pnAttrs = pn
      ? ` pageNumber-spec="BSP32_${2048 + 8 + (pn.align === 'left' ? 16 : pn.align === 'right' ? 64 : 32)}" pageNumber-seperator="${escapeXml(pn.withTotal ? pn.separator || '/' : '')}" pageNumber-fontFace="${escapeXml(pn.font.family)}" pageNumber-fontSize="${round(pn.font.size, 0)}" pageNumber-fontBold="${pn.font.bold}" pageNumber-fontItalic="${pn.font.italic}" pageNumber-color="${hexToArgb(pn.font.color ?? '#000000')}" pageNumber-foreStr="${escapeXml(pn.prefix)}" pageNumber-pageStartNumStr="${pn.start}"`
      : '';
    const footerBlocks = doc.footer?.blocks.length ? doc.footer.blocks : [emptyCellParagraph()];
    parts.push(`<footer background="-1" foreground="-16777216"${pnAttrs}>${blocksXml(footerBlocks, pool, avail)}</footer>`);
  }
  pool.add('\n');

  const landscape = doc.page.width > doc.page.height;
  const pw = landscape ? doc.page.height : doc.page.width;
  const ph = landscape ? doc.page.width : doc.page.height;
  const size = PAGE_SIZES.find(([, w, h]) => Math.abs(w - pw) < 3 && Math.abs(h - ph) < 3)?.[0] ?? '1';
  const m = doc.page.margins;

  let bg = '';
  if (doc.background) {
    const b = doc.background.margins;
    bg = `<bgImage bgImageSource="" bgImageData="${bytesToBase64(doc.background.image.bytes)}" bgImageBottomMargin="${round(b.bottom)}" bgImageUpMargin="${round(b.top)}" bgImageRigtMargin="${round(b.right)}" bgImageLeftMargin="${round(b.left)}" />`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<template format_id="1.8">
<content><![CDATA[${pool.text.replace(/]]>/g, ']]]]><![CDATA[>')}]]></content>
<properties><pageFormat mediaSizeName="${size}" leftMargin="${round(m.left, 4)}" rightMargin="${round(m.right, 4)}" topMargin="${round(m.top, 4)}" bottomMargin="${round(m.bottom, 4)}" paperOrientation="${landscape ? 0 : 1}" headerFOffset="${round(doc.page.headerOffset, 4)}" footerFOffset="${round(doc.page.footerOffset, 4)}" />${bg}</properties>
<elements resolver="hvl-default">
${parts.join('\n')}
</elements>
<styles><style name="default" description="Geçerli" family="Dialog" size="12" bold="false" italic="false" foreground="-13421773" FONT_ATTRIBUTE_KEY="javax.swing.plaf.FontUIResource[family=Dialog,name=Dialog,style=plain,size=12]" /><style name="hvl-default" family="Times New Roman" size="12" description="Gövde" /></styles>
</template>`;

  const problems = validateUdfXml(xml);
  if (problems.length) throw new ConvertError(`UDF dosyası oluşturulamadı: iç tutarlılık denetimi başarısız (${problems[0]}).`);
  return zip({ 'content.xml': xml });
}

/**
 * Üretilen content.xml'i denetler: metin havuzundaki her karakter (sondaki tek \n hariç) tam olarak bir öğe
 * tarafından kapsanmalı, aralıklar havuzun dışına taşmamalı, her paragraf \n ile bitmelidir.
 */
export function validateUdfXml(xml: string): string[] {
  const problems: string[] = [];
  const m = /<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>/.exec(xml);
  if (!m) return ['metin havuzu yok'];
  const text = m[1].replace(/\]\]\]\]><!\[CDATA\[>/g, ']]>');
  const covered = new Uint8Array(text.length);
  const re = /<(content|tab|image|space|field)\b[^>]*?startOffset="(\d+)" length="(\d+)"/g;
  let r: RegExpExecArray | null;
  while ((r = re.exec(xml))) {
    const s = Number(r[2]);
    const l = Number(r[3]);
    if (s + l > text.length) { problems.push(`aralık havuzun dışında (${s}+${l})`); break; }
    for (let i = s; i < s + l; i++) {
      if (covered[i]) { problems.push(`çakışan aralık (${i})`); break; }
      covered[i] = 1;
    }
  }
  for (let i = 0; i < text.length - 1; i++) if (!covered[i]) { problems.push(`kapsanmayan karakter (${i})`); break; }
  if (!text.endsWith('\n')) problems.push('havuz \\n ile bitmiyor');
  else if (covered[text.length - 1]) problems.push('sondaki \\n kapsanmamalı');
  return problems;
}
