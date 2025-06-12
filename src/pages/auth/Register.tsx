
import React from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { RegisterForm } from '@/components/auth/RegisterForm';

const Register: React.FC = () => {
  return (
    <AuthLayout 
      title="Create Your Account" 
      subtitle="Register with your Amrita institutional email"
      authType="register"
    >
      <RegisterForm />
    </AuthLayout>
  );
};

export default Register;
