import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { importRange, importRecent } from '@/lib/gazette/import';
import { addDays, isDateKey, todayKey } from '@/lib/gazette/source';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_RANGE_DAYS = 31;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // gizli anahtar tanımlı değilse kimse çalıştıramaz
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Vercel Cron her gece bugünün ve önceki iki günün sayılarını aktarır.
 * Aynı gizli anahtarla ?baslangic=YYYY-AA-GG&bitis=YYYY-AA-GG verilerek geçmiş dönem (en fazla 31 gün) aktarılabilir.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const deadline = Date.now() + (maxDuration - 30) * 1000;

  const from = request.nextUrl.searchParams.get('baslangic');
  const to = request.nextUrl.searchParams.get('bitis') ?? from;
  let results;
  if (from || to) {
    if (!from || !to || !isDateKey(from) || !isDateKey(to) || from > to || to > todayKey() || addDays(from, MAX_RANGE_DAYS - 1) < to) {
      return NextResponse.json({ ok: false, error: `Geçersiz tarih aralığı (en fazla ${MAX_RANGE_DAYS} gün).` }, { status: 400 });
    }
    results = await importRange(db, from, to, deadline);
  } else {
    results = await importRecent(db, new Date(), deadline);
  }
  const ok = results.every((r) => !r.error);
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 502, headers: { 'Cache-Control': 'no-store' } });
}
