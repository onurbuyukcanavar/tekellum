import { formatGazetteDate, supplementLabel } from '@/lib/gazette/format';
import { parseIssueSlug } from '@/lib/gazette/source';
import { OG_CONTENT_TYPE, OG_SIZE, renderCard } from '@/lib/og/card';
import { getIssue } from '@/lib/services/gazette';

export const alt = 'Resmî Gazete';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ sayi: string }> }) {
  const { sayi } = await params;
  const ref = parseIssueSlug(sayi);
  const issue = ref ? await getIssue(sayi) : null;
  if (!ref || !issue) return renderCard({ eyebrow: 'Resmî Gazete', title: 'Günlük Resmî Gazete' });
  return renderCard({
    eyebrow: 'Resmî Gazete',
    title: `${formatGazetteDate(ref.date)}${ref.supplement ? ` · ${supplementLabel(ref.supplement)}` : ''}`,
    subtitle: issue.items.slice(0, 2).map((i) => i.title).join(' · '),
    meta: `Sayı ${issue.number} · ${issue.items.length} başlık`,
  });
}
