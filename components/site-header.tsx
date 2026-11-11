import { Logo } from './logo';
import { NavLinks } from './nav-links';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75 sticky top-0 z-30">
      <div className="container-page flex h-14 items-center justify-between gap-6 sm:h-20">
        <Logo />
        <div className="flex items-center gap-2 lg:gap-6">
          <NavLinks className="hidden lg:flex" />
          <ThemeToggle />
        </div>
      </div>
      {/* Dar ekranlarda menü ikinci satırda, gerekirse yatay kaydırılır. */}
      <div className="container-page relative -mt-1 overflow-x-auto pb-1.5 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        <NavLinks className="-mx-2.5 w-max pr-8" label="Ana menü (mobil)" />
      </div>
      {/* Sağ kenardaki solma, menünün kaydırılabildiğini gösterir. */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-10 w-10 bg-gradient-to-l from-paper to-transparent sm:hidden" />
    </header>
  );
}
