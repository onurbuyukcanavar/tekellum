import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#icerik" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-navy focus:px-3 focus:py-2 focus:text-paper">
        İçeriğe geç
      </a>
      <SiteHeader />
      <main id="icerik" className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
