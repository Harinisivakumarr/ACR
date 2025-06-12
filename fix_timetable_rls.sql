-- =====================================================
-- FIX TIMETABLE RLS POLICIES
-- =====================================================
-- This script fixes the RLS policies to use the correct users table
-- The issue was that policies were checking preapproved_users.id = auth.uid()
-- but preapproved_users has its own UUID, not the auth user ID
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view timetables" ON timetable;
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
-- Check the users table (which uses auth.uid() as the primary key)
CREATE POLICY "Only admins can create timetables" ON timetable
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'Admin')
    )
  );

-- =====================================================
-- POLICY 3: ONLY ADMINS CAN UPDATE TIMETABLES
-- =====================================================
CREATE POLICY "Only admins can update timetables" ON timetable
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'Admin')
    )
  );

-- =====================================================
-- POLICY 4: ONLY ADMINS CAN DELETE TIMETABLES
-- =====================================================
CREATE POLICY "Only admins can delete timetables" ON timetable
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'Admin')
    )
  );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON timetable TO authenticated;
GRANT SELECT ON timetable TO anon;
GRANT ALL ON timetable TO authenticated;

-- =====================================================
-- TEST THE POLICIES
-- =====================================================
-- Check current user's role
SELECT 
  id,
  email,
  name,
  role,
  'Current user role' as description
FROM users 
WHERE id = auth.uid();

-- Test if current user can create timetables
SELECT 
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'admin' OR users.role = 'Admin')
  ) as can_create_timetables,
  'Can current user create timetables?' as description;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Timetable RLS policies fixed! Now using the correct users table.' as status;
