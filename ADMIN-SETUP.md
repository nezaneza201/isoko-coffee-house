# Isoko Coffee House Admin Setup

1. Create a Supabase project.
2. Open SQL Editor and run supabase-schema.sql.
3. In Supabase Authentication, keep email/password enabled.
4. Deploy the site, open /admin.html, and let the owner enter their own email and create their own password.
5. After the owner account is tested, disable public sign-ups in Supabase Authentication settings.
6. Put the Supabase Project URL and public anon key into admin.js and config.js. Never put a service-role key in browser code.

The admin dashboard supports owner login, photo uploads, menu editing and business-info editing. The database and image storage are hosted by Supabase.

The public homepage still needs its final data-sync pass so every owner edit is reflected automatically on the public page. Until that pass, the original homepage remains the fallback presentation.