/**
 * Kayıtlı kanunların güncel (konsolide) metnini Mevzuat Bilgi Sistemi'nden alır, Tekellüm biçimine çevirir,
 * denetler ve "Doğrulandı" olarak kaydeder.
 *
 *   npm run mevzuat:aktar                       → tüm kanunlar
 *   npm run mevzuat:aktar -- turk-borclar-kanunu → yalnızca belirtilen kısa adlar
 *   npm run mevzuat:aktar -- --kuru             → veritabanına yazmaz; .mevzuat-cikti/ klasörüne yazar
 *
 * Denetimler (biri bile geçmezse o kanun yazılmaz):
 *   - kaynak gerçekten mevzuat.gov.tr olmalı ve HTTP 200 dönmeli,
 *   - dönüştürülen metin, resmî HTML'deki kelimelerin en az %99,9'unu içermeli,
 *   - en az bir madde algılanmalı ve bozuk karakter (�) bulunmamalı.
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createPrismaClient } from '../lib/prisma-client';
import { articleLabels, convertMevzuatHtml, coverage, mbsTextUrl, parseMbsUrl, rawBodyText } from './mevzuat/donustur.mjs';

const UA = 'Mozilla/5.0 (compatible; TekellumMevzuat/1.0; +https://tekellum.vercel.app)';
const MIN_COVERAGE = 0.999;

async function fetchText(url: string, tries = 3): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastError;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--kuru');
  const only = args.filter((a) => !a.startsWith('--'));

  const prisma = createPrismaClient(process.env.DIRECT_URL || process.env.DATABASE_URL);
  let failed = 0;
  try {
    const laws = await prisma.law.findMany({
      where: only.length ? { slug: { in: only } } : undefined,
      select: { id: true, slug: true, title: true, officialUrl: true, content: true, verificationStatus: true },
      orderBy: { title: 'asc' },
    });
    if (!laws.length) throw new Error('Aktarılacak kanun bulunamadı.');
    if (dryRun) mkdirSync('.mevzuat-cikti', { recursive: true });

    for (const law of laws) {
      const ref = parseMbsUrl(law.officialUrl);
      if (!ref) {
        console.warn(`ATLANDI  ${law.title}: resmî kaynak bağlantısı bir Mevzuat Bilgi Sistemi adresi değil.`);
        continue;
      }
      try {
        const html = await fetchText(mbsTextUrl(ref));
        const text = convertMevzuatHtml(html);
        const cov = coverage(rawBodyText(html), text);
        const labels = articleLabels(text);
        const problems = [
          cov < MIN_COVERAGE && `kelime kapsaması düşük (${cov.toFixed(5)})`,
          labels.length === 0 && 'hiç madde algılanamadı',
          text.includes('�') && 'bozuk karakter var',
          text.length < 1000 && 'metin beklenenden kısa',
        ].filter(Boolean);
        if (problems.length) throw new Error(problems.join('; '));

        const summary = `${labels.length} madde, ${text.length.toLocaleString('tr-TR')} karakter, kapsama ${cov.toFixed(5)}`;
        if (dryRun) {
          writeFileSync(`.mevzuat-cikti/${law.slug}.txt`, text);
          console.log(`KURU     ${law.title}: ${summary}`);
          continue;
        }
        const changed = text !== law.content;
        await prisma.law.update({
          where: { id: law.id },
          data: { content: text, verificationStatus: 'DOGRULANDI', verifiedAt: new Date() },
        });
        console.log(`${changed ? 'GÜNCEL  ' : 'AYNI    '} ${law.title}: ${summary}`);
      } catch (error) {
        failed += 1;
        console.error(`HATA     ${law.title}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await new Promise((r) => setTimeout(r, 750)); // resmî sunucuya nazik davran
    }
  } finally {
    await prisma.$disconnect();
  }
  if (failed) {
    console.error(`${failed} kanun aktarılamadı; bu kayıtlar değiştirilmedi.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
