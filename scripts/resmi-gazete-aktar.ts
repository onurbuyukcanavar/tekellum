/**
 * Resmî Gazete sayılarını resmigazete.gov.tr'den aktarır.
 *
 *   npm run resmi-gazete:aktar                          → bugün ve önceki iki gün
 *   npm run resmi-gazete:aktar -- 2026-11-01            → tek gün
 *   npm run resmi-gazete:aktar -- 2026-10-01 2026-10-31 → tarih aralığı (iki uç dahil)
 */
import 'dotenv/config';
import { importRange, importRecent, type DayResult } from '../lib/gazette/import';
import { isDateKey } from '../lib/gazette/source';
import { createPrismaClient } from '../lib/prisma-client';

async function main() {
  const [from, to = from] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (from && (!isDateKey(from) || !isDateKey(to) || from > to)) {
    throw new Error('Tarihler YYYY-AA-GG biçiminde olmalı ve başlangıç bitişten sonra olmamalı.');
  }
  const db = createPrismaClient();
  try {
    const results: DayResult[] = from ? await importRange(db, from, to) : await importRecent(db);
    let failed = 0;
    for (const day of results) {
      if (day.error) { failed++; console.log(`HATA    ${day.date}: ${day.error}`); continue; }
      if (!day.published) { console.log(`YOK     ${day.date}: yayımlanmamış`); continue; }
      for (const i of day.issues) {
        failed += i.failed ? 1 : 0;
        console.log(`TAMAM   ${day.date}${i.supplement ? ` (${i.supplement}. mükerrer)` : ''} sayı ${i.number}: ${i.items} madde, ${i.texts} metin${i.failed ? `, ${i.failed} metin alınamadı` : ''}`);
      }
    }
    if (failed) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
