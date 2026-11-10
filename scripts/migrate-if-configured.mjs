// Vercel derlemesinde veritabanı tanımlıysa bekleyen migration'ları uygular; değilse atlar.
import { spawnSync } from 'node:child_process';

if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.warn('[muessir] DATABASE_URL tanımlı değil; migration adımı atlandı. Site çalışmak için bu değişkene ihtiyaç duyar.');
  process.exit(0);
}
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
