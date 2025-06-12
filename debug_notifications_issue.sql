-- DEBUG NOTIFICATIONS ISSUE
-- Run this to diagnose why notifications aren't working

-- Step 1: Check if user_notifications table exists
SELECT 'Step 1: Checking user_notifications table' as step;
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'user_notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check current user info
SELECT 'Step 2: Current user info' as step;
SELECT 
  auth.uid() as current_user_id,
  u.email,
  u.role,
  u.name
FROM users u 
WHERE u.id = auth.uid();

-- Step 3: Check recent announcements
SELECT 'Step 3: Recent announcements' as step;
SELECT 
  id,
  title,
  target_role,
  created_by,
  created_at,
  CASE 
    WHEN created_at > NOW() - INTERVAL '1 hour' THEN '🆕 Very Recent'
    WHEN created_at > NOW() - INTERVAL '1 day' THEN '📅 Today'
    ELSE '📆 Older'
  END as recency
FROM announcements
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Check if any user_notifications exist at all
SELECT 'Step 4: All user_notifications in system' as step;
SELECT 
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_count,
  COUNT(CASE WHEN is_read = TRUE THEN 1 END) as read_count
FROM user_notifications;

-- Step 5: Check user_notifications for current user
SELECT 'Step 5: Your user_notifications' as step;
SELECT 
  un.id,
  un.announcement_id,
  un.is_read,
  un.created_at as notification_created,
  a.title,
  a.created_by
FROM user_notifications un
LEFT JOIN announcements a ON a.id = un.announcement_id
WHERE un.user_id = auth.uid()
ORDER BY un.created_at DESC;

-- Step 6: Check if trigger exists
SELECT 'Step 6: Checking trigger' as step;
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_notifications';

-- Step 7: Check if function exists
SELECT 'Step 7: Checking function' as step;
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'create_notification_for_users';

-- Step 8: Manual test - create a notification record for current user for latest announcement
SELECT 'Step 8: Manual notification creation test' as step;

-- Get the latest announcement
WITH latest_announcement AS (
  SELECT id, title, target_role, created_by
  FROM announcements 
  ORDER BY created_at DESC 
  LIMIT 1
)
-- Try to insert a notification manually
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
RETURNING 'Manual notification created for: ' || (SELECT title FROM latest_announcement) as result;

-- Step 9: Check unread_notifications view
SELECT 'Step 9: Checking unread_notifications view' as step;
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

SELECT 'Debug complete! Check results above.' as final_result;
