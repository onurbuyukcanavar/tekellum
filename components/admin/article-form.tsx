'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';
import { saveArticleAction, type FormState } from '@/app/yonetim/actions';
import { ARTICLE_CATEGORIES } from '@/lib/constants';
import { slugify } from '@/lib/slug';
import { FieldError } from './field';
import { RichTextEditor } from './rich-text-editor';
import { SubmitButton } from './submit-button';

export type LawOption = { id: string; title: string; shortName: string; lawNumber: string };
export type ArticleFormValues = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  status: 'TASLAK' | 'YAYINDA';
  featured: boolean;
  lawRefs: { lawId: string; provision: string }[];
};

export function ArticleForm({ initial, lawOptions }: { initial: ArticleFormValues; lawOptions: LawOption[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveArticleAction, {});
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [refLaw, setRefLaw] = useState('');
  const [refProvision, setRefProvision] = useState('');
  const errors = state.errors ?? {};
  const set = <K extends keyof ArticleFormValues>(key: K, value: ArticleFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  // --- Kaydedilmemiş değişikliklerin korunması -------------------------------------------
  // Metin bu tarayıcıda birkaç saniyede bir saklanır; sayfa yanlışlıkla kapanırsa geri yüklenebilir.
  const draftKey = `tekellum-taslak:${initial.id ?? 'yeni'}`;
  const [editorKey, setEditorKey] = useState(0);
  const [offer, setOffer] = useState<Draft | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const submitting = useRef(false);
  const dirty = values.title !== initial.title || values.excerpt !== initial.excerpt || values.content !== initial.content;

  useEffect(() => {
    const draft = readDraft(draftKey);
    if (draft && (draft.title !== initial.title || draft.excerpt !== initial.excerpt || draft.content !== initial.content)) {
      // Taslak yalnızca ilk yüklemede okunur.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOffer(draft);
    } else if (draft) {
      removeDraft(draftKey);
    }
  }, [draftKey, initial.title, initial.excerpt, initial.content]);

  useEffect(() => {
    if (!dirty || offer) return;
    const t = setTimeout(() => {
      const at = new Date().toISOString();
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title: values.title, excerpt: values.excerpt, content: values.content, at }));
        setSavedAt(at);
      } catch { /* depolama dolu ya da kapalı */ }
    }, 1500);
    return () => clearTimeout(t);
  }, [dirty, offer, draftKey, values.title, values.excerpt, values.content]);

  const latest = useRef(values);
  useEffect(() => { latest.current = values; });

  useEffect(() => {
    // Kaydetme başarısız olduysa (doğrulama hatası) taslak yeniden yedeklenir ve çıkış uyarısı devreye girer.
    if (!submitting.current) return;
    submitting.current = false;
    const v = latest.current;
    try { localStorage.setItem(draftKey, JSON.stringify({ title: v.title, excerpt: v.excerpt, content: v.content, at: new Date().toISOString() })); } catch { /* yok say */ }
  }, [state, draftKey]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty && !submitting.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function restoreDraft() {
    if (!offer) return;
    setValues((v) => ({ ...v, title: offer.title, excerpt: offer.excerpt, content: offer.content }));
    setEditorKey((k) => k + 1);
    setOffer(null);
  }
  function discardDraft() {
    removeDraft(draftKey);
    setOffer(null);
  }

  function addRef() {
    if (!refLaw) return;
    const provision = refProvision.trim();
    if (values.lawRefs.some((r) => r.lawId === refLaw && r.provision === provision)) return;
    set('lawRefs', [...values.lawRefs, { lawId: refLaw, provision }]);
    setRefProvision('');
  }

  const lawLabel = (id: string) => {
    const law = lawOptions.find((l) => l.id === id);
    return law ? (law.shortName ? `${law.shortName} — ${law.title}` : law.title) : 'Silinmiş kayıt';
  };

  return (
    <form action={action} onSubmit={() => { submitting.current = true; removeDraft(draftKey); }} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="content" value={values.content} />
      <input type="hidden" name="lawRefs" value={JSON.stringify(values.lawRefs)} />

      <div className="min-w-0 space-y-6">
        {offer && (
          <div className="notice-warn flex flex-wrap items-center justify-between gap-3" role="alert">
            <span>
              Bu tarayıcıda kaydedilmemiş bir taslak bulundu
              {offer.at ? ` (${new Date(offer.at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })})` : ''}.
            </span>
            <span className="flex gap-2">
              <button type="button" className="btn !px-3 !py-1.5" onClick={restoreDraft}>Geri yükle</button>
              <button type="button" className="btn-secondary !px-3 !py-1.5" onClick={discardDraft}>Yok say</button>
            </span>
          </div>
        )}
        {state.message && <p className="notice-warn" role="alert">{state.message}</p>}
        <div>
          <label htmlFor="title" className="field-label">Başlık</label>
          <input
            id="title"
            name="title"
            required
            value={values.title}
            onChange={(e) => {
              const title = e.target.value;
              setValues((v) => ({ ...v, title, slug: slugTouched ? v.slug : slugify(title) }));
            }}
            className="field-input !text-lg font-serif"
            aria-invalid={!!errors.title}
          />
          <FieldError message={errors.title} />
        </div>

        <div>
          <label htmlFor="excerpt" className="field-label">Kısa açıklama</label>
          <textarea
            id="excerpt"
            name="excerpt"
            rows={3}
            maxLength={600}
            value={values.excerpt}
            onChange={(e) => set('excerpt', e.target.value)}
            className="field-input"
            aria-invalid={!!errors.excerpt}
          />
          <p className="field-hint">Ana sayfada ve paylaşım önizlemelerinde görünür. {values.excerpt.length}/600</p>
          <FieldError message={errors.excerpt} />
        </div>

        <div>
          <span className="field-label" id="content-label">Makale metni</span>
          <RichTextEditor
            key={editorKey}
            initialContent={values.content}
            onChange={(html) => set('content', html)}
            invalid={!!errors.content}
            describedBy={errors.content ? 'content-error' : undefined}
          />
          <FieldError id="content-error" message={errors.content} />
          <p className="field-hint">
            Değişiklikler yayına ancak sağdaki düğmeyle kaydedildiğinde yansır.{' '}
            {dirty
              ? savedAt
                ? `Kaydedilmemiş değişiklikler bu tarayıcıda yedeklendi (${new Date(savedAt).toLocaleTimeString('tr-TR', { timeStyle: 'short' })}).`
                : 'Kaydedilmemiş değişiklikler var.'
              : ''}
          </p>
        </div>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <div className="card space-y-5 p-5">
          <fieldset>
            <legend className="field-label">Durum</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['TASLAK', 'YAYINDA'] as const).map((s) => (
                <label
                  key={s}
                  className={`cursor-pointer rounded-md border px-3 py-2 text-center text-sm transition ${
                    values.status === s ? 'border-navy bg-navy text-paper' : 'border-line-strong text-ink-soft hover:border-bronze'
                  }`}
                >
                  <input type="radio" name="status" value={s} checked={values.status === s} onChange={() => set('status', s)} className="sr-only" />
                  {s === 'TASLAK' ? 'Taslak' : 'Yayında'}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" checked={values.featured} onChange={(e) => set('featured', e.target.checked)} className="h-4 w-4 accent-[var(--bronze)]" />
            Öne çıkan makale
          </label>
          <SubmitButton className="btn w-full" pendingText="Kaydediliyor…">
            {values.status === 'YAYINDA' ? 'Kaydet ve yayımla' : 'Taslak olarak kaydet'}
          </SubmitButton>
          {values.id && (
            <Link href={`/yonetim/makaleler/${values.id}/onizleme`} target="_blank" className="btn-secondary w-full">
              Kayıtlı hâlini önizle ↗
            </Link>
          )}
        </div>

        <div className="card space-y-4 p-5">
          <div>
            <label htmlFor="slug" className="field-label">URL kısa adı</label>
            <input
              id="slug"
              name="slug"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set('slug', e.target.value);
              }}
              onBlur={() => set('slug', slugify(values.slug))}
              className="field-input font-mono !text-sm"
              aria-invalid={!!errors.slug}
            />
            <p className="field-hint break-all">/makaleler/{values.slug || '…'}</p>
            <FieldError message={errors.slug} />
          </div>
          <div>
            <label htmlFor="category" className="field-label">Kategori</label>
            <select id="category" name="category" value={values.category} onChange={(e) => set('category', e.target.value)} className="field-input">
              {ARTICLE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <FieldError message={errors.category} />
          </div>
          <div>
            <label htmlFor="author" className="field-label">Yazar</label>
            <input id="author" name="author" value={values.author} onChange={(e) => set('author', e.target.value)} className="field-input" aria-invalid={!!errors.author} />
            <FieldError message={errors.author} />
          </div>
        </div>

        <div className="card space-y-3 p-5">
          <p className="field-label !mb-0">İlgili mevzuat</p>
          <p className="text-xs text-muted">Yazının atıf yaptığı kanun ve maddeler; makalenin altında ve ilgili kanun sayfasında listelenir.</p>
          {values.lawRefs.length > 0 && (
            <ul className="space-y-1.5">
              {values.lawRefs.map((r, i) => (
                <li key={`${r.lawId}-${r.provision}`} className="flex items-start justify-between gap-2 rounded-md bg-paper px-2.5 py-1.5 text-sm">
                  <span>{lawLabel(r.lawId)}{r.provision ? `, m. ${r.provision}` : ''}</span>
                  <button
                    type="button"
                    className="text-muted hover:text-danger"
                    aria-label="Bağlantıyı kaldır"
                    onClick={() => set('lawRefs', values.lawRefs.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-2">
            <label htmlFor="ref-law" className="sr-only">Kanun</label>
            <select id="ref-law" value={refLaw} onChange={(e) => setRefLaw(e.target.value)} className="field-input !text-sm">
              <option value="">Kanun seçin…</option>
              {lawOptions.map((l) => (
                <option key={l.id} value={l.id}>{l.shortName ? `${l.shortName} — ${l.title}` : l.title}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <label htmlFor="ref-provision" className="sr-only">Madde</label>
              <input
                id="ref-provision"
                value={refProvision}
                onChange={(e) => setRefProvision(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addRef();
                  }
                }}
                placeholder="Madde (ör. 49)"
                maxLength={40}
                className="field-input !text-sm"
              />
              <button type="button" className="btn-secondary !px-3" onClick={addRef} disabled={!refLaw}>Ekle</button>
            </div>
          </div>
          <FieldError message={errors.lawRefs} />
        </div>
      </aside>
    </form>
  );
}

type Draft = { title: string; excerpt: string; content: string; at?: string };

function readDraft(key: string): Draft | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null');
    return v && typeof v.content === 'string' && typeof v.title === 'string' ? { excerpt: '', ...v } : null;
  } catch {
    return null;
  }
}

function removeDraft(key: string) {
  try { localStorage.removeItem(key); } catch { /* yok say */ }
}
