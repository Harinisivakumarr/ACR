-- Fix Feedback Table - Simple and Clean
-- Copy and paste this ENTIRE script into Supabase SQL Editor and run it

-- Drop existing table if it exists
DROP TABLE IF EXISTS feedback CASCADE;

-- Create the feedback table with correct structure
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

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own feedback" ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback" ON feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON feedback TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Test the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'feedback' 
AND table_schema = 'public'
ORDER BY ordinal_position;
