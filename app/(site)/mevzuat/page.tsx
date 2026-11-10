import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { VerificationBadge } from '@/components/verification-badge';
import { listLaws } from '@/lib/services/laws';

export const metadata: Metadata = {
  title: 'Mevzuat kütüphanesi',
  description: 'Temel kanunlar ve resmî kaynak bağlantıları.',
  openGraph: { title: 'Mevzuat kütüphanesi · Müessir', description: 'Temel kanunlar ve resmî kaynak bağlantıları.', siteName: 'Müessir', locale: 'tr_TR' },
  alternates: { canonical: '/mevzuat' },
};

export default async function LawsPage() {
  await connection();
  const laws = await listLaws();
  return (
    <div className="container-page pt-14">
      <p className="eyebrow">Hukuk kaynakları</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">Mevzuat kütüphanesi</h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
        Kanun kayıtları ve resmî kaynaklara yönlendirmeler. Bir kanunun metni, ancak Mevzuat Bilgi Sistemi veya Resmî
        Gazete ile karşılaştırılıp doğrulandıktan sonra burada yayımlanır.
      </p>
      <p className="notice mt-8 max-w-3xl">
        Bu kütüphane resmî kaynak yerine geçmez. Yürürlükteki metni ve değişiklikleri her zaman resmî kaynaktan teyit edin.
      </p>

      {laws.length ? (
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {laws.map((law) => (
            <li key={law.id}>
              <Link href={`/mevzuat/${law.slug}`} className="card group flex h-full flex-col p-5 transition hover:border-bronze/60">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-sans text-xs font-semibold tracking-[0.15em] text-bronze">{law.shortName || 'KANUN'}</span>
                  {law.lawNumber && <span className="text-xs text-muted">{law.lawNumber} sayılı</span>}
                </div>
                <span className="mt-3 font-serif text-xl leading-snug text-navy transition group-hover:text-bronze">{law.title}</span>
                <span className="mt-auto pt-4"><VerificationBadge status={law.verificationStatus} verifiedAt={law.verifiedAt} /></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="notice mt-12">Henüz mevzuat kaydı eklenmedi.</p>
      )}
    </div>
  );
}
