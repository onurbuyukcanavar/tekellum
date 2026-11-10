'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getDummyHash, hashPassword, verifyPassword } from '@/lib/auth/password';
import { clearFailedLogins, isLoginBlocked, recordFailedLogin } from '@/lib/auth/rate-limit';
import {
  createSession, destroyCurrentSession, destroyOtherSessions, purgeExpiredSessions, requireAdmin,
} from '@/lib/auth/session';
import { clientIp } from '@/lib/request';
import * as articles from '@/lib/services/articles';
import * as laws from '@/lib/services/laws';
import { articleInputSchema, changePasswordSchema, fieldErrors, lawInputSchema, loginSchema } from '@/lib/validation';

export type FormState = { errors?: Record<string, string>; message?: string; ok?: boolean };

const GENERIC_LOGIN_ERROR = 'E-posta adresi veya parola hatalı.';

function safeNext(value: string | undefined): string {
  return value && /^\/yonetim(\/|$|\?)/.test(value) && !value.startsWith('//') ? value : '/yonetim';
}

// ---------------------------------------------------------------- oturum

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') || undefined,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { email, password, next } = parsed.data;

  const ip = await clientIp();
  if (await isLoginBlocked(ip, email)) {
    return { message: 'Çok sayıda başarısız deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin.' };
  }

  const user = await db.user.findUnique({ where: { email } });
  // Kullanıcı yoksa da parola doğrulaması yapılır; böylece yanıt süresi hesabın varlığını ele vermez.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) {
    await recordFailedLogin(ip, email);
    return { message: GENERIC_LOGIN_ERROR };
  }

  await clearFailedLogins(email);
  await createSession(user.id);
  await purgeExpiredSessions();
  redirect(safeNext(next));
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect('/');
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { errors: { currentPassword: 'Mevcut parola hatalı.' } };
  }
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } });
  const closed = await destroyOtherSessions(me.id, me.sessionId);
  return { ok: true, message: `Parola güncellendi. Diğer cihazlardaki ${closed} oturum kapatıldı.` };
}

export async function logoutOtherSessionsAction(): Promise<FormState> {
  const me = await requireAdmin();
  const closed = await destroyOtherSessions(me.id, me.sessionId);
  return { ok: true, message: `${closed} oturum kapatıldı.` };
}

// ---------------------------------------------------------------- makaleler

function parseJsonArray(value: FormDataEntryValue | null): unknown[] {
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveArticleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = (formData.get('id') as string) || null;
  const parsed = articleInputSchema.safeParse({
    title: formData.get('title') ?? '',
    slug: formData.get('slug') ?? '',
    excerpt: formData.get('excerpt') ?? '',
    content: formData.get('content') ?? '',
    category: formData.get('category'),
    author: formData.get('author') ?? '',
    status: formData.get('status'),
    featured: formData.get('featured') === 'on',
    lawRefs: parseJsonArray(formData.get('lawRefs')),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: 'Lütfen işaretli alanları düzeltin.' };

  const result = await articles.saveArticle(id, parsed.data);
  if (!result.ok) return { errors: result.errors, message: result.errors._form ?? 'Lütfen işaretli alanları düzeltin.' };

  revalidatePath('/', 'layout');
  redirect(`/yonetim/makaleler/${result.id}?kaydedildi=1`);
}

export async function deleteArticleAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (id) await articles.deleteArticle(id);
  revalidatePath('/', 'layout');
  redirect('/yonetim/makaleler?silindi=1');
}

// ---------------------------------------------------------------- mevzuat

export async function saveLawAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = (formData.get('id') as string) || null;
  const parsed = lawInputSchema.safeParse({
    title: formData.get('title') ?? '',
    slug: formData.get('slug') ?? '',
    lawNumber: formData.get('lawNumber') ?? '',
    shortName: formData.get('shortName') ?? '',
    officialUrl: formData.get('officialUrl') ?? '',
    content: formData.get('content') ?? '',
    verified: formData.get('verified') === 'on',
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: 'Lütfen işaretli alanları düzeltin.' };

  const result = await laws.saveLaw(id, parsed.data);
  if (!result.ok) return { errors: result.errors, message: result.errors._form ?? 'Lütfen işaretli alanları düzeltin.' };

  revalidatePath('/', 'layout');
  redirect(`/yonetim/mevzuat/${result.id}?kaydedildi=1`);
}

export async function deleteLawAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (id) await laws.deleteLaw(id);
  revalidatePath('/', 'layout');
  redirect('/yonetim/mevzuat?silindi=1');
}
