import type { Metadata } from 'next';
import { ContactForm } from '@/components/contact-form';
import { SITE_NAME } from '@/lib/constants';
import { CONTACT } from '@/lib/contact';

const DESCRIPTION = `${CONTACT.name} ile iletişim: e-posta adresi ve iletişim formu.`;

export const metadata: Metadata = {
  title: 'İletişim',
  description: DESCRIPTION,
  openGraph: { title: `İletişim · ${SITE_NAME}`, description: DESCRIPTION, siteName: SITE_NAME, locale: 'tr_TR' },
  alternates: { canonical: '/iletisim' },
};

export default function ContactPage() {
  return (
    <div className="container-page max-w-3xl pt-14">
      <p className="eyebrow">İletişim</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">{CONTACT.name}</h1>

      <dl className="mt-10 rounded-xl border border-line bg-paper-raised px-6 py-5">
        <dt className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted">E-posta</dt>
        <dd className="mt-2 break-all text-lg">
          <a className="text-navy underline decoration-bronze/50 underline-offset-4 hover:decoration-bronze" href={`mailto:${CONTACT.email}`}>
            {CONTACT.email}
          </a>
        </dd>
      </dl>

      <section className="mt-12" aria-labelledby="mesaj-baslik">
        <h2 id="mesaj-baslik" className="text-2xl sm:text-3xl">Mesaj gönderin</h2>
        <p className="mt-2 mb-6 text-ink-soft">Formu doldurmanız yeterli; mesajınız doğrudan e-posta kutuma ulaşır.</p>
        <div className="card relative p-5 sm:p-7">
          <ContactForm />
        </div>
      </section>

      <p className="mt-8 text-sm text-muted">
        Yazılar hakkındaki görüş, düzeltme ve önerilerinizi iletebilirsiniz. Bu sitedeki yazılar genel bilgilendirme
        amacı taşır; yazışmalar somut olaylara ilişkin hukuki danışmanlık yerine geçmez.
      </p>
    </div>
  );
}
