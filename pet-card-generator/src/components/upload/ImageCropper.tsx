import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Crop, RotateCw, ZoomIn, ZoomOut, Check, X } from 'lucide-react';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  src: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number; // width/height ratio, 1 for square
  minCropSize?: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  src,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
  minCropSize = 100
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      // Initialize crop area to center of image
      const size = Math.min(img.width, img.height) * 0.8;
      setCropArea({
        x: (img.width - size) / 2,
        y: (img.height - size) / 2,
        width: size,
        height: size / aspectRatio
      });
    };
    img.src = src;
  }, [src, aspectRatio]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
  }, [cropArea]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !image || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragStart.x;
    const y = e.clientY - rect.top - dragStart.y;
    
    // Constrain crop area within image bounds
    const maxX = image.width - cropArea.width;
    const maxY = image.height - cropArea.height;
    
    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y))
    }));
  }, [isDragging, dragStart, image, cropArea.width, cropArea.height]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleScaleChange = useCallback((value: number[]) => {
    setScale(value[0]);
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleCropSizeChange = useCallback((delta: number) => {
    if (!image) return;
    
    const newSize = Math.max(
      minCropSize,
      Math.min(
        Math.min(image.width, image.height),
        cropArea.width + delta
      )
    );
    
    const newHeight = newSize / aspectRatio;
    
    // Adjust position to keep crop centered
    const deltaX = (newSize - cropArea.width) / 2;
    const deltaY = (newHeight - cropArea.height) / 2;
    
    setCropArea(prev => ({
      x: Math.max(0, Math.min(image.width - newSize, prev.x - deltaX)),
      y: Math.max(0, Math.min(image.height - newHeight, prev.y - deltaY)),
      width: newSize,
      height: newHeight
    }));
  }, [image, cropArea, aspectRatio, minCropSize]);

  const handleCrop = useCallback(async () => {
    if (!image || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to crop area
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    
    // Apply transformations
    ctx.save();
    
    // Scale
    if (scale !== 1) {
      ctx.scale(scale, scale);
    }
    
    // Rotation
    if (rotation !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }
    
    // Draw cropped image
    ctx.drawImage(
      image,
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      0, 0, cropArea.width, cropArea.height
    );
    
    ctx.restore();
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
      }
    }, 'image/jpeg', 0.9);
  }, [image, cropArea, scale, rotation, onCropComplete]);

  if (!image) {
    return (
      <Dialog open={true} onOpenChange={onCancel}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading image...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Crop className="w-5 h-5 mr-2" />
            Crop Image
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Crop Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ZoomOut className="w-4 h-4" />
                <Slider
                  value={[scale]}
                  onValueChange={handleScaleChange}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-24"
                />
                <ZoomIn className="w-4 h-4" />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
              >
                <RotateCw className="w-4 h-4 mr-1" />
                Rotate
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCropSizeChange(-20)}
              >
                Smaller
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCropSizeChange(20)}
              >
                Larger
              </Button>
            </div>
          </div>
          
          {/* Crop Area */}
          <div className="relative border rounded-lg overflow-hidden bg-gray-100">
            <div
              ref={containerRef}
              className="relative inline-block cursor-move"
              style={{
                transform: `scale(${Math.min(1, 600 / image.width)})`,
                transformOrigin: 'top left'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Background Image */}
              <img
                src={src}
                alt="Crop preview"
                className="block"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center'
                }}
                draggable={false}
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-50" />
              
              {/* Crop Area */}
              <div
                className="absolute border-2 border-white bg-transparent"
                style={{
                  left: cropArea.x,
                  top: cropArea.y,
                  width: cropArea.width,
                  height: cropArea.height,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                }}
              >
                {/* Corner handles */}
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border border-gray-400 cursor-nw-resize" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border border-gray-400 cursor-ne-resize" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border border-gray-400 cursor-sw-resize" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-gray-400 cursor-se-resize" />
                
                {/* Grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-50">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-white border-opacity-30" />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleCrop}>
              <Check className="w-4 h-4 mr-1" />
              Apply Crop
            </Button>
          </div>
        </div>
        
        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropper;