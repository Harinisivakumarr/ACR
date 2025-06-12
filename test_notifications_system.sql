-- TEST NOTIFICATIONS SYSTEM
-- Run this to test if the notification system is working properly

-- Test 1: Check if user_notifications table exists
SELECT 'Testing user_notifications table:' as test;
SELECT 
  table_name,
  CASE WHEN table_name = 'user_notifications' THEN '✅ Table exists' ELSE '❌ Table missing' END as status
FROM information_schema.tables 
WHERE table_name = 'user_notifications' 
AND table_schema = 'public';

-- Test 2: Check current user info
SELECT 'Current user info:' as test;
SELECT 
  auth.uid() as user_id,
  u.email,
  u.role,
  u.name
FROM users u 
WHERE u.id = auth.uid();

-- Test 3: Check unread notifications for current user
SELECT 'Your unread notifications:' as test;
SELECT 
  notification_id,
  title,
  content,
  created_by,
  target_role,
  announcement_created_at
FROM unread_notifications
WHERE user_id = auth.uid()
ORDER BY notification_created_at DESC;

-- Test 4: Check all user_notifications records for current user
SELECT 'All your notification records:' as test;
SELECT 
  un.id as notification_id,
  un.is_read,
  un.read_at,
  un.created_at as notification_created,
  a.title,
  a.created_by
FROM user_notifications un
JOIN announcements a ON a.id = un.announcement_id
WHERE un.user_id = auth.uid()
ORDER BY un.created_at DESC
LIMIT 10;

-- Test 5: Count unread notifications
SELECT 'Unread count:' as test;
SELECT 
  COUNT(*) as unread_count
FROM user_notifications
WHERE user_id = auth.uid() 
AND is_read = FALSE;

-- Test 6: Check recent announcements
SELECT 'Recent announcements:' as test;
SELECT 
  id,
  title,
  target_role,
  created_by,
  created_at
FROM announcements
ORDER BY created_at DESC
LIMIT 5;

-- Test 7: Simulate marking a notification as read (if you have any)
-- Uncomment the lines below and replace 'NOTIFICATION_ID_HERE' with an actual notification ID
-- UPDATE user_notifications 
-- SET is_read = TRUE, read_at = NOW()
-- WHERE id = 'NOTIFICATION_ID_HERE' AND user_id = auth.uid();

SELECT 'Notification system test complete!' as result;
