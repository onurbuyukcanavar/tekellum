'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { sendContactMessageAction, type ContactFormState } from '@/app/(site)/iletisim/actions';
import { CONTACT_LIMITS } from '@/lib/contact';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn w-full sm:w-auto" disabled={pending} aria-disabled={pending}>
      {pending ? 'Gönderiliyor…' : 'Mesajı gönder'}
    </button>
  );
}

function FieldErr({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="field-error" role="alert">{message}</p> : null;
}

export function ContactForm() {
  const [state, action] = useActionState<ContactFormState, FormData>(sendContactMessageAction, {});
  const [bodyLength, setBodyLength] = useState(0);
  const [seenState, setSeenState] = useState(state);
  const startedAt = useRef(0);
  const statusRef = useRef<HTMLElement | null>(null);
  const errors = state.errors ?? {};
  const v = state.ok ? undefined : state.values;

  // Yeni bir sunucu yanıtı geldiğinde karakter sayacı geri dönen metne göre ayarlanır.
  if (seenState !== state) {
    setSeenState(state);
    setBodyLength(state.values?.body.length ?? 0);
  }

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Formun açılış zamanı gönderime eklenir (bot koruması); JavaScript yoksa bu alan boş gider.
  const submit = (formData: FormData) => {
    if (startedAt.current) formData.set('startedAt', String(startedAt.current));
    return action(formData);
  };

  useEffect(() => {
    if (state.message) statusRef.current?.focus();
  }, [state]);

  if (state.ok) {
    return (
      <div className="notice-ok space-y-3 !px-5 !py-5" role="status" tabIndex={-1} ref={(el) => { statusRef.current = el; }}>
        <p className="text-base font-medium">{state.message}</p>
        <button type="button" className="link-quiet text-sm" onClick={() => window.location.reload()}>Yeni bir mesaj yaz</button>
      </div>
    );
  }

  const describe = (name: string, hint?: string) => [errors[name] ? `${name}-hata` : '', hint ?? ''].filter(Boolean).join(' ') || undefined;

  return (
    <form action={submit} className="space-y-5" noValidate>
      {state.message && (
        <p ref={(el) => { statusRef.current = el; }} tabIndex={-1} className="notice-warn" role="alert">{state.message}</p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="field-label">Ad soyad</label>
          <input id="name" name="name" autoComplete="name" required minLength={CONTACT_LIMITS.name.min} maxLength={CONTACT_LIMITS.name.max}
            defaultValue={v?.name} className="field-input" aria-invalid={!!errors.name} aria-describedby={describe('name')} />
          <FieldErr id="name-hata" message={errors.name} />
        </div>
        <div>
          <label htmlFor="email" className="field-label">E-posta adresi</label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254}
            defaultValue={v?.email} className="field-input" aria-invalid={!!errors.email} aria-describedby={describe('email')} />
          <FieldErr id="email-hata" message={errors.email} />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="field-label">Konu</label>
        <input id="subject" name="subject" required minLength={CONTACT_LIMITS.subject.min} maxLength={CONTACT_LIMITS.subject.max}
          defaultValue={v?.subject} className="field-input" aria-invalid={!!errors.subject} aria-describedby={describe('subject')} />
        <FieldErr id="subject-hata" message={errors.subject} />
      </div>

      <div>
        <label htmlFor="body" className="field-label">Mesajınız</label>
        <textarea id="body" name="body" rows={7} required minLength={CONTACT_LIMITS.body.min} maxLength={CONTACT_LIMITS.body.max}
          defaultValue={v?.body} onChange={(e) => setBodyLength(e.target.value.length)}
          className="field-input min-h-40 resize-y leading-relaxed" aria-invalid={!!errors.body} aria-describedby={describe('body', 'body-sayac')} />
        <div className="flex justify-between gap-3">
          <FieldErr id="body-hata" message={errors.body} />
          <p id="body-sayac" className="field-hint ml-auto tabular-nums">{bodyLength} / {CONTACT_LIMITS.body.max}</p>
        </div>
      </div>

      {/* Bot tuzağı: gerçek kullanıcılar bu alanı görmez. */}
      <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="website">Web siteniz</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted sm:max-w-md">
          Paylaştığınız bilgiler yalnızca mesajınıza yanıt vermek için kullanılır ve üçüncü kişilerle paylaşılmaz.
        </p>
        <Submit />
      </div>
    </form>
  );
}
