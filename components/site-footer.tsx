import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page flex flex-col gap-6 py-10 text-sm text-muted sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md space-y-2">
          <p className="font-serif text-base tracking-[0.22em] text-navy">MÜESSİR</p>
          <p>
            Bu sitedeki yazılar genel bilgilendirme ve düşünce paylaşımı amacı taşır; somut olaylara ilişkin hukuki
            danışmanlık yerine geçmez.
          </p>
        </div>
        <nav aria-label="Alt menü" className="flex gap-5">
          <Link className="link-quiet" href="/makaleler">Makaleler</Link>
          <Link className="link-quiet" href="/mevzuat">Mevzuat</Link>
          <Link className="link-quiet" href="/yonetim" rel="nofollow">Yönetim</Link>
        </nav>
      </div>
      <div className="container-page pb-8 text-xs text-muted">© {new Date().getFullYear()} Müessir</div>
    </footer>
  );
}
