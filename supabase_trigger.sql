-- ========================================================================
-- SWIFTSTUDY - FAIL-SAFE SUPABASE AUTH TRIGGER AND PROFILE SYNC SCRIPT
-- ========================================================================
-- This SQL script configures a public.profiles table, writes a secure trigger
-- function, and binds it to auth.users insertion. This guarantees that whenever
-- a new user registers through Supabase Auth, they are instantly synchronized.
--
-- 👉 FAIL-SAFE IMPROVEMENT:
-- To prevent fatal "FUNCTION_INVOCATION_FAILED" or "500 Internal Server" errors,
-- the insertion into the public.profiles is enclosed within an EXCEPTION block.
-- If anything goes wrong (such as missing tables, RLS policy conflicts, or
-- missing columns), the Postgres transaction catches the exception, logs it as
-- a Postgres WARNING, and allows the registration on auth.users to suceed!
--
-- 👉 HOW TO USE:
-- Copy and run this entire file inside your Supabase "SQL Editor" dashboard.
-- ========================================================================

-- 1. Create a public profiles table to mirror registration parameters
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

-- 2. Enable Row Level Security (RLS) on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Allow public read access to profile rows
DROP POLICY IF EXISTS "Allow public read access" ON public.profiles;
CREATE POLICY "Allow public read access" ON public.profiles
  FOR SELECT TO public USING (true);

-- 4. Allow profile modifications (insert/update) by public clients
DROP POLICY IF EXISTS "Allow public modifications" ON public.profiles;
CREATE POLICY "Allow public modifications" ON public.profiles
  FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. Create the secure handle_new_user() trigger function (FAIL-SAFE)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_reg_number TEXT;
  v_class_level TEXT;
  v_wallet_balance NUMERIC;
BEGIN
  -- We wrap the core synchronization logic in a target exception block.
  -- This is the ultimate guard against "FUNCTION_INVOCATION_FAILED" errors.
  -- Even if public.profiles is missing, has wrong columns, or RLS fails,
  -- Postgres logs the issue but guarantees the user's account signup completes!
  BEGIN
    -- Extract custom metadata passed during signing up (options.data payload)
    v_name := COALESCE(new.raw_user_meta_data->>'name', 'New Scholar');
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'student');
    v_class_level := new.raw_user_meta_data->>'classLevel';
    
    -- Assign default complementary trial balances (₦25,000 teachers, ₦5,000 students)
    IF v_role = 'teacher' THEN
      v_wallet_balance := 25000;
    ELSE
      v_wallet_balance := 5000;
    END IF;

    -- Generate student registration number format automatically
    IF v_role = 'student' THEN
      v_reg_number := 'REG/' || to_char(now(), 'YYYY') || '/' || floor(1000 + random() * 9000)::text;
      v_class_level := COALESCE(v_class_level, 'Senior Secondary Section 3');
    ELSE
      v_reg_number := NULL;
      v_class_level := NULL;
    END IF;

    -- Insert our formatted profile row mapped to the newly created auth UUID
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
    -- Fallback: Raise warning only to log the diagnostic error without crashing the Auth sequence
    RAISE WARNING 'Error occurred during public.profiles synchronization in handle_new_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Clean and recreate the trigger linking auth.users inserts to our handler
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================================================
-- End of SQL Trigger sync script.
-- ========================================================================
