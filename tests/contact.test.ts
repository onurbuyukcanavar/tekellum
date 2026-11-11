import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: {} }));

const { buildContactEmail, hashIp } = await import('@/lib/services/contact');
const { contactMessageSchema } = await import('@/lib/validation');

const valid = { name: '  Ayşe   Yılmaz ', email: ' Ayse@Ornek.COM ', subject: 'Makale  hakkında', body: 'Merhaba,\r\nyazınızla ilgili bir sorum var.' };

describe('iletişim formu doğrulaması', () => {
  it('geçerli girdiyi temizler', () => {
    const r = contactMessageSchema.parse(valid);
    expect(r).toEqual({ name: 'Ayşe Yılmaz', email: 'ayse@ornek.com', subject: 'Makale hakkında', body: 'Merhaba,\nyazınızla ilgili bir sorum var.' });
  });

  it('eksik ve hatalı alanları Türkçe mesajlarla reddeder', () => {
    const r = contactMessageSchema.safeParse({ name: 'A', email: 'gecersiz', subject: '', body: 'kısa' });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(new Set(paths)).toEqual(new Set(['name', 'email', 'subject', 'body']));
    expect(r.error!.issues.find((i) => i.path[0] === 'email')!.message).toBe('Geçerli bir e-posta adresi girin.');
  });

  it('çok uzun mesajı reddeder', () => {
    expect(contactMessageSchema.safeParse({ ...valid, body: 'a'.repeat(5001) }).success).toBe(false);
  });
});

describe('bildirim e-postası', () => {
  it('kullanıcı girdisini HTML olarak çalıştırmaz ve konuda satır sonuna izin vermez', () => {
    const mail = buildContactEmail({
      name: '<script>alert(1)</script>', email: 'a@b.com', subject: 'Konu\r\nBcc: x@y.com', body: '<img src=x onerror=alert(1)>', createdAt: new Date('2026-11-11T10:00:00Z'),
    });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.subject).toBe('[Tekellüm] Konu Bcc: x@y.com');
    expect(mail.text).toContain('Ad soyad: <script>alert(1)</script>');
  });

  it('IP adresini saklamak yerine sabit uzunlukta özetler', () => {
    expect(hashIp('1.2.3.4')).toMatch(/^[0-9a-f]{32}$/);
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'));
  });
});
