'use server';

import { clientIp } from '@/lib/request';
import { hashIp, isContactRateLimited, submitContactMessage } from '@/lib/services/contact';
import { contactMessageSchema, fieldErrors } from '@/lib/validation';

export type ContactFormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: { name: string; email: string; subject: string; body: string };
};

/** Formun açılmasından gönderilmesine kadar en az bu kadar süre geçmeli (bot koruması). */
const MIN_FILL_MS = 2500;

export async function sendContactMessageAction(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const raw = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    subject: String(formData.get('subject') ?? ''),
    body: String(formData.get('body') ?? ''),
  };
  const values = { ...raw, body: raw.body.slice(0, 6000) };

  // Görünmez "web sitesi" alanını yalnızca botlar doldurur; onlara başarılı yanıt verilip mesaj atılır.
  if (String(formData.get('website') ?? '').trim()) return { ok: true, message: 'Mesajınız iletildi. Teşekkürler.' };
  const startedAt = Number(formData.get('startedAt'));
  if (Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < MIN_FILL_MS) {
    return { values, message: 'Mesajınız çok hızlı gönderildi; lütfen birkaç saniye sonra tekrar deneyin.' };
  }

  const parsed = contactMessageSchema.safeParse(raw);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error), message: 'Lütfen işaretli alanları düzeltin.' };

  const ipHash = hashIp(await clientIp());
  if (await isContactRateLimited(ipHash)) {
    return { values, message: 'Kısa sürede çok sayıda mesaj gönderildi. Lütfen daha sonra tekrar deneyin.' };
  }

  try {
    await submitContactMessage(parsed.data, ipHash);
  } catch (error) {
    console.error('İletişim mesajı kaydedilemedi', error);
    return { values, message: 'Mesajınız şu anda gönderilemedi. Lütfen biraz sonra tekrar deneyin ya da doğrudan e-posta gönderin.' };
  }
  return { ok: true, message: 'Mesajınız iletildi. En kısa sürede e-posta adresinize dönüş yapılacaktır.' };
}
