import React from 'react';
import { Authenticator, View, Heading, useTheme, Button, Alert, Divider } from '@aws-amplify/ui-react';
import { useAuth } from '../hooks/useAuth';
import '@aws-amplify/ui-react/styles.css';

interface LoginPageProps {
  onSignIn?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSignIn }) => {
  const { tokens } = useTheme();
  const { signIn } = useAuth();
  
  // Check if development bypass is enabled
  const DEV_BYPASS_ENABLED = import.meta.env['VITE_BYPASS_AUTH'] === 'true' || import.meta.env.DEV;

  const handleDevBypass = async () => {
    try {
      await signIn('developer', 'password');
      if (onSignIn) {
        onSignIn();
      }
    } catch (error) {
      console.error('Dev bypass failed:', error);
    }
  };

  const components = {
    Header() {
      return (
        <View textAlign="center" padding={tokens.space.large}>
          <Heading level={1} color={tokens.colors.primary[80].value}>
            Project Portal
          </Heading>
          <View marginTop={tokens.space.medium}>
            <p style={{ color: tokens.colors.neutral[60].value }}>
              Sign in to manage your AI-powered document analysis projects
            </p>
          </View>
        </View>
      );
    },
  };

  const formFields = {
    signIn: {
      username: {
        placeholder: 'Enter your username or email',
        isRequired: true,
        label: 'Username or Email'
      },
      password: {
        placeholder: 'Enter your password',
        isRequired: true,
        label: 'Password'
      }
    },
    signUp: {
      email: {
        placeholder: 'Enter your email address',
        isRequired: true,
        order: 1
      },
      username: {
        placeholder: 'Choose a username',
        isRequired: true,
        order: 2
      },
      password: {
        placeholder: 'Create a password',
        isRequired: true,
        order: 3
      },
      confirm_password: {
        placeholder: 'Confirm your password',
        isRequired: true,
        order: 4
      }
    }
  };

  return (
    <div style={{
      backgroundColor: tokens.colors.background.secondary.value,
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: tokens.space.medium.value
    }}>
      <View
        backgroundColor={tokens.colors.background.primary}
        borderRadius={tokens.radii.large}
        maxWidth="500px"
        width="100%"
        padding={tokens.space.large}
        style={{
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        {DEV_BYPASS_ENABLED && (
          <View marginBottom={tokens.space.large}>
            <Alert variation="info" marginBottom={tokens.space.medium}>
              <strong>Development Mode:</strong> Authentication bypass is enabled for testing.
            </Alert>
            <Button 
              variation="primary" 
              onClick={handleDevBypass}
              style={{ width: '100%' }}
            >
              🚀 Skip Login (Development)
            </Button>
            <Divider marginTop={tokens.space.medium} marginBottom={tokens.space.medium} />
          </View>
        )}

        <Authenticator
          components={components}
          formFields={formFields}
          hideSignUp={false}
          socialProviders={[]}
          variation="modal"
        >
          {({ signOut, user }) => {
            // This will be rendered when user is authenticated
            // Call the onSignIn callback if provided
            if (onSignIn) {
              onSignIn();
            }
            
            return (
              <View textAlign="center" padding={tokens.space.large}>
                <Heading level={2}>Welcome, {user?.username}!</Heading>
                <p>You are successfully signed in to Project Portal.</p>
                <button 
                  onClick={signOut}
                  style={{
                    marginTop: tokens.space.medium.value,
                    padding: `${tokens.space.small.value} ${tokens.space.medium.value}`,
                    backgroundColor: tokens.colors.primary[80].value,
                    color: tokens.colors.white.value,
                    border: 'none',
                    borderRadius: tokens.radii.small.value,
                    cursor: 'pointer'
                  }}
                >
                  Sign Out
                </button>
              </View>
            );
          }}
        </Authenticator>
      </View>
    </div>
  );
};

export default LoginPage;