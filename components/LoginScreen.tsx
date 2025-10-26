import React from 'react';
import { GoogleIcon, GitHubIcon, FacebookIcon, InstagramIcon } from './icons';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const SocialButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string }> = ({ onClick, icon, label }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900"
    >
        {icon}
        <span className="font-medium text-sm">{label}</span>
    </button>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-sm p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <div className="text-center">
            <h1 className="text-3xl font-bold tracking-wider uppercase">
                CNC<span className="text-blue-500">.AI</span> Designer
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
                Sign in to begin your project
            </p>
        </div>
        
        <div className="space-y-4">
            <SocialButton
                onClick={onLoginSuccess}
                icon={<GoogleIcon />}
                label="Continue with Google"
            />
            <SocialButton
                onClick={onLoginSuccess}
                icon={<GitHubIcon className="w-5 h-5 text-gray-800 dark:text-gray-200" />}
                label="Continue with GitHub"
            />
             <SocialButton
                onClick={onLoginSuccess}
                icon={<FacebookIcon className="w-5 h-5 text-blue-600" />}
                label="Continue with Facebook"
            />
            <SocialButton
                onClick={onLoginSuccess}
                icon={<InstagramIcon className="w-5 h-5 text-pink-500" />}
                label="Continue with Instagram"
            />
        </div>

        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
            By continuing, you agree to our Terms of Service.
            (This is a simulated login for demonstration purposes.)
        </p>

      </div>
    </div>
  );
};