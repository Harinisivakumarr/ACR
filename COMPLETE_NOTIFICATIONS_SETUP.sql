-- 🔔 COMPLETE NOTIFICATIONS SYSTEM SETUP FROM SCRATCH
-- This creates EVERYTHING needed for the notification system
-- Copy and paste this ENTIRE script into Supabase SQL Editor and run it

-- =====================================================
-- STEP 1: CREATE USER_NOTIFICATIONS TABLE
-- =====================================================
DROP TABLE IF EXISTS user_notifications CASCADE;

CREATE TABLE user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure one record per user per announcement
  UNIQUE(user_id, announcement_id)
);

-- =====================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_announcement_id ON user_notifications(announcement_id);
CREATE INDEX idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at);
CREATE INDEX idx_user_notifications_user_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;

-- =====================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE RLS POLICIES
-- =====================================================
-- Policy 1: Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON user_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own notifications
CREATE POLICY "Users can insert own notifications" ON user_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own notifications
CREATE POLICY "Users can update own notifications" ON user_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 4: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON user_notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- STEP 5: GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON user_notifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- STEP 6: CREATE UNREAD_NOTIFICATIONS VIEW
-- =====================================================
CREATE OR REPLACE VIEW unread_notifications AS
SELECT 
  un.id as notification_id,
  un.user_id,
  un.is_read,
  un.created_at as notification_created_at,
  un.updated_at as notification_updated_at,
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

-- =====================================================
-- STEP 7: CREATE FUNCTION TO AUTO-CREATE NOTIFICATIONS
-- =====================================================
CREATE OR REPLACE FUNCTION create_notifications_for_announcement()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notifications for all relevant users
  IF NEW.target_role IS NULL THEN
    -- Announcement for all users
    INSERT INTO user_notifications (user_id, announcement_id, is_read)
    SELECT 
      u.id, 
      NEW.id, 
      FALSE
    FROM auth.users u
    JOIN users usr ON usr.id = u.id
    WHERE u.id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    ON CONFLICT (user_id, announcement_id) DO NOTHING;
  ELSE
    -- Announcement for specific role
    INSERT INTO user_notifications (user_id, announcement_id, is_read)
    SELECT 
      u.id, 
      NEW.id, 
      FALSE
    FROM auth.users u
    JOIN users usr ON usr.id = u.id
    WHERE (
      usr.role = NEW.target_role 
      OR usr.role = 'admin' 
      OR usr.role = 'Admin'
    )
    AND u.id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    ON CONFLICT (user_id, announcement_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 8: CREATE TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS trigger_create_notifications_for_announcement ON announcements;

CREATE TRIGGER trigger_create_notifications_for_announcement
  AFTER INSERT ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION create_notifications_for_announcement();

-- =====================================================
-- STEP 9: CREATE NOTIFICATIONS FOR EXISTING ANNOUNCEMENTS
-- =====================================================
-- This creates notifications for recent announcements so you have something to test with

-- For current user specifically
INSERT INTO user_notifications (user_id, announcement_id, is_read)
SELECT 
  auth.uid(),
  a.id,
  FALSE
FROM announcements a
WHERE a.created_at > NOW() - INTERVAL '30 days' -- Last 30 days
AND (
  -- Announcement is for everyone
  a.target_role IS NULL 
  OR 
  -- Announcement is for user's role
  a.target_role = (SELECT role FROM users WHERE id = auth.uid())
  OR 
  -- User is admin (sees everything)
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'Admin')
)
AND a.created_by != (SELECT name FROM users WHERE id = auth.uid()) -- Don't notify self
ON CONFLICT (user_id, announcement_id) DO NOTHING;

-- =====================================================
-- STEP 10: VERIFICATION AND RESULTS
-- =====================================================
SELECT '🎉 NOTIFICATIONS SYSTEM SETUP COMPLETE!' as status;

-- Show table structure
SELECT 'Table Structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show policies created
SELECT 'RLS Policies Created:' as info;
SELECT 
  policyname,
  cmd as operation,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'user_notifications'
ORDER BY policyname;

-- Show current user info
SELECT 'Your User Info:' as info;
SELECT 
  auth.uid() as your_user_id,
  u.email,
  u.role,
  u.name
FROM users u 
WHERE u.id = auth.uid();

-- Show notifications created for current user
SELECT 'Notifications Created For You:' as info;
SELECT 
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_count
FROM user_notifications 
WHERE user_id = auth.uid();

-- Show actual notification details
SELECT 'Your Unread Notifications:' as info;
SELECT 
  notification_id,
  title,
  LEFT(content, 50) || '...' as content_preview,
  created_by,
  target_role,
  announcement_created_at
FROM unread_notifications
WHERE user_id = auth.uid()
ORDER BY announcement_created_at DESC
LIMIT 5;

-- Show recent announcements in system
SELECT 'Recent Announcements in System:' as info;
SELECT 
  id,
  title,
  target_role,
  created_by,
  created_at,
  CASE 
    WHEN created_at > NOW() - INTERVAL '1 hour' THEN '🆕 Very Recent'
    WHEN created_at > NOW() - INTERVAL '1 day' THEN '📅 Today'
    WHEN created_at > NOW() - INTERVAL '7 days' THEN '📆 This Week'
    ELSE '📅 Older'
  END as recency
FROM announcements
ORDER BY created_at DESC
LIMIT 10;

SELECT '✅ Setup complete! Refresh your dashboard to see notifications.' as final_message;
