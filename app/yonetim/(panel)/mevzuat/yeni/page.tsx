import Link from 'next/link';
import { LawForm } from '@/components/admin/law-form';
import { PageHeader } from '@/components/admin/page-header';

export const metadata = { title: 'Yeni mevzuat kaydı' };

export default function NewLawPage() {
  return (
    <>
      <PageHeader title="Yeni mevzuat kaydı" actions={<Link href="/yonetim/mevzuat" className="btn-secondary">← Mevzuat</Link>} />
      <LawForm initial={{ title: '', slug: '', lawNumber: '', shortName: '', officialUrl: 'https://www.mevzuat.gov.tr/', content: '', verified: false }} />
    </>
  );
}
