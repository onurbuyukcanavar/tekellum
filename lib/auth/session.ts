import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { SESSION_COOKIE, SESSION_TTL_MS } from './cookie';

export type SessionUser = { id: string; email: string; name: string; sessionId: string };

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const userAgent = ((await headers()).get('user-agent') ?? '').slice(0, 300);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt, userAgent } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/** Geçerli oturumun kullanıcısı; istek başına bir kez sorgulanır. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return { ...session.user, sessionId: session.id };
});

/** Yönetim sayfaları ve tüm yazma işlemleri bunu çağırır; oturum yoksa giriş sayfasına yönlendirir. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/yonetim/giris');
  return user;
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

export async function destroyOtherSessions(userId: string, keepSessionId: string): Promise<number> {
  const { count } = await db.session.deleteMany({ where: { userId, id: { not: keepSessionId } } });
  return count;
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
