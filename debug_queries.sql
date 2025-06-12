-- Debug queries to check the current state

-- 1. Check your current user's role in the users table
SELECT id, email, name, role FROM users WHERE email = 'your-email@example.com';

-- 2. Check your current user's role in preapproved_users table  
SELECT id, email, name, role FROM preapproved_users WHERE email = 'your-email@example.com';

-- 3. Check if the policies were created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'academic_calendar';

-- 4. Test the policy check manually (replace 'your-user-id' with your actual auth.uid())
SELECT EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = 'your-user-id'  -- Replace with your actual user ID
  AND users.role = 'Admin'
) as can_insert;

-- 5. Check what auth.uid() returns for your session
SELECT auth.uid() as current_user_id;

-- 6. Check the academic_calendar table structure
\d academic_calendar;
