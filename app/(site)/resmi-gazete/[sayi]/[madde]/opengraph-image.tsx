import { formatGazetteDate } from '@/lib/gazette/format';
import { OG_CONTENT_TYPE, OG_SIZE, renderCard } from '@/lib/og/card';
import { getItem } from '@/lib/services/gazette';

export const alt = 'Resmî Gazete';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ sayi: string; madde: string }> }) {
  const { sayi, madde } = await params;
  const item = await getItem(sayi, madde);
  if (!item) return renderCard({ eyebrow: 'Resmî Gazete', title: 'Günlük Resmî Gazete' });
  return renderCard({
    eyebrow: item.category || 'Resmî Gazete',
    title: item.title,
    meta: `Resmî Gazete · ${formatGazetteDate(item.dateKey, false)} · Sayı ${item.issue.number}`,
  });
}
