'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/makaleler', label: 'Makaleler' },
  { href: '/mevzuat', label: 'Mevzuat' },
  { href: '/iletisim', label: 'İletişim' },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Ana menü" className="flex items-center sm:gap-2">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-md px-1 py-1.5 min-[400px]:px-1.5 text-[0.8125rem] font-medium max-[359px]:text-xs sm:px-2.5 sm:text-sm transition ${
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
