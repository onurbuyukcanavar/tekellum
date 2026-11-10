import { OtherSessionsForm, PasswordForm } from '@/components/admin/password-form';
import { PageHeader } from '@/components/admin/page-header';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Hesap' };

export default async function AccountPage() {
  const me = await requireAdmin();
  const sessions = await db.session.findMany({
    where: { userId: me.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, userAgent: true },
  });
  return (
    <>
      <PageHeader title="Hesap" description={me.email} />
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-5 text-xl">Parola</h2>
          <PasswordForm />
        </section>
        <section className="card p-6">
          <h2 className="mb-2 text-xl">Açık oturumlar</h2>
          <p className="mb-5 text-sm text-muted">Oturumlar 7 gün sonra kendiliğinden sona erer.</p>
          <ul className="mb-6 divide-y divide-line text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="py-2.5">
                <span className="font-medium">{s.id === me.sessionId ? 'Bu cihaz' : 'Başka bir cihaz'}</span>
                <span className="text-muted"> · {formatDateTime(s.createdAt)}</span>
                <div className="truncate text-xs text-muted">{s.userAgent || 'Tarayıcı bilgisi yok'}</div>
              </li>
            ))}
          </ul>
          {sessions.length > 1 && <OtherSessionsForm />}
        </section>
      </div>
    </>
  );
}
