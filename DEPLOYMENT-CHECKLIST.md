# Müessir launch checklist

- [ ] Create Supabase project
- [ ] Run `supabase/schema.sql`
- [ ] Create owner user in Supabase Auth
- [ ] Add owner UUID to `public.admin_users`
- [ ] Disable open registration
- [ ] Configure `.env.local` and run locally
- [ ] Verify draft is not visible publicly
- [ ] Verify published article is visible publicly
- [ ] Verify anonymous user cannot create/edit/delete articles or laws
- [ ] Verify owner can create/edit/delete
- [ ] Push code to private GitHub repository
- [ ] Import to Vercel and add environment variables
- [ ] Set Supabase Auth URLs for production domain
- [ ] Add custom domain and configure DNS
- [ ] Run build and smoke tests
- [ ] Configure backups and test restoration
- [ ] Review privacy notice, contact details and legal disclaimers
- [ ] Verify all statutory texts and amendment dates against official sources

- [ ] Test bold, italic, underline, headings, lists, quotes, undo/redo, and pasted content in the article editor.
- [ ] Import a representative `.docx` file (under 10 MB), inspect headings, paragraphs, lists and tables, then save, reopen and publish it.
- [ ] Confirm public article HTML renders correctly and script-like content is not executed.
- [ ] Confirm duplicate slugs show a helpful error and the editor stays available after a failed save.
