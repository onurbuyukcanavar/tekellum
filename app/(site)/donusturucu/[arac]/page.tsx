import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Converter } from '@/components/converter/converter';
import { SITE_NAME } from '@/lib/constants';
import { getTool, TOOLS } from '@/lib/convert/tools';

type Props = { params: Promise<{ arac: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ arac: tool.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getTool((await params).arac);
  if (!tool) return {};
  const title = `${tool.title} Dönüştürücü`;
  return {
    title,
    description: tool.description,
    openGraph: { title: `${title} · ${SITE_NAME}`, description: tool.description, siteName: SITE_NAME, locale: 'tr_TR' },
    alternates: { canonical: `/donusturucu/${tool.id}` },
  };
}

export default async function ToolPage({ params }: Props) {
  const tool = getTool((await params).arac);
  if (!tool) notFound();

  return (
    <div className="container-page pt-14">
      <nav aria-label="Konum" className="text-sm text-muted">
        <Link className="link-quiet" href="/donusturucu">Dönüştürücü</Link> <span aria-hidden>/</span> {tool.title}
      </nav>
      <h1 className="mt-4 text-4xl sm:text-5xl">{tool.title}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{tool.description}</p>

      <div className="mt-10 max-w-3xl">
        <Converter toolId={tool.id} />
        {tool.caveat && <p className="notice-warn mt-6 text-sm">{tool.caveat}</p>}
      </div>

      <section className="mt-16 max-w-3xl" aria-labelledby="diger-araclar">
        <h2 id="diger-araclar" className="text-2xl">Diğer dönüştürücüler</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {TOOLS.filter((t) => t.id !== tool.id).map((t) => (
            <li key={t.id}>
              <Link href={`/donusturucu/${t.id}`} className="inline-block rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-soft transition hover:border-bronze/70 hover:text-navy">
                {t.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
