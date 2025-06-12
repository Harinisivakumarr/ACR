-- =====================================================
-- TIMETABLE RLS POLICIES SETUP
-- =====================================================
-- This script sets up Row Level Security policies for the timetable table
-- ADMIN ONLY: Create, Update, Delete timetables
-- EVERYONE: Can view/read timetables
-- =====================================================

-- First, drop any existing policies to start fresh
DROP POLICY IF EXISTS "Everyone can view timetable" ON timetable;
DROP POLICY IF EXISTS "Admins and faculty can create timetable entries" ON timetable;
DROP POLICY IF EXISTS "Admins and faculty can update timetable entries" ON timetable;
DROP POLICY IF EXISTS "Only admins can delete timetable entries" ON timetable;
DROP POLICY IF EXISTS "Admin only create timetable" ON timetable;
DROP POLICY IF EXISTS "Admin only update timetable" ON timetable;
DROP POLICY IF EXISTS "Admin only delete timetable" ON timetable;

-- Enable Row Level Security on the timetable table
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICY 1: EVERYONE CAN VIEW TIMETABLES
-- =====================================================
-- Students, Faculty, CR, Admin - everyone can see timetables
CREATE POLICY "Everyone can view timetables" ON timetable
  FOR SELECT 
  USING (true);

-- =====================================================
-- POLICY 2: ONLY ADMINS CAN CREATE TIMETABLES
-- =====================================================
-- Only users with role 'admin' can insert new timetable entries
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
-- Only users with role 'admin' can modify existing timetable entries
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
-- Only users with role 'admin' can delete timetable entries
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
-- Grant necessary permissions to authenticated users
GRANT SELECT ON timetable TO authenticated;
GRANT SELECT ON timetable TO anon;

-- Grant full permissions to authenticated users (RLS will control access)
GRANT ALL ON timetable TO authenticated;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_timetable_class_id ON timetable(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day_period ON timetable(day_of_week, period_number);
CREATE INDEX IF NOT EXISTS idx_timetable_year_branch ON timetable(year, branch);
CREATE INDEX IF NOT EXISTS idx_timetable_subject ON timetable(subject);

-- =====================================================
-- VERIFY POLICIES (Optional - for testing)
-- =====================================================
-- You can run these queries to verify the policies are working:

-- Check if policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'timetable';

-- Test as different user roles:
-- SELECT * FROM timetable; -- Should work for everyone
-- INSERT INTO timetable (...) VALUES (...); -- Should only work for Admins
-- UPDATE timetable SET subject = 'Test' WHERE id = 'some-id'; -- Should only work for Admins
-- DELETE FROM timetable WHERE id = 'some-id'; -- Should only work for Admins

-- =====================================================
-- SUMMARY OF PERMISSIONS
-- =====================================================
-- 
-- 👥 EVERYONE (Student, Faculty, CR, Admin):
--    ✅ SELECT/VIEW timetables
--
-- 🔐 ADMIN ONLY:
--    ✅ INSERT new timetable entries
--    ✅ UPDATE existing timetable entries  
--    ✅ DELETE timetable entries
--    ✅ SELECT/VIEW timetables
--
-- 🚫 STUDENTS, FACULTY, CR:
--    ❌ Cannot INSERT timetables
--    ❌ Cannot UPDATE timetables
--    ❌ Cannot DELETE timetables
--    ✅ Can only VIEW timetables
--
-- =====================================================
