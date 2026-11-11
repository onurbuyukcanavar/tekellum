import Link from 'next/link';
import { ArticleForm } from '@/components/admin/article-form';
import { PageHeader } from '@/components/admin/page-header';
import { SITE_NAME } from '@/lib/constants';
import { listLawOptions } from '@/lib/services/laws';

export const metadata = { title: 'Yeni makale' };

export default async function NewArticlePage() {
  const lawOptions = await listLawOptions();
  return (
    <>
      <PageHeader title="Yeni makale" actions={<Link href="/yonetim/makaleler" className="btn-secondary">← Makaleler</Link>} />
      <ArticleForm
        lawOptions={lawOptions}
        initial={{ title: '', slug: '', excerpt: '', content: '', category: 'Hukuk', author: SITE_NAME, status: 'TASLAK', featured: false, lawRefs: [] }}
      />
    </>
  );
}
