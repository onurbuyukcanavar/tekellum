import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { pgConnectionConfig } from './db-ssl';

/** Hem Next.js uygulaması hem de komut satırı betikleri için Prisma istemcisi üretir. */
export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL tanımlı değil. .env.example dosyasına bakın.');
  }
  const adapter = new PrismaPg({ ...pgConnectionConfig(connectionString), max: Number(process.env.DATABASE_POOL_MAX || 5) });
  return new PrismaClient({ adapter });
}
