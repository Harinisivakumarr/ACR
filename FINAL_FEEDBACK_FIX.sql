-- 🚨 FINAL FEEDBACK SYSTEM FIX
-- This will completely fix all admin access issues
-- Copy and paste this ENTIRE script into Supabase SQL Editor

-- Step 1: Check current user info (for debugging)
SELECT 'Current user check:' as step;
SELECT 
  auth.uid() as user_id,
  u.email,
  u.role,
  u.name
FROM users u 
WHERE u.id = auth.uid();

-- Step 2: Drop ALL existing conflicting policies
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
DROP POLICY IF EXISTS "Users see own feedback or admins see all" ON feedback;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can update feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can delete feedback" ON feedback;

-- Step 3: Create ONE working set of policies
-- Policy 1: Anyone authenticated can submit feedback
CREATE POLICY "feedback_insert_policy" ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: COMBINED SELECT - Users see own OR Admins see all
CREATE POLICY "feedback_select_policy" ON feedback
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own feedback
    auth.uid() = user_id 
    OR 
    -- OR user is admin (check both cases)
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'Admin')
    )
  );

-- Policy 3: Only admins can update feedback
CREATE POLICY "feedback_update_policy" ON feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'Admin')
    )
  );

-- Policy 4: Only admins can delete feedback
CREATE POLICY "feedback_delete_policy" ON feedback
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'Admin')
    )
  );

-- Step 4: Test the admin access query
SELECT 'Testing admin access:' as step;
SELECT 
  f.id,
  f.user_name,
  f.subject,
  f.status,
  f.created_at,
  CASE 
    WHEN f.user_id = auth.uid() THEN 'Own feedback'
    ELSE 'Admin access'
  END as access_type
FROM feedback f
WHERE 
  -- User's own feedback
  f.user_id = auth.uid() 
  OR 
  -- Admin can see all
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'Admin')
  )
ORDER BY f.created_at DESC;

-- Step 5: Show current policies
SELECT 'Current policies after fix:' as step;
SELECT policyname, cmd, permissive, roles, qual
FROM pg_policies 
WHERE tablename = 'feedback'
ORDER BY policyname;

-- Step 6: Final verification
SELECT 'Verification complete!' as status;
SELECT 
  COUNT(*) as total_feedback,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed_count,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count
FROM feedback;
