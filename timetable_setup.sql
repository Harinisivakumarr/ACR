-- Create timetable table for class schedules
CREATE TABLE IF NOT EXISTS timetable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id VARCHAR(50) NOT NULL, -- e.g., "AI-A", "CS-B", "ECE-C"
  day_of_week VARCHAR(20) NOT NULL, -- Monday, Tuesday, etc.
  period_number INTEGER NOT NULL, -- 1-8
  subject VARCHAR(100) NOT NULL,
  classroom_id VARCHAR(50), -- Reference to classroom
  start_time TIME,
  end_time TIME,
  year VARCHAR(10) NOT NULL, -- e.g., "2024", "2025"
  branch VARCHAR(50) NOT NULL, -- e.g., "AI", "CS", "ECE"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timetable_class_id ON timetable(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day_period ON timetable(day_of_week, period_number);
CREATE INDEX IF NOT EXISTS idx_timetable_year_branch ON timetable(year, branch);
CREATE INDEX IF NOT EXISTS idx_timetable_subject ON timetable(subject);

-- Enable Row Level Security (RLS)
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Policy 1: Everyone can read timetable (students, faculty, etc. need to see schedules)
CREATE POLICY "Everyone can view timetables" ON timetable
  FOR SELECT USING (true);

-- Policy 2: ONLY ADMINS can insert timetable entries
CREATE POLICY "Only admins can create timetables" ON timetable
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
    )
  );

-- Policy 3: ONLY ADMINS can update timetable entries
CREATE POLICY "Only admins can update timetables" ON timetable
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
    )
  );

-- Policy 4: ONLY ADMINS can delete timetable entries
CREATE POLICY "Only admins can delete timetables" ON timetable
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
    )
  );

-- Grant necessary permissions
GRANT ALL ON timetable TO authenticated;
GRANT SELECT ON timetable TO anon;

-- Insert some sample data for testing
INSERT INTO timetable (class_id, day_of_week, period_number, subject, classroom_id, start_time, end_time, year, branch) VALUES
-- AI-A Monday
('AI-A', 'Monday', 1, 'Machine Learning', 'AI-101', '09:00', '09:50', '2024', 'AI'),
('AI-A', 'Monday', 2, 'Data Structures', 'AI-101', '09:50', '10:40', '2024', 'AI'),
('AI-A', 'Monday', 3, 'Mathematics', 'AI-102', '10:50', '11:40', '2024', 'AI'),
('AI-A', 'Monday', 4, 'Python Programming', 'AI-101', '11:40', '12:30', '2024', 'AI'),
('AI-A', 'Monday', 5, 'Lunch', NULL, '12:30', '13:20', '2024', 'AI'),
('AI-A', 'Monday', 6, 'Neural Networks', 'AI-103', '14:10', '15:00', '2024', 'AI'),
('AI-A', 'Monday', 7, 'Statistics', 'AI-102', '15:10', '16:00', '2024', 'AI'),
('AI-A', 'Monday', 8, 'Lab Session', 'AI-Lab1', '16:00', '16:50', '2024', 'AI'),

-- AI-A Tuesday
('AI-A', 'Tuesday', 1, 'Deep Learning', 'AI-103', '09:00', '09:50', '2024', 'AI'),
('AI-A', 'Tuesday', 2, 'Algorithms', 'AI-101', '09:50', '10:40', '2024', 'AI'),
('AI-A', 'Tuesday', 3, 'Linear Algebra', 'AI-102', '10:50', '11:40', '2024', 'AI'),
('AI-A', 'Tuesday', 4, 'Computer Vision', 'AI-103', '11:40', '12:30', '2024', 'AI'),
('AI-A', 'Tuesday', 5, 'Lunch', NULL, '12:30', '13:20', '2024', 'AI'),
('AI-A', 'Tuesday', 6, 'NLP', 'AI-101', '14:10', '15:00', '2024', 'AI'),
('AI-A', 'Tuesday', 7, 'Ethics in AI', 'AI-102', '15:10', '16:00', '2024', 'AI'),
('AI-A', 'Tuesday', 8, 'Project Work', 'AI-Lab1', '16:00', '16:50', '2024', 'AI'),

-- AI-A Wednesday
('AI-A', 'Wednesday', 1, 'Distributed Systems', 'AI-101', '09:00', '09:50', '2024', 'AI'),
('AI-A', 'Wednesday', 2, 'Computer Security', 'AI-102', '09:50', '10:40', '2024', 'AI'),
('AI-A', 'Wednesday', 3, 'Cloud Computing', 'AI-103', '10:50', '11:40', '2024', 'AI'),
('AI-A', 'Wednesday', 4, 'Software Engineering', 'AI-101', '11:40', '12:30', '2024', 'AI'),
('AI-A', 'Wednesday', 5, 'Lunch', NULL, '12:30', '13:20', '2024', 'AI'),
('AI-A', 'Wednesday', 6, 'Machine Learning', 'AI-102', '14:10', '15:00', '2024', 'AI'),
('AI-A', 'Wednesday', 7, 'Data Mining', 'AI-103', '15:10', '16:00', '2024', 'AI'),
('AI-A', 'Wednesday', 8, 'Research Methods', 'AI-Lab1', '16:00', '16:50', '2024', 'AI'),

