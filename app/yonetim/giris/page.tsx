import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/login-form';
import { Logo } from '@/components/logo';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Yönetici girişi', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ sonra?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { sonra } = await searchParams;
  if (await getCurrentUser()) redirect('/yonetim');
  const next = sonra && sonra.startsWith('/yonetim') && !sonra.startsWith('//') ? sonra : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center"><Logo /></div>
        <div className="card p-7 shadow-sm">
          <h1 className="text-2xl">Yönetici girişi</h1>
          <p className="mt-2 mb-6 text-sm text-muted">Bu alan yalnızca yetkili kullanıcı içindir.</p>
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-center text-sm"><Link href="/" className="link-quiet text-muted">← Siteye dön</Link></p>
      </div>
    </main>
  );
}
