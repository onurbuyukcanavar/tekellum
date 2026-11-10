import { NotFoundContent } from '@/components/not-found-content';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export default function RootNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1"><NotFoundContent /></main>
      <SiteFooter />
    </>
  );
}
