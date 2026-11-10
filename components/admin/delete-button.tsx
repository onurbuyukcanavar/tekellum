'use client';

import { useState } from 'react';
import { SubmitButton } from './submit-button';

/** İki adımlı silme: tarayıcı onay penceresi yerine aynı yerde "Emin misiniz?" sorusu. */
export function DeleteButton({ action, id, label = 'Sil', confirmText }: {
  action: (formData: FormData) => Promise<void>; id: string; label?: string; confirmText: string;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return <button type="button" className="btn-danger" onClick={() => setConfirming(true)}>{label}</button>;
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" role="alert">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-danger">{confirmText}</span>
      <SubmitButton className="btn-danger" pendingText="Siliniyor…">Evet, kalıcı olarak sil</SubmitButton>
      <button type="button" className="btn-secondary" onClick={() => setConfirming(false)}>Vazgeç</button>
    </form>
  );
}
