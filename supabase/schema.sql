-- Müessir schema — run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  category text not null default 'Hukuk',
  author text not null default 'Müessir',
  status text not null default 'draft' check (status in ('draft','published')),
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.laws (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  law_number text not null default '',
  official_url text not null default '',
  content text not null default '',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists articles_updated_at on public.articles;
create trigger articles_updated_at before update on public.articles for each row execute procedure public.set_updated_at();
drop trigger if exists laws_updated_at on public.laws;
create trigger laws_updated_at before update on public.laws for each row execute procedure public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.articles enable row level security;
alter table public.laws enable row level security;

-- Admin can see their own allow-list row. Do NOT expose service-role keys in the browser.
drop policy if exists "admin reads own row" on public.admin_users;
create policy "admin reads own row" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "public reads published articles" on public.articles;
create policy "public reads published articles" on public.articles for select to anon, authenticated using (status = 'published' or exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));
drop policy if exists "admins insert articles" on public.articles;
create policy "admins insert articles" on public.articles for insert to authenticated with check (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));
drop policy if exists "admins update articles" on public.articles;
create policy "admins update articles" on public.articles for update to authenticated using (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid()))) with check (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));
drop policy if exists "admins delete articles" on public.articles;
create policy "admins delete articles" on public.articles for delete to authenticated using (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));

drop policy if exists "public reads laws" on public.laws;
create policy "public reads laws" on public.laws for select to anon, authenticated using (true);
drop policy if exists "admins insert laws" on public.laws;
create policy "admins insert laws" on public.laws for insert to authenticated with check (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));
drop policy if exists "admins update laws" on public.laws;
create policy "admins update laws" on public.laws for update to authenticated using (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid()))) with check (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));
drop policy if exists "admins delete laws" on public.laws;
create policy "admins delete laws" on public.laws for delete to authenticated using (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));

-- Starter catalogue only. These are not full statutory texts and must be checked against official sources.
insert into public.laws(title,slug,law_number,official_url) values
('Türk Medenî Kanunu','turk-medeni-kanunu','4721','https://www.mevzuat.gov.tr/'),
('Türk Borçlar Kanunu','turk-borclar-kanunu','6098','https://www.mevzuat.gov.tr/'),
('Hukuk Muhakemeleri Kanunu','hukuk-muhakemeleri-kanunu','6100','https://www.mevzuat.gov.tr/'),
('İcra ve İflas Kanunu','icra-ve-iflas-kanunu','2004','https://www.mevzuat.gov.tr/'),
('Türk Ceza Kanunu','turk-ceza-kanunu','5237','https://www.mevzuat.gov.tr/'),
('Ceza Muhakemesi Kanunu','ceza-muhakemesi-kanunu','5271','https://www.mevzuat.gov.tr/'),
('Türkiye Cumhuriyeti Anayasası','turkiye-cumhuriyeti-anayasasi','2709','https://www.mevzuat.gov.tr/'),
('İş Kanunu','is-kanunu','4857','https://www.mevzuat.gov.tr/'),
('İdari Yargılama Usulü Kanunu','idari-yargilama-usulu-kanunu','2577','https://www.mevzuat.gov.tr/'),
('Türk Ticaret Kanunu','turk-ticaret-kanunu','6102','https://www.mevzuat.gov.tr/'),
('Tüketicinin Korunması Hakkında Kanun','tuketicinin-korunmasi-hakkinda-kanun','6502','https://www.mevzuat.gov.tr/'),
('Kişisel Verilerin Korunması Kanunu','kisisel-verilerin-korunmasi-kanunu','6698','https://www.mevzuat.gov.tr/')
on conflict (slug) do nothing;
