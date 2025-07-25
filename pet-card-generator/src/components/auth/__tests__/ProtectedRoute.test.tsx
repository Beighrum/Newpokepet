import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock AuthModal component
vi.mock('../AuthModal', () => ({
  default: ({ isOpen }: any) => isOpen ? <div data-testid="auth-modal">Auth Modal</div> : null
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when auth is loading', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: true
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: { 
        uid: '123', 
        email: 'test@example.com',
        emailVerified: true 
      },
      loading: false
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows authentication required message when user is not authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('Please sign in to access this feature and start creating amazing pet cards.')).toBeInTheDocument();
    expect(screen.getByText('Sign In to Continue')).toBeInTheDocument();
  });

  it('renders fallback component when provided and user is not authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false
    });

    render(
      <ProtectedRoute fallback={<div>Custom Fallback</div>}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
  });

  it('shows email verification required when user email is not verified', () => {
    (useAuth as any).mockReturnValue({
      user: { 
        uid: '123', 
        email: 'test@example.com',
        emailVerified: false 
      },
      loading: false
    });

    render(
      <ProtectedRoute requireEmailVerification={true}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Email Verification Required')).toBeInTheDocument();
    expect(screen.getByText('Please verify your email address to access this feature. Check your inbox for a verification link.')).toBeInTheDocument();
  });

  it('renders children when email verification is not required', () => {
    (useAuth as any).mockReturnValue({
      user: { 
        uid: '123', 
        email: 'test@example.com',
        emailVerified: false 
      },
      loading: false
    });

    render(
      <ProtectedRoute requireEmailVerification={false}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children when user is authenticated and email is verified', () => {
    (useAuth as any).mockReturnValue({
      user: { 
        uid: '123', 
        email: 'test@example.com',
        emailVerified: true 
      },
      loading: false
    });

    render(
      <ProtectedRoute requireEmailVerification={true}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});