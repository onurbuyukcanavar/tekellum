'use client';

import { useActionState } from 'react';
import { importGazetteAction, type FormState } from '@/app/yonetim/actions';
import { FieldError } from './field';
import { SubmitButton } from './submit-button';

export function GazetteImportForm({ today }: { today: string }) {
  const [state, action] = useActionState<FormState, FormData>(importGazetteAction, {});
  const errors = state.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="from" className="field-label">Başlangıç</label>
          <input id="from" name="from" type="date" required max={today} defaultValue={today} className="field-input" aria-invalid={!!errors.from} />
          <FieldError message={errors.from} />
        </div>
        <div>
          <label htmlFor="to" className="field-label">Bitiş (boşsa tek gün)</label>
          <input id="to" name="to" type="date" max={today} className="field-input" aria-invalid={!!errors.to} />
          <FieldError message={errors.to} />
        </div>
      </div>
      <p className="field-hint">Tek seferde en fazla 31 gün. Daha önce aktarılmış sayılar güncellenir, alınamamış metinler yeniden denenir.</p>
      {state.message && <p className={state.ok ? 'notice-ok' : 'notice-warn'} role="status">{state.message}</p>}
      <SubmitButton pendingText="Aktarılıyor… (birkaç dakika sürebilir)">Aktar</SubmitButton>
    </form>
  );
}
