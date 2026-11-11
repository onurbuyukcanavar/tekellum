/** Görsellerden PDF oluşturma ve PDF birleştirme (pdf-lib). */
import { PDFDocument } from 'pdf-lib';
import { A4, ConvertError, type ImageData } from './model';

export type PageImage = ImageData & { width: number; height: number };

/** Her görsel bir A4 sayfasına (yönü görsele göre seçilerek) kenar boşluklu ve oranı korunarak yerleştirilir. */
export async function imagesToPdf(images: PageImage[], opts: { margin?: number; title?: string } = {}): Promise<Uint8Array> {
  if (!images.length) throw new ConvertError('Dönüştürülecek görsel yok.');
  const margin = opts.margin ?? 20;
  const pdf = await PDFDocument.create();
  pdf.setProducer('Tekellüm Dönüştürücü');
  if (opts.title) pdf.setTitle(opts.title);
  for (const img of images) {
    const embedded = img.mime === 'image/png' ? await pdf.embedPng(img.bytes) : await pdf.embedJpg(img.bytes);
    const landscape = img.width > img.height * 1.05;
    const [pw, ph] = landscape ? [A4.height, A4.width] : [A4.width, A4.height];
    const page = pdf.addPage([pw, ph]);
    const scale = Math.min((pw - 2 * margin) / embedded.width, (ph - 2 * margin) / embedded.height, 1e9);
    const w = embedded.width * scale;
    const h = embedded.height * scale;
    page.drawImage(embedded, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  }
  return pdf.save({ useObjectStreams: true });
}

/** PDF'leri verilen sırayla tek dosyada birleştirir. */
export async function mergePdfs(files: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  if (files.length < 2) throw new ConvertError('Birleştirmek için en az iki PDF seçin.');
  const out = await PDFDocument.create();
  out.setProducer('Tekellüm Dönüştürücü');
  for (const f of files) {
    let src: PDFDocument;
    try {
      src = await PDFDocument.load(f.bytes, { ignoreEncryption: true, updateMetadata: false });
    } catch {
      throw new ConvertError(`"${f.name}" açılamadı: dosya bozuk ya da PDF değil.`);
    }
    if (src.isEncrypted) throw new ConvertError(`"${f.name}" parola korumalı olduğu için birleştirilemiyor.`);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save({ useObjectStreams: true });
}
