-- Debug Feedback Table
-- Copy and paste this into Supabase SQL Editor to check what's wrong

-- First, let's check if the table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'feedback';

-- Check if preapproved_users table exists (needed for RLS policies)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'preapproved_users';

-- Let's create the feedback table without complex RLS first
DROP TABLE IF EXISTS feedback CASCADE;

CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Simple policies that should work
CREATE POLICY "Allow authenticated users to insert feedback" ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to view their own feedback" ON feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON feedback TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
