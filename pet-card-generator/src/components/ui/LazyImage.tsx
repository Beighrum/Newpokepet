import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  placeholder?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  fallbackSrc,
  placeholder,
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  className,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up intersection observer
  useEffect(() => {
    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setCurrentSrc(src);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
    } else {
      onError?.();
    }
  };

  const showPlaceholder = !isInView || (!isLoaded && !hasError);
  const showImage = isInView && currentSrc;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Placeholder */}
      {showPlaceholder && (
        <div className="absolute inset-0">
          {placeholder || (
            <Skeleton className="w-full h-full" />
          )}
        </div>
      )}

      {/* Actual image */}
      {showImage && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          {...props}
        />
      )}

      {/* Error state */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <div className="text-center">
            <div className="text-2xl mb-2">📷</div>
            <div className="text-sm">Failed to load image</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Progressive image component with multiple sources
interface ProgressiveImageProps extends Omit<LazyImageProps, 'src'> {
  srcSet: {
    src: string;
    width?: number;
    height?: number;
    quality?: 'low' | 'medium' | 'high';
  }[];
  sizes?: string;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  srcSet,
  sizes,
  alt,
  className,
  ...props
}) => {
  const [currentSrcIndex, setCurrentSrcIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sort srcSet by quality (low to high)
  const sortedSrcSet = [...srcSet].sort((a, b) => {
    const qualityOrder = { low: 0, medium: 1, high: 2 };
    return (qualityOrder[a.quality || 'medium'] || 1) - (qualityOrder[b.quality || 'medium'] || 1);
  });

  const handleLoad = () => {
    setIsLoaded(true);
    
    // Load next higher quality image if available
    if (currentSrcIndex < sortedSrcSet.length - 1) {
      setTimeout(() => {
        setCurrentSrcIndex(currentSrcIndex + 1);
        setIsLoaded(false);
      }, 100);
    }
  };

  const currentSrc = sortedSrcSet[currentSrcIndex];

  return (
    <LazyImage
      src={currentSrc.src}
      alt={alt}
      onLoad={handleLoad}
      className={cn(
        'transition-all duration-500',
        !isLoaded && currentSrcIndex === 0 && 'blur-sm',
        className
      )}
      {...props}
    />
  );
};

// Gallery image with optimized loading
interface GalleryImageProps extends LazyImageProps {
  aspectRatio?: 'square' | '4:3' | '16:9' | 'auto';
  showOverlay?: boolean;
  overlayContent?: React.ReactNode;
}

const GalleryImage: React.FC<GalleryImageProps> = ({
  aspectRatio = 'square',
  showOverlay = false,
  overlayContent,
  className,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const aspectRatioClasses = {
    square: 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-video',
    auto: ''
  };

  return (
    <div
      className={cn(
        'relative group cursor-pointer',
        aspectRatioClasses[aspectRatio],
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <LazyImage
        className="w-full h-full object-cover rounded-lg"
        {...props}
      />
      
      {/* Overlay */}
      {showOverlay && (
        <div
          className={cn(
            'absolute inset-0 bg-black/50 rounded-lg transition-opacity duration-200 flex items-center justify-center',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          {overlayContent}
        </div>
      )}
    </div>
  );
};

export { LazyImage, ProgressiveImage, GalleryImage };
export default LazyImage;