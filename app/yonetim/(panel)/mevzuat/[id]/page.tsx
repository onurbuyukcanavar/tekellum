import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deleteLawAction } from '@/app/yonetim/actions';
import { DeleteButton } from '@/components/admin/delete-button';
import { LawForm } from '@/components/admin/law-form';
import { PageHeader } from '@/components/admin/page-header';
import { VerificationBadge } from '@/components/verification-badge';
import { getLawForAdmin } from '@/lib/services/laws';

export const metadata = { title: 'Mevzuat kaydını düzenle' };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ kaydedildi?: string }> };

export default async function EditLawPage({ params, searchParams }: Props) {
  const [{ id }, { kaydedildi }] = await Promise.all([params, searchParams]);
  const law = await getLawForAdmin(id);
  if (!law) notFound();
  const refs = law._count.articleRefs;

  return (
    <>
      <PageHeader
        title="Mevzuat kaydını düzenle"
        actions={
          <>
            <Link href={`/mevzuat/${law.slug}`} target="_blank" className="btn-secondary">Sitede görüntüle ↗</Link>
            <Link href="/yonetim/mevzuat" className="btn-secondary">← Mevzuat</Link>
          </>
        }
      />
      {kaydedildi && (
        <p className="notice-ok mb-6 flex flex-wrap items-center gap-3" role="status">
          Kayıt kaydedildi. <VerificationBadge status={law.verificationStatus} verifiedAt={law.verifiedAt} />
        </p>
      )}
      <LawForm
        key={law.updatedAt.toISOString()}
        initial={{
          id: law.id,
          title: law.title,
          slug: law.slug,
          lawNumber: law.lawNumber,
          shortName: law.shortName,
          officialUrl: law.officialUrl,
          content: law.content,
          verified: law.verificationStatus === 'DOGRULANDI',
        }}
      />
      <section className="mt-16 border-t border-line pt-8">
        <h2 className="text-lg">Tehlikeli bölge</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          {refs > 0 ? `Bu kayda ${refs} makale bağlantısı var; silinirse bu bağlantılar da kaldırılır.` : 'Silinen kayıt geri getirilemez.'}
        </p>
        <DeleteButton action={deleteLawAction} id={law.id} label="Kaydı sil" confirmText="Bu mevzuat kaydı kalıcı olarak silinecek." />
      </section>
    </>
  );
}
