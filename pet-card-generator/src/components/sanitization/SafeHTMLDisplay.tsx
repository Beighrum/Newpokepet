/**
 * SafeHTMLDisplay component for rendering sanitized HTML content with error boundaries
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSanitizedContent } from '../../hooks/useSanitizedContent';
import {
  SafeHTMLDisplayProps,
  ContentType,
  SecurityViolation
} from '../../types/sanitization';

// Error boundary component for safe HTML rendering
class SafeHTMLErrorBoundary extends React.Component<
  { 
    children: React.ReactNode; 
    onError?: (error: Error) => void;
    fallback?: React.ComponentType;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SafeHTMLDisplay error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      
      return (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center text-red-800">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Content could not be displayed safely</span>
          </div>
          <p className="mt-1 text-xs text-red-600">
            The content contains elements that cannot be rendered securely.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Default fallback component
const DefaultFallback: React.FC = () => (
  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
    <div className="flex items-center text-gray-600">
      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <span className="text-sm">Content unavailable</span>
    </div>
  </div>
);

export const SafeHTMLDisplay: React.FC<SafeHTMLDisplayProps> = ({
  content,
  className = '',
  contentType = ContentType.GENERAL,
  fallbackComponent = DefaultFallback,
  onRenderError,
  allowInteractivity = false,
  ...props
}) => {
  const [sanitizedHTML, setSanitizedHTML] = useState<string>('');
  const [violations, setViolations] = useState<SecurityViolation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const { sanitize, lastResult, error } = useSanitizedContent({
    contentType,
    enableMemoization: true
  });

  // Sanitize content when it changes
  useEffect(() => {
    if (!content) {
      setSanitizedHTML('');
      setViolations([]);
      return;
    }

    setIsProcessing(true);

    try {
      // Get appropriate allowed tags based on content type and interactivity
      const allowedTags = getAllowedTags(contentType, allowInteractivity);
      const sanitized = sanitize(content, { allowedTags });
      
      setSanitizedHTML(sanitized);
      
      if (lastResult?.securityViolations) {
        setViolations(lastResult.securityViolations);
        
        // Log security violations for monitoring
        if (lastResult.securityViolations.length > 0) {
          console.warn('SafeHTMLDisplay: Security violations detected', {
            contentType,
            violations: lastResult.securityViolations,
            originalContent: content.substring(0, 100) + '...'
          });
        }
      }
    } catch (err) {
      console.error('SafeHTMLDisplay: Sanitization failed', err);
      setSanitizedHTML('');
      if (onRenderError) {
        onRenderError(err instanceof Error ? err : new Error('Sanitization failed'));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [content, contentType, allowInteractivity, sanitize, lastResult, onRenderError]);

  // Get allowed tags based on content type and interactivity settings
  const getAllowedTags = useCallback((type: ContentType, interactive: boolean): string[] => {
    const baseTags = ['p', 'br', 'strong', 'em', 'u', 'span', 'div'];
    
    switch (type) {
      case ContentType.USER_PROFILE:
        return [...baseTags, 'h1', 'h2', 'h3', 'ul', 'ol', 'li'];
      
      case ContentType.PET_CARD_METADATA:
        return [...baseTags, 'small', 'mark'];
      
      case ContentType.COMMENT:
        return [...baseTags, 'blockquote', 'code', 'pre'];
      
      case ContentType.SOCIAL_SHARING:
        return baseTags; // Most restrictive for social sharing
      
      default:
        const tags = [...baseTags];
        if (interactive) {
          // Only add interactive elements if explicitly allowed and in safe contexts
          tags.push('a'); // Links are the only interactive element we might allow
        }
        return tags;
    }
  }, []);

  // Memoized component class name
  const componentClassName = useMemo(() => {
    let classes = 'safe-html-display';
    
    if (className) {
      classes += ` ${className}`;
    }
    
    if (violations.length > 0) {
      classes += ' has-security-violations';
    }
    
    if (isProcessing) {
      classes += ' is-processing';
    }
    
    return classes;
  }, [className, violations.length, isProcessing]);

  // Handle render errors
  const handleRenderError = useCallback((renderError: Error) => {
    console.error('SafeHTMLDisplay render error:', renderError);
    if (onRenderError) {
      onRenderError(renderError);
    }
  }, [onRenderError]);

  // Show loading state
  if (isProcessing) {
    return (
      <div className={`${componentClassName} animate-pulse`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center text-red-800">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Sanitization Error</span>
        </div>
        <p className="mt-1 text-xs text-red-600">{error.message}</p>
      </div>
    );
  }

  // Show empty state
  if (!sanitizedHTML) {
    return (
      <div className="text-gray-500 text-sm italic">
        No content to display
      </div>
    );
  }

  return (
    <SafeHTMLErrorBoundary onError={handleRenderError} fallback={fallbackComponent}>
      <div 
        className={componentClassName}
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
        {...props}
      />
      
      {/* Security violations indicator (only in development) */}
      {process.env.NODE_ENV === 'development' && violations.length > 0 && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <div className="font-medium text-yellow-800">
            ⚠️ {violations.length} security violation{violations.length > 1 ? 's' : ''} sanitized
          </div>
          <details className="mt-1">
            <summary className="cursor-pointer text-yellow-700">View details</summary>
            <ul className="mt-1 text-yellow-600">
              {violations.map((violation, index) => (
                <li key={index}>
                  • {violation.type}: {violation.description || 'Content removed for security'}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </SafeHTMLErrorBoundary>
  );
};

export default SafeHTMLDisplay;