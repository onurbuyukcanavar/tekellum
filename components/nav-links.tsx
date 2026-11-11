'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const LINKS = [
  { href: '/makaleler', label: 'Makaleler' },
  { href: '/mevzuat', label: 'Mevzuat' },
  { href: '/resmi-gazete', label: 'Resmî Gazete' },
  { href: '/donusturucu', label: 'Dönüştürücü' },
  { href: '/iletisim', label: 'İletişim' },
];

export function NavLinks({ className = '', label = 'Ana menü' }: { className?: string; label?: string }) {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  // Dar ekranda menü yatay kaydırılır; bulunulan bölümün bağlantısı görünür alana getirilir.
  useEffect(() => {
    const scroller = ref.current?.parentElement;
    const active = ref.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!scroller || !active || scroller.scrollWidth <= scroller.clientWidth) return;
    const left = active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left) });
  }, [pathname]);

  return (
    <nav ref={ref} aria-label={label} className={`flex items-center gap-1 lg:gap-2 ${className}`}>
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
              active ? 'text-bronze' : 'text-ink-soft hover:text-navy'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
