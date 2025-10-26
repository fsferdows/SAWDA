import React, { useState, useEffect } from 'react';
import type { DesignOptions } from '../types';
import { CheckCircleIcon } from './icons';
import { ImageEditor } from './ImageEditor';

interface PreviewProps {
  imagePreview: string | null;
  generatedPreview: string | null;
  isLoading: boolean;
  options: DesignOptions;
}

const loadingStages = [
  'Analyzing Reference Image',
  'Generating Design Concepts',
  'Creating Vector Paths',
  'Optimizing for CNC',
  'Finalizing Preview',
];

export const Preview: React.FC<PreviewProps> = ({ imagePreview, generatedPreview, isLoading, options }) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isLoading) {
      setCurrentStageIndex(0); // Reset on start
      interval = window.setInterval(() => {
        setCurrentStageIndex(prevIndex => {
          // Stop at the last stage and wait for isLoading to become false
          if (prevIndex >= loadingStages.length - 1) {
            clearInterval(interval);
            return prevIndex;
          }
          return prevIndex + 1;
        });
      }, 1500); // Animate through stages
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLoading]);
  
  const content = () => {
    if (isLoading && !generatedPreview) { // Only show loading stages on first generation
      return (
        <div className="flex flex-col items-center justify-center text-center w-full max-w-md">
            <p className="text-xl font-semibold mb-6">Generating your design...</p>
            <div className="w-full space-y-4">
                {loadingStages.map((stage, index) => (
                    <div key={stage} className="flex items-center text-left transition-all duration-300">
                        <div className="w-8 h-8 mr-4 flex items-center justify-center flex-shrink-0">
                            {index < currentStageIndex ? (
                                <CheckCircleIcon className="w-6 h-6 text-green-500" />
                            ) : index === currentStageIndex ? (
                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <div className="w-5 h-5 border-2 border-gray-400 dark:border-gray-600 rounded-full"></div>
                            )}
                        </div>
                        <span className={`transition-colors duration-300 ${
                            index <= currentStageIndex 
                                ? 'text-gray-800 dark:text-gray-200 font-medium' 
                                : 'text-gray-500 dark:text-gray-500'
                        }`}>
                            {stage}
                        </span>
                    </div>
                ))}
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-8 text-sm">Please wait, this may take a moment...</p>
        </div>
      );
    }
    if (generatedPreview) {
      return <ImageEditor src={generatedPreview} options={options} isLoading={isLoading} />;
    }
    if (imagePreview) {
      return <img src={imagePreview} alt="Uploaded file preview" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />;
    }
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        <h2 className="text-2xl font-bold mb-2">Welcome to CNC.AI Wood Engraving Designer</h2>
        <p>Upload a reference image and provide instructions to generate a machine-ready design for wood.</p>
      </div>
    );
  };

  return (
    <div className="flex-1 p-8 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      {content()}
    </div>
  );
};