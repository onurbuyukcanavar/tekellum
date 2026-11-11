import { Logo } from './logo';
import { NavLinks } from './nav-links';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75 sticky top-0 z-30">
      <div className="container-page flex h-14 items-center justify-between gap-6 sm:h-20">
        <Logo />
        <div className="flex items-center gap-2 lg:gap-6">
          <NavLinks className="hidden md:flex" />
          <ThemeToggle />
        </div>
      </div>
      {/* Dar ekranlarda menü ikinci satırda, gerekirse yatay kaydırılır. */}
      <div className="container-page -mt-1 overflow-x-auto pb-1.5 md:hidden">
        <NavLinks className="-mx-2.5" label="Ana menü (mobil)" />
      </div>
    </header>
  );
}
