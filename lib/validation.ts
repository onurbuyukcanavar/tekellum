import { z } from 'zod';
import { ARTICLE_CATEGORIES } from './constants';
import { slugify } from './slug';

const trimmed = (max: number, label: string) =>
  z.string().trim().max(max, `${label} en fazla ${max} karakter olabilir.`);

const slugField = z
  .string()
  .trim()
  .max(120, 'URL kısa adı en fazla 120 karakter olabilir.')
  .transform((value) => slugify(value));

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Geçerli bir e-posta adresi girin.')),
  password: z.string().min(1, 'Parola gerekli.').max(256),
  next: z.string().optional(),
});

export const passwordSchema = z
  .string()
  .min(12, 'Parola en az 12 karakter olmalı.')
  .max(256, 'Parola en fazla 256 karakter olabilir.');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut parola gerekli.'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Yeni parolalar eşleşmiyor.',
  });

export const lawRefSchema = z.object({
  lawId: z.string().min(1).max(40),
  provision: trimmed(40, 'Madde bilgisi').default(''),
});

export const articleInputSchema = z
  .object({
    title: trimmed(300, 'Başlık').min(1, 'Başlık zorunludur.'),
    slug: slugField,
    excerpt: trimmed(600, 'Kısa açıklama').default(''),
    content: z.string().max(2_000_000, 'Makale metni çok uzun.'),
    category: z.enum(ARTICLE_CATEGORIES, { error: 'Geçerli bir kategori seçin.' }),
    author: trimmed(120, 'Yazar').min(1, 'Yazar adı zorunludur.'),
    status: z.enum(['TASLAK', 'YAYINDA']),
    featured: z.boolean().default(false),
    lawRefs: z.array(lawRefSchema).max(50, 'En fazla 50 mevzuat bağlantısı eklenebilir.').default([]),
  })
  .transform((v) => ({ ...v, slug: v.slug || slugify(v.title) }))
  .refine((v) => v.slug.length > 0, { path: ['slug'], message: 'Başlıktan URL kısa adı üretilemedi; elle girin.' });

export const lawInputSchema = z
  .object({
    title: trimmed(300, 'Kanun adı').min(1, 'Kanun adı zorunludur.'),
    slug: slugField,
    lawNumber: trimmed(20, 'Kanun numarası').default(''),
    shortName: trimmed(20, 'Kısaltma').default(''),
    officialUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || /^https:\/\//i.test(v), 'Resmî kaynak bağlantısı https:// ile başlamalıdır.')
      .default(''),
    content: z.string().max(5_000_000, 'Mevzuat metni çok uzun.').default(''),
    verified: z.boolean().default(false),
  })
  .transform((v) => ({ ...v, slug: v.slug || slugify(v.title) }))
  .refine((v) => v.slug.length > 0, { path: ['slug'], message: 'Kanun adından URL kısa adı üretilemedi; elle girin.' });

export type ArticleInput = z.infer<typeof articleInputSchema>;
export type LawInput = z.infer<typeof lawInputSchema>;

/** Zod hatalarını alan → ilk mesaj biçimine çevirir. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
