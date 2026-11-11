/**
 * PostgreSQL bağlantı ayarları.
 *
 * Supabase'in sunucu sertifikası kendi kök sertifikasıyla (prod-ca-2021.crt) imzalıdır ve Node'un
 * güvendiği listede yoktur; bu yüzden `sslmode=require` tek başına "self-signed certificate in
 * certificate chain" hatası verir. DATABASE_CA_CERT tanımlıysa bağlantı bu kök sertifikayla
 * TAM doğrulanır (şifreli + sunucu kimliği ve alan adı kontrolü).
 */
import type { PoolConfig } from 'pg';

const SSL_PARAMS = ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat'];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
let warned = false;

export function pgConnectionConfig(connectionString: string): PoolConfig {
  // Vercel'e tek satır olarak yapıştırılan sertifikalarda "\n" kaçışları gerçek satır sonuna çevrilir.
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n').trim();
  const url = new URL(connectionString);

  if (ca) {
    for (const key of SSL_PARAMS) url.searchParams.delete(key);
    return { connectionString: url.toString(), ssl: { ca, rejectUnauthorized: true } };
  }

  if (!LOCAL_HOSTS.has(url.hostname) && !url.searchParams.has('sslmode') && !warned) {
    warned = true;
    console.warn(
      '[tekellum] Uyarı: DATABASE_CA_CERT tanımlı değil ve bağlantı adresinde sslmode yok; veritabanı bağlantısı şifrelenmeyebilir.',
    );
  }
  return { connectionString };
}
