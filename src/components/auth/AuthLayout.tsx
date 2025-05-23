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
  authType,
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/amrita2video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Optional dark overlay */}
      <div className="absolute inset-0 bg-black/50 z-0" />

      {/* Mode toggle top right */}
      <div className="flex items-center justify-end w-full max-w-md mb-4 z-10">
        <ModeToggle />
      </div>

      {/* Login/Register card with reduced opacity */}
      <Card className="w-full max-w-md z-10 p-8 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-center mb-2">{title}</h1>
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
