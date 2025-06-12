
import React from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';

const Login: React.FC = () => {
  return (
    <AuthLayout 
      title="Sign In to Your Account" 
      authType="login"
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default Login;
