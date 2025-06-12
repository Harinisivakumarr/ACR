# 📝 Feedback System Setup Guide

## 🎯 **Overview**
The feedback system allows:
- **Everyone** can submit feedback (students, faculty, staff, etc.)
- **Only admins** can view all feedback submissions
- **Users** can view their own feedback
- **Real-time notifications** for admins when new feedback arrives
- **Status tracking** (pending, reviewed, resolved)

---

## 📋 **Step-by-Step Setup**

### 1. **Database Setup**
   - Open your Supabase Dashboard
   - Go to **SQL Editor**
   - Copy and paste the contents of `feedback_system_setup.sql`
   - Click **"Run"** to execute the script

### 2. **Verify Database Setup**
   - Go to **Table Editor** in Supabase
   - You should see a new `feedback` table
   - Go to **Authentication** → **Policies**
   - Verify 4 policies were created for the `feedback` table

### 3. **Frontend Integration**
   The following components have been created:
   - `src/pages/dashboard/Feedback.tsx` - User feedback form
   - `src/pages/dashboard/AdminFeedback.tsx` - Admin dashboard
   - Routes added to `src/App.tsx`
   - Navigation added to sidebar

---

## 🔐 **Security & Permissions**

### **Row Level Security (RLS) Policies:**

| Policy | Who | Action | Description |
|--------|-----|--------|-------------|
| Submit Feedback | Everyone | INSERT | Any authenticated user can submit feedback |
| View Own Feedback | Users | SELECT | Users can only see their own feedback |
| View All Feedback | Admins | SELECT | Admins can see all feedback from everyone |
| Update Status | Admins | UPDATE | Only admins can change feedback status |

### **Database Structure:**
```sql
feedback (
  id UUID PRIMARY KEY,
  user_id UUID (references auth.users),
  user_name TEXT,
  user_email TEXT,
  subject TEXT,
  message TEXT,
  status TEXT ('pending', 'reviewed', 'resolved'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## 🚀 **Features**

### **For Everyone (Submit Feedback):**
- ✅ Simple, clean feedback form
- ✅ Subject and message fields
- ✅ User info auto-populated
- ✅ Success confirmation
- ✅ Toast notifications
- ✅ Form validation

### **For Admins (Manage Feedback):**
- ✅ View all feedback submissions
- ✅ Real-time notifications for new feedback
- ✅ Status management (pending/reviewed/resolved)
- ✅ User information display
- ✅ Statistics dashboard
- ✅ Responsive design

---

## 📱 **Navigation**

### **Regular Users:**
- Sidebar: "Feedback" → Submit feedback form

### **Admins:**
- Sidebar: "Feedback" → Submit feedback form
- Sidebar: "Admin" → "Manage Feedback" → View all feedback

---

## 🔔 **Real-time Notifications**

Admins receive instant notifications when:
- New feedback is submitted
- Shows user name and subject
- 5-second duration toast notification

---

## 🎨 **UI/UX Features**

### **Feedback Form:**
- Clean, modern design
- Auto-populated user information
- Form validation
- Success state with animation
- Loading states

### **Admin Dashboard:**
- Statistics cards (pending, reviewed, resolved)
- Color-coded status badges
- Sortable by date
- Status dropdown for quick updates
- User contact information display

---

## 🛠️ **Testing the System**

### **Test as Regular User:**
1. Login as student/faculty/staff
2. Go to "Feedback" in sidebar
3. Submit feedback
4. Verify success message

### **Test as Admin:**
1. Login as admin
2. Go to "Manage Feedback" in sidebar
3. Verify you can see all feedback
4. Test status updates
5. Submit feedback as admin to test notifications

---

## 🚨 **Troubleshooting**

### **If feedback submission fails:**
1. Check if user is authenticated
2. Verify RLS policies are enabled
3. Check browser console for errors
4. Ensure `preapproved_users` table has correct user roles

### **If admin can't see feedback:**
1. Verify user role is exactly 'admin' (lowercase)
2. Check RLS policies in Supabase
3. Ensure user exists in `preapproved_users` table

### **If real-time notifications don't work:**
1. Check Supabase realtime is enabled
2. Verify subscription in browser dev tools
3. Test with multiple browser tabs

---

## 📊 **Database Queries for Testing**

### **View all feedback (as admin):**
```sql
SELECT * FROM feedback ORDER BY created_at DESC;
```

### **Check RLS policies:**
```sql
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'feedback';
```

### **Check user roles:**
```sql
SELECT email, role FROM preapproved_users;
```

---

## 🎉 **Success Indicators**

✅ **Database:** feedback table created with RLS policies  
✅ **Frontend:** Feedback form accessible to all users  
✅ **Admin:** Admin dashboard shows all feedback  
✅ **Real-time:** Notifications work for new feedback  
✅ **Security:** Users can only see their own feedback  
✅ **Status:** Admins can update feedback status  

---

## 📞 **Support**

If you encounter any issues:
1. Check the browser console for errors
2. Verify database setup in Supabase
3. Test with different user roles
4. Check network requests in dev tools

The feedback system is now ready to help improve your campus experience! 🎓
