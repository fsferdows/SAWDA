import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
    PencilIcon, EraserIcon, UndoIcon, TrashIcon, DownloadIcon, ArrowPathIcon,
    ChevronDownIcon, HandRaisedIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowsPointingInIcon 
} from './icons';
import type { DesignOptions } from '../types';

type Tool = 'brush' | 'eraser' | 'pan';
interface Point { x: number; y: number; }
interface ViewTransform { scale: number; offset: Point; }

interface ImageEditorProps {
  src: string;
  options: DesignOptions;
  onResetGeneration?: () => void;
  isLoading: boolean;
}

const ToolButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode, label: string }> = ({ active, onClick, children, label }) => (
    <button
        onClick={onClick}
        aria-label={label}
        className={`p-3 rounded-lg transition-colors ${
            active
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
    >
        {children}
    </button>
);

export const ImageEditor: React.FC<ImageEditorProps> = ({ src, options, onResetGeneration, isLoading }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('brush');
  const [lineWidth, setLineWidth] = useState(5);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadButtonRef = useRef<HTMLDivElement>(null);
  
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ scale: 1, offset: { x: 0, y: 0 } });
  const [isPanning, setIsPanning] = useState(false);
  const panStartPoint = useRef<Point>({ x: 0, y: 0 });

  const mousePosRef = useRef<Point | null>(null);
  const lastMousePosRef = useRef<Point | null>(null);

  const getTransformedPoint = useCallback((x: number, y: number): Point => {
    return {
      x: (x - viewTransform.offset.x) / viewTransform.scale,
      y: (y - viewTransform.offset.y) / viewTransform.scale,
    };
  }, [viewTransform]);

  const redrawCanvas = useCallback(() => {
    if (!context || !canvasRef.current) return;
    const canvas = canvasRef.current;
    context.save();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.translate(viewTransform.offset.x, viewTransform.offset.y);
    context.scale(viewTransform.scale, viewTransform.scale);
    if (history.length > 0 && history[historyIndex]) {
      context.putImageData(history[historyIndex], 0, 0);
    }
    context.restore();
  }, [context, viewTransform, history, historyIndex]);

  useEffect(() => {
    redrawCanvas();
  }, [viewTransform, redrawCanvas]);

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
    if (!context || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [context, history, historyIndex]);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      setContext(ctx);

      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = src;
      image.onload = () => {
        // Only reset canvas size and history if the image dimensions have changed
        if (canvas.width !== image.width || canvas.height !== image.height) {
            canvas.width = image.width;
            canvas.height = image.height;
        }
        ctx?.drawImage(image, 0, 0);
        const initialImageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([initialImageData]);
        setHistoryIndex(0);
        setViewTransform({ scale: 1, offset: { x: 0, y: 0 } }); // Reset view on new image
      };
    }
  }, [src]);

  const renderCanvas = useCallback(() => {
    if (!isDrawing || !context || !mousePosRef.current || !lastMousePosRef.current) return;
    if (tool === 'pan') return;

    context.save();
    context.translate(viewTransform.offset.x, viewTransform.offset.y);
    context.scale(viewTransform.scale, viewTransform.scale);
    
    context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    context.strokeStyle = tool === 'brush' ? 'black' : 'rgba(0,0,0,1)';
    context.lineWidth = lineWidth / viewTransform.scale;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.beginPath();
    context.moveTo(lastMousePosRef.current.x, lastMousePosRef.current.y);
    context.lineTo(mousePosRef.current.x, mousePosRef.current.y);
    context.stroke();
    context.restore();
    
    lastMousePosRef.current = mousePosRef.current;
    requestAnimationFrame(renderCanvas);
  }, [isDrawing, context, tool, lineWidth, viewTransform]);

  useEffect(() => {
    if (isDrawing && tool !== 'pan') {
      requestAnimationFrame(renderCanvas);
    }
  }, [isDrawing, renderCanvas, tool]);

  const handleMouseDown = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = nativeEvent;
    if (tool === 'pan') {
      setIsPanning(true);
      panStartPoint.current = { x: offsetX - viewTransform.offset.x, y: offsetY - viewTransform.offset.y };
      return;
    }
    if (context) {
      const point = getTransformedPoint(offsetX, offsetY);
      mousePosRef.current = point;
      lastMousePosRef.current = point;
      setIsDrawing(true);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      mousePosRef.current = null;
      lastMousePosRef.current = null;
      saveState();
    }
    if(isPanning) {
        setIsPanning(false);
    }
  };

  const handleMouseMove = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = nativeEvent;
    if (isPanning) {
        const newOffset = {
            x: offsetX - panStartPoint.current.x,
            y: offsetY - panStartPoint.current.y,
        };
        setViewTransform(prev => ({ ...prev, offset: newOffset }));
        return;
    }
    if (!isDrawing) return;
    mousePosRef.current = getTransformedPoint(offsetX, offsetY);
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { offsetX, offsetY, deltaY } = e.nativeEvent;
    const zoomFactor = 1.1;
    const newScale = deltaY < 0 ? viewTransform.scale * zoomFactor : viewTransform.scale / zoomFactor;
    const clampedScale = Math.max(0.1, Math.min(newScale, 10));

    const mousePoint = { x: offsetX, y: offsetY };
    
    const newOffsetX = mousePoint.x - (mousePoint.x - viewTransform.offset.x) * (clampedScale / viewTransform.scale);
    const newOffsetY = mousePoint.y - (mousePoint.y - viewTransform.offset.y) * (clampedScale / viewTransform.scale);

    setViewTransform({ scale: clampedScale, offset: { x: newOffsetX, y: newOffsetY } });
  };
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
    }
  };
  
  const handleResetEdits = () => {
    if (history.length > 0) {
      setHistoryIndex(0);
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
        
        // This is a simplified scanline vectorization for DXF output.
        const generateDxf = (imgData: ImageData): string => {
            const width = imgData.width;
            const height = imgData.height;
            const data = imgData.data;
            const threshold = 128; // Grayscale threshold to determine black/white

            let dxfContent = `0\nSECTION\n2\nENTITIES\n`;

            for (let y = 0; y < height; y++) {
                let inSegment = false;
                let startX = 0;
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4;
                    // Check if pixel is dark enough and not transparent
                    // We only check the red channel, assuming it's a B&W or grayscale image.
                    const isBlack = data[index] < threshold && data[index + 3] > threshold;

                    if (isBlack && !inSegment) {
                        inSegment = true;
                        startX = x;
                    } else if (!isBlack && inSegment) {
                        inSegment = false;
                        const endX = x - 1;
                        if (startX <= endX) {
                            const dxfY = height - 1 - y; // DXF Y-axis is often inverted
                            dxfContent += `0\nLINE\n8\n0\n10\n${startX}\n20\n${dxfY}\n11\n${endX}\n21\n${dxfY}\n`;
                        }
                    }
                }
                if (inSegment) { // Handle segment that goes to the end of the line
                    const endX = width - 1;
                    if (startX <= endX) {
                        const dxfY = height - 1 - y;
                        dxfContent += `0\nLINE\n8\n0\n10\n${startX}\n20\n${dxfY}\n11\n${endX}\n21\n${dxfY}\n`;
                    }
                }
            }
            dxfContent += `0\nENDSEC\n0\nEOF\n`;
            return dxfContent;
        };

        const dxfString = generateDxf(imageData);
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
    if (!canvasRef.current) return;
    if (direction === 'reset') {
        setViewTransform({ scale: 1, offset: { x: 0, y: 0 } });
        return;
    }
    const zoomFactor = 1.2;
    const newScale = direction === 'in' ? viewTransform.scale * zoomFactor : viewTransform.scale / zoomFactor;
    const clampedScale = Math.max(0.1, Math.min(newScale, 10));
    const center = { x: canvasRef.current.parentElement!.clientWidth / 2, y: canvasRef.current.parentElement!.clientHeight / 2 };

    const newOffsetX = center.x - (center.x - viewTransform.offset.x) * (clampedScale / viewTransform.scale);
    const newOffsetY = center.y - (center.y - viewTransform.offset.y) * (clampedScale / viewTransform.scale);

    setViewTransform({ scale: clampedScale, offset: { x: newOffsetX, y: newOffsetY } });
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-4 bg-gray-100 dark:bg-gray-800 p-3 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
            {/* Drawing Tools */}
            <div className="flex items-center gap-2">
                <ToolButton label="Brush" active={tool === 'brush'} onClick={() => setTool('brush')}><PencilIcon className="w-5 h-5" /></ToolButton>
                <ToolButton label="Eraser" active={tool === 'eraser'} onClick={() => setTool('eraser')}><EraserIcon className="w-5 h-5" /></ToolButton>
                <ToolButton label="Pan" active={tool === 'pan'} onClick={() => setTool('pan')}><HandRaisedIcon className="w-5 h-5" /></ToolButton>
                <div className="flex items-center gap-2 ml-2">
                    <label htmlFor="lineWidth" className="text-sm font-medium">Size:</label>
                    <input id="lineWidth" type="range" min="1" max="50" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="w-24 cursor-pointer"/>
                </div>
            </div>
            
            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-2 hidden sm:block"></div>
            
            {/* History & AI */}
            <div className="flex items-center gap-2">
                <ToolButton label="Undo Edits" active={false} onClick={handleUndo}><UndoIcon className="w-5 h-5" /></ToolButton>
                <ToolButton label="Reset Edits" active={false} onClick={handleResetEdits}><TrashIcon className="w-5 h-5" /></ToolButton>
                {onResetGeneration && (
                  <ToolButton label="Reset Generation" active={false} onClick={onResetGeneration}>
                      <ArrowPathIcon className="w-5 h-5" />
                  </ToolButton>
                )}
            </div>
        </div>
        
        <div className="relative flex-1 flex items-center justify-center w-full h-full p-0 sm:p-4 overflow-hidden">
             {isLoading && (
                <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center rounded-lg">
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
              className={`max-w-full max-h-full object-contain rounded-lg shadow-lg bg-white ${tool === 'pan' ? 'cursor-grab' : 'cursor-crosshair'} ${isPanning ? 'cursor-grabbing' : ''}`}
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-300 dark:border-gray-700">
                <button onClick={() => handleZoomChange('out')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><MagnifyingGlassMinusIcon className="w-5 h-5"/></button>
                <span className="text-sm font-semibold w-12 text-center">{Math.round(viewTransform.scale * 100)}%</span>
                <button onClick={() => handleZoomChange('in')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><MagnifyingGlassPlusIcon className="w-5 h-5"/></button>
                <button onClick={() => handleZoomChange('reset')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ml-2"><ArrowsPointingInIcon className="w-5 h-5"/></button>
            </div>
        </div>
      
        <div className="relative" ref={downloadButtonRef}>
            <button
                onClick={() => setIsDownloadMenuOpen(prev => !prev)}
                className="flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900"
            >
                <DownloadIcon className="w-5 h-5" />
                Download Design
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isDownloadMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDownloadMenuOpen && (
                <div className="absolute bottom-full mb-2 w-full bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                    <ul className="py-1">
                        <li><button onClick={() => handleDownload('png')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">Download as PNG</button></li>
                        <li><button onClick={() => handleDownload('jpeg')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">Download as JPEG</button></li>
                        <li><button onClick={() => handleDownload('svg')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">Download as SVG <span className="text-xs text-gray-500">(for tracing)</span></button></li>
                        <li><button onClick={() => handleDownload('dxf')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">Download as DXF <span className="text-xs text-gray-500">(vectorized)</span></button></li>
                    </ul>
                </div>
            )}
        </div>
    </div>
  );
};