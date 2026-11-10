import { renderLawHtml } from '@/lib/law-render';
import { parseLawText } from '@/lib/law-text';
import { getPublishedLawContent } from '@/lib/services/laws';

export const dynamic = 'force-dynamic';

/**
 * Kanun metninin HTML parçası. Sayfa bu adresi metnin sürümüyle (?v=updatedAt) çağırır; sürüm güncelse
 * yanıt CDN'de kalıcı olarak önbelleğe alınır, metin değişince adres de değişir.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const law = await getPublishedLawContent(slug);
  if (!law) {
    return new Response('Bu kanunun doğrulanmış metni bulunmuyor.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  const requested = new URL(request.url).searchParams.get('v');
  const html = renderLawHtml(parseLawText(law.content));
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': requested === law.version ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
