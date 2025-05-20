
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, UserRole } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up session listener
    const setupSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user);
      }
      
      setLoading(false);
      
      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setProfile(null);
        }
      });
      
      return () => subscription.unsubscribe();
    };
    
    setupSession();
  }, []);
  
  const fetchUserProfile = async (user: User) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();
      
    if (error) {
      console.error('Error fetching user profile:', error);
      return;
    }
    
    setProfile(data as UserProfile);
  };
  
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast({
          title: 'Authentication Error',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }
      
      navigate('/dashboard');
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };
  
  const signUp = async (email: string, password: string, name: string) => {
    try {
      // First check if email is in preapproved_users
      const { data: preapprovedUsers, error: fetchError } = await supabase
        .from('preapproved_users')
        .select('email, role')
        .eq('email', email)
        .single();
        
      if (fetchError || !preapprovedUsers) {
        toast({
          title: 'Registration Error',
          description: 'Your email is not authorized to register. Please contact the administrator.',
          variant: 'destructive',
        });
        return { error: fetchError || new Error('Email not authorized') };
      }
      
      // Register the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      
      if (authError) {
        toast({
          title: 'Registration Error',
          description: authError.message,
          variant: 'destructive',
        });
        return { error: authError };
      }
      
      // Create user profile in users table
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: email,
              name: name,
              role: preapprovedUsers.role,
            }
          ]);
          
        if (profileError) {
          toast({
            title: 'Profile Creation Error',
            description: profileError.message,
            variant: 'destructive',
          });
          return { error: profileError };
        }
      }
      
      toast({
        title: 'Registration Successful',
        description: 'Please check your email for the confirmation link before signing in.',
      });
      
      navigate('/auth/login');
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };
  
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth/login');
  };
  
  return (
    <AuthContext.Provider value={{ session, user, profile, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Custom hook to check if user has specific role(s)
export const useRoleCheck = (allowedRoles: UserRole[]) => {
  const { profile } = useAuth();
  return profile && allowedRoles.includes(profile.role);
};
