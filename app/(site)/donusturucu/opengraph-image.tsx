import { OG_CONTENT_TYPE, OG_SIZE, renderCard } from '@/lib/og/card';

export const alt = 'Belge dönüştürücü';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderCard({
    eyebrow: 'Belge Dönüştürücü',
    title: 'UDF, Word ve PDF dönüştürücü',
    subtitle: 'UYAP UDF → PDF/Word, Word ↔ PDF, görselden PDF, PDF birleştirme.',
    meta: 'Ücretsiz · Dosyalar cihazınızdan çıkmaz',
  });
}
