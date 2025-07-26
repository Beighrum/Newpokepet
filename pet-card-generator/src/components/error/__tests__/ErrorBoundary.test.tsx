import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary';

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock Sentry
const mockSentry = {
  withScope: jest.fn((callback) => {
    const scope = {
      setTag: jest.fn(),
      setContext: jest.fn(),
      setUser: jest.fn(),
      setLevel: jest.fn(),
      addBreadcrumb: jest.fn()
    };
    callback(scope);
  }),
  captureException: jest.fn()
};
(window as any).Sentry = mockSentry;

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; message?: string }> = ({ 
  shouldThrow = true, 
  message = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error fallback when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="Component crashed" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component Error')).toBeInTheDocument();
    expect(screen.getByText('Component crashed')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError message="Callback test" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      }),
      expect.any(String)
    );
  });

  it('should show retry button when enableRetry is true', () => {
    render(
      <ErrorBoundary enableRetry={true}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should not show retry button when max retries reached', () => {
    const { rerender } = render(
      <ErrorBoundary enableRetry={true} maxRetries={1}>
        <ThrowError />
      </ErrorBoundary>
    );

    // First error - should show retry button
    expect(screen.getByText('Try Again')).toBeInTheDocument();

    // Click retry
    fireEvent.click(screen.getByText('Try Again'));

    // Component throws again - should not show retry button
    rerender(
      <ErrorBoundary enableRetry={true} maxRetries={1}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('should reset error boundary when retry is clicked', async () => {
    let shouldThrow = true;
    
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Success</div>;
    };

    render(
      <ErrorBoundary enableRetry={true}>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component Error')).toBeInTheDocument();

    // Fix the error condition
    shouldThrow = false;

    // Click retry
    fireEvent.click(screen.getByText('Try Again'));

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });

  it('should show different UI based on error level', () => {
    render(
      <ErrorBoundary level="page">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Page Error')).toBeInTheDocument();
    expect(screen.getByText('Go Home')).toBeInTheDocument();
  });

  it('should toggle error details when show/hide details is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Details should be hidden initially
    expect(screen.queryByText('Stack Trace:')).not.toBeInTheDocument();

    // Click show details
    fireEvent.click(screen.getByText('Show Details'));

    expect(screen.getByText('Stack Trace:')).toBeInTheDocument();

    // Click hide details
    fireEvent.click(screen.getByText('Hide Details'));

    expect(screen.queryByText('Stack Trace:')).not.toBeInTheDocument();
  });

  it('should copy error details to clipboard', async () => {
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError message="Copy test error" />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Copy Details'));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Copy test error')
      );
    });
  });

  it('should store error logs in localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('[]');

    render(
      <ErrorBoundary>
        <ThrowError message="Storage test" />
      </ErrorBoundary>
    );

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'errorBoundaryLogs',
      expect.stringContaining('Storage test')
    );
  });

  it('should report error to Sentry', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="Sentry test" />
      </ErrorBoundary>
    );

    expect(mockSentry.withScope).toHaveBeenCalled();
    expect(mockSentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Sentry test'
      })
    );
  });

  it('should reset on props change when resetOnPropsChange is true', () => {
    const { rerender } = render(
      <ErrorBoundary resetOnPropsChange={true} resetKeys={['key1']}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component Error')).toBeInTheDocument();

    // Change reset keys
    rerender(
      <ErrorBoundary resetOnPropsChange={true} resetKeys={['key2']}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should use custom fallback component', () => {
    const CustomFallback: React.FC<any> = ({ error }) => (
      <div>Custom error: {error.message}</div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError message="Custom fallback test" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error: Custom fallback test')).toBeInTheDocument();
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(ThrowError, {
      level: 'component'
    });

    render(<WrappedComponent message="HOC test" />);

    expect(screen.getByText('Component Error')).toBeInTheDocument();
    expect(screen.getByText('HOC test')).toBeInTheDocument();
  });

  it('should preserve component display name', () => {
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = 'TestComponent';

    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });
});