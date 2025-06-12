-- Quick Feedback Table Setup
-- Copy and paste this into Supabase SQL Editor

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
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

-- Allow everyone to insert feedback
CREATE POLICY "Everyone can submit feedback" ON feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to see their own feedback
CREATE POLICY "Users can view their own feedback" ON feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins to see all feedback
CREATE POLICY "Only admins can view all feedback" ON feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM preapproved_users
      WHERE preapproved_users.id = auth.uid()
      AND preapproved_users.role = 'admin'
    )
  );

-- Allow admins to update feedback
CREATE POLICY "Only admins can update feedback status" ON feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM preapproved_users
      WHERE preapproved_users.id = auth.uid()
      AND preapproved_users.role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON feedback TO authenticated;
