import { useState, useEffect } from 'react';

// Mock auth hook for demonstration
export const useAuth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Mock user for demonstration
    setUser({
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