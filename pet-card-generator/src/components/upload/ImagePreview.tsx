import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  src,
  alt,
  className = '',
  onLoad,
  onError
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
    onLoad?.();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    onError?.();
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 border border-gray-300 rounded ${className}`}>
        <div className="text-center text-gray-500">
          <AlertCircle className="w-6 h-6 mx-auto mb-1" />
          <p className="text-xs">Failed to load</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 border border-gray-300 rounded">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
      />
    </div>
  );
};

export default ImagePreview;