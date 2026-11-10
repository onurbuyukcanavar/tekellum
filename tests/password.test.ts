import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('parola özeti', () => {
  it('doğru parolayı kabul eder, yanlışı reddeder', async () => {
    const hash = await hashPassword('Çok-Gizli-Parola-2026');
    expect(hash.startsWith('scrypt$32768$8$1$')).toBe(true);
    expect(await verifyPassword('Çok-Gizli-Parola-2026', hash)).toBe(true);
    expect(await verifyPassword('çok-gizli-parola-2026', hash)).toBe(false);
  });
  it('her özet farklı tuz kullanır', async () => {
    expect(await hashPassword('ayni-parola-12')).not.toBe(await hashPassword('ayni-parola-12'));
  });
  it('bozuk özet biçimlerini reddeder', async () => {
    expect(await verifyPassword('x', 'bcrypt$abc')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$a$b$c$d$e')).toBe(false);
  });
});
