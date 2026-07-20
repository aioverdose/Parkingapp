-- ⚠️  DESTRUCTIVE: Deletes ALL users and their data
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Delete from auth.users (cascades to public.users via FK, which cascades to all other tables)
DELETE FROM auth.users;

-- Verify
SELECT 'auth.users remaining: ' || count(*) FROM auth.users;
SELECT 'public.users remaining: ' || count(*) FROM public.users;