-- AI-A Thursday
('AI-A', 'Thursday', 1, 'Robotics', 'AI-103', '09:00', '09:50', '2024', 'AI'),
('AI-A', 'Thursday', 2, 'IoT Systems', 'AI-101', '09:50', '10:40', '2024', 'AI'),
('AI-A', 'Thursday', 3, 'Big Data Analytics', 'AI-102', '10:50', '11:40', '2024', 'AI'),
('AI-A', 'Thursday', 4, 'Blockchain Tech', 'AI-103', '11:40', '12:30', '2024', 'AI'),
('AI-A', 'Thursday', 5, 'Lunch', NULL, '12:30', '13:20', '2024', 'AI'),
('AI-A', 'Thursday', 6, 'Quantum Computing', 'AI-101', '14:10', '15:00', '2024', 'AI'),
('AI-A', 'Thursday', 7, 'Cybersecurity', 'AI-102', '15:10', '16:00', '2024', 'AI'),
('AI-A', 'Thursday', 8, 'Innovation Lab', 'AI-Lab1', '16:00', '16:50', '2024', 'AI'),

-- AI-A Friday
('AI-A', 'Friday', 1, 'Presentation Skills', 'AI-101', '09:00', '09:50', '2024', 'AI'),
('AI-A', 'Friday', 2, 'Technical Writing', 'AI-102', '09:50', '10:40', '2024', 'AI'),
('AI-A', 'Friday', 3, 'Industry Connect', 'AI-103', '10:50', '11:40', '2024', 'AI'),
('AI-A', 'Friday', 4, 'Capstone Project', 'AI-Lab1', '11:40', '12:30', '2024', 'AI'),
('AI-A', 'Friday', 5, 'Lunch', NULL, '12:30', '13:20', '2024', 'AI'),
('AI-A', 'Friday', 6, 'Seminar', 'AI-101', '14:10', '15:00', '2024', 'AI'),
('AI-A', 'Friday', 7, 'Career Guidance', 'AI-102', '15:10', '16:00', '2024', 'AI'),
('AI-A', 'Friday', 8, 'Free Period', NULL, '16:00', '16:50', '2024', 'AI'),

-- CS-A Monday
('CS-A', 'Monday', 1, 'Operating Systems', 'CS-201', '09:00', '09:50', '2024', 'CS'),
('CS-A', 'Monday', 2, 'Database Systems', 'CS-202', '09:50', '10:40', '2024', 'CS'),
('CS-A', 'Monday', 3, 'Software Engineering', 'CS-201', '10:50', '11:40', '2024', 'CS'),
('CS-A', 'Monday', 4, 'Web Development', 'CS-Lab1', '11:40', '12:30', '2024', 'CS'),
('CS-A', 'Monday', 5, 'Lunch', NULL, '12:30', '13:20', '2024', 'CS'),
('CS-A', 'Monday', 6, 'Computer Networks', 'CS-202', '14:10', '15:00', '2024', 'CS'),
('CS-A', 'Monday', 7, 'Discrete Mathematics', 'CS-201', '15:10', '16:00', '2024', 'CS'),
('CS-A', 'Monday', 8, 'Programming Lab', 'CS-Lab2', '16:00', '16:50', '2024', 'CS'),

-- Add more sample data for different sections and days
('AI-B', 'Monday', 1, 'Machine Learning', 'AI-104', '09:00', '09:50', '2024', 'AI'),
('AI-B', 'Monday', 2, 'Data Structures', 'AI-104', '09:50', '10:40', '2024', 'AI'),
('AI-B', 'Monday', 3, 'Mathematics', 'AI-105', '10:50', '11:40', '2024', 'AI'),
('AI-B', 'Monday', 4, 'Python Programming', 'AI-104', '11:40', '12:30', '2024', 'AI'),
('AI-B', 'Monday', 5, 'Lunch', NULL, '12:30', '13:20', '2024', 'AI'),
('AI-B', 'Monday', 6, 'Neural Networks', 'AI-106', '14:10', '15:00', '2024', 'AI'),
('AI-B', 'Monday', 7, 'Statistics', 'AI-105', '15:10', '16:00', '2024', 'AI'),
('AI-B', 'Monday', 8, 'Lab Session', 'AI-Lab2', '16:00', '16:50', '2024', 'AI');
