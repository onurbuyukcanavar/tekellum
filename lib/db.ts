import 'server-only';
import type { PrismaClient } from '@/generated/prisma/client';
import { createPrismaClient } from './prisma-client';

// Geliştirmede sıcak yeniden yükleme her seferinde yeni bağlantı havuzu açmasın diye tek örnek tutulur.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}

// İlk sorguya kadar bağlantı kurulmaz; böylece derleme sırasında veritabanı gerekmez.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
