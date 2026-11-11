import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { zipSync, strToU8, unzipSync, strFromU8 } from 'fflate';
import { readUdf, parseTabSet } from '@/lib/convert/udf-read';
import { writeUdf, validateUdfXml } from '@/lib/convert/udf-write';
import { readDocx } from '@/lib/convert/docx-read';
import { writeDocx } from '@/lib/convert/docx-write';
import { writePdf } from '@/lib/convert/pdf-write';
import { readPdf, type PdfJs } from '@/lib/convert/pdf-read';
import { imagesToPdf, mergePdfs } from '@/lib/convert/pdf-tools';
import { plainText, type Paragraph } from '@/lib/convert/model';
import { convertFile } from '@/lib/convert/pipelines';
import { TOOLS } from '@/lib/convert/tools';

const fonts = async (file: string) => new Uint8Array(readFileSync(`public/fonts/${file}`));
const pdfjs = async () => (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJs;
const env = { fonts, pdfjs };

/** UYAP Doküman Editörü'nün yapısını taklit eden yapay bir UDF (gerçek belge içermez). */
function syntheticUdf() {
  const header = 'Sayfa başlığı\n';
  const p1 = 'İSTANBUL ( ) ASLİYE HUKUK MAHKEMESİ\n';
  const p2 = 'DAVACI\t: Ayşe ÖRNEK\n';
  const p3 = 'Uzun açıklama metni şöyle devam eder ve iki yana yaslanır.\n';
  const text = header + p1 + p2 + p3 + '\n';
  let off = 0;
  const range = (s: string) => {
    const r = `startOffset="${off}" length="${s.length}"`;
    off += s.length;
    return r;
  };
  const h = range(header);
  const a = range(p1);
  const b1 = range('DAVACI');
  const b2 = range('\t');
  const b3 = range(': Ayşe ÖRNEK\n');
  const c = range(p3);
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<template format_id="1.8"><content><![CDATA[${text}]]></content>
<properties><pageFormat mediaSizeName="1" leftMargin="70.0" rightMargin="70.0" topMargin="40.0" bottomMargin="40.0" paperOrientation="1" headerFOffset="20.0" footerFOffset="20.0" /></properties>
<elements resolver="hvl-default">
<header startPage="2"><paragraph Alignment="1"><content ${h} /></paragraph></header>
<paragraph Alignment="1" resolver="hvl-default"><content bold="true" family="Times New Roman" size="12" ${a} /></paragraph>
<paragraph Alignment="0" TabSet="120.0:0:0" resolver="hvl-default"><content bold="true" ${b1} /><tab ${b2} /><content ${b3} /></paragraph>
<paragraph Alignment="3" FirstLineIndent="35.0" Hanging="0.0" resolver="hvl-default"><content italic="true" ${c} /></paragraph>
<footer pageNumber-spec="BSP32_2088" pageNumber-seperator="/"></footer>
</elements>
<styles><style name="default" description="Geçerli" family="Dialog" size="12" bold="false" italic="false" FONT_ATTRIBUTE_KEY="javax.swing.plaf.FontUIResource[family=Dialog,name=Dialog,style=plain,size=12]" foreground="-13421773" /><style name="hvl-default" family="Times New Roman" size="12" description="Gövde" /></styles>
</template>`;
  return zipSync({ 'content.xml': strToU8(xml) });
}

describe('UDF okuma', () => {
  it('metni, hizalamayı, sekmeleri ve sayfa numarasını çözer', () => {
    const { doc } = readUdf(syntheticUdf());
    const paras = doc.body.filter((b): b is Paragraph => b.type === 'paragraph');
    expect(plainText(doc.body)).toContain('İSTANBUL ( ) ASLİYE HUKUK MAHKEMESİ');
    expect(paras[0].align).toBe('center');
    expect(paras[0].font.bold).toBe(true);
    expect(paras[1].tabs[0]).toMatchObject({ pos: 120, align: 'left' });
    expect(paras[2].align).toBe('justify');
    expect(paras[2].firstLine).toBeCloseTo(35);
    expect(doc.header?.startPage).toBe(2);
    expect(doc.pageNumbers).toMatchObject({ align: 'center', position: 'bottom', withTotal: true, separator: '/' });
    expect(doc.page.margins.left).toBeCloseTo(70);
  });

  it('Swing sekme kodlarını doğru eşler (1 sağ, 2 orta)', () => {
    expect(parseTabSet('100:1:0,200:2:1').map((t) => [t.align, t.leader])).toEqual([['right', 'none'], ['center', 'dot']]);
  });

  it('UDF olmayan dosyayı anlaşılır bir hatayla reddeder', () => {
    expect(() => readUdf(strToU8('düz metin'))).toThrow(/UDF/);
  });
});

describe('UDF yazma', () => {
  it('geçerli, metni koruyan bir UDF üretir (gidiş-dönüş)', () => {
    const { doc } = readUdf(syntheticUdf());
    const out = writeUdf(doc);
    const xml = strFromU8(unzipSync(out)['content.xml']);
    expect(() => validateUdfXml(xml)).not.toThrow();
    const again = readUdf(out).doc;
    expect(plainText(again.body)).toBe(plainText(doc.body));
    expect(again.pageNumbers?.withTotal).toBe(true);
  });
});

describe('Word', () => {
  const docx = new Uint8Array(readFileSync('tests/fixtures/ornek-dilekce.docx'));

  it('.docx dilekçeyi okur (başlık, tablo, görsel, sayfa alanları)', () => {
    const doc = readDocx(docx);
    const text = plainText(doc.body);
    expect(text.length).toBeGreaterThan(200);
    expect(doc.body.some((b) => b.type === 'table')).toBe(true);
    expect(doc.header || doc.footer).toBeTruthy();
  });

  it('eski .doc dosyasını Türkçe bir mesajla reddeder', () => {
    expect(() => readDocx(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]))).toThrow(/\.docx/);
  });

  it('Word → UDF → Word metni korur', async () => {
    const doc = readDocx(docx);
    const udf = writeUdf(doc);
    const back = readDocx(await writeDocx(readUdf(udf).doc));
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    expect(norm(plainText(back.body))).toBe(norm(plainText(doc.body)));
  });
});

describe('PDF', () => {
  it('UDF → PDF metni okunabilir bir PDF üretir ve PDF geri okunabilir', async () => {
    const out = await convertFile('udf-pdf', { name: 'dilekce.udf', bytes: syntheticUdf() }, env);
    expect(out.name).toBe('dilekce.pdf');
    expect(strFromU8(out.bytes.slice(0, 5))).toBe('%PDF-');
    const doc = await readPdf(out.bytes, await pdfjs());
    const text = plainText(doc.body);
    expect(text).toContain('ASLİYE HUKUK MAHKEMESİ');
    expect(text).toContain('Ayşe ÖRNEK');
  });

  it('Word → PDF çok sayfalı belgede sayfa numaralarını basar', async () => {
    const doc = readDocx(new Uint8Array(readFileSync('tests/fixtures/ornek-dilekce.docx')));
    const pdf = await writePdf(doc, { fonts });
    const lib = await pdfjs();
    const loaded = await lib.getDocument({ data: pdf.slice() }).promise;
    expect(loaded.numPages).toBeGreaterThanOrEqual(2);
  });

  it('görselleri ve PDF\'leri birleştirir', async () => {
    // 1x1 PNG
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
    const a = await imagesToPdf([{ bytes: png, mime: 'image/png', width: 400, height: 300 }], {});
    const b = await imagesToPdf([{ bytes: png, mime: 'image/png', width: 300, height: 400 }], {});
    const merged = await mergePdfs([{ name: 'a.pdf', bytes: a }, { name: 'b.pdf', bytes: b }]);
    const loaded = await (await pdfjs()).getDocument({ data: merged.slice() }).promise;
    expect(loaded.numPages).toBe(2);
  });
});

describe('Araç tanımları', () => {
  it('her aracın benzersiz adresi ve kabul ettiği uzantı vardır', () => {
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
    for (const t of TOOLS) expect(t.accept.length).toBeGreaterThan(0);
  });

  it('tarayıcıya kopyalanan pdf.js çalışanı paketle aynı sürümde', () => {
    const pkg = JSON.parse(readFileSync('node_modules/pdfjs-dist/package.json', 'utf8')) as { version: string };
    const browser = readFileSync('lib/convert/browser.ts', 'utf8');
    expect(browser).toContain(`PDFJS_VERSION = '${pkg.version}'`);
    const worker = readFileSync('public/vendor/pdf.worker.min.mjs', 'utf8');
    expect(worker).toContain(pkg.version);
  });
});
