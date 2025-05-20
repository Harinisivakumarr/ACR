
import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';

// Landing page which redirects to the appropriate route
const Index = () => {
  useEffect(() => {
    // Check for session on load
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // User is logged in, redirect to dashboard will happen below
      }
    };

    checkSession();
  }, []);

  return <Navigate to="/auth/login" replace />;
};

export default Index;
