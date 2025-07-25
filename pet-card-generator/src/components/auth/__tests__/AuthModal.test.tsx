import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AuthModal from '../AuthModal';
import { useAuth } from '@/hooks/useAuth';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      <button onClick={() => onValueChange('signin')}>Sign In</button>
      <button onClick={() => onValueChange('signup')}>Sign Up</button>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  )
}));

const mockAuth = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn()
};

describe('AuthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue(mockAuth);
  });

  it('renders sign in form by default', () => {
    render(
      <AuthModal 
        isOpen={true} 
        onClose={vi.fn()} 
        defaultTab="signin" 
      />
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Pet Card Generator')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });

  it('switches to sign up tab when clicked', async () => {
    render(
      <AuthModal 
        isOpen={true} 
        onClose={vi.fn()} 
        defaultTab="signin" 
      />
    );

    const signUpButton = screen.getByText('Sign Up');
    fireEvent.click(signUpButton);

    expect(screen.getByText('Create an account')).toBeInTheDocument();
  });

  it('handles sign in form submission', async () => {
    mockAuth.signIn.mockResolvedValue({});
    const onClose = vi.fn();

    render(
      <AuthModal 
        isOpen={true} 
        onClose={onClose} 
        defaultTab="signin" 
      />
    );

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockAuth.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles sign up form submission', async () => {
    mockAuth.signUp.mockResolvedValue({});

    render(
      <AuthModal 
        isOpen={true} 
        onClose={vi.fn()} 
        defaultTab="signup" 
      />
    );

    const nameInput = screen.getByPlaceholderText('Enter your name');
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Create a password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password');
    const signUpButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(signUpButton);

    await waitFor(() => {
      expect(mockAuth.signUp).toHaveBeenCalledWith('john@example.com', 'password123', 'John Doe');
    });
  });

  it('shows error when passwords do not match', async () => {
    render(
      <AuthModal 
        isOpen={true} 
        onClose={vi.fn()} 
        defaultTab="signup" 
      />
    );

    const passwordInput = screen.getByPlaceholderText('Create a password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password');
    const signUpButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different' } });
    fireEvent.click(signUpButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('shows error when password is too short', async () => {
    render(
      <AuthModal 
        isOpen={true} 
        onClose={vi.fn()} 
        defaultTab="signup" 
      />
    );

    const passwordInput = screen.getByPlaceholderText('Create a password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password');
    const signUpButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
    fireEvent.click(signUpButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('handles authentication errors', async () => {
    mockAuth.signIn.mockRejectedValue({ code: 'auth/user-not-found' });

    render(
      <AuthModal 
        isOpen={true} 
        onClose={vi.fn()} 
        defaultTab="signin" 
      />
    );

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText('No account found with this email address.')).toBeInTheDocument();
    });
  });

  it('handles password reset', async () => {
    mockAuth.resetPassword.mockResolvedValue({});

    render(
      <AuthModal 
        isOpen={true} 
        onClose={vi.fn()} 
        defaultTab="signin" 
      />
    );

    // Click forgot password link
    const forgotPasswordLink = screen.getByText('Forgot your password?');
    fireEvent.click(forgotPasswordLink);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const resetButton = screen.getByRole('button', { name: /send reset link/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockAuth.resetPassword).toHaveBeenCalledWith('test@example.com');
      expect(screen.getByText('Password reset email sent! Check your inbox.')).toBeInTheDocument();
    });
  });

  it('does not render when closed', () => {
    render(
      <AuthModal 
        isOpen={false} 
        onClose={vi.fn()} 
        defaultTab="signin" 
      />
    );

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });
});