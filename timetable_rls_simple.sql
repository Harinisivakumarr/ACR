-- =====================================================
-- SIMPLE TIMETABLE RLS POLICIES
-- =====================================================
-- This script works with your existing timetable table structure
-- ADMIN ONLY: Create, Update, Delete timetables
-- EVERYONE: Can view/read timetables
-- =====================================================

-- Drop any existing policies first
DROP POLICY IF EXISTS "Everyone can view timetable" ON timetable;
DROP POLICY IF EXISTS "Everyone can view timetables" ON timetable;
DROP POLICY IF EXISTS "Admins and faculty can create timetable entries" ON timetable;
DROP POLICY IF EXISTS "Admins and faculty can update timetable entries" ON timetable;
DROP POLICY IF EXISTS "Only admins can delete timetable entries" ON timetable;
DROP POLICY IF EXISTS "Admin only create timetable" ON timetable;
DROP POLICY IF EXISTS "Admin only update timetable" ON timetable;
DROP POLICY IF EXISTS "Admin only delete timetable" ON timetable;
DROP POLICY IF EXISTS "Only admins can create timetables" ON timetable;
DROP POLICY IF EXISTS "Only admins can update timetables" ON timetable;
DROP POLICY IF EXISTS "Only admins can delete timetables" ON timetable;

-- Enable Row Level Security
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICY 1: EVERYONE CAN VIEW TIMETABLES
-- =====================================================
CREATE POLICY "Everyone can view timetables" ON timetable
  FOR SELECT 
  USING (true);

-- =====================================================
-- POLICY 2: ONLY ADMINS CAN CREATE TIMETABLES
-- =====================================================
CREATE POLICY "Only admins can create timetables" ON timetable
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM preapproved_users
      WHERE preapproved_users.id = auth.uid()
      AND preapproved_users.role = 'admin'
    )
  );

-- =====================================================
-- POLICY 3: ONLY ADMINS CAN UPDATE TIMETABLES
-- =====================================================
CREATE POLICY "Only admins can update timetables" ON timetable
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM preapproved_users
      WHERE preapproved_users.id = auth.uid()
      AND preapproved_users.role = 'admin'
    )
  );

-- =====================================================
-- POLICY 4: ONLY ADMINS CAN DELETE TIMETABLES
-- =====================================================
CREATE POLICY "Only admins can delete timetables" ON timetable
  FOR DELETE
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
GRANT SELECT ON timetable TO authenticated;
GRANT SELECT ON timetable TO anon;
GRANT ALL ON timetable TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
-- If you see this message, the RLS policies were created successfully!
SELECT 'RLS Policies created successfully! Admin-only create/update/delete, Everyone can view.' as status;

-- =====================================================
-- FEEDBACK SYSTEM SETUP
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Everyone can submit feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON feedback;
DROP POLICY IF EXISTS "Only admins can view all feedback" ON feedback;
DROP POLICY IF EXISTS "Only admins can update feedback status" ON feedback;

-- =====================================================
-- FEEDBACK RLS POLICIES
-- =====================================================

-- Policy 1: Everyone can submit feedback
CREATE POLICY "Everyone can submit feedback" ON feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Users can view their own feedback
CREATE POLICY "Users can view their own feedback" ON feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 3: Only admins can view all feedback
CREATE POLICY "Only admins can view all feedback" ON feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM preapproved_users
      WHERE preapproved_users.id = auth.uid()
      AND preapproved_users.role = 'admin'
    )
  );

-- Policy 4: Only admins can update feedback status
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
GRANT SELECT, INSERT ON feedback TO authenticated;
GRANT SELECT, INSERT ON feedback TO anon;
GRANT ALL ON feedback TO authenticated;

-- Success message for feedback system
SELECT 'Feedback system created successfully! Everyone can submit, only admins can view all.' as feedback_status;
