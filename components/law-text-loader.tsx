'use client';

import { useEffect, useRef, useState } from 'react';
import { provisionAnchor } from '@/lib/law-text';

type State = { status: 'loading' } | { status: 'ok'; html: string } | { status: 'error' };

/** Kanun metnini ayrı (önbellekli) adresten yükler; madde çapalarına kaydırır ve "maddeye git" sağlar. */
export function LawTextLoader({ src, officialUrl, articleCount }: { src: string; officialUrl: string; articleCount: number }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [notFound, setNotFound] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((html) => alive && setState({ status: 'ok', html }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [src, attempt]);

  useEffect(() => {
    if (state.status !== 'ok') return;
    const focus = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      container.current?.querySelectorAll('.is-target').forEach((el) => el.classList.remove('is-target'));
      if (!id) return;
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('is-target');
        el.scrollIntoView({ block: 'start' });
      }
    };
    focus();
    window.addEventListener('hashchange', focus);
    return () => window.removeEventListener('hashchange', focus);
  }, [state.status]);

  function goTo(e: React.FormEvent) {
    e.preventDefault();
    const anchor = provisionAnchor(query);
    const exists = anchor && document.getElementById(anchor);
    setNotFound(!exists);
    if (exists) window.location.hash = anchor;
  }

  return (
    <div>
      <form onSubmit={goTo} className="sticky top-[91px] z-20 sm:top-[115px] lg:top-20 -mx-3 mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-paper/95 px-3 py-2 backdrop-blur" role="search">
        <label htmlFor="madde-ara" className="text-sm text-muted">Maddeye git</label>
        <input
          id="madde-ara"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setNotFound(false);
          }}
          placeholder="ör. 49, 68/a, geçici 1"
          inputMode="text"
          className="field-input !w-44 !py-1.5 text-sm"
          disabled={state.status !== 'ok'}
        />
        <button type="submit" className="btn !px-3 !py-1.5" disabled={state.status !== 'ok' || !query.trim()}>Git</button>
        <span className="ml-auto text-xs text-muted">{articleCount} madde</span>
        {notFound && <span className="w-full text-sm text-danger" role="status">Bu madde metinde bulunamadı.</span>}
      </form>

      {state.status === 'loading' && (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <p className="text-sm text-muted">Kanun metni yükleniyor…</p>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-line/70" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
          ))}
        </div>
      )}
      {state.status === 'error' && (
        <div className="notice-warn" role="alert">
          Kanun metni şu anda yüklenemedi.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              setState({ status: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            Tekrar deneyin
          </button>{' '}
          ya da metni{' '}
          <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="underline">resmî kaynakta</a> açın.
        </div>
      )}
      {state.status === 'ok' && <div ref={container} className="law-body" dangerouslySetInnerHTML={{ __html: state.html }} />}
    </div>
  );
}
