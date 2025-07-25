/**
 * SanitizedInput component with real-time validation and security feedback
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSanitizedContent } from '../../hooks/useSanitizedContent';
import {
  SanitizedInputProps,
  SecurityViolation,
  ContentType
} from '../../types/sanitization';

export const SanitizedInput: React.FC<SanitizedInputProps> = ({
  value,
  onChange,
  placeholder = '',
  allowedTags = [],
  maxLength,
  contentType = ContentType.GENERAL,
  onSecurityViolation,
  className = '',
  disabled = false,
  ...props
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [violations, setViolations] = useState<SecurityViolation[]>([]);
  const [showSecurityFeedback, setShowSecurityFeedback] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const { sanitize, lastResult, error } = useSanitizedContent({
    contentType,
    enableMemoization: true
  });

  // Sync with external value changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Debounced sanitization and validation
  const debouncedSanitize = useCallback((content: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (content) {
        const sanitized = sanitize(content, { allowedTags });
        
        // Check for security violations
        if (lastResult?.securityViolations) {
          setViolations(lastResult.securityViolations);
          setShowSecurityFeedback(lastResult.securityViolations.length > 0);
          
          // Notify parent of security violations
          if (onSecurityViolation && lastResult.securityViolations.length > 0) {
            lastResult.securityViolations.forEach(violation => {
              onSecurityViolation(violation);
            });
          }
        }

        // Only call onChange if the sanitized content is different
        if (sanitized !== content) {
          onChange(sanitized);
          setInputValue(sanitized);
        }
      } else {
        setViolations([]);
        setShowSecurityFeedback(false);
      }
    }, 300); // 300ms debounce
  }, [sanitize, allowedTags, lastResult, onChange, onSecurityViolation]);

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Check max length
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    setInputValue(newValue);
    debouncedSanitize(newValue);
  }, [maxLength, debouncedSanitize]);

  // Handle input blur - final sanitization
  const handleBlur = useCallback(() => {
    if (inputValue) {
      const sanitized = sanitize(inputValue, { allowedTags });
      if (sanitized !== inputValue) {
        setInputValue(sanitized);
        onChange(sanitized);
      }
    }
    setShowSecurityFeedback(false);
  }, [inputValue, sanitize, allowedTags, onChange]);

  // Handle focus - show security feedback if there are violations
  const handleFocus = useCallback(() => {
    if (violations.length > 0) {
      setShowSecurityFeedback(true);
    }
  }, [violations]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Determine input styling based on security status
  const getInputClassName = () => {
    let baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors';
    
    if (className) {
      baseClasses += ` ${className}`;
    }

    if (disabled) {
      baseClasses += ' bg-gray-100 cursor-not-allowed';
    }

    if (error) {
      baseClasses += ' border-red-500 focus:ring-red-500 focus:border-red-500';
    } else if (violations.length > 0) {
      const criticalViolations = violations.filter(v => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        baseClasses += ' border-red-400 focus:ring-red-400 focus:border-red-400';
      } else {
        baseClasses += ' border-yellow-400 focus:ring-yellow-400 focus:border-yellow-400';
      }
    } else {
      baseClasses += ' border-gray-300 focus:ring-blue-500 focus:border-blue-500';
    }

    return baseClasses;
  };

  // Get security feedback message
  const getSecurityFeedback = () => {
    if (!showSecurityFeedback || violations.length === 0) {
      return null;
    }

    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const highViolations = violations.filter(v => v.severity === 'high');

    if (criticalViolations.length > 0) {
      return (
        <div className="mt-1 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Dangerous content removed ({criticalViolations.length} critical issue{criticalViolations.length > 1 ? 's' : ''})
        </div>
      );
    } else if (highViolations.length > 0) {
      return (
        <div className="mt-1 text-sm text-yellow-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Content sanitized ({violations.length} issue{violations.length > 1 ? 's' : ''} fixed)
        </div>
      );
    } else {
      return (
        <div className="mt-1 text-sm text-blue-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Minor formatting adjustments made
        </div>
      );
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={getInputClassName()}
        maxLength={maxLength}
        {...props}
      />
      
      {/* Character count indicator */}
      {maxLength && (
        <div className="mt-1 text-xs text-gray-500 text-right">
          {inputValue.length}/{maxLength}
        </div>
      )}

      {/* Security feedback */}
      {getSecurityFeedback()}

      {/* Error display */}
      {error && (
        <div className="mt-1 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Sanitization error: {error.message}
        </div>
      )}
    </div>
  );
};

export default SanitizedInput;