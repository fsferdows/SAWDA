import React from 'react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  return (
    <header className="flex items-center justify-between p-4 bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 shadow-md z-10">
      <h1 className="text-xl font-bold tracking-wider uppercase">
        CNC<span className="text-blue-500">.AI</span> Designer
      </h1>
      <div className="flex items-center gap-2">
        <button
          onClick={onLogout}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-300 rounded-md hover:bg-gray-400 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
        >
          Logout
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
};