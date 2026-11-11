import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/constants';
import { TOOLS } from '@/lib/convert/tools';

const DESCRIPTION = 'UYAP UDF dosyalarını PDF ve Word\'e, Word ve PDF belgelerini UDF\'ye dönüştürün; görselleri PDF yapın, PDF\'leri birleştirin. Dosyalar cihazınızdan çıkmaz.';

export const metadata: Metadata = {
  title: 'Belge Dönüştürücü',
  description: DESCRIPTION,
  openGraph: { title: `Belge Dönüştürücü · ${SITE_NAME}`, description: DESCRIPTION, siteName: SITE_NAME, locale: 'tr_TR' },
  alternates: { canonical: '/donusturucu' },
};

export default function ConverterHubPage() {
  return (
    <div className="container-page pt-14">
      <p className="eyebrow">Araçlar</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">Belge Dönüştürücü</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
        UYAP&apos;ın UDF dosyaları başta olmak üzere hukuk pratiğinde sık kullanılan belge biçimleri arasında dönüştürme.
        Bilgisayardan ya da telefondan dosyanızı seçmeniz yeterli.
      </p>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        Dosyalarınız hiçbir sunucuya yüklenmez; tüm işlem tarayıcınızın içinde, kendi cihazınızda yapılır.
      </p>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map((tool) => (
          <li key={tool.id}>
            <Link
              href={`/donusturucu/${tool.id}`}
              className="group flex h-full flex-col rounded-xl border border-line bg-paper-raised p-5 transition hover:border-bronze/70 hover:shadow-sm"
            >
              <span className="font-serif text-2xl text-navy group-hover:text-bronze">{tool.title}</span>
              <span className="mt-2 text-sm font-medium text-ink">{tool.short}</span>
              <span className="mt-2 text-sm leading-relaxed text-muted">{tool.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
