# Migration Guide: Lovable Cloud to Standalone Supabase

## Quick Start (~30 minutes)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Save your Project URL, anon key, and service_role key

### Step 2: Create Storage Buckets
In Supabase Dashboard → Storage, create 4 **private** buckets:
- `documents`
- `teacher-documents`
- `staff-resumes`
- `document-templates`

### Step 3: Run Schema SQL
1. Go to Supabase Dashboard → SQL Editor
2. Paste contents of `docs/MIGRATION_CONSOLIDATED_SCHEMA.sql`
3. Execute

### Step 4: Configure Secrets
In Supabase Dashboard → Edge Functions → Secrets:
- `RESEND_API_KEY` - Your Resend API key for emails
- `LOVABLE_API_KEY` - For AI eligibility analysis (optional)

### Step 5: Deploy Edge Functions
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_ID

# Deploy all functions
supabase functions deploy analyze-teacher-eligibility
supabase functions deploy authenticate-document
supabase functions deploy auto-assign-branch
supabase functions deploy export-school-data
supabase functions deploy import-roster
supabase functions deploy log-auth-event --no-verify-jwt
supabase functions deploy log-error --no-verify-jwt
supabase functions deploy log-event
supabase functions deploy notify-parent-accepted
supabase functions deploy process-bulk-documents
supabase functions deploy scan-document
supabase functions deploy send-director-invitation
supabase functions deploy send-expiration-reminders
supabase functions deploy send-parent-invitation
supabase functions deploy send-parent-welcome
supabase functions deploy send-school-admin-invitation
supabase functions deploy send-teacher-invitation
```

### Step 6: New Lovable Project
1. In Lovable Settings → Connectors → Lovable Cloud → Disable for new projects
2. Create new Lovable project (blank)
3. Connect to GitHub (new repo)
4. Push code from existing repo to new repo:
```bash
git clone https://github.com/YOUR_USER/EXISTING_REPO.git
cd EXISTING_REPO
git remote add newproject https://github.com/YOUR_USER/NEW_REPO.git
git push newproject main --force
```
5. In new Lovable project → Settings → Connectors → Connect to Supabase

### Step 7: Configure Auth
In Supabase Dashboard → Authentication → Providers:
- Enable Email provider
- Enable "Confirm email" auto-confirmation (for dev)
- Set Site URL to your Lovable preview URL

## Verification Checklist
- [ ] All tables visible in Table Editor
- [ ] RLS enabled on all tables
- [ ] Storage buckets created (private)
- [ ] Edge functions deployed
- [ ] Auth working (signup/login)
- [ ] App loads without errors
