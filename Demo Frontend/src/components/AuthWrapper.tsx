import React from 'react';
import type { ReactNode } from 'react';
import { View, Loader } from '@aws-amplify/ui-react';
import { useAuth } from '../hooks/useAuth';
import { LoginPage } from '../pages';

interface AuthWrapperProps {
  children: ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  // Show loading spinner while checking authentication state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--amplify-colors-background-secondary)'
      }}>
        <View textAlign="center">
          <Loader size="large" />
          <View marginTop="medium">
            <p>Loading Project Portal...</p>
          </View>
        </View>
      </div>
    );
  }

  // Show login page if user is not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // Render the protected content if user is authenticated
  return <>{children}</>;
};

export default AuthWrapper;