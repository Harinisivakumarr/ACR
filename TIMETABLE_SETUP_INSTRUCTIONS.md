# 🚀 Timetable Setup Instructions

## ⚠️ IMPORTANT: Database Setup Required

The timetable dropdown menus are not working because the `timetable` table doesn't exist in your Supabase database yet.

## 📋 Step-by-Step Setup:

### 1. **Open Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Sign in to your account
   - Open your project: `dwduaysywemwapfazfwe`

### 2. **Open SQL Editor**
   - In your Supabase dashboard, click on **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

### 3. **Run the Setup Script**
   - Copy the entire contents of `timetable_setup.sql` file
   - Paste it into the SQL editor
   - Click **"Run"** button

### 4. **Verify Setup**
   - Go to **"Table Editor"** in the left sidebar
   - You should see a new table called **"timetable"**
   - The table should have sample data with subjects like:
     - Machine Learning
     - Data Structures
     - Computer Security
     - etc.

## 🎯 What the Script Does:

1. **Creates the `timetable` table** with proper structure
2. **Sets up Row Level Security (RLS)** policies
3. **Adds sample data** for testing:
   - Year: 2024
   - Branches: AI, CS
   - Sections: A, B
   - Full week schedule (Monday-Friday)
   - 8 periods per day

## 🔧 After Setup:

1. **Refresh your timetable page**
2. **Check browser console** (F12) for any errors
3. **Select filters**:
   - Year: 2024
   - Branch: AI
   - Section: A
4. **You should see a colorful timetable** with all subjects

## 🐛 Troubleshooting:

### If dropdowns are still empty:
1. Check browser console (F12) for errors
2. Verify the table was created in Supabase
3. Check if RLS policies are properly set
4. Make sure your user has the correct permissions

### If you see "Database Setup Required" toast:
- The script hasn't been run yet
- Run the `timetable_setup.sql` script in Supabase

### If you see permission errors:
- Check that your user role is properly set in the `users` table
- Verify RLS policies are correctly configured

## 📞 Need Help?

If you're still having issues:
1. Check the browser console for specific error messages
2. Verify your Supabase connection is working
3. Make sure you're logged in with the correct user role

## 🎨 Expected Result:

After setup, you should see:
- ✅ Working dropdown menus
- ✅ Colorful timetable grid
- ✅ No horizontal scrolling
- ✅ Vibrant subject colors
- ✅ Professional layout

**The timetable will look exactly like the reference image you showed!** 🎉
