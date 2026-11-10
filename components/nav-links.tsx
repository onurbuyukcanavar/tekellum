'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/makaleler', label: 'Makaleler' },
  { href: '/mevzuat', label: 'Mevzuat' },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Ana menü" className="flex items-center gap-1 sm:gap-2">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
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
