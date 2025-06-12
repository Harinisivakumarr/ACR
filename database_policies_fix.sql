-- Drop existing policies first
DROP POLICY IF EXISTS "Everyone can view academic calendar events" ON academic_calendar;
DROP POLICY IF EXISTS "Only admins can create academic calendar events" ON academic_calendar;
DROP POLICY IF EXISTS "Only admins can update their own academic calendar events" ON academic_calendar;
DROP POLICY IF EXISTS "Only admins can delete their own academic calendar events" ON academic_calendar;

-- Create indexes for better performance (if not already created)
CREATE INDEX IF NOT EXISTS idx_academic_calendar_date ON academic_calendar(date);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_created_by ON academic_calendar(created_by);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_event_type ON academic_calendar(event_type);

-- Enable Row Level Security (RLS)
ALTER TABLE academic_calendar ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Policy 1: Everyone can read events
CREATE POLICY "Everyone can view academic calendar events" ON academic_calendar
  FOR SELECT USING (true);

-- Policy 2: Only admins can insert events (checking for both 'admin' and 'Admin')
CREATE POLICY "Only admins can create academic calendar events" ON academic_calendar
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'admin' OR users.role = 'Admin')
    )
  );

-- Policy 3: Only admins can update their own events
CREATE POLICY "Only admins can update their own academic calendar events" ON academic_calendar
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'admin' OR users.role = 'Admin')
    )
    AND created_by = auth.uid()
  );

-- Policy 4: Only admins can delete their own events
CREATE POLICY "Only admins can delete their own academic calendar events" ON academic_calendar
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'admin' OR users.role = 'Admin')
    )
    AND created_by = auth.uid()
  );

-- Grant necessary permissions
GRANT ALL ON academic_calendar TO authenticated;
GRANT ALL ON academic_calendar TO anon;
