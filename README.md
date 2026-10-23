# MÜESSİR — production-oriented starter

Personal legal publishing platform: public article pages, admin-only article editor, draft/publish workflow, legislation catalogue, Supabase Auth, PostgreSQL, and Row Level Security (RLS).

> **Status:** This is a deployable application starter, not a site already hosted on the public internet. You must create the Supabase project, configure secrets, deploy it, and connect your domain. No credentials are embedded in this repository. The law catalogue contains names/numbers and official-source links only; it does not claim to contain complete or current statutory text.

## Stack
- Next.js App Router + TypeScript
- Supabase Auth and PostgreSQL
- RLS policies that allow public reads of published articles and legislation, while restricting article writes and all legislation writes to explicitly allow-listed admin users
- Vercel-compatible deployment

## 1. Requirements
- Node.js 20.9+ (LTS recommended)
- A Supabase account/project
- A GitHub account and Vercel account for public deployment

## 2. Create the database
1. Create a Supabase project.
2. Open **SQL Editor** in Supabase.
3. Run the complete `supabase/schema.sql` script.
4. In Supabase **Authentication → Users**, create your personal user (email/password). Disable public sign-ups in Authentication settings after your own user is created, unless you have a clear reason to allow registration.
5. Copy the user's UUID from Authentication → Users.
6. In SQL Editor run the following, replacing the UUID with your own:

```sql
insert into public.admin_users (user_id)
values ('YOUR-AUTH-USER-UUID');
```

Never put a Supabase `service_role` key in `.env.local`, browser code, GitHub, or Vercel client-exposed variables. This application needs only the publishable/anon key in the browser; RLS protects writes.

## 3. Run locally
```bash
cp .env.example .env.local
```
Fill in values from **Supabase → Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (use the current publishable/anon key shown by your project)
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

Then run:
```bash
npm install
npm run dev
```
Open `http://localhost:3000`. Visit `/admin`, sign in with the Supabase user you created, and create/publish an article. Test a draft in a private browser window: it should not be publicly visible.

## 4. Deploy publicly (Vercel)
1. Push this folder to a **private GitHub repository**.
2. In Vercel, import that repository. Framework should be detected as Next.js.
3. Add the same three environment variables in Vercel Project Settings → Environment Variables. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS domain.
4. Deploy. In Supabase Authentication → URL Configuration, set the Site URL to the final site URL and add the local and production URLs to Redirect URLs as needed.
5. Visit `/api/health` to check the deployment responds.
6. Add your custom domain in Vercel and follow its DNS instructions at your domain registrar. DNS propagation and domain purchase are separate from this code package.

## 5. Publishing workflow
- `/admin`: sign in, create an article, fill title/slug/category/excerpt, use the Word-like rich-text editor or import a `.docx` file, then select Draft or Publish. Save explicitly; editing is not autosaved.
- The article editor supports bold, italic, underline, headings, blockquotes, ordered/unordered lists, undo/redo, paste cleanup, and Word `.docx` import (up to 10 MB). Imported Word text, basic formatting, and tables are converted into HTML; some advanced layout, fonts, images, headers/footers, footnotes, and page-level formatting may not transfer exactly. Review the imported article before publishing. Old plain-text records remain readable. The public article renderer sanitizes stored HTML before display.
- The laws panel lets you add/edit/delete a law record and official URL. Only mark a text verified after checking it against the official current source. Starter records intentionally do not include full law text.
- Public pages: `/`, `/articles/[slug]`, `/laws`, `/laws/[slug]`.

## Security and operational checklist before relying on it
- Use a unique, strong password and MFA where available; restrict Supabase Auth registration.
- Keep the GitHub repository private if desired; never commit `.env.local`.
- Verify the RLS policies in Supabase and test as both anonymous visitor and admin.
- Configure regular database backups and periodically test restore. Confirm the backup/retention plan for your chosen Supabase tier.
- Add a privacy notice and contact information before collecting visitor data or enabling analytics.
- Add rate limiting/monitoring if you later add public forms, comments, or other write endpoints.
- Confirm current legal texts, amendments, effective dates and official URLs before publishing them. This software is not legal advice and does not guarantee the accuracy or currentness of legislation.
- Before production launch, install dependencies and run `npm run build`; test admin login, rich-text formatting after saving and reopening, Word `.docx` import, publish/draft visibility, duplicate slugs, deletion, mobile layout, and backups. Dependency installation/build could not be completed in the generation environment, so do not treat this archive as build-verified until these checks pass.

## Troubleshooting
- **No articles shown:** publish an article through `/admin`; check Supabase URL/key and SQL schema.
- **Admin login succeeds but access is denied:** ensure your authenticated user's UUID is present in `public.admin_users`.
- **Can sign in but cannot save:** inspect Supabase logs and ensure the full RLS policies from `schema.sql` were applied.
- **Redirect loop or login issues after deployment:** check Supabase Auth Site URL/Redirect URLs and the `NEXT_PUBLIC_SITE_URL` value.
