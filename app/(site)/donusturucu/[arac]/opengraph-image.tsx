import { OG_CONTENT_TYPE, OG_SIZE, renderCard } from '@/lib/og/card';
import { getTool, TOOLS } from '@/lib/convert/tools';

export const alt = 'Belge dönüştürücü';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ arac: t.id }));
}

export default async function Image({ params }: { params: Promise<{ arac: string }> }) {
  const tool = getTool((await params).arac);
  return renderCard({
    eyebrow: 'Belge Dönüştürücü',
    title: tool?.title ?? 'Belge Dönüştürücü',
    subtitle: tool?.description,
    meta: 'Ücretsiz · Dosyalar cihazınızdan çıkmaz',
  });
}
