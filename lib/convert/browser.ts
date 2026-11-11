/**
 * Tarayıcı ortamı: yazı tiplerini /fonts'tan, pdf.js'i (eski tarayıcılarla uyumlu "legacy" derleme) ve
 * işçisini /vendor'dan yükler; görselleri tuval üzerinden normalleştirir. Dosyalar hiçbir sunucuya gönderilmez.
 */
import { ConvertError } from './model';
import type { PdfJs } from './pdf-read';
import type { PageImage } from './pdf-tools';
import type { ConvertEnv } from './pipelines';

const PDFJS_VERSION = '6.5.438';
const fontCache = new Map<string, Promise<Uint8Array>>();

export const browserEnv: ConvertEnv = {
  fonts: (file) => {
    if (!fontCache.has(file)) {
      fontCache.set(file, fetch(`/fonts/${file}`).then(async (r) => {
        if (!r.ok) throw new ConvertError('Yazı tipi yüklenemedi; internet bağlantınızı kontrol edip tekrar deneyin.');
        return new Uint8Array(await r.arrayBuffer());
      }).catch((e) => {
        fontCache.delete(file);
        throw e;
      }));
    }
    return fontCache.get(file)!;
  },
  pdfjs: async () => {
    const lib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    lib.GlobalWorkerOptions.workerSrc = `/vendor/pdf.worker.min.mjs?v=${PDFJS_VERSION}`;
    return lib as unknown as PdfJs;
  },
};

const MAX_SIDE = 3000;

/** Görseli (EXIF yönü uygulanmış, en uzun kenarı en çok 3000 px) JPEG/PNG'ye çevirir. */
export async function normalizeImage(file: File): Promise<PageImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    const heic = /\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type);
    throw new ConvertError(heic
      ? `"${file.name}" HEIC biçiminde ve bu tarayıcı bu biçimi açamıyor. iPhone'da fotoğrafı "Paylaş → Kopyala" ile ya da Ayarlar → Kamera → Biçimler → "En Uyumlu" seçeneğiyle JPEG olarak kullanabilirsiniz.`
      : `"${file.name}" bir görsel olarak açılamadı.`);
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ConvertError('Tarayıcınız görsel işlemeyi desteklemiyor.');
  const png = file.type === 'image/png';
  if (!png) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, png ? 'image/png' : 'image/jpeg', 0.9));
  if (!blob) throw new ConvertError(`"${file.name}" işlenemedi.`);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: png ? 'image/png' : 'image/jpeg', width: w, height: h };
}

export async function zipOutputs(files: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  const { zipSync } = await import('fflate');
  const used = new Set<string>();
  const input: Record<string, Uint8Array> = {};
  for (const f of files) {
    let name = f.name;
    for (let i = 2; used.has(name); i++) name = f.name.replace(/(\.[^.]+)$/, ` (${i})$1`);
    used.add(name);
    input[name] = f.bytes;
  }
  return zipSync(input, { level: 0 });
}
