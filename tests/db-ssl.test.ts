import { afterEach, describe, expect, it } from 'vitest';
import { pgConnectionConfig } from '@/lib/db-ssl';

const PEM = '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----';

describe('pgConnectionConfig', () => {
  afterEach(() => {
    delete process.env.DATABASE_CA_CERT;
  });
  it('kök sertifika yoksa adresi olduğu gibi kullanır', () => {
    expect(pgConnectionConfig('postgresql://u:p@localhost:5432/db')).toEqual({ connectionString: 'postgresql://u:p@localhost:5432/db' });
  });
  it('kök sertifika varsa tam doğrulama açar ve sslmode parametresini kaldırır', () => {
    process.env.DATABASE_CA_CERT = PEM;
    const cfg = pgConnectionConfig('postgresql://u:p@h.pooler.supabase.com:6543/postgres?sslmode=require&application_name=x');
    expect(cfg.ssl).toEqual({ ca: PEM, rejectUnauthorized: true });
    expect(cfg.connectionString).toBe('postgresql://u:p@h.pooler.supabase.com:6543/postgres?application_name=x');
  });
  it('tek satıra kaçışlı yapıştırılmış sertifikayı çözer', () => {
    process.env.DATABASE_CA_CERT = PEM.replace(/\n/g, '\\n');
    expect((pgConnectionConfig('postgresql://u:p@h:5432/d').ssl as { ca: string }).ca).toBe(PEM);
  });
});
