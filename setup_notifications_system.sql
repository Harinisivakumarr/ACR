-- NOTIFICATIONS SYSTEM SETUP
-- This creates a proper read/unread notification system
-- Copy and paste this ENTIRE script into Supabase SQL Editor

-- Step 1: Create user_notifications table to track what each user has seen
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user per announcement
  UNIQUE(user_id, announcement_id)
);

-- Step 2: Enable RLS on user_notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for user_notifications
-- Users can only see their own notification records
CREATE POLICY "Users can view own notifications" ON user_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own notification records
CREATE POLICY "Users can insert own notifications" ON user_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notification records
CREATE POLICY "Users can update own notifications" ON user_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_announcement_id ON user_notifications(announcement_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);

-- Step 5: Create a function to automatically create notification records for new announcements
CREATE OR REPLACE FUNCTION create_notification_for_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification records for all users who should see this announcement
  IF NEW.target_role IS NULL THEN
    -- Announcement for all users
    INSERT INTO user_notifications (user_id, announcement_id, is_read)
    SELECT u.id, NEW.id, FALSE
    FROM auth.users u
    WHERE u.id != auth.uid(); -- Don't notify the creator
  ELSE
    -- Announcement for specific role
    INSERT INTO user_notifications (user_id, announcement_id, is_read)
    SELECT u.id, NEW.id, FALSE
    FROM auth.users u
    JOIN users usr ON usr.id = u.id
    WHERE (usr.role = NEW.target_role OR usr.role = 'admin' OR usr.role = 'Admin')
    AND u.id != auth.uid(); -- Don't notify the creator
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to automatically create notifications
DROP TRIGGER IF EXISTS trigger_create_notifications ON announcements;
CREATE TRIGGER trigger_create_notifications
  AFTER INSERT ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_for_users();

-- Step 7: Grant permissions
GRANT ALL ON user_notifications TO authenticated;

-- Step 8: Create a view for easy querying of unread notifications
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

-- Step 9: Verification
SELECT 'Notifications system setup complete!' as status;
SELECT 
  'Tables created: ' || COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_name IN ('user_notifications') 
AND table_schema = 'public';
