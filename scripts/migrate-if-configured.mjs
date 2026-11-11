// Vercel derlemesinde veritabanı tanımlıysa bekleyen migration'ları uygular ve başlangıç
// kataloğunu yükler (seed tekrar çalıştırılmaya karşı güvenlidir); veritabanı yoksa atlar.
import { spawnSync } from 'node:child_process';

if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.warn('[tekellum] DATABASE_URL tanımlı değil; migration adımı atlandı. Site çalışmak için bu değişkene ihtiyaç duyar.');
  process.exit(0);
}

const run = (args) => spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' }).status ?? 1;

const migrated = run(['prisma', 'migrate', 'deploy']);
if (migrated !== 0) process.exit(migrated);
process.exit(run(['prisma', 'db', 'seed']));
