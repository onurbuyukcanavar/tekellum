/**
 * Resmî Gazete içe aktarımı: fihristi çeker, sayıyı ve maddeleri kaydeder, metin maddelerini temizleyip saklar.
 * Hem zamanlanmış görevde hem yönetim panelinde hem de komut satırı betiğinde kullanılır.
 */
import type { PrismaClient } from '@/generated/prisma/client';
import {
  RG_USER_AGENT, addDays, cleanItemHtml, dateKeyToDate, decodeHtml, indexUrl, isDateKey, parseIndex, textOf, todayKey,
  type DateKey,
} from './source';

/** Bir günde bakılacak en yüksek mükerrer sayısı. */
const MAX_SUPPLEMENTS = 5;
const CONTENT_CONCURRENCY = 4;

type Fetched = { status: number; bytes: Uint8Array; contentType: string };

async function fetchBytes(url: string): Promise<Fetched> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': RG_USER_AGENT, Accept: 'text/html,*/*' },
        signal: AbortSignal.timeout(30_000),
        cache: 'no-store',
      });
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      const bytes = res.ok ? new Uint8Array(await res.arrayBuffer()) : new Uint8Array();
      return { status: res.status, bytes, contentType: res.headers.get('content-type') ?? '' };
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export type IssueResult = { date: DateKey; supplement: number; number: number; items: number; texts: number; failed: number };
export type DayResult = { date: DateKey; issues: IssueResult[]; published: boolean; error?: string };

/** Bir sayıyı (ve metin maddelerini) aktarır. Sayı yoksa veya o gün yayımlanmadıysa null döner. */
export async function importIssue(db: PrismaClient, date: DateKey, supplement: number, deadline = Infinity): Promise<IssueResult | null> {
  const url = indexUrl(date, supplement);
  const res = await fetchBytes(url);
  if (res.status === 404) return null;
  if (!(res.status >= 200 && res.status < 300)) throw new Error(`${url}: HTTP ${res.status}`);

  const parsed = parseIndex(decodeHtml(res.bytes, res.contentType), url);
  if (!parsed.published || parsed.number == null) return null;

  const issue = await db.gazetteIssue.upsert({
    where: { date_supplement: { date: dateKeyToDate(date), supplement } },
    create: { date: dateKeyToDate(date), supplement, number: parsed.number, sourceUrl: url, pdfUrl: parsed.pdfUrl },
    update: { number: parsed.number, sourceUrl: url, pdfUrl: parsed.pdfUrl, fetchedAt: new Date() },
  });

  const codes = parsed.items.map((i) => i.code);
  await db.$transaction([
    db.gazetteItem.deleteMany({ where: { issueId: issue.id, code: { notIn: codes } } }),
    ...parsed.items.map((item, position) =>
      db.gazetteItem.upsert({
        where: { issueId_code: { issueId: issue.id, code: item.code } },
        create: { issueId: issue.id, position, ...item },
        update: { position, section: item.section, category: item.category, title: item.title, kind: item.kind, sourceUrl: item.sourceUrl },
      }),
    ),
  ]);

  // Henüz metni alınmamış (veya önceki denemesi başarısız olmuş) metin maddeleri.
  const pending = await db.gazetteItem.findMany({
    where: { issueId: issue.id, kind: 'METIN', OR: [{ contentFetchedAt: null }, { error: { not: '' } }] },
    select: { id: true, sourceUrl: true },
    orderBy: { position: 'asc' },
  });

  let failed = 0;
  const queue = [...pending];
  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      if (Date.now() > deadline) { failed++; continue; }
      try {
        const page = await fetchBytes(next.sourceUrl);
        if (page.status !== 200) throw new Error(`HTTP ${page.status}`);
        const content = cleanItemHtml(decodeHtml(page.bytes, page.contentType), next.sourceUrl);
        if (textOf(content).length < 20) throw new Error('Metin boş görünüyor');
        if (content.includes('�')) throw new Error('Karakter kodlaması çözülemedi');
        await db.gazetteItem.update({ where: { id: next.id }, data: { content, error: '', contentFetchedAt: new Date() } });
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        await db.gazetteItem.update({ where: { id: next.id }, data: { error: message.slice(0, 300), contentFetchedAt: new Date() } });
      }
    }
  }
  await Promise.all(Array.from({ length: CONTENT_CONCURRENCY }, worker));

  return {
    date, supplement, number: parsed.number, items: parsed.items.length,
    texts: parsed.items.filter((i) => i.kind === 'METIN').length, failed,
  };
}

/** Bir günün normal ve mükerrer sayılarını aktarır. */
export async function importDay(db: PrismaClient, date: DateKey, deadline = Infinity): Promise<DayResult> {
  if (!isDateKey(date)) throw new Error(`Geçersiz tarih: ${date}`);
  const issues: IssueResult[] = [];
  try {
    for (let supplement = 0; supplement <= MAX_SUPPLEMENTS; supplement++) {
      const result = await importIssue(db, date, supplement, deadline);
      if (!result) {
        if (supplement === 0) continue; // asıl sayı yoksa da mükerrer olabilir (nadir); bir sonrakine bak
        break;
      }
      issues.push(result);
    }
    return { date, issues, published: issues.length > 0 };
  } catch (error) {
    return { date, issues, published: issues.length > 0, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Tarih aralığını (dahil) yeniden eskiye doğru aktarır; süre sınırı aşılırsa durur. */
export async function importRange(db: PrismaClient, from: DateKey, to: DateKey, deadline = Infinity): Promise<DayResult[]> {
  const results: DayResult[] = [];
  for (let day = to; day >= from; day = addDays(day, -1)) {
    if (Date.now() > deadline) break;
    results.push(await importDay(db, day, deadline));
  }
  return results;
}

/** Günlük görev: bugün ve son iki gün (geç yayımlanan mükerrer sayılar ve başarısız metinler için). */
export async function importRecent(db: PrismaClient, now = new Date(), deadline = Infinity): Promise<DayResult[]> {
  const today = todayKey(now);
  return importRange(db, addDays(today, -2), today, deadline);
}
