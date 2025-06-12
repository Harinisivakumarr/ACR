-- SIMPLE NOTIFICATIONS FIX
-- This creates a working notification system without complex triggers
-- Copy and paste this ENTIRE script into Supabase SQL Editor

-- Step 1: Drop existing table and recreate cleanly
DROP TABLE IF EXISTS user_notifications CASCADE;

-- Step 2: Create user_notifications table
CREATE TABLE user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user per announcement
  UNIQUE(user_id, announcement_id)
);

-- Step 3: Enable RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple RLS policies
CREATE POLICY "Users can view own notifications" ON user_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON user_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON user_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 5: Grant permissions
GRANT ALL ON user_notifications TO authenticated;

-- Step 6: Create indexes
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_announcement_id ON user_notifications(announcement_id);
CREATE INDEX idx_user_notifications_is_read ON user_notifications(is_read);

-- Step 7: Create the unread_notifications view
CREATE OR REPLACE VIEW unread_notifications AS
SELECT 
  un.id as notification_id,
  un.user_id,
  un.is_read,
  un.created_at as notification_created_at,
  a.id as announcement_id,
  a.title,
  a.content,
  a.created_at as announcement_created_at,
  a.created_by,
  a.target_role
FROM user_notifications un
JOIN announcements a ON a.id = un.announcement_id
WHERE un.is_read = FALSE
ORDER BY un.created_at DESC;

-- Grant access to the view
GRANT SELECT ON unread_notifications TO authenticated;

-- Step 8: Create notifications for existing announcements (for current user)
-- This will create notifications for recent announcements so you can test
INSERT INTO user_notifications (user_id, announcement_id, is_read)
SELECT 
  auth.uid(),
  a.id,
  FALSE
FROM announcements a
WHERE a.created_at > NOW() - INTERVAL '7 days' -- Last 7 days
AND (
  a.target_role IS NULL 
  OR a.target_role = (SELECT role FROM users WHERE id = auth.uid())
  OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'Admin')
)
AND NOT EXISTS (
  SELECT 1 FROM user_notifications 
  WHERE user_id = auth.uid() 
  AND announcement_id = a.id
)
ON CONFLICT (user_id, announcement_id) DO NOTHING;

-- Step 9: Verification
SELECT 'Setup complete!' as status;

-- Show what notifications were created for current user
SELECT 
  'Notifications created for you:' as info,
  COUNT(*) as notification_count
FROM user_notifications 
WHERE user_id = auth.uid() AND is_read = FALSE;

-- Show the actual notifications
SELECT 
  un.id as notification_id,
  a.title,
  a.created_by,
  a.target_role,
  a.created_at as announcement_date
FROM user_notifications un
JOIN announcements a ON a.id = un.announcement_id
WHERE un.user_id = auth.uid() 
AND un.is_read = FALSE
ORDER BY a.created_at DESC;
