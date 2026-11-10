import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/admin-nav';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { logoutAction } from '@/app/yonetim/actions';
import { requireAdmin } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: { default: 'Yönetim', template: '%s · Yönetim · Müessir' },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <>
      <header className="border-b border-line bg-paper-raised">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo compact />
            <span className="hidden rounded border border-line px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-bronze sm:inline">
              Yönetim
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="link-quiet hidden text-muted sm:inline" target="_blank">Siteyi görüntüle ↗</Link>
            <span className="hidden text-muted md:inline">{user.name || user.email}</span>
            <ThemeToggle />
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary !px-3 !py-1.5">Çıkış</button>
            </form>
          </div>
        </div>
        <div className="container-page"><AdminNav /></div>
      </header>
      <main className="container-page flex-1 py-10">{children}</main>
    </>
  );
}
