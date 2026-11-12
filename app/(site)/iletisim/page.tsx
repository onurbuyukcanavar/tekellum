import { DEFAULT_OG_IMAGES } from '@/lib/og/defaults';
import type { Metadata } from 'next';
import { ContactForm } from '@/components/contact-form';
import { SITE_NAME } from '@/lib/constants';
import { CONTACT } from '@/lib/contact';

const DESCRIPTION = `${CONTACT.name} ile iletişim: e-posta, LinkedIn ve iletişim formu.`;

export const metadata: Metadata = {
  title: 'İletişim',
  description: DESCRIPTION,
  openGraph: { images: DEFAULT_OG_IMAGES, title: `İletişim · ${SITE_NAME}`, description: DESCRIPTION, siteName: SITE_NAME, locale: 'tr_TR' },
  alternates: { canonical: '/iletisim' },
};

export default function ContactPage() {
  return (
    <div className="container-page max-w-3xl pt-14">
      <p className="eyebrow">İletişim</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">{CONTACT.name}</h1>

      <dl className="mt-10 grid gap-6 rounded-xl border border-line bg-paper-raised px-6 py-5 sm:grid-cols-2">
        <div>
          <dt className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted">E-posta</dt>
          <dd className="mt-2 break-all text-lg">
            <a className="text-navy underline decoration-bronze/50 underline-offset-4 hover:decoration-bronze" href={`mailto:${CONTACT.email}`}>
              {CONTACT.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted">LinkedIn</dt>
          <dd className="mt-2 text-lg [overflow-wrap:anywhere]">
            <a
              className="text-navy underline decoration-bronze/50 underline-offset-4 hover:decoration-bronze"
              href={CONTACT.linkedin.url}
              target="_blank"
              rel="noopener noreferrer me"
            >
              {CONTACT.linkedin.label.replace('/in/', '/in/\u200b')}
            </a>
          </dd>
        </div>
      </dl>

      <section className="mt-12" aria-labelledby="mesaj-baslik">
        <h2 id="mesaj-baslik" className="text-2xl sm:text-3xl">Mesaj gönderin</h2>
        <p className="mt-2 mb-6 text-ink-soft">Formu doldurmanız yeterli; mesajınız doğrudan bana ulaşır.</p>
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
