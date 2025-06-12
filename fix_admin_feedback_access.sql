-- FIX ADMIN ACCESS TO FEEDBACK
-- Run this if you already have the feedback table but admins can't see all feedback

-- Drop existing SELECT policies that might be conflicting
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;

-- Create a single combined SELECT policy
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

-- Test the policy by checking what an admin should see
-- Replace 'your-admin-user-id' with an actual admin user ID to test
-- SELECT * FROM feedback WHERE 
--   auth.uid() = user_id 
--   OR 
--   EXISTS (
--     SELECT 1 FROM preapproved_users 
--     WHERE user_id = auth.uid() 
--     AND role = 'admin'
--   );
