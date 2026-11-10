import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import { LawText } from '@/components/law-text';
import { VerificationBadge } from '@/components/verification-badge';
import { SITE_NAME } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { provisionAnchor } from '@/lib/law-text';
import { getLawBySlug } from '@/lib/services/laws';

type Props = { params: Promise<{ slug: string }> };
const load = cache((slug: string) => getLawBySlug(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const law = await load((await params).slug);
  if (!law) return { title: 'Mevzuat bulunamadı' };
  const title = law.lawNumber ? `${law.title} (${law.lawNumber})` : law.title;
  const description = `${law.title}${law.lawNumber ? `, ${law.lawNumber} sayılı kanun` : ''}: resmî kaynak bağlantısı ve doğrulama durumu.`;
  return {
    title,
    description,
    alternates: { canonical: `/mevzuat/${law.slug}` },
    openGraph: { type: 'website', title, description, siteName: SITE_NAME, locale: 'tr_TR' },
  };
}

export default async function LawPage({ params }: Props) {
  await connection();
  const law = await load((await params).slug);
  if (!law) notFound();
  const verified = law.verificationStatus === 'DOGRULANDI' && law.content.trim().length > 0;

  return (
    <article className="container-page max-w-3xl pt-14">
      <Link href="/mevzuat" className="link-quiet text-sm text-muted">← Mevzuat kütüphanesi</Link>
      <p className="eyebrow mt-8">{law.shortName || 'Kanun'}</p>
      <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">{law.title}</h1>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
        {law.lawNumber && <span>{law.lawNumber} sayılı kanun</span>}
        <VerificationBadge status={law.verificationStatus} verifiedAt={law.verifiedAt} />
      </div>

      {law.officialUrl && (
        <p className="mt-8">
          <a href={law.officialUrl} target="_blank" rel="noopener noreferrer" className="btn">
            Resmî kaynakta aç ↗
          </a>
        </p>
      )}

      {verified ? (
        <>
          <p className="notice mt-8">
            Bu metin {formatDate(law.verifiedAt)} tarihinde resmî kaynakla karşılaştırılmıştır. Sonraki değişiklikler
            yansımamış olabilir; yürürlükteki metni resmî kaynaktan teyit edin.
          </p>
          <hr className="rule my-10" />
          <LawText content={law.content} />
        </>
      ) : (
        <p className="notice-warn mt-8">
          Bu kanunun metni henüz resmî kaynakla karşılaştırılarak doğrulanmadığı için burada yayımlanmıyor. Güncel ve
          resmî metin için yukarıdaki bağlantıyı kullanın.
        </p>
      )}

      {law.articleRefs.length > 0 && (
        <aside className="mt-14 rounded-xl border border-line bg-paper-raised p-6" aria-labelledby="atif-yapan-yazilar">
          <h2 id="atif-yapan-yazilar" className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            Bu kanuna atıf yapan yazılar
          </h2>
          <ul className="mt-4 space-y-2">
            {law.articleRefs.map((ref) => {
              const anchor = ref.provision ? provisionAnchor(ref.provision) : null;
              return (
                <li key={ref.id} className="flex flex-wrap items-baseline gap-x-2">
                  <Link href={`/makaleler/${ref.article.slug}`} className="link-quiet">{ref.article.title}</Link>
                  {ref.provision && (
                    verified && anchor
                      ? <a href={`#${anchor}`} className="text-sm text-bronze">m. {ref.provision}</a>
                      : <span className="text-sm text-muted">m. {ref.provision}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
      )}
    </article>
  );
}
