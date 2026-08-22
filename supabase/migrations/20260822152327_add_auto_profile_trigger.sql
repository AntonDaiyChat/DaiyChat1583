/*
# Auto-create profile on user signup

## Purpose
When a new user registers via Supabase Auth, a corresponding row in the `profiles` table
must be created automatically. Previously the frontend tried to insert this row manually
after signUp, which could fail due to RLS timing issues (the session may not be fully
established yet for the insert). A server-side trigger eliminates this race condition.

## Changes
1. Creates a `handle_new_user()` trigger function that inserts a `profiles` row
   using the new user's ID and display_name from auth metadata.
2. Attaches the function as an `AFTER INSERT` trigger on `auth.users`.
3. The trigger is idempotent-safe via `ON CONFLICT DO NOTHING` on the primary key.

## Security
- The trigger function runs with `SECURITY DEFINER` (bypasses RLS) so it can insert
  into `profiles` even though the new user's session isn't established yet.
- The function only reads from `auth.users` (the trigger event) and writes to `profiles`.
- No new policies are added; existing RLS policies on `profiles` remain unchanged.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
