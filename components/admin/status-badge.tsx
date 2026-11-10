export function ArticleStatusBadge({ status }: { status: 'TASLAK' | 'YAYINDA' }) {
  return status === 'YAYINDA'
    ? <span className="badge border-ok-ink/25 bg-ok-bg text-ok-ink">Yayında</span>
    : <span className="badge border-line-strong text-muted">Taslak</span>;
}
