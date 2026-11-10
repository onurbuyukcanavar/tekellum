import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Migration'lar havuzsuz (doğrudan) bağlantı ister; tanımlı değilse DATABASE_URL kullanılır.
const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: migrationUrl ? { url: migrationUrl } : undefined,
});
