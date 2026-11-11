'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/makaleler', label: 'Makaleler' },
  { href: '/mevzuat', label: 'Mevzuat' },
  { href: '/resmi-gazete', label: 'Resmî Gazete' },
  { href: '/iletisim', label: 'İletişim' },
];

export function NavLinks({ className = '', label = 'Ana menü' }: { className?: string; label?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className={`flex items-center gap-1 lg:gap-2 ${className}`}>
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
