import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Dağıtım ve veritabanı bağlantısı için sağlık kontrolü. */
export async function GET() {
  const startedAt = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: 'ok', latencyMs: Date.now() - startedAt }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, database: 'erisilemiyor' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
