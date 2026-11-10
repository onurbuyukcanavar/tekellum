'use client';

import { useActionState } from 'react';
import { loginAction, type FormState } from '@/app/yonetim/actions';
import { FieldError } from './field';
import { SubmitButton } from './submit-button';

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="field-label">E-posta</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field-input" aria-invalid={!!state.errors?.email} />
        <FieldError message={state.errors?.email} />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Parola</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field-input" aria-invalid={!!state.errors?.password} />
        <FieldError message={state.errors?.password} />
      </div>
      {state.message && <p className="notice-warn" role="alert">{state.message}</p>}
      <SubmitButton pendingText="Kontrol ediliyor…" className="btn w-full">Giriş yap</SubmitButton>
    </form>
  );
}
