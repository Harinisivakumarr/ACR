-- COMPLETE FEEDBACK SYSTEM SETUP
-- Copy and paste this ENTIRE script into Supabase SQL Editor

-- Step 1: Drop existing table if it exists
DROP TABLE IF EXISTS feedback CASCADE;

-- Step 2: Create the feedback table with ALL required columns
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,  -- This is the missing column!
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies
-- Policy 1: Anyone can submit feedback (insert their own)
CREATE POLICY "Anyone can submit feedback" ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Combined SELECT policy - Users see own feedback OR Admins see all
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

-- Policy 4: ONLY ADMINS can update feedback status
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

-- Policy 5: ONLY ADMINS can delete feedback
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

-- Step 5: Grant permissions
GRANT ALL ON feedback TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 6: Verify table structure
SELECT 'Table created successfully!' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'feedback' 
AND table_schema = 'public'
ORDER BY ordinal_position;
