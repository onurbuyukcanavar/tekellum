'use client';

import { uploadArticleImageAction } from '@/app/yonetim/actions';

const MAX_SIDE = 1600;

async function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Görseli makale için hazırlar: uzun kenarı en fazla 1600 px, telefon fotoğraflarının yönü düzeltilir.
 * Küçük PNG/GIF'ler (ekran görüntüsü, hareketli görsel) olduğu gibi bırakılır.
 */
export async function prepareImage(input: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const type = input.type.toLowerCase();
  if (/hei[cf]/.test(type)) throw new Error('HEIC biçimi tarayıcıda açılamıyor; fotoğrafı JPEG olarak paylaşıp tekrar deneyin.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(input, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Görsel okunamadı. JPEG, PNG, WebP ya da GIF deneyin.');
  }
  const { width, height } = bitmap;
  const keep = (type === 'image/gif' && input.size <= 4 * 1024 * 1024)
    || ((type === 'image/png' || type === 'image/webp' || type === 'image/jpeg') && input.size <= 600 * 1024 && Math.max(width, height) <= MAX_SIDE);
  if (keep) { bitmap.close(); return { blob: input, width, height }; }

  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  let blob = await toBlob(canvas, 'image/webp', 0.86);
  if (!blob || blob.type !== 'image/webp') {
    // WebP kodlayamayan tarayıcılarda saydam alanlar beyaza boyanıp JPEG yapılır.
    const flat = document.createElement('canvas');
    flat.width = w; flat.height = h;
    const fctx = flat.getContext('2d')!;
    fctx.fillStyle = '#ffffff';
    fctx.fillRect(0, 0, w, h);
    fctx.drawImage(canvas, 0, 0);
    blob = await toBlob(flat, 'image/jpeg', 0.88);
  }
  if (!blob) throw new Error('Görsel işlenemedi.');
  return { blob, width: w, height: h };
}

export async function uploadImage(input: Blob): Promise<{ src: string; width: number; height: number }> {
  const { blob, width, height } = await prepareImage(input);
  const fd = new FormData();
  fd.set('file', new File([blob], 'gorsel', { type: blob.type }));
  fd.set('width', String(width));
  fd.set('height', String(height));
  const res = await uploadArticleImageAction(fd);
  if (!res.ok) throw new Error(res.error);
  return { src: res.src, width: res.width, height: res.height };
}
