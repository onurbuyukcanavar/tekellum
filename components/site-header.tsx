import { Logo } from './logo';
import { NavLinks } from './nav-links';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75 sticky top-0 z-30">
      <div className="container-page flex h-16 max-[359px]:px-3 items-center justify-between gap-2 sm:h-20 sm:gap-6">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-6">
          <NavLinks />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
