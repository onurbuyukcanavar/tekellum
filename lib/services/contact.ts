import 'server-only';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { CONTACT } from '@/lib/contact';
import { SITE_NAME } from '@/lib/constants';
import { escapeHtml } from '@/lib/format';

export type ContactInput = { name: string; email: string; subject: string; body: string };

/** Aynı adresten 10 dakikada 3, günde 10 mesaj. */
const LIMITS = [
  { windowMs: 10 * 60 * 1000, max: 3 },
  { windowMs: 24 * 60 * 60 * 1000, max: 10 },
];

export function hashIp(ip: string): string {
  return createHash('sha256').update(`tekellum-iletisim:${ip}`).digest('hex').slice(0, 32);
}

export async function isContactRateLimited(ipHash: string, now = Date.now()): Promise<boolean> {
  for (const { windowMs, max } of LIMITS) {
    const count = await db.contactMessage.count({ where: { ipHash, createdAt: { gte: new Date(now - windowMs) } } });
    if (count >= max) return true;
  }
  return false;
}

/** E-posta gönderimi için ayarlar. RESEND_API_KEY yoksa mesajlar yalnızca yönetim panelinde görünür. */
function mailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    from: process.env.CONTACT_MAIL_FROM?.trim() || `${SITE_NAME} <onboarding@resend.dev>`,
    to: process.env.CONTACT_MAIL_TO?.trim() || CONTACT.email,
  };
}

export function isMailConfigured() {
  return mailConfig() !== null;
}

export function buildContactEmail(m: ContactInput & { createdAt: Date }) {
  const when = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Istanbul' }).format(m.createdAt);
  const subject = `[${SITE_NAME}] ${m.subject}`.replace(/[\r\n]+/g, ' ').slice(0, 250);
  const text = [
    `${SITE_NAME} iletişim formundan yeni mesaj`,
    '',
    `Ad soyad: ${m.name}`,
    `E-posta: ${m.email}`,
    `Konu: ${m.subject}`,
    `Tarih: ${when}`,
    '',
    m.body,
    '',
    '—',
    'Bu e-postayı yanıtladığınızda yanıtınız doğrudan gönderene gider.',
  ].join('\n');
  const html = `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#1b2333;max-width:640px">
<p style="color:#8a6a3b;font-size:12px;letter-spacing:.15em;text-transform:uppercase;margin:0 0 12px">${escapeHtml(SITE_NAME)} · İletişim formu</p>
<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;margin-bottom:16px">
<tr><td style="padding:2px 12px 2px 0;color:#6b7280">Ad soyad</td><td><strong>${escapeHtml(m.name)}</strong></td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#6b7280">E-posta</td><td><a href="mailto:${escapeHtml(m.email)}">${escapeHtml(m.email)}</a></td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#6b7280">Konu</td><td>${escapeHtml(m.subject)}</td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#6b7280">Tarih</td><td>${escapeHtml(when)}</td></tr>
</table>
<div style="white-space:pre-wrap;border-left:3px solid #b08d57;padding:4px 0 4px 14px">${escapeHtml(m.body)}</div>
<p style="color:#6b7280;font-size:12px;margin-top:20px">Bu e-postayı yanıtladığınızda yanıtınız doğrudan gönderene gider.</p>
</div>`;
  return { subject, text, html };
}

async function sendMail(m: ContactInput & { createdAt: Date }): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = mailConfig();
  if (!config) return { ok: false, error: 'E-posta gönderimi ayarlı değil (RESEND_API_KEY).' };
  const { subject, text, html } = buildContactEmail(m);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.from, to: [config.to], reply_to: m.email, subject, text, html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true };
    const detail = (await res.text()).slice(0, 300);
    return { ok: false, error: `Resend ${res.status}: ${detail}` };
  } catch (error) {
    return { ok: false, error: `Gönderilemedi: ${error instanceof Error ? error.message : String(error)}`.slice(0, 300) };
  }
}

/** Mesajı kaydeder ve e-postayla iletmeyi dener. Gönderim başarısız olsa da mesaj kaybolmaz. */
export async function submitContactMessage(input: ContactInput, ipHash: string) {
  const saved = await db.contactMessage.create({ data: { ...input, ipHash } });
  const result = await sendMail(saved);
  await db.contactMessage.update({
    where: { id: saved.id },
    data: result.ok ? { emailedAt: new Date(), emailError: null } : { emailError: result.error },
  });
  // Bir yıldan eski mesajlar silinir.
  await db.contactMessage.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } });
  return { id: saved.id, emailed: result.ok };
}

export async function resendContactMessage(id: string) {
  const m = await db.contactMessage.findUnique({ where: { id } });
  if (!m) return { ok: false as const, error: 'Mesaj bulunamadı.' };
  const result = await sendMail(m);
  await db.contactMessage.update({
    where: { id },
    data: result.ok ? { emailedAt: new Date(), emailError: null } : { emailError: result.error },
  });
  return result;
}

export function listContactMessages() {
  return db.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
}

export function countUnreadMessages() {
  return db.contactMessage.count({ where: { readAt: null } });
}

export async function setMessageRead(id: string, read: boolean) {
  await db.contactMessage.updateMany({ where: { id }, data: { readAt: read ? new Date() : null } });
}

export async function deleteContactMessage(id: string) {
  await db.contactMessage.deleteMany({ where: { id } });
}
