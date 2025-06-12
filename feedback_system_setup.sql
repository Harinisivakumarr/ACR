-- =====================================================
-- FEEDBACK SYSTEM SETUP
-- =====================================================
-- This script sets up a complete feedback system where:
-- 1. Everyone can submit feedback
-- 2. Only admins can view all feedback
-- 3. Users can view their own feedback
-- 4. Only admins can update feedback status

-- =====================================================
-- CREATE FEEDBACK TABLE
-- =====================================================

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_user_email ON feedback(user_email);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP EXISTING POLICIES (IF ANY)
-- =====================================================

-- Drop any existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Everyone can submit feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON feedback;
DROP POLICY IF EXISTS "Only admins can view all feedback" ON feedback;
DROP POLICY IF EXISTS "Only admins can update feedback status" ON feedback;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

-- Policy 1: Everyone can submit feedback (INSERT)
-- Any authenticated user can submit feedback
CREATE POLICY "Everyone can submit feedback" ON feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Users can view their own feedback (SELECT)
-- Users can only see feedback they submitted
CREATE POLICY "Users can view their own feedback" ON feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 3: Only admins can view all feedback (SELECT)
-- Admins can see all feedback from all users
CREATE POLICY "Only admins can view all feedback" ON feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM preapproved_users
      WHERE preapproved_users.id = auth.uid()
      AND preapproved_users.role = 'admin'
    )
  );

-- Policy 4: Only admins can update feedback status (UPDATE)
-- Only admins can change the status of feedback (pending/reviewed/resolved)
CREATE POLICY "Only admins can update feedback status" ON feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM preapproved_users
      WHERE preapproved_users.id = auth.uid()
      AND preapproved_users.role = 'admin'
    )
  );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT ON feedback TO authenticated;
GRANT SELECT, INSERT ON feedback TO anon;

-- Grant all permissions to authenticated users (needed for RLS to work properly)
GRANT ALL ON feedback TO authenticated;

-- =====================================================
-- CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at when feedback is modified
DROP TRIGGER IF EXISTS update_feedback_updated_at ON feedback;
CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if the table was created successfully
SELECT 'feedback' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') 
            THEN '✅ Created' 
            ELSE '❌ Not Found' 
       END as status;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'feedback';

-- Check if policies were created
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'feedback'
ORDER BY policyname;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '🎉 Feedback system setup completed successfully!' as message,
       'Everyone can submit feedback, only admins can view all feedback' as description;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Example 1: Submit feedback (any authenticated user)
-- INSERT INTO feedback (user_id, user_name, user_email, subject, message) 
-- VALUES (auth.uid(), 'John Doe', 'john@example.com', 'App Suggestion', 'Great app, but could use dark mode!');

-- Example 2: View all feedback (admin only)
-- SELECT * FROM feedback ORDER BY created_at DESC;

-- Example 3: Update feedback status (admin only)
-- UPDATE feedback SET status = 'reviewed' WHERE id = 'some-uuid';

-- Example 4: View user's own feedback (any user)
-- SELECT * FROM feedback WHERE user_id = auth.uid();
