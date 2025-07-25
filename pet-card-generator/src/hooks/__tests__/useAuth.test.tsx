import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../useAuth';

// Mock Firebase Auth
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  sendEmailVerification: vi.fn()
};

const mockUser = {
  uid: '123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true
};

vi.mock('@/config/firebase', () => ({
  auth: mockAuth
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  FacebookAuthProvider: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  updateProfile: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn()
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.onAuthStateChanged.mockImplementation((callback) => {
      callback(null);
      return vi.fn(); // unsubscribe function
    });
  });

  it('provides initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signUp).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
  });

  it('updates user state when auth state changes', () => {
    mockAuth.onAuthStateChanged.mockImplementation((callback) => {
      callback(mockUser);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(mockUser);
  });

  it('handles sign in', async () => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    (signInWithEmailAndPassword as any).mockResolvedValue({ user: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const user = await result.current.signIn('test@example.com', 'password');
      expect(user).toEqual(mockUser);
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      'test@example.com',
      'password'
    );
  });

  it('handles sign up', async () => {
    const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = await import('firebase/auth');
    (createUserWithEmailAndPassword as any).mockResolvedValue({ user: mockUser });
    (updateProfile as any).mockResolvedValue({});
    (sendEmailVerification as any).mockResolvedValue({});

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const user = await result.current.signUp('test@example.com', 'password', 'Test User');
      expect(user).toEqual(mockUser);
    });

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      'test@example.com',
      'password'
    );
    expect(updateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'Test User' });
    expect(sendEmailVerification).toHaveBeenCalledWith(mockUser);
  });

  it('handles Google sign in', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    (signInWithPopup as any).mockResolvedValue({ user: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const user = await result.current.signInWithGoogle();
      expect(user).toEqual(mockUser);
    });

    expect(signInWithPopup).toHaveBeenCalledWith(mockAuth, expect.any(Object));
  });

  it('handles sign out', async () => {
    const { signOut } = await import('firebase/auth');
    (signOut as any).mockResolvedValue({});

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(signOut).toHaveBeenCalledWith(mockAuth);
  });

  it('handles password reset', async () => {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    (sendPasswordResetEmail as any).mockResolvedValue({});

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.resetPassword('test@example.com');
    });

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(mockAuth, 'test@example.com');
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});