import Link from 'next/link';
import { SITE_NAME } from '@/lib/constants';
import { CONTACT } from '@/lib/contact';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page flex flex-col gap-6 py-10 text-sm text-muted sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md space-y-2">
          <p className="font-serif text-base tracking-[0.22em] text-navy">{SITE_NAME.toLocaleUpperCase('tr')}</p>
          <p>
            Bu sitedeki yazılar genel bilgilendirme ve düşünce paylaşımı amacı taşır; somut olaylara ilişkin hukuki
            danışmanlık yerine geçmez.
          </p>
          <p className="pt-2 text-ink-soft">
            {CONTACT.name} ·{' '}
            <a className="link-quiet" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> ·{' '}
            <a className="link-quiet" href={CONTACT.linkedin.url} target="_blank" rel="noopener noreferrer me">LinkedIn</a>
          </p>
        </div>
        <nav aria-label="Alt menü" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link className="link-quiet" href="/makaleler">Makaleler</Link>
          <Link className="link-quiet" href="/mevzuat">Mevzuat</Link>
          <Link className="link-quiet" href="/resmi-gazete">Resmî Gazete</Link>
          <Link className="link-quiet" href="/donusturucu">Dönüştürücü</Link>
          <Link className="link-quiet" href="/iletisim">İletişim</Link>
        </nav>
      </div>
      <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-8 text-xs text-muted">
        <span>© {new Date().getFullYear()} {SITE_NAME}</span>
        <Link className="link-quiet" href="/gizlilik">Gizlilik ve Çerezler</Link>
      </div>
    </footer>
  );
}
