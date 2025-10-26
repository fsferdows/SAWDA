import React, { useRef } from 'react';
import type { DesignOptions, DesignType, Material, OutputFormat } from '../types';
import { UploadIcon } from './icons';

interface SidebarProps {
  options: DesignOptions;
  setOptions: React.Dispatch<React.SetStateAction<DesignOptions>>;
  onImageUpload: (url: string | null) => void;
}

const InputField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
    {children}
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({ options, setOptions, onImageUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onImageUpload(URL.createObjectURL(file));
    }
    // Fix: Reset the file input to allow re-uploading the same file
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleOptionChange = <K extends keyof DesignOptions,>(key: K, value: DesignOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };
  
  const handleDimensionChange = (key: 'width' | 'height' | 'depth', value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      handleOptionChange(key, numValue);
    }
  };

  return (
    <aside className="w-80 bg-gray-200 dark:bg-gray-800 p-6 overflow-y-auto flex flex-col space-y-6 border-r border-gray-300 dark:border-gray-700">
      <div
        className="relative border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadIcon className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-blue-600 dark:text-blue-400">Upload an image</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG up to 10MB</p>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
      </div>

      <div className="space-y-4 flex-grow">
        <InputField label="Design Type">
          <select value={options.designType} onChange={e => handleOptionChange('designType', e.target.value as DesignType)} className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500">
            {['2D Flat', '3D Relief', 'Mixed'].map(type => <option key={type}>{type}</option>)}
          </select>
        </InputField>

        <InputField label="Material">
          <select value={options.material} onChange={e => handleOptionChange('material', e.target.value as Material)} className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500">
            {['Wood', 'Metal', 'Plastic', 'MDF'].map(mat => <option key={mat}>{mat}</option>)}
          </select>
        </InputField>

        <InputField label="Dimensions (mm)">
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="W" value={options.width} onChange={e => handleDimensionChange('width', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            <input type="number" placeholder="H" value={options.height} onChange={e => handleDimensionChange('height', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            <input type="number" placeholder="D" value={options.depth} onChange={e => handleDimensionChange('depth', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500" />
          </div>
        </InputField>
        
        {(options.designType === '3D Relief' || options.designType === 'Mixed') && (
            <InputField label={`Depth Layers (2-10)`}>
              <div className="flex items-center space-x-2">
                <input 
                  type="range" 
                  min="2" 
                  max="10" 
                  step="1"
                  value={options.depthLayers} 
                  onChange={e => handleOptionChange('depthLayers', parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="font-semibold text-sm w-8 text-center">{options.depthLayers}</span>
              </div>
            </InputField>
        )}
        
        <InputField label="Outline Thickness (1-10)">
          <input 
            type="number" 
            min="1" 
            max="10" 
            value={options.outlineThickness} 
            onChange={e => {
                const numValue = parseInt(e.target.value, 10);
                if(!isNaN(numValue)) {
                    handleOptionChange('outlineThickness', numValue);
                }
            }} 
            onBlur={e => {
                let num = parseInt(e.target.value, 10);
                if (isNaN(num) || num < 1) {
                    num = 1;
                } else if (num > 10) {
                    num = 10;
                }
                handleOptionChange('outlineThickness', num);
            }}
            className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500" 
          />
        </InputField>

        <InputField label="Output Format">
            <select value={options.outputFormat} onChange={e => handleOptionChange('outputFormat', e.target.value as OutputFormat)} className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500">
                {['JD', 'STL', 'DXF', 'SVG'].map(format => <option key={format}>{format}</option>)}
            </select>
        </InputField>
        
        <InputField label="Design Instructions">
          <textarea value={options.prompt} onChange={e => handleOptionChange('prompt', e.target.value)} rows={3} className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g., 'a detailed lion head', 'intricate celtic knot border'"></textarea>
        </InputField>
      </div>
    </aside>
  );
};