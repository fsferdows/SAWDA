import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
    UndoIcon, RedoIcon, DownloadIcon, ChevronDownIcon,
    MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowsPointingInIcon,
    FileImageIcon, FileSvgIcon, FileDxfIcon, EyeIcon, EyeSlashIcon, PencilIcon
} from './icons';
import type { DesignOptions } from '../types';

interface Point { x: number; y: number; }
interface ViewTransform { scale: number; offset: Point; }
type ViewMode = 'EDIT' | 'LAYER_PREVIEW';

interface ImageEditorProps {
  src: string;
  options: DesignOptions;
  isLoading: boolean;
}

const LINE_WIDTH = 5;
const DXF_LAYER_COLORS = [
    { name: 'red', hex: '#FF0000' },
    { name: 'yellow', hex: '#FFFF00' },
    { name: 'green', hex: '#00FF00' },
    { name: 'cyan', hex: '#00FFFF' },
    { name: 'blue', hex: '#0000FF' },
    { name: 'magenta', hex: '#FF00FF' },
    { name: 'white', hex: '#FFFFFF' },
];

const getLayerNameForIndex = (index: number, totalLayers: number): string => {
    const deepThreshold = Math.ceil(totalLayers / 3);
    const mediumThreshold = Math.ceil(totalLayers * 2 / 3);
  
    let prefix = '';
    // Layer index 0 is the deepest (darkest color)
    if (index < deepThreshold) {
      prefix = 'DEEP_CUT';
    } else if (index < mediumThreshold) {
      prefix = 'MEDIUM_CUT';
    } else {
      prefix = 'SHALLOW_DETAIL';
    }
    
    return `${prefix}_${index + 1}`;
};

const DownloadMenuItem: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    subtext?: string;
}> = ({ onClick, icon, label, subtext }) => (
    <li className="px-1 py-1">
        <button
            onClick={onClick}
            className="w-full text-left flex items-start gap-3 px-3 py-2 text-sm rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
            <span className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
            <div className="flex-1">
                <span className="font-medium leading-tight">{label}</span>
                {subtext && <span className="block text-xs text-gray-500 dark:text-gray-400 leading-tight">{subtext}</span>}
            </div>
        </button>
    </li>
);


