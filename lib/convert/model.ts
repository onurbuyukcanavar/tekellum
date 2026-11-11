/**
 * Dönüştürücülerin ortak belge modeli. Her okuyucu (UDF, Word, PDF) bu modeli üretir,
 * her yazıcı (PDF, Word, UDF) bu modelden çıktı üretir. Tüm ölçüler punto (pt) cinsindendir.
 */

export type Align = 'left' | 'center' | 'right' | 'justify';

export type FontSpec = {
  family: string;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  /** #rrggbb; yoksa siyah */
  color?: string;
  /** #rrggbb vurgulama / arka plan */
  background?: string;
  vertical?: 'super' | 'sub';
};

export type TabStop = {
  pos: number;
  align: 'left' | 'center' | 'right' | 'decimal';
  leader: 'none' | 'dot' | 'hyphen' | 'underscore';
};

export type ImageData = { bytes: Uint8Array; mime: 'image/png' | 'image/jpeg' };

export type Inline =
  | { kind: 'text'; text: string; font: FontSpec }
  | { kind: 'tab'; font: FontSpec }
  | { kind: 'break'; font: FontSpec }
  | { kind: 'image'; image: ImageData; width: number; height: number }
  | { kind: 'field'; field: 'page' | 'pages'; font: FontSpec };

export type ListLabel = { text: string; font: FontSpec };

export type Paragraph = {
  type: 'paragraph';
  align: Align;
  /** Sol girinti (ilk satır dışındaki satırlar buradan başlar) */
  indentLeft: number;
  indentRight: number;
  /** İlk satırın indentLeft'e göre kayması; negatifse asılı girinti */
  firstLine: number;
  spaceBefore: number;
  spaceAfter: number;
  /** Satır yüksekliği çarpanı (1 = tek satır) */
  lineHeight: number;
  /** Varsa satır yüksekliği bu değerde sabittir (pt) */
  lineExact?: number;
  tabs: TabStop[];
  /** Madde işareti veya numara; satırın başına yazılır */
  list?: ListLabel;
  pageBreakBefore?: boolean;
  /** Boş paragrafın yüksekliği ve madde etiketi için varsayılan yazı */
  font: FontSpec;
  inlines: Inline[];
};

export type Border = { width: number; color: string; style: 'solid' | 'dashed' | 'dotted' | 'double' };

export type Cell = {
  blocks: Block[];
  colSpan: number;
  /** Word'deki dikey birleştirmenin devam hücresi: içerik yok, üst kenarlık çizilmez */
  mergedAbove?: boolean;
  borders: { top: Border | null; right: Border | null; bottom: Border | null; left: Border | null };
  fill?: string;
  vAlign: 'top' | 'middle' | 'bottom';
};

export type Row = { cells: Cell[]; height?: number; exactHeight?: boolean };

export type Table = {
  type: 'table';
  /** Sütun genişlikleri; oransal kullanılır, toplamı sayfa genişliğini aşarsa ölçeklenir */
  columns: number[];
  rows: Row[];
  indentLeft: number;
  align: 'left' | 'center' | 'right';
  /** true ise sütunlar metin genişliğini doldurur */
  fullWidth: boolean;
};

export type PageBreak = { type: 'pageBreak' };

export type Block = Paragraph | Table | PageBreak;

export type PageSetup = {
  width: number;
  height: number;
  margins: { top: number; right: number; bottom: number; left: number };
  /** Üst bilginin sayfanın üst kenarına uzaklığı */
  headerOffset: number;
  /** Alt bilginin sayfanın alt kenarına uzaklığı */
  footerOffset: number;
};

export type HeaderFooter = { blocks: Block[]; startPage: number };

export type PageNumbering = {
  align: 'left' | 'center' | 'right';
  position: 'top' | 'bottom';
  /** true: "1/3" biçimi; false: yalnızca "1" */
  withTotal: boolean;
  separator: string;
  prefix: string;
  start: number;
  font: FontSpec;
};

export type Background = { image: ImageData; margins: { top: number; right: number; bottom: number; left: number } };

export type Doc = {
  page: PageSetup;
  header?: HeaderFooter;
  footer?: HeaderFooter;
  pageNumbers?: PageNumbering;
  background?: Background;
  body: Block[];
  /** Dönüştürme sırasında kullanıcıya gösterilecek notlar (ör. desteklenmeyen öğe atlandı) */
  notes: string[];
};

export const A4 = { width: 595.28, height: 841.89 };

export function defaultFont(over: Partial<FontSpec> = {}): FontSpec {
  return { family: 'Times New Roman', size: 12, bold: false, italic: false, underline: false, strike: false, ...over };
}

export function emptyParagraph(over: Partial<Paragraph> = {}): Paragraph {
  return {
    type: 'paragraph', align: 'left', indentLeft: 0, indentRight: 0, firstLine: 0, spaceBefore: 0, spaceAfter: 0,
    lineHeight: 1, tabs: [], font: defaultFont(), inlines: [], ...over,
  };
}

export function defaultPage(): PageSetup {
  return { ...A4, margins: { top: 70.87, right: 70.87, bottom: 70.87, left: 70.87 }, headerOffset: 20, footerOffset: 20 };
}

/** Modelin düz metni (doğrulama ve testler için). Paragraflar \n ile, tablo hücreleri \t ile ayrılır. */
export function plainText(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === 'paragraph') {
      out.push((b.list ? `${b.list.text} ` : '') + b.inlines.map((i) => (i.kind === 'text' ? i.text : i.kind === 'tab' ? '\t' : i.kind === 'break' ? '\n' : '')).join(''));
    } else if (b.type === 'table') {
      for (const r of b.rows) out.push(r.cells.map((c) => plainText(c.blocks)).join('\t'));
    }
  }
  return out.join('\n');
}

/** Dosya türünü içeriğinden tanır (uzantıya güvenmeden). */
export function sniffImage(bytes: Uint8Array): ImageData['mime'] | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  return null;
}

export class ConvertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConvertError';
  }
}
