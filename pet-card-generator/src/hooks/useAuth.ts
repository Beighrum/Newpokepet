import { useState, useEffect } from 'react';

// Mock auth hook for demonstration
export const useAuth = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Mock user for demonstration
    setUser({
      id: 'demo-user-123',
      uid: 'demo-user-123',
      email: 'demo@example.com',
      displayName: 'Demo User',
      photoURL: null,
      metadata: {
        creationTime: new Date().toISOString()
      },
      getIdToken: async () => 'mock-token'
    });
  }, []);

  const signOut = async () => {
    setUser(null);
  };

  const signInWithGoogle = async () => {
    setUser({
      id: 'demo-user-123',
      uid: 'demo-user-123',
      email: 'demo@example.com',
      displayName: 'Demo User',
      photoURL: null,
      metadata: {
        creationTime: new Date().toISOString()
      },
      getIdToken: async () => 'mock-token'
    });
  };

  return {
    user,
    signOut,
    signInWithGoogle
  };
};