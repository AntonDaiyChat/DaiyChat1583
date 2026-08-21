/*
# Omni Daily Core Schema

## Overview
Creates the full database schema for Omni Daily, an AI-powered daily life planner.
All tables are multi-user (sign-in required) with per-user row-level security.

## New Tables

1. `profiles` - User profile data (extends auth.users)
   - `id` (uuid, PK, references auth.users)
   - `display_name` (text)
   - `avatar_url` (text, nullable)
   - `onboarding_completed` (boolean, default false)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

2. `user_memory` - Compact long-term AI memory (one row per user)
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users, unique)
   - `goals` (text, nullable) - User's health/fitness goals
   - `allergies` (text[], default '{}') - Allergies and intolerances
   - `diet_type` (text, nullable) - vegan, vegetarian, omnivore, etc.
   - `training_rhythm` (text, nullable) - Training frequency/style
   - `favorite_foods` (text[], default '{}') - Favorite foods/ingredients
   - `calorie_target` (integer, nullable) - Daily calorie target
   - `protein_target` (integer, nullable) - Daily protein target (g)
   - `carbs_target` (integer, nullable) - Daily carbs target (g)
   - `fat_target` (integer, nullable) - Daily fat target (g)
   - `created_at`, `updated_at`

3. `meal_plans` - Daily meal plans
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users)
   - `date` (date) - Which day the plan is for
   - `meals` (jsonb) - Array of meal objects with name, type, calories, macros, ingredients, image_url
   - `total_calories` (integer)
   - `total_protein` (integer)
   - `total_carbs` (integer)
   - `total_fat` (integer)
   - `created_at`, `updated_at`

4. `workout_plans` - Workout/training plans
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users)
   - `date` (date) - Which day the plan is for
   - `title` (text) - e.g. "Push Day", "Leg Day"
   - `exercises` (jsonb) - Array of exercise objects with name, sets, reps, weight, notes
   - `duration_minutes` (integer, nullable)
   - `completed` (boolean, default false)
   - `created_at`, `updated_at`

5. `events` - Calendar events
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users)
   - `title` (text)
   - `description` (text, nullable)
   - `event_type` (text) - 'work', 'school', 'training', 'leisure', 'meal', 'appointment'
   - `start_time` (timestamptz)
   - `end_time` (timestamptz)
   - `location` (text, nullable)
   - `linked_workout_id` (uuid, nullable, references workout_plans)
   - `linked_meal_plan_id` (uuid, nullable, references meal_plans)
   - `created_at`, `updated_at`

6. `chat_messages` - AI conversation messages per persona
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users)
   - `persona` (text) - 'nutrition', 'training', 'calendar', 'dashboard'
   - `role` (text) - 'user' or 'assistant'
   - `content` (text)
   - `created_at`

7. `request_logs` - AI request audit log
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users)
   - `persona` (text)
   - `request_text` (text)
   - `response_text` (text, nullable)
   - `status` (text) - 'success', 'error', 'blocked'
   - `latency_ms` (integer, nullable)
   - `created_at`

8. `audit_logs` - Admin/system audit trail
   - `id` (uuid, PK)
   - `user_id` (uuid, nullable, references auth.users)
   - `action` (text) - e.g. 'gdpr_delete', 'profile_update', 'admin_action'
   - `details` (jsonb, nullable)
   - `created_at`

## Security
- RLS enabled on ALL tables.
- All tables scoped TO authenticated with auth.uid() ownership checks.
- Owner columns default to auth.uid() so inserts work without client passing user_id.
- Sensitive tables (audit_logs, request_logs) are insert-only for users (no read access).
*/

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User Memory
CREATE TABLE IF NOT EXISTS user_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  goals text,
  allergies text[] NOT NULL DEFAULT '{}',
  diet_type text,
  training_rhythm text,
  favorite_foods text[] NOT NULL DEFAULT '{}',
  calorie_target integer,
  protein_target integer,
  carbs_target integer,
  fat_target integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_memory" ON user_memory;
CREATE POLICY "select_own_memory" ON user_memory FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_memory" ON user_memory;
CREATE POLICY "insert_own_memory" ON user_memory FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_memory" ON user_memory;
CREATE POLICY "update_own_memory" ON user_memory FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_memory" ON user_memory;
CREATE POLICY "delete_own_memory" ON user_memory FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Meal Plans
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  meals jsonb NOT NULL DEFAULT '[]',
  total_calories integer NOT NULL DEFAULT 0,
  total_protein integer NOT NULL DEFAULT 0,
  total_carbs integer NOT NULL DEFAULT 0,
  total_fat integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_meal_plans" ON meal_plans;
CREATE POLICY "select_own_meal_plans" ON meal_plans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_meal_plans" ON meal_plans;
CREATE POLICY "insert_own_meal_plans" ON meal_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_meal_plans" ON meal_plans;
CREATE POLICY "update_own_meal_plans" ON meal_plans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_meal_plans" ON meal_plans;
CREATE POLICY "delete_own_meal_plans" ON meal_plans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Workout Plans
CREATE TABLE IF NOT EXISTS workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text NOT NULL DEFAULT 'Workout',
  exercises jsonb NOT NULL DEFAULT '[]',
  duration_minutes integer,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workout_plans" ON workout_plans;
CREATE POLICY "select_own_workout_plans" ON workout_plans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_workout_plans" ON workout_plans;
CREATE POLICY "insert_own_workout_plans" ON workout_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_workout_plans" ON workout_plans;
CREATE POLICY "update_own_workout_plans" ON workout_plans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_workout_plans" ON workout_plans;
CREATE POLICY "delete_own_workout_plans" ON workout_plans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'appointment',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  linked_workout_id uuid REFERENCES workout_plans(id) ON DELETE SET NULL,
  linked_meal_plan_id uuid REFERENCES meal_plans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_events" ON events;
CREATE POLICY "select_own_events" ON events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_events" ON events;
CREATE POLICY "insert_own_events" ON events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_events" ON events;
CREATE POLICY "update_own_events" ON events FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_events" ON events;
CREATE POLICY "delete_own_events" ON events FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  persona text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chats" ON chat_messages;
CREATE POLICY "select_own_chats" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chats" ON chat_messages;
CREATE POLICY "insert_own_chats" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chats" ON chat_messages;
CREATE POLICY "delete_own_chats" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Request Logs (insert-only for users, no read access)
CREATE TABLE IF NOT EXISTS request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  persona text NOT NULL,
  request_text text NOT NULL,
  response_text text,
  status text NOT NULL DEFAULT 'success',
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_own_request_logs" ON request_logs;
CREATE POLICY "insert_own_request_logs" ON request_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Audit Logs (insert-only for users, no read access)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_own_audit_logs" ON audit_logs;
CREATE POLICY "insert_own_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_date ON workout_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_events_user_start_time ON events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_persona ON chat_messages(user_id, persona, created_at);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_user_memory_updated_at ON user_memory;
CREATE TRIGGER trigger_user_memory_updated_at BEFORE UPDATE ON user_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_meal_plans_updated_at ON meal_plans;
CREATE TRIGGER trigger_meal_plans_updated_at BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_workout_plans_updated_at ON workout_plans;
CREATE TRIGGER trigger_workout_plans_updated_at BEFORE UPDATE ON workout_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_events_updated_at ON events;
CREATE TRIGGER trigger_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();