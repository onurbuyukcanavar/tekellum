import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl">Kayıt bulunamadı.</h1>
      <p className="mt-2 text-muted">Silinmiş olabilir.</p>
      <Link href="/yonetim" className="btn mt-6">Genel bakışa dön</Link>
    </div>
  );
}
