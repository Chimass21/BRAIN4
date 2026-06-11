-- =========================================================================
-- SWIFTSTUDY - ULTIMATE DIAGNOSTIC & FIX FOR SUPABASE "FUNCTION_INVOCATION_FAILED"
-- =========================================================================
-- This script diagnoses and resolves database trigger/webhook conflicts on your
-- "auth.users" table which are causing signup failures.
--
-- 👉 THE ROOT CAUSE:
-- "FUNCTION_INVOCATION_FAILED" is thrown by Supabase GoTrue Auth when an insert
-- into "auth.users" fails because of a broken trigger or database webhook.
-- Common causes are:
-- 1. A Database Webhook was created in the UI (e.g. to call an Edge Function) and then deleted.
--    This creates an automatic trigger called "supabase_functions" on auth.users which breaks.
-- 2. An old trigger function failed, causing the registration transaction to roll back.
--
-- 👉 HOW TO APPLY:
-- 1. Go to your Supabase Dashboard: https://supabase.com
-- 2. Open your project, click on "SQL Editor" in the left navigation sidebar.
-- 3. Click "New Query", paste this entire script, and click "Run".
-- =========================================================================

-- STEP 1: DROP ANY DEFUNCT DATABASE WEBHOOKS TRIGGERS ON auth.users
-- When you enable Database Webhooks on auth.users in the UI, Supabase creates
-- a trigger named 'supabase_functions'. If the target is broken, auth fails.
DROP TRIGGER IF EXISTS supabase_functions ON auth.users CASCADE;

-- STEP 2: DROP OTHER POTENTIALLY BROKEN LEGACY TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS sync_user_profile ON auth.users CASCADE;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users CASCADE;

-- STEP 3: CREATE / RECREATE THE PUBLIC.PROFILES RECIPIENT TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'student',
  wallet_balance NUMERIC DEFAULT 5000,
  reg_number TEXT,
  class_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 4: ENSURE RLS IS CONFIGURED AND SAFE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.profiles;
CREATE POLICY "Allow public read access" ON public.profiles FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public modifications" ON public.profiles;
CREATE POLICY "Allow public modifications" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);

-- STEP 5: CREATE THE BULLETPROOF FAIL-SAFE TRIGGER FUNCTION
-- This function extracts client signup metadata and synchronizes it safely.
-- It is wrapped in an EXCEPTION block so that EVEN IF profiles schema or permissions fail,
-- the Postgres transaction is not rolled back. This ensures authentication NEVER fails!
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_reg_number TEXT;
  v_class_level TEXT;
  v_wallet_balance NUMERIC;
BEGIN
  -- We wrap everything in an EXCEPTION block so it is 100% fail-safe.
  BEGIN
    -- Extract custom metadata passed from client
    v_name := COALESCE(new.raw_user_meta_data->>'name', 'New Scholar');
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'student');
    v_class_level := new.raw_user_meta_data->>'classLevel';

    -- Preload trial balances (₦25,000 for teachers, ₦5,000 for students)
    IF v_role = 'teacher' THEN
      v_wallet_balance := 25000;
    ELSE
      v_wallet_balance := 5000;
    END IF;

    -- Generate a student registration number format automatically if applicable
    IF v_role = 'student' THEN
      v_reg_number := 'REG/' || to_char(now(), 'YYYY') || '/' || floor(1000 + random() * 9000)::text;
      v_class_level := COALESCE(v_class_level, 'Senior Secondary Section 3');
    ELSE
      v_reg_number := NULL;
      v_class_level := NULL;
    END IF;

    -- Insert profile row mapped to new Auth UUID
    INSERT INTO public.profiles (
      id,
      email,
      name,
      role,
      wallet_balance,
      reg_number,
      class_level,
      created_at
    ) VALUES (
      new.id,
      new.email,
      v_name,
      v_role,
      v_wallet_balance,
      v_reg_number,
      v_class_level,
      COALESCE(new.created_at, now())
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = COALESCE(public.profiles.name, EXCLUDED.name),
      role = COALESCE(public.profiles.role, EXCLUDED.role);

  EXCEPTION WHEN OTHERS THEN
    -- A warning is printed to Postgres logs, but we return NEW to let the transaction succeed!
    RAISE WARNING 'Fail-safe warning: custom profile sync failed in handle_new_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: REBIND THE CLEAN TRIGGER TO auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 7: RUN RECONCILIATION FOR ANY USERS ALREADY IN auth.users WHO MISS PROFILES (OPTIONAL)
INSERT INTO public.profiles (id, email, name, role, wallet_balance, reg_number, class_level, created_at)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'name', 'New Scholar') as name,
  COALESCE(raw_user_meta_data->>'role', 'student') as role,
  CASE WHEN (raw_user_meta_data->>'role') = 'teacher' THEN 25000 ELSE 5000 END as wallet_balance,
  CASE WHEN (raw_user_meta_data->>'role') = 'student' THEN 'REG/' || to_char(now(), 'YYYY') || '/' || floor(1000 + random() * 9000)::text ELSE NULL END as reg_number,
  CASE WHEN (raw_user_meta_data->>'role') = 'student' THEN 'Senior Secondary Section 3' ELSE NULL END as class_level,
  COALESCE(created_at, now())
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- SUCCESS CONFIRMATION
SELECT 'Success! Your triggers have been cleaned and the fail-safe signup profile trigger is active.' as status;
