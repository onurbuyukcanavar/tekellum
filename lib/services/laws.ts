import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { isOfficialSourceUrl } from '@/lib/official-source';
import type { LawInput } from '@/lib/validation';
import type { SaveResult } from './articles';

const byTurkishTitle = <T extends { title: string }>(rows: T[]) =>
  rows.sort((a, b) => a.title.localeCompare(b.title, 'tr-TR'));

export async function listLaws() {
  return byTurkishTitle(await db.law.findMany({
    select: {
      id: true, title: true, slug: true, lawNumber: true, shortName: true, officialUrl: true,
      verificationStatus: true, verifiedAt: true, updatedAt: true,
    },
  }));
}

export async function listLawOptions() {
  return byTurkishTitle(await db.law.findMany({ select: { id: true, title: true, shortName: true, lawNumber: true } }));
}

export function getLawBySlug(slug: string) {
  return db.law.findUnique({
    where: { slug },
    include: {
      articleRefs: {
        where: { article: { status: 'YAYINDA' } },
        include: { article: { select: { title: true, slug: true, publishedAt: true } } },
      },
    },
  });
}

export function getLawForAdmin(id: string) {
  return db.law.findUnique({ where: { id }, include: { _count: { select: { articleRefs: true } } } });
}

export async function saveLaw(id: string | null, input: LawInput): Promise<SaveResult> {
  const existing = id
    ? await db.law.findUnique({ where: { id }, select: { content: true, verificationStatus: true, verifiedAt: true } })
    : null;
  if (id && !existing) return { ok: false, errors: { _form: 'Mevzuat kaydı bulunamadı; silinmiş olabilir.' } };

  const content = input.content.replace(/\r\n?/g, '\n').trim();
  if (input.verified) {
    if (!content) return { ok: false, errors: { verified: 'Metni olmayan bir kayıt doğrulanmış olarak işaretlenemez.' } };
    if (!isOfficialSourceUrl(input.officialUrl)) {
      return {
        ok: false,
        errors: { verified: 'Doğrulama için resmî kaynak bağlantısı mevzuat.gov.tr veya resmigazete.gov.tr adresinde olmalıdır.' },
      };
    }
  }

  // Metin değişmediyse ve zaten doğrulanmışsa eski doğrulama tarihi korunur; aksi hâlde yeniden damgalanır.
  const unchangedVerified =
    existing?.verificationStatus === 'DOGRULANDI' && existing.content === content && input.verified;
  const data = {
    title: input.title,
    slug: input.slug,
    lawNumber: input.lawNumber,
    shortName: input.shortName,
    officialUrl: input.officialUrl,
    content,
    verificationStatus: input.verified ? ('DOGRULANDI' as const) : ('DOGRULANMAYI_BEKLIYOR' as const),
    verifiedAt: input.verified ? (unchangedVerified ? existing!.verifiedAt : new Date()) : null,
  };

  try {
    const saved = id ? await db.law.update({ where: { id }, data }) : await db.law.create({ data });
    return { ok: true, id: saved.id, slug: saved.slug };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, errors: { slug: 'Bu URL kısa adı başka bir mevzuat kaydında kullanılıyor.' } };
    }
    throw error;
  }
}

export async function deleteLaw(id: string): Promise<void> {
  await db.law.deleteMany({ where: { id } });
}
