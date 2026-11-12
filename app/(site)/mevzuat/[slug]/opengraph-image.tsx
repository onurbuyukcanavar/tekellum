import { SITE_NAME } from '@/lib/constants';
import { OG_CONTENT_TYPE, OG_SIZE, renderCard } from '@/lib/og/card';
import { getLawBySlug } from '@/lib/services/laws';

export const alt = `${SITE_NAME} mevzuat kütüphanesi`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const law = await getLawBySlug(slug);
  if (!law) return renderCard({ eyebrow: 'Mevzuat', title: 'Mevzuat kütüphanesi' });
  return renderCard({
    eyebrow: 'Mevzuat',
    title: law.title,
    subtitle: [law.lawNumber ? `${law.lawNumber} sayılı kanun` : null, law.shortName || null].filter(Boolean).join(' · ') || undefined,
    // Yalnızca doğrulanmış ve metni yayımlanmış kanunlarda "doğrulanmış" denir.
    meta: law.published ? 'Resmî kaynakla doğrulanmış güncel metin' : 'Mevzuat kütüphanesi',
  });
}
