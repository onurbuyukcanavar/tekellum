/**
 * Araç → okuyucu/yazıcı eşlemesi. Ortamdan bağımsızdır: yazı tipi ve pdf.js yükleyicisi dışarıdan verilir
 * (tarayıcıda fetch/worker, testlerde dosya sistemi).
 */
import { readDocx } from './docx-read';
import { writeDocx } from './docx-write';
import { ConvertError, type Doc } from './model';
import { readPdf, type PdfJs } from './pdf-read';
import { imagesToPdf, mergePdfs, type PageImage } from './pdf-tools';
import { writePdf, type FontLoader } from './pdf-write';
import { getTool, type ToolId } from './tools';
import { readUdf } from './udf-read';
import { writeUdf } from './udf-write';

export type ConvertEnv = { fonts: FontLoader; pdfjs: () => Promise<PdfJs> };
export type InputFile = { name: string; bytes: Uint8Array };
export type OutputFile = { name: string; bytes: Uint8Array; notes: string[] };

export function baseName(name: string): string {
  const clean = name.replace(/^.*[\\/]/, '');
  const dot = clean.lastIndexOf('.');
  return (dot > 0 ? clean.slice(0, dot) : clean) || 'belge';
}

function extensionOk(name: string, accept: string[]): boolean {
  const lower = name.toLowerCase();
  return accept.some((ext) => lower.endsWith(ext));
}

async function readInput(tool: ToolId, file: InputFile, env: ConvertEnv): Promise<{ doc: Doc; notes: string[] }> {
  switch (tool) {
    case 'udf-pdf':
    case 'udf-word': {
      const { doc, info } = readUdf(file.bytes);
      const notes = [...doc.notes];
      if (info.signed) notes.push('Belgedeki e-imza dönüştürülen dosyaya taşınamaz; resmî işlemlerde UYAP\'taki imzalı asıl belge esastır.');
      return { doc, notes };
    }
    case 'word-pdf':
    case 'word-udf': {
      const doc = readDocx(file.bytes);
      return { doc, notes: doc.notes };
    }
    case 'pdf-word':
    case 'pdf-udf': {
      const doc = await readPdf(file.bytes, await env.pdfjs());
      return { doc, notes: doc.notes };
    }
    default:
      throw new ConvertError('Bu araç tek dosya dönüştürmesi yapmaz.');
  }
}

/** Tek dosyayı seçilen araçla dönüştürür. */
export async function convertFile(tool: ToolId, file: InputFile, env: ConvertEnv): Promise<OutputFile> {
  const def = getTool(tool);
  if (!def || def.combine) throw new ConvertError('Geçersiz dönüştürücü.');
  if (!extensionOk(file.name, def.accept)) {
    throw new ConvertError(`"${file.name}" bu araç için uygun değil. Beklenen dosya türü: ${def.accept.join(', ')}`);
  }
  const { doc, notes } = await readInput(tool, file, env);
  const title = baseName(file.name);
  let bytes: Uint8Array;
  switch (def.output) {
    case 'pdf':
      bytes = await writePdf(doc, { title, fonts: env.fonts });
      break;
    case 'docx':
      bytes = await writeDocx(doc, { title });
      break;
    case 'udf':
      bytes = writeUdf(doc);
      break;
  }
  return { name: `${title}.${def.output}`, bytes, notes };
}

/** Birden çok girdiden tek çıktı üreten araçlar (görsel → PDF, PDF birleştirme). */
export async function combineFiles(tool: ToolId, files: InputFile[], images: PageImage[] | null, outName: string): Promise<OutputFile> {
  if (tool === 'pdf-birlestir') return { name: `${outName}.pdf`, bytes: await mergePdfs(files), notes: [] };
  if (tool === 'gorsel-pdf') {
    if (!images) throw new ConvertError('Görseller hazırlanamadı.');
    return { name: `${outName}.pdf`, bytes: await imagesToPdf(images, { title: outName }), notes: [] };
  }
  throw new ConvertError('Geçersiz dönüştürücü.');
}
