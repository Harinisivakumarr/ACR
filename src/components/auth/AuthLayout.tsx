
import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ModeToggle } from '@/components/theme/ModeToggle';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  authType: 'login' | 'register';
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title, 
  subtitle = "Welcome to Amrita Campus Radar",
  authType 
}) => {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center"
      style={{
        backgroundImage: "url('/amrita-campus.jpg')",
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      
      <div className="flex items-center justify-end w-full max-w-md mb-4 z-10">
        <ModeToggle />
      </div>
      
      <Card className="w-full max-w-md z-10 p-8 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="flex justify-center mb-6">
          <img 
            src="/amrita-logo.png" 
            alt="Amrita Logo" 
            className="h-16" 
          />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">
          {title}
        </h1>
        
        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
          {subtitle}
        </p>
        
        {children}
        
        <div className="mt-6 text-center text-sm">
          {authType === 'login' ? (
            <p>
              Don't have an account?{' '}
              <Link to="/auth/register" className="text-primary hover:underline">
                Register
              </Link>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <Link to="/auth/login" className="text-primary hover:underline">
                Login
              </Link>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
