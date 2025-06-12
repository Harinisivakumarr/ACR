import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dwduaysywemwapfazfwe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3ZHVheXN5d2Vtd2FwZmF6ZndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MzgyMjEsImV4cCI6MjA2MzMxNDIyMX0.07djNRBl57QuzgauW4hO15678A3g44YfrGexm3dGkSc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// User role types
export type UserRole = 'Student' | 'Faculty' | 'CR' | 'Canteen Staff' | 'Admin' | 'admin';

// Classroom status types
export type ClassroomStatus = 'Available' | 'Occupied' | 'Maintenance';

// Faculty availability types
export type FacultyAvailability = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
};
// ✅ Check if an email is preapproved
export const isPreapprovedUser = async (email: string) => {
  const { data, error } = await supabase
    .from('preapproved_users')
    .select('*')
    .eq('email', email)
    .single();
    return { isAllowed: !!data, data, error };
};

// ✅ Get current user and profile from preapproved_users
export const getCurrentUser = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return { user: null, profile: null, error: authError };
  }

  const { data: profile, error: profileError } = await supabase
    .from('preapproved_users')
    .select('*')
    .eq('email', user.email)
    .single();

  return { user, profile, error: profileError };
};
// Helper to check user role
export const checkUserRole = (role: UserRole | null, allowedRoles: UserRole[]) => {
  if (!role) return false;
  return allowedRoles.includes(role);
};