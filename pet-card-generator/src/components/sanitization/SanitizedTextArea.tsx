/**
 * SanitizedTextArea component for longer content with auto-resize and security validation
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSanitizedContent } from '../../hooks/useSanitizedContent';
import {
  SanitizedTextAreaProps,
  SecurityViolation,
  ContentType
} from '../../types/sanitization';

export const SanitizedTextArea: React.FC<SanitizedTextAreaProps> = ({
  value,
  onChange,
  placeholder = '',
  allowedTags = ['p', 'strong', 'em', 'br'],
  maxLength,
  contentType = ContentType.GENERAL,
  onSecurityViolation,
  className = '',
  disabled = false,
  rows = 4,
  autoResize = false,
  minRows = 2,
  maxRows = 10,
  ...props
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [violations, setViolations] = useState<SecurityViolation[]>([]);
  const [showSecurityFeedback, setShowSecurityFeedback] = useState(false);
  const [currentRows, setCurrentRows] = useState(rows);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const { sanitize, lastResult, error } = useSanitizedContent({
    contentType,
    enableMemoization: true
  });

  // Sync with external value changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
      if (autoResize) {
        calculateRows(value);
      }
    }
  }, [value, inputValue, autoResize]);

  // Calculate rows for auto-resize
  const calculateRows = useCallback((content: string) => {
    if (!autoResize) return;

    const lines = content.split('\n').length;
    const calculatedRows = Math.max(minRows || 2, Math.min(maxRows || 10, lines + 1));
    setCurrentRows(calculatedRows);
  }, [autoResize, minRows, maxRows]);

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
          if (autoResize) {
            calculateRows(sanitized);
          }
        }
      } else {
        setViolations([]);
        setShowSecurityFeedback(false);
      }
    }, 500); // Longer debounce for textarea
  }, [sanitize, allowedTags, lastResult, onChange, onSecurityViolation, autoResize, calculateRows]);

  // Handle textarea changes
  const handleTextAreaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Check max length
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    setInputValue(newValue);
    
    // Auto-resize if enabled
    if (autoResize) {
      calculateRows(newValue);
    }

    debouncedSanitize(newValue);
  }, [maxLength, autoResize, calculateRows, debouncedSanitize]);

  // Handle textarea blur - final sanitization
  const handleBlur = useCallback(() => {
    if (inputValue) {
      const sanitized = sanitize(inputValue, { allowedTags });
      if (sanitized !== inputValue) {
        setInputValue(sanitized);
        onChange(sanitized);
        if (autoResize) {
          calculateRows(sanitized);
        }
      }
    }
    setShowSecurityFeedback(false);
  }, [inputValue, sanitize, allowedTags, onChange, autoResize, calculateRows]);

  // Handle focus - show security feedback if there are violations
  const handleFocus = useCallback(() => {
    if (violations.length > 0) {
      setShowSecurityFeedback(true);
    }
  }, [violations]);

  // Handle key down for better UX
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Ctrl+Enter or Cmd+Enter to trigger blur (finalize sanitization)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      textAreaRef.current?.blur();
    }
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Determine textarea styling based on security status
  const getTextAreaClassName = () => {
    let baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors resize-none';
    
    if (className) {
      baseClasses += ` ${className}`;
    }

    if (disabled) {
      baseClasses += ' bg-gray-100 cursor-not-allowed';
    }

    if (!autoResize) {
      baseClasses += ' resize-y';
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

  // Get security feedback message with more detailed info for textarea
  const getSecurityFeedback = () => {
    if (!showSecurityFeedback || violations.length === 0) {
      return null;
    }

    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const highViolations = violations.filter(v => v.severity === 'high');
    const mediumViolations = violations.filter(v => v.severity === 'medium');

    if (criticalViolations.length > 0) {
      return (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-800 flex items-center font-medium">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Critical security issues removed
          </div>
          <div className="mt-1 text-xs text-red-600">
            {criticalViolations.map((violation, index) => (
              <div key={index}>• {violation.description || `${violation.type} detected`}</div>
            ))}
          </div>
        </div>
      );
    } else if (highViolations.length > 0 || mediumViolations.length > 0) {
      return (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="text-sm text-yellow-800 flex items-center font-medium">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Content sanitized for safety
          </div>
          <div className="mt-1 text-xs text-yellow-700">
            {[...highViolations, ...mediumViolations].map((violation, index) => (
              <div key={index}>• {violation.description || `${violation.type} removed`}</div>
            ))}
          </div>
        </div>
      );
    } else {
      return (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-sm text-blue-800 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Minor formatting adjustments made
          </div>
        </div>
      );
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textAreaRef}
        value={inputValue}
        onChange={handleTextAreaChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={currentRows}
        className={getTextAreaClassName()}
        maxLength={maxLength}
        {...props}
      />
      
      {/* Character count and allowed tags info */}
      <div className="mt-1 flex justify-between items-center text-xs text-gray-500">
        <div>
          {allowedTags.length > 0 && (
            <span>Allowed: {allowedTags.join(', ')}</span>
          )}
        </div>
        {maxLength && (
          <div className={inputValue.length > maxLength * 0.9 ? 'text-yellow-600' : ''}>
            {inputValue.length}/{maxLength}
          </div>
        )}
      </div>

      {/* Security feedback */}
      {getSecurityFeedback()}

      {/* Error display */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-800 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Sanitization error: {error.message}
          </div>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {showSecurityFeedback && (
        <div className="mt-1 text-xs text-gray-400">
          Press Ctrl+Enter (Cmd+Enter on Mac) to finalize content
        </div>
      )}
    </div>
  );
};

export default SanitizedTextArea;