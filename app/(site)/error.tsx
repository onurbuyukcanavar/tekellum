'use client';

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page max-w-2xl py-24 text-center">
      <p className="eyebrow">Geçici bir sorun</p>
      <h1 className="mt-4 text-3xl">Sayfa şu anda yüklenemedi.</h1>
      <p className="mt-4 text-ink-soft">Lütfen biraz sonra tekrar deneyin.</p>
      <button type="button" onClick={reset} className="btn mt-8">Tekrar dene</button>
    </div>
  );
}
