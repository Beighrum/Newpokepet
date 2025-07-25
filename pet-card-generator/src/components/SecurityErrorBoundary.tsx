/**
 * Security Error Boundary Component
 * Handles security-related errors and provides safe fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Shield, RefreshCw, Home } from 'lucide-react';
import { securityEventLogger } from '@/services/securityEventLogger';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isSecurityError: boolean;
}

class SecurityErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isSecurityError: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is a security-related error
    const isSecurityError = SecurityErrorBoundary.isSecurityRelatedError(error);
    
    return {
      hasError: true,
      error,
      isSecurityError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log security errors with enhanced context
    if (this.state.isSecurityError) {
      this.logSecurityError(error, errorInfo);
    }

    // Report to Sentry with security context
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', 'SecurityErrorBoundary');
      scope.setTag('isSecurityError', this.state.isSecurityError);
      scope.setLevel('error');
      
      if (this.state.isSecurityError) {
        scope.setTag('securityErrorType', this.getSecurityErrorType(error));
        scope.setContext('securityContext', {
          errorMessage: error.message,
          errorStack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString()
        });
      }
      
      Sentry.captureException(error);
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private static isSecurityRelatedError(error: Error): boolean {
    const securityKeywords = [
      'sanitization',
      'xss',
      'script',
      'security',
      'violation',
      'dompurify',
      'malicious',
      'unsafe'
    ];

    const errorMessage = error.message.toLowerCase();
    const errorStack = (error.stack || '').toLowerCase();

    return securityKeywords.some(keyword => 
      errorMessage.includes(keyword) || errorStack.includes(keyword)
    );
  }

  private getSecurityErrorType(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('sanitization')) return 'sanitization_error';
    if (message.includes('xss')) return 'xss_prevention_error';
    if (message.includes('dompurify')) return 'dompurify_error';
    if (message.includes('violation')) return 'security_violation';
    if (message.includes('script')) return 'script_injection_attempt';
    
    return 'unknown_security_error';
  }

  private async logSecurityError(error: Error, errorInfo: ErrorInfo) {
    try {
      await securityEventLogger.logSecurityEvent({
        type: 'security_error_boundary',
        severity: 'error',
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
          componentStack: errorInfo.componentStack,
          errorType: this.getSecurityErrorType(error),
          timestamp: new Date(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      });
    } catch (loggingError) {
      console.error('Failed to log security error:', loggingError);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isSecurityError: false
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Security-specific error UI
      if (this.state.isSecurityError) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-800">
                  <Shield className="w-5 h-5" />
                  <span>Security Error</span>
                </CardTitle>
                <CardDescription>
                  A security-related error occurred while processing your request.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    For your security, this action has been blocked. The incident has been logged and will be reviewed.
                  </AlertDescription>
                </Alert>

                <div className="bg-red-50 p-3 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">What happened?</h4>
                  <p className="text-sm text-red-700">
                    Our security systems detected potentially unsafe content or behavior. 
                    This could be due to malicious input, script injection attempts, or content sanitization failures.
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">What can you do?</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Try refreshing the page</li>
                    <li>• Avoid using special characters or HTML in your input</li>
                    <li>• Contact support if the problem persists</li>
                  </ul>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={this.handleRetry} variant="outline" className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button onClick={this.handleGoHome} className="flex-1">
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                      Error Details (Development Only)
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {this.state.error.message}
                      {'\n\n'}
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          </div>
        );
      }

      // General error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <span>Something went wrong</span>
              </CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  We're sorry for the inconvenience. The error has been reported and will be investigated.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-2">
                <Button onClick={this.handleRetry} variant="outline" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SecurityErrorBoundary;