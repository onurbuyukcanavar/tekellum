/**
 * Başlangıç kataloğu: 12 temel kanunun adı, numarası ve Mevzuat Bilgi Sistemi bağlantısı.
 * Metin İÇERMEZ; tüm kayıtlar "Doğrulanmayı bekliyor" durumunda oluşturulur.
 * Var olan kayıtlara dokunmaz (tekrar çalıştırmak güvenlidir).
 */
import 'dotenv/config';
import { createPrismaClient } from '../lib/prisma-client';

const mbs = (no: string, tertip: number) =>
  `https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=${no}&MevzuatTur=1&MevzuatTertip=${tertip}`;

const LAWS = [
  { title: 'Türk Medenî Kanunu', slug: 'turk-medeni-kanunu', lawNumber: '4721', shortName: 'TMK', tertip: 5 },
  { title: 'Türk Borçlar Kanunu', slug: 'turk-borclar-kanunu', lawNumber: '6098', shortName: 'TBK', tertip: 5 },
  { title: 'Hukuk Muhakemeleri Kanunu', slug: 'hukuk-muhakemeleri-kanunu', lawNumber: '6100', shortName: 'HMK', tertip: 5 },
  { title: 'İcra ve İflas Kanunu', slug: 'icra-ve-iflas-kanunu', lawNumber: '2004', shortName: 'İİK', tertip: 3 },
  { title: 'Türk Ceza Kanunu', slug: 'turk-ceza-kanunu', lawNumber: '5237', shortName: 'TCK', tertip: 5 },
  { title: 'Ceza Muhakemesi Kanunu', slug: 'ceza-muhakemesi-kanunu', lawNumber: '5271', shortName: 'CMK', tertip: 5 },
  { title: 'Türkiye Cumhuriyeti Anayasası', slug: 'turkiye-cumhuriyeti-anayasasi', lawNumber: '2709', shortName: 'AY', tertip: 5 },
  { title: 'İş Kanunu', slug: 'is-kanunu', lawNumber: '4857', shortName: 'İşK', tertip: 5 },
  { title: 'İdari Yargılama Usulü Kanunu', slug: 'idari-yargilama-usulu-kanunu', lawNumber: '2577', shortName: 'İYUK', tertip: 5 },
  { title: 'Türk Ticaret Kanunu', slug: 'turk-ticaret-kanunu', lawNumber: '6102', shortName: 'TTK', tertip: 5 },
  { title: 'Tüketicinin Korunması Hakkında Kanun', slug: 'tuketicinin-korunmasi-hakkinda-kanun', lawNumber: '6502', shortName: 'TKHK', tertip: 5 },
  { title: 'Kişisel Verilerin Korunması Kanunu', slug: 'kisisel-verilerin-korunmasi-kanunu', lawNumber: '6698', shortName: 'KVKK', tertip: 5 },
];

async function main() {
  const prisma = createPrismaClient(process.env.DIRECT_URL || process.env.DATABASE_URL);
  try {
    let created = 0;
    for (const { tertip, ...law } of LAWS) {
      const exists = await prisma.law.findUnique({ where: { slug: law.slug }, select: { id: true } });
      if (exists) continue;
      await prisma.law.create({ data: { ...law, officialUrl: mbs(law.lawNumber, tertip) } });
      created += 1;
    }
    console.log(`Mevzuat kataloğu: ${created} yeni kayıt eklendi, ${LAWS.length - created} kayıt zaten vardı.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
