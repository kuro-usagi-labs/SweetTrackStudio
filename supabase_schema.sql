-- ==========================================
-- SWEETTRACK STUDIO - SUPABASE INTEGRATION
-- ==========================================
-- This script creates all the necessary tables and Row Level Security (RLS) 
-- policies for the SweetTrack Studio application.
-- Run this script in your Supabase SQL Editor.

-- 1. Profiles Table
CREATE TABLE profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  avatar text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Targets Table (Quarterly Trajectory)
CREATE TABLE targets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  long_form integer DEFAULT 36,
  shorts integer DEFAULT 70,
  subscribers integer DEFAULT 1000,
  watch_hours integer DEFAULT 4000,
  ctr numeric DEFAULT 5.0,
  retention_30s numeric DEFAULT 55.0,
  avg_view_duration numeric DEFAULT 35.0,
  completed_targets text DEFAULT '[]',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Custom Targets Table
CREATE TABLE custom_targets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  current numeric DEFAULT 0,
  target numeric NOT NULL,
  unit text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Pipeline Table (Video Production Pipeline)
CREATE TABLE pipeline (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'Idea',
  stage text,
  type text DEFAULT 'Long-form',
  tags text DEFAULT '[]',
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Ideas Table (Idea Bank)
CREATE TABLE ideas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  content text,
  tags text DEFAULT '[]',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Reminders Table
CREATE TABLE reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  due_time text NOT NULL,
  is_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Scratchpad Table (Today's Focus)
CREATE TABLE scratchpad (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  content text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Prompts Table (AI Prompts)
CREATE TABLE prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Analytics Table
CREATE TABLE analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  video_title text NOT NULL,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  date_added text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. App Settings Table
CREATE TABLE app_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  is_dark_mode integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Enable RLS on all tables so users can only access their own data

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE scratchpad ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for all tables
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'targets', 'custom_targets', 'pipeline', 'ideas', 'reminders', 'scratchpad', 'prompts', 'analytics', 'app_settings')
  LOOP
    EXECUTE format('
      CREATE POLICY "Users can view own %I" ON %I FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Users can insert own %I" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can update own %I" ON %I FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY "Users can delete own %I" ON %I FOR DELETE USING (auth.uid() = user_id);
    ', t, t, t, t, t, t, t, t);
  END LOOP;
END $$;
