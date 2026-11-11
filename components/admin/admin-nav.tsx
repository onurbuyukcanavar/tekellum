'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/yonetim', label: 'Genel bakış', exact: true },
  { href: '/yonetim/makaleler', label: 'Makaleler' },
  { href: '/yonetim/mevzuat', label: 'Mevzuat' },
  { href: '/yonetim/resmi-gazete', label: 'Resmî Gazete' },
  { href: '/yonetim/mesajlar', label: 'Mesajlar' },
  { href: '/yonetim/hesap', label: 'Hesap' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Yönetim menüsü" className="flex gap-1 overflow-x-auto">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
              active ? 'border-bronze text-navy' : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
