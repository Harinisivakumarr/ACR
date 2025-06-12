-- 🧪 CREATE TEST ANNOUNCEMENT (FOR ADMINS ONLY)
-- Run this as an admin to create a test announcement and verify notifications work

-- Check if current user is admin
SELECT 'Admin Check:' as step;
SELECT 
  u.role,
  CASE 
    WHEN u.role IN ('admin', 'Admin') THEN '✅ You are an admin - can create test announcement'
    ELSE '❌ You are not an admin - ask an admin to run this'
  END as status
FROM users u 
WHERE u.id = auth.uid();

-- Create a test announcement (only if admin)
INSERT INTO announcements (title, content, created_by, target_role)
SELECT 
  'Test Notification System - ' || TO_CHAR(NOW(), 'HH24:MI:SS'),
  'This is a test announcement to verify the notification system is working properly. If you can see this as a notification, everything is working! Created at ' || NOW(),
  u.name,
  NULL  -- NULL means for all users
FROM users u 
WHERE u.id = auth.uid() 
AND u.role IN ('admin', 'Admin')
RETURNING 
  id,
  title,
  'Test announcement created!' as status;

-- Show what notifications were created
SELECT 'Notifications created:' as step;
SELECT 
  COUNT(*) as notification_count,
  'Notifications created for ' || COUNT(*) || ' users' as result
FROM user_notifications un
JOIN announcements a ON a.id = un.announcement_id
WHERE a.title LIKE 'Test Notification System%'
AND a.created_at > NOW() - INTERVAL '1 minute';

-- Show which users got notifications
SELECT 'Users who got notifications:' as step;
SELECT 
  u.email,
  u.role,
  u.name,
  un.created_at as notification_created
FROM user_notifications un
JOIN announcements a ON a.id = un.announcement_id
JOIN users u ON u.id = un.user_id
WHERE a.title LIKE 'Test Notification System%'
AND a.created_at > NOW() - INTERVAL '1 minute'
ORDER BY un.created_at DESC;

SELECT '✅ Test announcement created! Check your dashboard notifications.' as final_result;
