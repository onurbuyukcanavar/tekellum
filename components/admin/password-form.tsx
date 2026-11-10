'use client';

import { useActionState } from 'react';
import { changePasswordAction, logoutOtherSessionsAction, type FormState } from '@/app/yonetim/actions';
import { FieldError } from './field';
import { SubmitButton } from './submit-button';

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, {});
  const errors = state.errors ?? {};
  // Parola alanları bilerek denetimsizdir: her gönderimden sonra React formu temizler.
  const field = (name: 'currentPassword' | 'newPassword' | 'confirmPassword', label: string, autoComplete: string) => (
    <div>
      <label htmlFor={name} className="field-label">{label}</label>
      <input
        id={name}
        name={name}
        type="password"
        autoComplete={autoComplete}
        className="field-input"
        aria-invalid={!!errors[name]}
      />
      <FieldError message={errors[name]} />
    </div>
  );
  return (
    <form action={action} className="space-y-4" noValidate>
      {field('currentPassword', 'Mevcut parola', 'current-password')}
      {field('newPassword', 'Yeni parola (en az 12 karakter)', 'new-password')}
      {field('confirmPassword', 'Yeni parola (tekrar)', 'new-password')}
      {state.message && <p className={state.ok ? 'notice-ok' : 'notice-warn'} role="status">{state.message}</p>}
      <SubmitButton pendingText="Güncelleniyor…">Parolayı değiştir</SubmitButton>
    </form>
  );
}

export function OtherSessionsForm() {
  const [state, action] = useActionState<FormState, FormData>(async () => logoutOtherSessionsAction(), {});
  return (
    <form action={action} className="space-y-3">
      {state.message && <p className="notice-ok" role="status">{state.message}</p>}
      <SubmitButton className="btn-secondary" pendingText="Kapatılıyor…">Diğer tüm oturumları kapat</SubmitButton>
    </form>
  );
}
