import Link from 'next/link';

/** Tipografik logo: klişe hukuk sembolleri yerine harf aralıklı serif ad ve bronz çizgi. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex flex-col leading-none" aria-label="Müessir ana sayfa">
      <span className="font-serif text-[1.25rem] font-semibold tracking-[0.24em] sm:text-[1.45rem] sm:tracking-[0.28em] text-navy transition group-hover:text-bronze">
        MÜESSİR
      </span>
      {!compact && (
        <span className="mt-1.5 hidden items-center gap-2 text-[0.62rem] sm:flex font-medium uppercase tracking-[0.3em] text-muted">
          <span className="h-px w-5 bg-bronze" aria-hidden />
          Hukuk · Düşünce · Metin
        </span>
      )}
    </Link>
  );
}
