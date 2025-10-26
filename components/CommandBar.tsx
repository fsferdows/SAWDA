import React from 'react';
import { MagicWandIcon } from './icons';

interface CommandBarProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  hasGeneratedImage: boolean;
}

export const CommandBar: React.FC<CommandBarProps> = ({ prompt, setPrompt, onGenerate, isLoading, hasGeneratedImage }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading) {
        onGenerate();
      }
    }
  };

  return (
    <div className="p-4 bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700">
      <div className="relative">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasGeneratedImage
              ? "Describe how to modify the engraving..."
              : "Describe the wood engraving you want to create..."
          }
          className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-4 pr-36 py-3"
          disabled={isLoading}
        />
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-200 dark:focus:ring-offset-gray-800 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <MagicWandIcon className="w-5 h-5" />
          <span>{isLoading ? 'Generating...' : (hasGeneratedImage ? 'Modify' : 'Generate')}</span>
        </button>
      </div>
    </div>
  );
};