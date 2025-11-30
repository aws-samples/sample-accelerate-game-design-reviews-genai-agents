import React from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { View, Loader } from '@aws-amplify/ui-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
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
            <p>Loading...</p>
          </View>
        </View>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render the protected content if user is authenticated
  return <>{children}</>;
};

export default ProtectedRoute;