export const ImageEditor: React.FC<ImageEditorProps> = ({ src, options, isLoading }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadButtonRef = useRef<HTMLDivElement>(null);
  
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ scale: 1, offset: { x: 0, y: 0 } });
  
  const mousePosRef = useRef<Point | null>(null);
  const lastMousePosRef = useRef<Point | null>(null);

  const [layerData, setLayerData] = useState<Record<string, ImageData>>({});
  const [layerNames, setLayerNames] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('EDIT');
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());

  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
  }, []);

  const getTransformedPoint = useCallback((x: number, y: number): Point => {
    return {
      x: (x - viewTransform.offset.x) / viewTransform.scale,
      y: (y - viewTransform.offset.y) / viewTransform.scale,
    };
  }, [viewTransform]);

  const redrawCanvas = useCallback(() => {
    if (!context || !canvasRef.current) return;
    const canvas = canvasRef.current;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
        if (viewMode === 'EDIT') {
            if (history.length > 0 && history[historyIndex]) {
                tempCtx.putImageData(history[historyIndex], 0, 0);
            }
        } else { // 'LAYER_PREVIEW'
            tempCtx.fillStyle = '#2a2a2a'; // dark background for layer clarity
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            const layerCanvas = document.createElement('canvas');
            layerCanvas.width = canvas.width;
            layerCanvas.height = canvas.height;
            const layerCtx = layerCanvas.getContext('2d', { willReadFrequently: true });

            if(layerCtx){
                for(const layerName of layerNames) {
                    if (visibleLayers.has(layerName) && layerData[layerName]) {
                        layerCtx.putImageData(layerData[layerName], 0, 0);
                        tempCtx.drawImage(layerCanvas, 0, 0);
                    }
                }
            }
        }
    }
    
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    context.translate(viewTransform.offset.x, viewTransform.offset.y);
    context.scale(viewTransform.scale, viewTransform.scale);
    
    context.drawImage(tempCanvas, 0, 0);
    
    context.restore();

  }, [context, viewTransform, history, historyIndex, viewMode, layerData, layerNames, visibleLayers]);

  useEffect(() => {
    redrawCanvas();
  }, [viewTransform, redrawCanvas, viewMode, visibleLayers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (downloadButtonRef.current && !downloadButtonRef.current.contains(event.target as Node)) {
            setIsDownloadMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveState = useCallback(() => {
    if (!context || !canvasRef.current || viewMode !== 'EDIT') return;
    const canvas = canvasRef.current;
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [context, history, historyIndex, viewMode]);
  
  const is3DDesign = options.designType === '3D Relief' || options.designType === 'Mixed';

  // Effect to pre-process and cache layer data for visualization
  useEffect(() => {
    if (!context || !canvasRef.current || !history[0] || !is3DDesign) {
        setLayerData({});
        setLayerNames([]);
        setVisibleLayers(new Set());
        return;
    }

    const sourceImageData = history[0];
    const width = sourceImageData.width;
    const height = sourceImageData.height;
    const data = sourceImageData.data;
    const numLayers = options.depthLayers;
    const grayscaleStep = 256 / numLayers;
    
    const generatedLayers: Record<string, ImageData> = {};
    const generatedLayerNames: string[] = [];
    const layerPixelData: Record<string, Uint8ClampedArray> = {};

    for (let i = 0; i < numLayers; i++) {
        const layerName = getLayerNameForIndex(i, numLayers);
        generatedLayerNames.push(layerName);
        // Initialize with fully transparent pixels
        layerPixelData[layerName] = new Uint8ClampedArray(width * height * 4);
    }
    
    for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i+1] + data[i+2]) / 3;
        const alpha = data[i+3];

        if (alpha > 128) { // Only process non-transparent pixels
            for (let l = 0; l < numLayers; l++) {
                const minGray = Math.floor(l * grayscaleStep);
                const maxGray = Math.floor((l + 1) * grayscaleStep) - 1;
                
                if (gray >= minGray && gray <= (l === numLayers - 1 ? 255 : maxGray)) {
                    const layerName = getLayerNameForIndex(l, numLayers);
                    const color = DXF_LAYER_COLORS[l % DXF_LAYER_COLORS.length].hex;
                    const r = parseInt(color.substring(1, 3), 16);
                    const g = parseInt(color.substring(3, 5), 16);
                    const b = parseInt(color.substring(5, 7), 16);

                    layerPixelData[layerName][i] = r;
                    layerPixelData[layerName][i+1] = g;
                    layerPixelData[layerName][i+2] = b;
                    layerPixelData[layerName][i+3] = 255;
                    break;
                }
            }
        }
    }

    for (const name of generatedLayerNames) {
        generatedLayers[name] = new ImageData(layerPixelData[name], width, height);
    }
    
    setLayerData(generatedLayers);
    setLayerNames(generatedLayerNames);
    setVisibleLayers(new Set(generatedLayerNames));
    setViewMode('EDIT');
  }, [history[0], options.depthLayers, options.designType, context, is3DDesign]);
  

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      setContext(ctx);

      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = src;
      image.onload = () => {
        if (canvas.width !== image.width || canvas.height !== image.height) {
            canvas.width = image.width;
            canvas.height = image.height;
        }
        ctx?.drawImage(image, 0, 0);
        const initialImageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([initialImageData]);
        setHistoryIndex(0);
        setViewTransform({ scale: 1, offset: { x: 0, y: 0 } });
        setViewMode('EDIT');
      };
    }
  }, [src]);

  const renderCanvas = useCallback(() => {
    if (!isDrawing || !context || !mousePosRef.current || !lastMousePosRef.current) return;

    context.save();
    context.translate(viewTransform.offset.x, viewTransform.offset.y);
    context.scale(viewTransform.scale, viewTransform.scale);
    
    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = 'black';
    context.lineWidth = LINE_WIDTH / viewTransform.scale;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.beginPath();
    context.moveTo(lastMousePosRef.current.x, lastMousePosRef.current.y);
    context.lineTo(mousePosRef.current.x, mousePosRef.current.y);
    context.stroke();
    context.restore();
    
    lastMousePosRef.current = mousePosRef.current;
    requestAnimationFrame(renderCanvas);
  }, [isDrawing, context, viewTransform]);

  useEffect(() => {
    if (isDrawing) {
      requestAnimationFrame(renderCanvas);
    }
  }, [isDrawing, renderCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'EDIT') return;
    const canvasPoint = getCanvasPoint(e);
    if (!canvasPoint || !context) return;

    const point = getTransformedPoint(canvasPoint.x, canvasPoint.y);
    mousePosRef.current = point;
    lastMousePosRef.current = point;
    setIsDrawing(true);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      mousePosRef.current = null;
      lastMousePosRef.current = null;
      saveState();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'EDIT') return;
    const canvasPoint = getCanvasPoint(e);
    if (!canvasPoint || !isDrawing) return;
    mousePosRef.current = getTransformedPoint(canvasPoint.x, canvasPoint.y);
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvasPoint = getCanvasPoint(e);
    if (!canvasPoint) return;

    const { deltaY } = e;
    const zoomFactor = 1.1;
    const newScale = deltaY < 0 ? viewTransform.scale * zoomFactor : viewTransform.scale / zoomFactor;
    const clampedScale = Math.max(0.1, Math.min(newScale, 10));

    const mousePoint = canvasPoint;
    
    const newOffsetX = mousePoint.x - (mousePoint.x - viewTransform.offset.x) * (clampedScale / viewTransform.scale);
    const newOffsetY = mousePoint.y - (mousePoint.y - viewTransform.offset.y) * (clampedScale / viewTransform.scale);

    setViewTransform({ scale: clampedScale, offset: { x: newOffsetX, y: newOffsetY } });
  };
  
  const handleUndo = () => {
    if (historyIndex > 0 && viewMode === 'EDIT') {
      setHistoryIndex(prev => prev - 1);
    }
  };
  
  const handleRedo = () => {
      if (historyIndex < history.length - 1 && viewMode === 'EDIT') {
          setHistoryIndex(prev => prev + 1);
      }
  };
  
  const handleDownload = (format: 'png' | 'jpeg' | 'svg' | 'dxf') => {
    if (!canvasRef.current) return;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    
    if (history.length > 0 && history[historyIndex]) {
        tempCtx.putImageData(history[historyIndex], 0, 0);
    }
    
    const link = document.createElement('a');
    const getFileName = (ext: string) => `cnc-design-${options.material.toLowerCase()}-${options.designType.toLowerCase().replace(' ', '-')}.${ext}`;

    if (format === 'svg') {
        const pngDataUrl = tempCanvas.toDataURL('image/png');
        const svgContent = `<svg width="${tempCanvas.width}" height="${tempCanvas.height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="${pngDataUrl}" width="${tempCanvas.width}" height="${tempCanvas.height}"/></svg>`;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        link.href = URL.createObjectURL(blob);
        link.download = getFileName('svg');
    } else if (format === 'dxf') {
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        
        const generateDxf = (imgData: ImageData, designOpts: DesignOptions): string => {
            const width = imgData.width;
            const height = imgData.height;
            const data = imgData.data;
    
            const is2D = designOpts.designType === '2D Flat';
            const layers: { [name: string]: { color: number, min?: number, max?: number } } = {};
            const layerNames: string[] = [];

            if (is2D) {
                layers['ENGRAVE'] = { color: 1 };
                layerNames.push('ENGRAVE');
            } else {
                const numLayers = designOpts.depthLayers;
                const grayscaleStep = 256 / numLayers;
                for (let i = 0; i < numLayers; i++) {
                    const layerName = getLayerNameForIndex(i, numLayers);
                    layerNames.push(layerName);
                    const minGray = Math.floor(i * grayscaleStep);
                    const maxGray = Math.floor((i + 1) * grayscaleStep) - 1;
                    
                    layers[layerName] = {
                        color: (i % 7) + 1, // Cycle through standard DXF colors 1-7
                        min: minGray,
                        max: i === numLayers - 1 ? 255 : maxGray, // Ensure last layer includes 255
                    };
                }
            }
    
            let dxfContent = `999\nDXF generated by SAWDA CNC DESIGN\n`;
            dxfContent += `999\nDesign Type: ${designOpts.designType}\n`;
            
            dxfContent += `0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n`;
            dxfContent += `0\nLAYER\n2\n0\n70\n0\n62\n7\n6\nCONTINUOUS\n`;

            for (const layerName of layerNames) {
                const layer = layers[layerName];
                dxfContent += `0\nLAYER\n2\n${layerName}\n70\n0\n62\n${layer.color}\n6\nCONTINUOUS\n`;
            }
    
            dxfContent += `0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
    
            for (let y = 0; y < height; y++) {
                const segments: { [layerName: string]: { startX: number } | null } = {};
                layerNames.forEach(name => segments[name] = null);

                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4;
                    const gray = (data[index] + data[index + 1] + data[index + 2]) / 3;
                    const alpha = data[index + 3];

                    let pixelLayerName: string | null = null;
                    if (alpha > 128) { // Only consider non-transparent pixels
                        if (is2D) {
                            if (gray < 250) pixelLayerName = 'ENGRAVE'; // Almost any non-white is engraved
                        } else {
                            for (const layerName of layerNames) {
                                const layerInfo = layers[layerName];
                                if (layerInfo.min !== undefined && layerInfo.max !== undefined && gray >= layerInfo.min && gray <= layerInfo.max) {
                                    pixelLayerName = layerName;
                                    break;
                                }
                            }
                        }
                    }
                    
                    for (const layerName of layerNames) {
                        const segment = segments[layerName];
                        const isInThisLayer = pixelLayerName === layerName;
                        
                        if (isInThisLayer && !segment) {
                            segments[layerName] = { startX: x };
                        } else if (!isInThisLayer && segment) {
                            const endX = x - 1;
                            if (segment.startX <= endX) {
                                const dxfY = height - 1 - y;
                                dxfContent += `0\nLINE\n8\n${layerName}\n10\n${segment.startX.toFixed(4)}\n20\n${dxfY.toFixed(4)}\n11\n${endX.toFixed(4)}\n21\n${dxfY.toFixed(4)}\n`;
                            }
                            segments[layerName] = null;
                        }
                    }
                }

                for (const layerName of layerNames) {
                    const segment = segments[layerName];
                    if (segment) {
                        const endX = width - 1;
                        if (segment.startX <= endX) {
                            const dxfY = height - 1 - y;
                            dxfContent += `0\nLINE\n8\n${layerName}\n10\n${segment.startX.toFixed(4)}\n20\n${dxfY.toFixed(4)}\n11\n${endX.toFixed(4)}\n21\n${dxfY.toFixed(4)}\n`;
                        }
                    }
                }
            }
    
            dxfContent += `0\nENDSEC\n0\nEOF\n`;
            return dxfContent;
        };

        const dxfString = generateDxf(imageData, options);
        const blob = new Blob([dxfString], { type: 'application/dxf' });
        link.href = URL.createObjectURL(blob);
        link.download = getFileName('dxf');
    } else {
        const mimeType = `image/${format}`;
        link.href = tempCanvas.toDataURL(mimeType, format === 'jpeg' ? 0.9 : undefined);
        link.download = getFileName(format);
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsDownloadMenuOpen(false);
  };
  
  const handleZoomChange = (direction: 'in' | 'out' | 'reset') => {
    if (!canvasRef.current || !canvasRef.current.parentElement) return;
    if (direction === 'reset') {
        setViewTransform({ scale: 1, offset: { x: 0, y: 0 } });
        return;
    }
    const zoomFactor = 1.2;
    const newScale = direction === 'in' ? viewTransform.scale * zoomFactor : viewTransform.scale / zoomFactor;
    const clampedScale = Math.max(0.1, Math.min(newScale, 10));
    const center = { x: canvasRef.current.parentElement.clientWidth / 2, y: canvasRef.current.parentElement.clientHeight / 2 };

    const newOffsetX = center.x - (center.x - viewTransform.offset.x) * (clampedScale / viewTransform.scale);
    const newOffsetY = center.y - (center.y - viewTransform.offset.y) * (clampedScale / viewTransform.scale);

    setViewTransform({ scale: clampedScale, offset: { x: newOffsetX, y: newOffsetY } });
  }

  const handleToggleLayerVisibility = (layerName: string) => {
    setViewMode('LAYER_PREVIEW');
    setVisibleLayers(prev => {
        const newSet = new Set(prev);
        if (newSet.has(layerName)) {
            newSet.delete(layerName);
        } else {
            newSet.add(layerName);
        }
        return newSet;
    });
  };

  const isEditingDisabled = viewMode !== 'EDIT';

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="relative flex-1 flex items-center justify-center w-full h-full p-0 sm:p-4 overflow-hidden">
             {isLoading && (
                <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className={`max-w-full max-h-full object-contain rounded-lg shadow-lg ${isEditingDisabled ? 'bg-gray-800 cursor-grab' : 'bg-white cursor-crosshair'}`}
            />
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 z-10">
                <button 
                    onClick={handleUndo} 
                    disabled={historyIndex <= 0 || isEditingDisabled}
                    className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Back"
                >
                    <UndoIcon className="w-5 h-5"/>
                </button>
                <button 
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1 || isEditingDisabled}
                    className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Next"
                >
                    <RedoIcon className="w-5 h-5"/>
                </button>
            </div>
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 z-10">
                <button onClick={() => handleZoomChange('out')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><MagnifyingGlassMinusIcon className="w-5 h-5"/></button>
                <span className="text-sm font-semibold w-12 text-center">{Math.round(viewTransform.scale * 100)}%</span>
                <button onClick={() => handleZoomChange('in')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><MagnifyingGlassPlusIcon className="w-5 h-5"/></button>
                <button onClick={() => handleZoomChange('reset')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ml-2"><ArrowsPointingInIcon className="w-5 h-5"/></button>
            </div>
            {is3DDesign && layerNames.length > 0 && (
                <div className="absolute bottom-4 left-4 flex flex-col gap-1 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 z-10 max-h-[50vh] overflow-y-auto">
                    <button
                        onClick={() => setViewMode('EDIT')}
                        className={`w-full text-left px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors ${viewMode === 'EDIT' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        <PencilIcon className="w-3 h-3" />
                        Edit Mode
                    </button>
                    <div className="border-t border-gray-300 dark:border-gray-600 my-1"></div>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-gray-200 dark:bg-gray-900/50 rounded-md">
                        <button
                            onClick={() => { setViewMode('LAYER_PREVIEW'); setVisibleLayers(new Set(layerNames)); }}
                            className="px-2 py-1 text-xs font-semibold rounded-md bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
                        >Show All</button>
                        <button
                            onClick={() => { setViewMode('LAYER_PREVIEW'); setVisibleLayers(new Set()); }}
                            className="px-2 py-1 text-xs font-semibold rounded-md bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
                        >Hide All</button>
                    </div>
                    {layerNames.map((name, index) => {
                        const color = DXF_LAYER_COLORS[index % DXF_LAYER_COLORS.length].hex;
                        const isVisible = visibleLayers.has(name);
                        return (
                        <button
                            key={name}
                            onClick={() => handleToggleLayerVisibility(name)}
                            className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-2 transition-colors ${viewMode === 'LAYER_PREVIEW' && isVisible ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'} hover:bg-gray-200 dark:hover:bg-gray-700`}
                        >
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.2)' }}></span>
                            <span className="flex-1">{name}</span>
                            {isVisible ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                        </button>
                    )})}
                </div>
            )}
        </div>
      
        <div className="relative mt-4" ref={downloadButtonRef}>
            <button
                onClick={() => setIsDownloadMenuOpen(prev => !prev)}
                className="flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900"
            >
                <DownloadIcon className="w-5 h-5" />
                Download Design
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isDownloadMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDownloadMenuOpen && (
                <div className="absolute bottom-full mb-2 w-64 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-20 p-1">
                    <ul>
                        <DownloadMenuItem 
                            onClick={() => handleDownload('png')} 
                            icon={<FileImageIcon />}
                            label="Download as PNG"
                        />
                         <DownloadMenuItem 
                            onClick={() => handleDownload('jpeg')} 
                            icon={<FileImageIcon />}
                            label="Download as JPEG"
                        />
                         <DownloadMenuItem 
                            onClick={() => handleDownload('svg')} 
                            icon={<FileSvgIcon />}
                            label="Download as SVG"
                            subtext="(for tracing)"
                        />
                         <DownloadMenuItem 
                            onClick={() => handleDownload('dxf')} 
                            icon={<FileDxfIcon />}
                            label="Download as DXF"
                            subtext={`(${options.designType === '2D Flat' ? "single layer" : `${options.depthLayers} layers for JD Paint`})`}
                        />
                    </ul>
                </div>
            )}
        </div>
    </div>
  );
};