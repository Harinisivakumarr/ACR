-- 🧪 TEST NOTIFICATIONS SYSTEM AFTER SETUP
-- Run this after the main setup to verify everything works

-- Test 1: Check if table exists and has correct structure
SELECT '🔍 Test 1: Table Structure' as test;
SELECT 
  table_name,
  CASE WHEN table_name = 'user_notifications' THEN '✅ Table exists' ELSE '❌ Table missing' END as status
FROM information_schema.tables 
WHERE table_name = 'user_notifications' 
AND table_schema = 'public';

-- Test 2: Check RLS policies
SELECT '🔍 Test 2: RLS Policies' as test;
SELECT 
  COUNT(*) as policy_count,
  CASE WHEN COUNT(*) >= 4 THEN '✅ Policies created' ELSE '❌ Missing policies' END as status
FROM pg_policies 
WHERE tablename = 'user_notifications';

-- Test 3: Check current user
SELECT '🔍 Test 3: Current User' as test;
SELECT 
  auth.uid() as user_id,
  u.email,
  u.role,
  u.name,
  CASE WHEN auth.uid() IS NOT NULL THEN '✅ User authenticated' ELSE '❌ Not authenticated' END as status
FROM users u 
WHERE u.id = auth.uid();

-- Test 4: Check unread notifications count
SELECT '🔍 Test 4: Your Notifications' as test;
SELECT 
  COUNT(*) as notification_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ You have ' || COUNT(*) || ' notifications'
    ELSE '⚠️ No notifications (this is normal if no recent announcements)'
  END as status
FROM user_notifications 
WHERE user_id = auth.uid() AND is_read = FALSE;

-- Test 5: Check unread_notifications view
SELECT '🔍 Test 5: Unread Notifications View' as test;
SELECT 
  COUNT(*) as view_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ View working with ' || COUNT(*) || ' notifications'
    ELSE '⚠️ View working but no notifications'
  END as status
FROM unread_notifications
WHERE user_id = auth.uid();

-- Test 6: Check recent announcements
SELECT '🔍 Test 6: Recent Announcements' as test;
SELECT 
  COUNT(*) as announcement_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Found ' || COUNT(*) || ' recent announcements'
    ELSE '⚠️ No recent announcements'
  END as status
FROM announcements
WHERE created_at > NOW() - INTERVAL '30 days';

-- Test 7: Manual notification creation test
SELECT '🔍 Test 7: Manual Notification Creation' as test;

-- Try to create a test notification for the latest announcement
WITH latest_announcement AS (
  SELECT id, title, target_role
  FROM announcements 
  ORDER BY created_at DESC 
  LIMIT 1
),
test_insert AS (
  INSERT INTO user_notifications (user_id, announcement_id, is_read)
  SELECT 
    auth.uid(),
    la.id,
    FALSE
  FROM latest_announcement la
  WHERE NOT EXISTS (
    SELECT 1 FROM user_notifications 
    WHERE user_id = auth.uid() 
    AND announcement_id = la.id
  )
  ON CONFLICT (user_id, announcement_id) DO NOTHING
  RETURNING id
)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM test_insert) THEN '✅ Test notification created'
    WHEN EXISTS (SELECT 1 FROM latest_announcement) THEN '⚠️ Notification already exists (normal)'
    ELSE '❌ No announcements to test with'
  END as status;

-- Test 8: Check trigger function exists
SELECT '🔍 Test 8: Trigger Function' as test;
SELECT 
  routine_name,
  CASE WHEN routine_name = 'create_notifications_for_announcement' THEN '✅ Function exists' ELSE '❌ Function missing' END as status
FROM information_schema.routines 
WHERE routine_name = 'create_notifications_for_announcement';

-- Test 9: Check trigger exists
SELECT '🔍 Test 9: Trigger' as test;
SELECT 
  trigger_name,
  CASE WHEN trigger_name = 'trigger_create_notifications_for_announcement' THEN '✅ Trigger exists' ELSE '❌ Trigger missing' END as status
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_notifications_for_announcement';

-- Test 10: Final summary
SELECT '📊 FINAL TEST SUMMARY' as summary;

SELECT 
  'Total notifications for you: ' || COUNT(*) as your_notifications
FROM user_notifications 
WHERE user_id = auth.uid();

SELECT 
  'Unread notifications: ' || COUNT(*) as unread_notifications
FROM user_notifications 
WHERE user_id = auth.uid() AND is_read = FALSE;

-- Show your actual notifications
SELECT '📋 Your Actual Notifications:' as details;
SELECT 
  un.id as notification_id,
  a.title,
  a.created_by,
  a.target_role,
  a.created_at as announcement_date,
  un.created_at as notification_date,
  CASE WHEN un.is_read THEN '✅ Read' ELSE '🔔 Unread' END as status
FROM user_notifications un
JOIN announcements a ON a.id = un.announcement_id
WHERE un.user_id = auth.uid()
ORDER BY un.created_at DESC
LIMIT 10;

SELECT '🎯 TESTING COMPLETE!' as result;
SELECT 'If you see notifications above, the system is working!' as instruction;
SELECT 'If no notifications, ask an admin to create a test announcement.' as next_step;
