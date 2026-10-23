import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
export const revalidate = 0;
export default async function Home() {
  const supabase = await createClient();
  const { data: articles, error } = await supabase.from('articles').select('id,title,slug,excerpt,category,author,published_at,featured').eq('status','published').order('published_at',{ascending:false}).limit(30);
  return <><section className="hero"><div className="eyebrow">Bağımsız hukuk ve düşünce yayını</div><h1>Hukuku anlamak,<br/>metinle düşünmek.</h1><p>Müessir; hukuk, düşünce ve metin üzerine makalelerin, çalışma notlarının ve mevzuat kaynaklarının bir araya geldiği kişisel yayın platformudur.</p></section><div className="section-head"><h2>Son yazılar</h2><span className="kicker">Makaleler / 01</span></div>{error?<div className="notice">İçerik veritabanına şu anda erişilemiyor. Kurulum adımlarındaki Supabase yapılandırmasını kontrol edin.</div>:<div className="article-grid">{articles?.length?articles.map(a=><Link className="article-card" href={`/articles/${a.slug}`} key={a.id}><div className="tag">{a.category}{a.featured?' · Öne çıkan':''}</div><h3 className="article-title">{a.title}</h3><p className="excerpt">{a.excerpt}</p><div className="meta"><span>{a.author||'Müessir'}</span><span>{a.published_at?new Date(a.published_at).toLocaleDateString('tr-TR'):''}</span></div></Link>):<div className="empty">Henüz yayımlanmış makale bulunmuyor. Yönetim panelinden ilk yazınızı yayımlayabilirsiniz.</div>}</div>}</>;
}
