/**
 * Yönetici hesabı oluşturur ya da var olan hesabın parolasını sıfırlar.
 *   npm run yonetici:olustur -- ornek@alanadi.com "Ad Soyad"
 * Parola gizli olarak sorulur; otomasyonda ADMIN_PASSWORD ortam değişkeniyle verilebilir.
 */
import 'dotenv/config';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { hashPassword } from '../lib/auth/password';
import { createPrismaClient } from '../lib/prisma-client';
import { passwordSchema } from '../lib/validation';

function askHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const name = process.argv[3]?.trim() ?? '';
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Kullanım: npm run yonetici:olustur -- eposta@alanadi.com "Ad Soyad"');
    process.exit(1);
  }

  let password = process.env.ADMIN_PASSWORD ?? '';
  if (!password) {
    password = await askHidden('Yeni parola (en az 12 karakter): ');
    const again = await askHidden('Parolayı tekrar girin: ');
    if (password !== again) {
      console.error('Parolalar eşleşmiyor.');
      process.exit(1);
    }
  }
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    console.error(parsed.error.issues[0]?.message);
    process.exit(1);
  }

  const prisma = createPrismaClient(process.env.DIRECT_URL || process.env.DATABASE_URL);
  try {
    const passwordHash = await hashPassword(password);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.$transaction([
        prisma.user.update({ where: { email }, data: { passwordHash, ...(name ? { name } : {}) } }),
        prisma.session.deleteMany({ where: { userId: existing.id } }),
      ]);
      console.log(`${email} hesabının parolası güncellendi; açık oturumların tümü kapatıldı.`);
    } else {
      await prisma.user.create({ data: { email, name, passwordHash } });
      console.log(`Yönetici hesabı oluşturuldu: ${email}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
