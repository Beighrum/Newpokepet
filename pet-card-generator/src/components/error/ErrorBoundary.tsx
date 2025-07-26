import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  Home, 
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  showDetails: boolean;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  errorId: string;
  retry: () => void;
  goHome: () => void;
  canRetry: boolean;
  retryCount: number;
  level: 'page' | 'section' | 'component';
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    const { errorId } = this.state;

    this.setState({ errorInfo });

    // Log error to monitoring service
    this.logError(error, errorInfo, errorId);

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo, errorId);
    }

    // Report to external services (Sentry, etc.)
    this.reportError(error, errorInfo, errorId);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys && resetOnPropsChange) {
      if (resetKeys && resetKeys.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    const errorData = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      level: this.props.level || 'component'
    };

    console.error('ErrorBoundary caught an error:', errorData);

    // Store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorBoundaryLogs') || '[]');
      existingErrors.push(errorData);
      
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      
      localStorage.setItem('errorBoundaryLogs', JSON.stringify(existingErrors));
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e);
    }
  };

  private reportError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    // Report to Sentry or other monitoring service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.withScope((scope: any) => {
        scope.setTag('errorBoundary', true);
        scope.setTag('errorId', errorId);
        scope.setTag('level', this.props.level || 'component');
        scope.setContext('errorInfo', {
          componentStack: errorInfo.componentStack
        });
        (window as any).Sentry.captureException(error);
      });
    }

    // Report to custom analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: this.props.level === 'page',
        error_id: errorId
      });
    }
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false,
      retryCount: 0
    });
  };

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState({ retryCount: retryCount + 1 });
      
      // Reset after a short delay to allow for cleanup
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetErrorBoundary();
      }, 100);
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    
    const errorDetails = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        // Could show a toast here
        console.log('Error details copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy error details:', err);
      });
  };

  render() {
    const { hasError, error, errorInfo, errorId, showDetails, retryCount } = this.state;
    const { 
      children, 
      fallback: FallbackComponent, 
      enableRetry = true, 
      maxRetries = 3,
      level = 'component'
    } = this.props;

    if (hasError && error) {
      const canRetry = enableRetry && retryCount < maxRetries;

      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo!}
            errorId={errorId}
            retry={this.handleRetry}
            goHome={this.handleGoHome}
            canRetry={canRetry}
            retryCount={retryCount}
            level={level}
          />
        );
      }

      return <DefaultErrorFallback
        error={error}
        errorInfo={errorInfo!}
        errorId={errorId}
        retry={this.handleRetry}
        goHome={this.handleGoHome}
        canRetry={canRetry}
        retryCount={retryCount}
        level={level}
        showDetails={showDetails}
        onToggleDetails={() => this.setState({ showDetails: !showDetails })}
        onCopyDetails={this.copyErrorDetails}
      />;
    }

    return children;
  }
}

// Default error fallback component
interface DefaultErrorFallbackProps extends ErrorFallbackProps {
  showDetails: boolean;
  onToggleDetails: () => void;
  onCopyDetails: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  retry,
  goHome,
  canRetry,
  retryCount,
  level,
  showDetails,
  onToggleDetails,
  onCopyDetails
}) => {
  const getLevelConfig = () => {
    switch (level) {
      case 'page':
        return {
          title: 'Page Error',
          description: 'Something went wrong with this page',
          icon: <AlertTriangle className="w-12 h-12 text-red-500" />,
          showHomeButton: true
        };
      case 'section':
        return {
          title: 'Section Error',
          description: 'This section encountered an error',
          icon: <Bug className="w-8 h-8 text-red-500" />,
          showHomeButton: false
        };
      default:
        return {
          title: 'Component Error',
          description: 'A component failed to render',
          icon: <Bug className="w-6 h-6 text-red-500" />,
          showHomeButton: false
        };
    }
  };

  const config = getLevelConfig();

  return (
    <Card className={cn(
      'border-red-200 bg-red-50',
      level === 'page' && 'min-h-[400px]',
      level === 'section' && 'min-h-[200px]'
    )}>
      <CardHeader>
        <div className="flex items-center space-x-3">
          {config.icon}
          <div>
            <CardTitle className="text-red-800">{config.title}</CardTitle>
            <CardDescription className="text-red-600">
              {config.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Message */}
        <div className="bg-white rounded-lg p-4 border border-red-200">
          <div className="text-sm font-medium text-red-800 mb-2">Error Message:</div>
          <div className="text-sm text-red-700 font-mono bg-red-100 p-2 rounded">
            {error.message}
          </div>
        </div>

        {/* Error ID and Retry Count */}
        <div className="flex items-center space-x-4 text-xs text-red-600">
          <Badge variant="outline" className="border-red-300 text-red-700">
            ID: {errorId.slice(-8)}
          </Badge>
          {retryCount > 0 && (
            <Badge variant="outline" className="border-red-300 text-red-700">
              Retries: {retryCount}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {canRetry && (
            <Button
              onClick={retry}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          
          {config.showHomeButton && (
            <Button
              onClick={goHome}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          )}

          <Button
            onClick={onCopyDetails}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-100"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Details
          </Button>

          <Button
            onClick={onToggleDetails}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-100"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Show Details
              </>
            )}
          </Button>
        </div>

        {/* Error Details */}
        {showDetails && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="text-sm font-medium text-red-800 mb-2">Stack Trace:</div>
              <pre className="text-xs text-red-700 bg-red-100 p-2 rounded overflow-auto max-h-40">
                {error.stack}
              </pre>
            </div>

            {errorInfo && (
              <div className="bg-white rounded-lg p-4 border border-red-200">
                <div className="text-sm font-medium text-red-800 mb-2">Component Stack:</div>
                <pre className="text-xs text-red-700 bg-red-100 p-2 rounded overflow-auto max-h-40">
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Higher-order component for easy wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export { ErrorBoundary };
export type { ErrorBoundaryProps, ErrorFallbackProps };
export default ErrorBoundary;