# 🔐 Timetable RLS Policies Setup Guide

## 🎯 **Objective**
Set up Row Level Security (RLS) policies for the timetable table where:
- **👥 EVERYONE**: Can view/read timetables
- **🔐 ADMIN ONLY**: Can create, update, and delete timetables

---

## 📋 **Step-by-Step Setup**

### 1. **Open Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Sign in and open your project
   - Navigate to **SQL Editor**

### 2. **Run RLS Policies Script**
   - Copy the entire contents of `timetable_rls_policies.sql`
   - Paste into SQL Editor
   - Click **"Run"**

### 3. **Verify Setup**
   - Go to **Authentication** → **Policies**
   - Look for the `timetable` table
   - You should see 4 policies created

---

## 🔒 **RLS Policies Created**

### **Policy 1: Everyone can view timetables**
```sql
FOR SELECT USING (true)
```
- ✅ **Students** can view
- ✅ **Faculty** can view  
- ✅ **CR** can view
- ✅ **Admin** can view

### **Policy 2: Only admins can create timetables**
```sql
FOR INSERT WITH CHECK (users.role = 'Admin')
```
- ❌ **Students** cannot create
- ❌ **Faculty** cannot create
- ❌ **CR** cannot create
- ✅ **Admin** can create

### **Policy 3: Only admins can update timetables**
```sql
FOR UPDATE USING (users.role = 'Admin')
```
- ❌ **Students** cannot update
- ❌ **Faculty** cannot update
- ❌ **CR** cannot update
- ✅ **Admin** can update

### **Policy 4: Only admins can delete timetables**
```sql
FOR DELETE USING (users.role = 'Admin')
```
- ❌ **Students** cannot delete
- ❌ **Faculty** cannot delete
- ❌ **CR** cannot delete
- ✅ **Admin** can delete

---

## 🧪 **Testing the Policies**

### **As a Student/Faculty/CR:**
```sql
-- This should WORK ✅
SELECT * FROM timetable;

-- These should FAIL ❌
INSERT INTO timetable (...) VALUES (...);
UPDATE timetable SET subject = 'Test' WHERE id = 'some-id';
DELETE FROM timetable WHERE id = 'some-id';
```

### **As an Admin:**
```sql
-- All of these should WORK ✅
SELECT * FROM timetable;
INSERT INTO timetable (...) VALUES (...);
UPDATE timetable SET subject = 'Test' WHERE id = 'some-id';
DELETE FROM timetable WHERE id = 'some-id';
```

---

## 🔍 **Verification Commands**

### **Check if policies exist:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'timetable';
```

### **Check RLS is enabled:**
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'timetable';
```

---

## 🚨 **Important Notes**

1. **User Role Check**: Make sure users have the correct role in the `users` table
2. **Case Sensitive**: Role must be exactly `'Admin'` (capital A)
3. **Authentication**: Users must be logged in for policies to work
4. **Permissions**: The `authenticated` role needs proper grants

---

## 🛠️ **Troubleshooting**

### **If policies don't work:**
1. Check if RLS is enabled: `ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;`
2. Verify user roles in the `users` table
3. Make sure the user is authenticated
4. Check for typos in role names (case-sensitive)

### **If you get permission errors:**
1. Run: `GRANT ALL ON timetable TO authenticated;`
2. Check if the `users` table exists and has the correct structure
3. Verify the user's role is set correctly

---

## 📊 **Permission Matrix**

| Role     | SELECT | INSERT | UPDATE | DELETE |
|----------|--------|--------|--------|--------|
| Student  | ✅     | ❌     | ❌     | ❌     |
| Faculty  | ✅     | ❌     | ❌     | ❌     |
| CR       | ✅     | ❌     | ❌     | ❌     |
| Admin    | ✅     | ✅     | ✅     | ✅     |

---

## 🎉 **Expected Result**

After running the RLS setup:
- **All users** can view the colorful timetable
- **Only Admins** can manage (add/edit/delete) timetable entries
- **Security is enforced** at the database level
- **No unauthorized modifications** possible

---

## 📁 **Files to Use**

1. **`timetable_rls_policies.sql`** - Complete RLS setup (recommended)
2. **`timetable_setup.sql`** - Updated with correct policies
3. **This guide** - Step-by-step instructions

**Run either file in your Supabase SQL Editor to set up the policies!** 🚀
