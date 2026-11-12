import { OG_CONTENT_TYPE, OG_SIZE, renderCard } from '@/lib/og/card';
import { SITE_NAME } from '@/lib/constants';

export const alt = `${SITE_NAME} — Gelenek, Usul ve Gelecek`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderCard({
    eyebrow: 'Hukuk · Düşünce · Metin',
    title: 'Gelenek, Usul ve',
    italicTail: 'Gelecek',
    subtitle: 'Makaleler, mevzuat kütüphanesi, günlük Resmî Gazete ve belge dönüştürücü.',
    meta: 'Bağımsız hukuk ve düşünce yayını',
  });
}
