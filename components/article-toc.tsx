'use client';

import { useEffect, useRef, useState } from 'react';
import type { TocEntry } from '@/lib/toc';

/** Okunan bölümü bulur: ekranın üst kısmını geçmiş son başlık etkindir. */
function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!ids.length) return;
    const headings = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = Math.min(window.innerHeight * 0.3, 220);
      let current: string | null = null;
      for (const h of headings) {
        if (h.getBoundingClientRect().top - line <= 0) current = h.id;
        else break;
      }
      // Sayfanın sonuna gelindiyse son başlık etkin sayılır (kısa son bölümler için).
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = headings.at(-1)?.id ?? current;
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);

  return active;
}

function TocList({ toc, active, onNavigate }: { toc: TocEntry[]; active: string | null; onNavigate?: () => void }) {
  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    // Önce mobil kutu kapanır; kapanınca sayfa kısalacağından kaydırma bir sonraki karede hesaplanır.
    onNavigate?.();
    requestAnimationFrame(() => {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      history.replaceState(null, '', `#${id}`);
      // Klavye ve ekran okuyucu kullanıcıları için odak da bölüme taşınır.
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  };

  return (
    <ol className="space-y-1 text-[0.92rem] leading-snug">
      {toc.map((item) => {
        const isActive = item.id === active;
        return (
          <li key={item.id} className={item.level === 3 ? 'pl-4' : ''}>
            <a
              href={`#${item.id}`}
              onClick={(e) => go(e, item.id)}
              aria-current={isActive ? 'location' : undefined}
              className={`-ml-px block border-l-2 py-1 pl-3 transition-colors ${
                isActive ? 'border-bronze font-medium text-navy' : 'border-transparent text-ink-soft hover:border-line-strong hover:text-navy'
              } ${item.level === 3 ? 'text-[0.86rem]' : ''}`}
            >
              {item.text}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/** Geniş ekranda makalenin yanında sabit duran içindekiler. */
export function ArticleTocSidebar({ toc }: { toc: TocEntry[] }) {
  const ids = useIds(toc);
  const active = useActiveHeading(ids);
  const listRef = useRef<HTMLDivElement>(null);

  // Uzun listelerde etkin başlık görünür alanda tutulur.
  useEffect(() => {
    const box = listRef.current;
    const el = active ? box?.querySelector<HTMLElement>(`a[href="#${CSS.escape(active)}"]`) : null;
    if (!box || !el) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTo({ top: top - box.clientHeight / 3 });
    }
  }, [active]);

  return (
    <nav aria-labelledby="icindekiler-yan" className="sticky top-28">
      <p id="icindekiler-yan" className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
        İçindekiler
      </p>
      <div ref={listRef} className="relative max-h-[calc(100vh-10rem)] overflow-y-auto border-l border-line pr-1">
        <TocList toc={toc} active={active} />
      </div>
      <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); history.replaceState(null, '', location.pathname + location.search); }}
        className="mt-5 inline-block text-xs text-muted hover:text-navy">
        ↑ Başa dön
      </a>
    </nav>
  );
}

/** Dar ekranda makalenin başında açılıp kapanan içindekiler. */
export function ArticleTocInline({ toc }: { toc: TocEntry[] }) {
  const ids = useIds(toc);
  const active = useActiveHeading(ids);
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={ref} className="group rounded-xl border border-line bg-paper-raised">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-bronze">İçindekiler</span>
        <span className="flex items-center gap-2 text-sm text-muted">
          {toc.length} başlık
          <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-open:rotate-180" fill="currentColor" aria-hidden>
            <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-line px-5 py-4">
        <div className="border-l border-line">
          <TocList toc={toc} active={active} onNavigate={() => ref.current?.removeAttribute('open')} />
        </div>
      </div>
    </details>
  );
}

function useIds(toc: TocEntry[]) {
  const [ids] = useState(() => toc.map((t) => t.id));
  return ids;
}
