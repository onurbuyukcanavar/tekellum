import { messageAction } from '@/app/yonetim/actions';
import { PageHeader } from '@/components/admin/page-header';
import { SubmitButton } from '@/components/admin/submit-button';
import { formatDateTime } from '@/lib/format';
import { isMailConfigured, listContactMessages } from '@/lib/services/contact';

export const metadata = { title: 'Mesajlar' };

export default async function AdminMessagesPage() {
  const messages = await listContactMessages();
  const unread = messages.filter((m) => !m.readAt).length;
  const mailOn = isMailConfigured();

  return (
    <>
      <PageHeader
        title="Mesajlar"
        description={`İletişim formundan gelen mesajlar${messages.length ? ` · ${messages.length} mesaj, ${unread} okunmamış` : ''}. Bir yıldan eski mesajlar otomatik silinir.`}
      />


      {messages.length === 0 ? (
        <p className="notice">Henüz mesaj yok.</p>
      ) : (
        <ul className="space-y-4">
          {messages.map((m) => {
            const replyHref = `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`;
            return (
              <li key={m.id} className={`card p-5 ${m.readAt ? '' : 'border-bronze/60'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      {!m.readAt && <span className="badge border-bronze/40 bg-bronze/10 text-bronze">Yeni</span>}
                      <span className="font-serif text-lg text-navy">{m.subject}</span>
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {m.name} · <a className="link-quiet" href={replyHref}>{m.email}</a>
                    </p>
                  </div>
                  <p className="text-xs text-muted">{formatDateTime(m.createdAt)}</p>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed text-ink">{m.body}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-xs">
                    {!mailOn ? null : m.emailedAt
                      ? <span className="text-ok-ink">E-postayla iletildi · {formatDateTime(m.emailedAt)}</span>
                      : <span className="text-warn-ink" title={m.emailError ?? undefined}>E-postayla iletilemedi{m.emailError ? ` — ${m.emailError.slice(0, 120)}` : ''}</span>}
                  </p>
                  <form action={messageAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <a className="btn !px-3 !py-1.5" href={replyHref}>Yanıtla</a>
                    {m.readAt
                      ? <SubmitButton className="btn-secondary !px-3 !py-1.5" name="op" value="okunmadi" pendingText="…">Okunmadı yap</SubmitButton>
                      : <SubmitButton className="btn-secondary !px-3 !py-1.5" name="op" value="okundu" pendingText="…">Okundu</SubmitButton>}
                    {!m.emailedAt && mailOn && (
                      <SubmitButton className="btn-secondary !px-3 !py-1.5" name="op" value="yeniden-gonder" pendingText="Gönderiliyor…">E-postayı yeniden gönder</SubmitButton>
                    )}
                    <details className="group relative">
                      <summary className="btn-secondary !px-3 !py-1.5 cursor-pointer list-none text-danger [&::-webkit-details-marker]:hidden">Sil</summary>
                      <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-line bg-paper-raised p-3 text-sm shadow-lg">
                        <p className="mb-2 text-ink-soft">Mesaj kalıcı olarak silinsin mi?</p>
                        <SubmitButton className="btn !px-3 !py-1.5 !bg-danger !border-danger" name="op" value="sil" pendingText="Siliniyor…">Evet, sil</SubmitButton>
                      </div>
                    </details>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
