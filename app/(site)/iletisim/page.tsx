import type { Metadata } from 'next';
import { CONTACT } from '@/lib/contact';

export const metadata: Metadata = {
  title: 'İletişim',
  description: `${CONTACT.name} ile iletişim bilgileri.`,
  openGraph: { title: 'İletişim · Müessir', description: `${CONTACT.name} ile iletişim bilgileri.`, siteName: 'Müessir', locale: 'tr_TR' },
  alternates: { canonical: '/iletisim' },
};

export default function ContactPage() {
  return (
    <div className="container-page max-w-3xl pt-14">
      <p className="eyebrow">İletişim</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">{CONTACT.name}</h1>

      <dl className="mt-10 rounded-xl border border-line bg-paper-raised px-6 py-5">
        <dt className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted">E-posta</dt>
        <dd className="mt-2 text-lg">
          <a className="text-navy underline decoration-bronze/50 underline-offset-4 hover:decoration-bronze" href={`mailto:${CONTACT.email}`}>
            {CONTACT.email}
          </a>
        </dd>
      </dl>

      <p className="mt-8 text-sm text-muted">
        Yazılar hakkındaki görüş, düzeltme ve önerilerinizi bu adrese iletebilirsiniz. Bu sitedeki yazılar genel
        bilgilendirme amacı taşır; e-posta yazışmaları somut olaylara ilişkin hukuki danışmanlık yerine geçmez.
      </p>
    </div>
  );
}
