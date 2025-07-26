import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle,
  Camera,
  Loader2
} from 'lucide-react';
import { validateImage, ImageValidationResult } from '@/services/imageValidation';
import ImagePreview from './ImagePreview';
import ImageCropper from './ImageCropper';

interface PhotoUploadProps {
  onImageSelect: (file: File, croppedBlob?: Blob) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number; // in MB
  acceptedFormats?: string[];
  requireSquare?: boolean;
  className?: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onImageSelect,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  maxFileSize = 10,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  requireSquare = false,
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [validationResult, setValidationResult] = useState<ImageValidationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);
    setUploadError(null);

    // Validate the image
    const validation = await validateImage(file, {
      maxSizeInMB: maxFileSize,
      acceptedFormats,
      requireSquare
    });

    setValidationResult(validation);

    if (validation.isValid) {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Show cropper if needed
      if (requireSquare && !validation.isSquare) {
        setShowCropper(true);
      } else {
        onImageSelect(file);
      }
    }
  }, [maxFileSize, acceptedFormats, requireSquare, onImageSelect]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    if (selectedFile) {
      setShowCropper(false);
      onImageSelect(selectedFile, croppedBlob);
      
      // Update preview with cropped image
      const croppedUrl = URL.createObjectURL(croppedBlob);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(croppedUrl);
    }
  }, [selectedFile, previewUrl, onImageSelect]);

  const handleRemoveImage = useCallback(() => {
    setSelectedFile(null);
    setValidationResult(null);
    setShowCropper(false);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  const handleCancelUpload = useCallback(() => {
    if (uploadControllerRef.current) {
      uploadControllerRef.current.abort();
      uploadControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
  }, []);

  const simulateUpload = useCallback(async () => {
    if (!selectedFile || !validationResult?.isValid) return;

    setIsUploading(true);
    setUploadError(null);
    uploadControllerRef.current = new AbortController();

    try {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        if (uploadControllerRef.current?.signal.aborted) {
          throw new Error('Upload cancelled');
        }
        
        setUploadProgress(progress);
        onUploadProgress?.(progress);
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Simulate successful upload
      const mockUrl = `https://example.com/uploads/${selectedFile.name}`;
      onUploadComplete?.(mockUrl);
      
    } catch (error: any) {
      if (error.message !== 'Upload cancelled') {
        const errorMessage = 'Upload failed. Please try again.';
        setUploadError(errorMessage);
        onUploadError?.(errorMessage);
      }
    } finally {
      setIsUploading(false);
      uploadControllerRef.current = null;
    }
  }, [selectedFile, validationResult, onUploadProgress, onUploadComplete, onUploadError]);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {!selectedFile && (
        <Card 
          className={`border-2 border-dashed transition-all duration-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
              dragActive ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              {dragActive ? (
                <Upload className="w-8 h-8 text-blue-600" />
              ) : (
                <Camera className="w-8 h-8 text-gray-600" />
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {dragActive ? 'Drop your photo here' : 'Upload your pet\'s photo'}
            </h3>
            
            <p className="text-gray-600 mb-4">
              Drag and drop your image here, or click to browse
            </p>
            
            <div className="text-sm text-gray-500 space-y-1">
              <p>Supported formats: {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}</p>
              <p>Maximum file size: {maxFileSize}MB</p>
              {requireSquare && <p>Image will be cropped to square format</p>}
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="mt-4"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Validation Results */}
      {validationResult && !validationResult.isValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationResult.errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Image Preview */}
      {selectedFile && validationResult?.isValid && previewUrl && !showCropper && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <ImagePreview
                src={previewUrl}
                alt="Selected image"
                className="w-24 h-24 rounded-lg object-cover"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Size: {formatFileSize(selectedFile.size)}</p>
                  {validationResult.dimensions && (
                    <p>Dimensions: {validationResult.dimensions.width} × {validationResult.dimensions.height}</p>
                  )}
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Valid image
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelUpload}
                  className="w-full"
                >
                  Cancel Upload
                </Button>
              </div>
            )}

            {/* Upload Error */}
            {uploadError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {/* Upload Button */}
            {!isUploading && uploadProgress === 0 && (
              <Button
                onClick={simulateUpload}
                className="w-full mt-4"
                disabled={!validationResult?.isValid}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Cropper Modal */}
      {showCropper && previewUrl && (
        <ImageCropper
          src={previewUrl}
          onCropComplete={handleCropComplete}
          onCancel={() => setShowCropper(false)}
          aspectRatio={1} // Square crop
        />
      )}
    </div>
  );
};

export default PhotoUpload;