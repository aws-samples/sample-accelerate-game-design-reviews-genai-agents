import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getCurrentUser, signIn as amplifySignIn, signOut as amplifySignOut } from 'aws-amplify/auth';
import type { AuthContextType, User } from '../types';
import { ErrorHandler } from '../utils/errorHandler';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Development bypass - automatically login with mock user
  // Use useMemo to prevent recalculation on every render
  const DEV_BYPASS_AUTH = useMemo(() => 
    import.meta.env['VITE_BYPASS_AUTH'] === 'true' || import.meta.env.DEV, 
    []
  );

  const checkAuthState = useCallback(async () => {
    // Skip auth check if bypass is enabled
    if (DEV_BYPASS_AUTH) {
      return;
    }

    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      
      // Convert Amplify user to our User type
      const userData: User = {
        id: currentUser.userId,
        username: currentUser.username,
        email: currentUser.signInDetails?.loginId || currentUser.username
      };
      
      setUser(userData);
    } catch (error) {
      // User is not authenticated - this is expected behavior, don't show error
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [DEV_BYPASS_AUTH]);

  // Check for existing authenticated user on app load
  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      // Bypass authentication in development
      const mockUser: User = {
        id: 'dev-user-123',
        username: 'developer',
        email: 'developer@example.com'
      };
      setUser(mockUser);
      setIsLoading(false);
    } else {
      checkAuthState();
    }
  }, [DEV_BYPASS_AUTH, checkAuthState]);

  const signIn = async (username: string, password: string): Promise<void> => {
    // Handle dev bypass
    if (DEV_BYPASS_AUTH) {
      setIsLoading(true);
      // Simulate login delay
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockUser: User = {
        id: 'dev-user-123',
        username: username || 'developer',
        email: `${username || 'developer'}@example.com`
      };
      setUser(mockUser);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { isSignedIn } = await amplifySignIn({ username, password });
      
      if (isSignedIn) {
        // Get user details after successful sign in
        await checkAuthState();
      }
    } catch (error) {
      setIsLoading(false);
      const appError = ErrorHandler.parseError(error);
      ErrorHandler.logError(appError, 'Authentication sign in');
      throw appError;
    }
  };

  const signOut = async (): Promise<void> => {
    // Handle dev bypass
    if (DEV_BYPASS_AUTH) {
      setIsLoading(true);
      // Simulate logout delay
      await new Promise(resolve => setTimeout(resolve, 300));
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      await amplifySignOut();
      setUser(null);
    } catch (error) {
      const appError = ErrorHandler.parseError(error);
      ErrorHandler.logError(appError, 'Authentication sign out');
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    signIn,
    signOut,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};