import Link from 'next/link';

export function NotFoundContent() {
  return (
    <div className="container-page max-w-2xl py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 text-4xl">Aradığınız sayfa bulunamadı.</h1>
      <p className="mt-4 text-ink-soft">Bağlantı değişmiş ya da içerik yayından kaldırılmış olabilir.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn">Ana sayfa</Link>
        <Link href="/makaleler" className="btn-secondary">Makaleler</Link>
      </div>
    </div>
  );
}
