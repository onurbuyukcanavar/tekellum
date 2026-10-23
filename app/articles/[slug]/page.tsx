import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { safeArticleHtml } from '@/lib/content';
export const revalidate = 0;
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params;const s=await createClient();const {data}=await s.from('articles').select('title,excerpt').eq('slug',slug).eq('status','published').maybeSingle();return {title:data?.title||'Makale',description:data?.excerpt||undefined};}
export default async function ArticlePage({params}:Props){const {slug}=await params;const s=await createClient();const {data,error}=await s.from('articles').select('*').eq('slug',slug).eq('status','published').maybeSingle();if(error||!data)notFound();return <article className="article-body"><div className="eyebrow">{data.category||'Makale'}</div><h1>{data.title}</h1>{data.excerpt&&<p className="article-lead">{data.excerpt}</p>}<div className="meta"><span>{data.author||'Müessir'}</span><span>{data.published_at?new Date(data.published_at).toLocaleDateString('tr-TR'):''}</span></div><hr style={{border:0,borderTop:'1px solid var(--line)',margin:'28px 0'}}/><div className="prose" dangerouslySetInnerHTML={{__html:safeArticleHtml(data.content)}} /><div className="notice">Bu yazı genel bilgilendirme ve düşünce paylaşımı amacı taşır; somut olaylara ilişkin hukuki danışmanlık yerine geçmez.</div></article>}
