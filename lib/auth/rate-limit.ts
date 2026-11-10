import 'server-only';
import { db } from '@/lib/db';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

export async function isLoginBlocked(ip: string, email: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    db.loginAttempt.count({ where: { key: `email:${email}`, createdAt: { gte: since } } }),
    db.loginAttempt.count({ where: { key: `ip:${ip}`, createdAt: { gte: since } } }),
  ]);
  return byEmail >= MAX_PER_EMAIL || byIp >= MAX_PER_IP;
}

export async function recordFailedLogin(ip: string, email: string): Promise<void> {
  await db.loginAttempt.createMany({ data: [{ key: `email:${email}` }, { key: `ip:${ip}` }] });
  // Eski kayıtları ara sıra temizle.
  if (Math.random() < 0.1) {
    await db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  }
}

export async function clearFailedLogins(email: string): Promise<void> {
  await db.loginAttempt.deleteMany({ where: { key: `email:${email}` } });
}
