import { getArticleImage } from '@/lib/services/images';

/** Makale görselleri. Kimlikler değişmediği için tarayıcı ve CDN'de süresiz önbelleğe alınır. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(id)) return new Response('Bulunamadı', { status: 404 });
  const image = await getArticleImage(id);
  if (!image) return new Response('Bulunamadı', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(new Uint8Array(image.data), {
    headers: {
      'Content-Type': image.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
