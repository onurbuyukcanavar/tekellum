'use client';

import { useActionState, useMemo, useState } from 'react';
import { saveLawAction, type FormState } from '@/app/yonetim/actions';
import { parseLawText } from '@/lib/law-text';
import { isOfficialSourceUrl } from '@/lib/official-source';
import { slugify } from '@/lib/slug';
import { FieldError } from './field';
import { SubmitButton } from './submit-button';

export type LawFormValues = {
  id?: string;
  title: string;
  slug: string;
  lawNumber: string;
  shortName: string;
  officialUrl: string;
  content: string;
  verified: boolean;
};

export function LawForm({ initial }: { initial: LawFormValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveLawAction, {});
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const errors = state.errors ?? {};
  const set = <K extends keyof LawFormValues>(key: K, value: LawFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  const articleCount = useMemo(() => parseLawText(values.content).filter((b) => b.kind === 'article').length, [values.content]);
  const contentChanged = values.content.trim() !== initial.content.trim();
  const officialOk = isOfficialSourceUrl(values.officialUrl);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="min-w-0 space-y-6">
        {state.message && <p className="notice-warn" role="alert">{state.message}</p>}
        <div>
          <label htmlFor="title" className="field-label">Kanun adı</label>
          <input
            id="title"
            name="title"
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
          <label htmlFor="content" className="field-label">Mevzuat metni (düz metin)</label>
          <textarea
            id="content"
            name="content"
            rows={22}
            value={values.content}
            onChange={(e) => set('content', e.target.value)}
            className="field-input font-serif leading-relaxed"
            placeholder={'MADDE 1- (1) …\n\nMADDE 2- …'}
            aria-invalid={!!errors.content}
          />
          <p className="field-hint">
            Metni resmî kaynaktan kopyalayıp yapıştırın. “MADDE 49-” ile başlayan satırlar madde olarak algılanır ve
            makalelerden doğrudan bağlantı verilebilir. Şu an algılanan madde sayısı: <strong>{articleCount}</strong>.
          </p>
          <FieldError message={errors.content} />
        </div>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <div className="card space-y-4 p-5">
          <label className={`flex items-start gap-3 rounded-md border p-3 text-sm ${values.verified ? 'border-ok-ink/30 bg-ok-bg text-ok-ink' : 'border-warn-ink/25 bg-warn-bg text-warn-ink'}`}>
            <input type="checkbox" name="verified" checked={values.verified} onChange={(e) => set('verified', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--bronze)]" />
            <span>
              <strong className="block">Metni resmî kaynakla karşılaştırdım ve doğruladım.</strong>
              <span className="mt-1 block opacity-90">
                İşaretli değilse metin sitede yayımlanmaz; yalnızca kanun adı ve resmî bağlantı görünür.
              </span>
            </span>
          </label>
          {values.verified && initial.verified && contentChanged && (
            <p className="text-xs text-warn-ink">Metin değişti. Kaydettiğinizde doğrulama tarihi bugün olarak yenilenir.</p>
          )}
          {values.verified && !officialOk && (
            <p className="text-xs text-danger">Doğrulama için resmî kaynak bağlantısı mevzuat.gov.tr veya resmigazete.gov.tr adresinde olmalıdır.</p>
          )}
          <FieldError message={errors.verified} />
          <SubmitButton className="btn w-full" pendingText="Kaydediliyor…">Kaydet</SubmitButton>
        </div>

        <div className="card space-y-4 p-5">
          <div>
            <label htmlFor="shortName" className="field-label">Kısaltma</label>
            <input id="shortName" name="shortName" value={values.shortName} onChange={(e) => set('shortName', e.target.value)} placeholder="TBK" className="field-input" />
            <FieldError message={errors.shortName} />
          </div>
          <div>
            <label htmlFor="lawNumber" className="field-label">Kanun numarası</label>
            <input id="lawNumber" name="lawNumber" value={values.lawNumber} onChange={(e) => set('lawNumber', e.target.value)} placeholder="6098" className="field-input" />
            <FieldError message={errors.lawNumber} />
          </div>
          <div>
            <label htmlFor="officialUrl" className="field-label">Resmî kaynak bağlantısı</label>
            <input id="officialUrl" name="officialUrl" type="url" value={values.officialUrl} onChange={(e) => set('officialUrl', e.target.value)} placeholder="https://www.mevzuat.gov.tr/…" className="field-input !text-sm" aria-invalid={!!errors.officialUrl} />
            <FieldError message={errors.officialUrl} />
          </div>
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
            <p className="field-hint break-all">/mevzuat/{values.slug || '…'}</p>
            <FieldError message={errors.slug} />
          </div>
        </div>
      </aside>
    </form>
  );
}
