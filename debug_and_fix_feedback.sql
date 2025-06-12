-- COMPREHENSIVE FEEDBACK SYSTEM DEBUG AND FIX
-- Run this script to diagnose and fix all feedback issues

-- Step 1: Check current user and their role
SELECT 'Current user info:' as step;
SELECT 
  auth.uid() as current_user_id,
  u.email,
  u.role,
  u.name
FROM users u 
WHERE u.id = auth.uid();

-- Step 2: Check if feedback table exists and its structure
SELECT 'Feedback table structure:' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'feedback' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 3: Check existing feedback data
SELECT 'Existing feedback:' as step;
SELECT id, user_name, subject, status, created_at
FROM feedback
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Check RLS policies
SELECT 'Current RLS policies:' as step;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'feedback';

-- Step 5: Test admin access query
SELECT 'Testing admin access:' as step;
SELECT 
  f.*,
  'User owns this' as access_reason
FROM feedback f
WHERE f.user_id = auth.uid()

UNION ALL

SELECT 
  f.*,
  'User is admin' as access_reason
FROM feedback f
WHERE EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() 
  AND (role = 'admin' OR role = 'Admin')
);

-- Step 6: Fix the feedback table and policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
DROP POLICY IF EXISTS "Users see own feedback or admins see all" ON feedback;
DROP POLICY IF EXISTS "Admins can update feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can delete feedback" ON feedback;

-- Recreate the table if needed (uncomment if table is missing columns)
-- DROP TABLE IF EXISTS feedback CASCADE;
-- CREATE TABLE feedback (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
--   user_name TEXT NOT NULL,
--   user_email TEXT NOT NULL,
--   subject TEXT NOT NULL,
--   message TEXT NOT NULL,
--   status TEXT DEFAULT 'pending',
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create fixed policies
CREATE POLICY "Anyone can submit feedback" ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users see own feedback or admins see all" ON feedback
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'Admin')
    )
  );

CREATE POLICY "Admins can update feedback" ON feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'Admin')
    )
  );

CREATE POLICY "Admins can delete feedback" ON feedback
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'Admin')
    )
  );

-- Grant permissions
GRANT ALL ON feedback TO authenticated;

-- Final verification
SELECT 'Setup complete! Final check:' as step;
SELECT 
  'Table exists: ' || CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN 'YES' ELSE 'NO' END as table_status,
  'RLS enabled: ' || CASE WHEN relrowsecurity THEN 'YES' ELSE 'NO' END as rls_status,
  'Policies count: ' || COUNT(*)::text as policies_count
FROM pg_class 
LEFT JOIN pg_policies ON pg_policies.tablename = 'feedback'
WHERE relname = 'feedback'
GROUP BY relrowsecurity;
