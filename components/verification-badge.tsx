import { formatDate } from '@/lib/format';

export function VerificationBadge({ status, verifiedAt }: { status: 'DOGRULANDI' | 'DOGRULANMAYI_BEKLIYOR'; verifiedAt: Date | null }) {
  if (status === 'DOGRULANDI') {
    return (
      <span className="badge border-ok-ink/25 bg-ok-bg text-ok-ink">
        Doğrulandı{verifiedAt ? ` · ${formatDate(verifiedAt)}` : ''}
      </span>
    );
  }
  return <span className="badge border-warn-ink/25 bg-warn-bg text-warn-ink">Doğrulanmayı bekliyor</span>;
}
