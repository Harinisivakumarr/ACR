-- 🧪 TEST ADMIN ACCESS TO FEEDBACK
-- Run this to verify admin can see all feedback

-- Test 1: Check your current user info
SELECT 'Your user info:' as test;
SELECT 
  auth.uid() as your_user_id,
  u.email as your_email,
  u.role as your_role,
  u.name as your_name,
  CASE 
    WHEN u.role = 'admin' OR u.role = 'Admin' THEN '✅ You are an admin'
    ELSE '❌ You are NOT an admin'
  END as admin_status
FROM users u 
WHERE u.id = auth.uid();

-- Test 2: Check all feedback in the system
SELECT 'All feedback in system:' as test;
SELECT 
  id,
  user_name,
  user_email,
  subject,
  LEFT(message, 50) || '...' as message_preview,
  status,
  created_at
FROM feedback
ORDER BY created_at DESC;

-- Test 3: Test what YOU can see with current RLS policies
SELECT 'What you can see (RLS test):' as test;
SELECT 
  f.id,
  f.user_name,
  f.subject,
  f.status,
  f.created_at,
  CASE 
    WHEN f.user_id = auth.uid() THEN 'Your own feedback'
    ELSE 'Admin access to others feedback'
  END as why_you_can_see_this
FROM feedback f
ORDER BY f.created_at DESC;

-- Test 4: Check current RLS policies
SELECT 'Current RLS policies:' as test;
SELECT 
  policyname,
  cmd as operation,
  CASE WHEN permissive = 'PERMISSIVE' THEN '✅ Permissive' ELSE '❌ Restrictive' END as type,
  qual as condition
FROM pg_policies 
WHERE tablename = 'feedback'
ORDER BY policyname;
