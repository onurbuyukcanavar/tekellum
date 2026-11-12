import 'server-only';
import { db } from '@/lib/db';

export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

/** Dosyanın gerçek türünü ilk baytlarından belirler (uzantıya ya da beyan edilen türe güvenilmez). */
export function sniffImageMime(b: Uint8Array): ImageMime | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

export async function saveArticleImage(bytes: Uint8Array, width: number, height: number) {
  const mime = sniffImageMime(bytes);
  if (!mime) throw new Error('Desteklenmeyen görsel türü. JPEG, PNG, WebP ya da GIF yükleyin.');
  if (bytes.length > IMAGE_MAX_BYTES) throw new Error('Görsel en fazla 4 MB olabilir.');
  const w = Math.round(width), h = Math.round(height);
  if (!(w > 0 && w <= 10000 && h > 0 && h <= 10000)) throw new Error('Görsel boyutları okunamadı.');
  const row = await db.articleImage.create({ data: { mime, width: w, height: h, size: bytes.length, data: Buffer.from(bytes) }, select: { id: true } });
  return { id: row.id, src: `/gorsel/${row.id}`, width: w, height: h };
}

export function getArticleImage(id: string) {
  return db.articleImage.findUnique({ where: { id }, select: { mime: true, data: true } });
}
