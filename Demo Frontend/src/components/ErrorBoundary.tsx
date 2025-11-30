import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Alert, Button, Flex, Text } from '@aws-amplify/ui-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    // Reset error state and reload the page
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  };

  handleReset = () => {
    // Reset error state without reloading
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Flex
          direction="column"
          alignItems="center"
          justifyContent="center"
          padding="2rem"
          minHeight="50vh"
        >
          <Alert
            variation="error"
            isDismissible={false}
            hasIcon={true}
            heading="Something went wrong"
          >
            <Flex direction="column" gap="1rem">
              <Text>
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </Text>
              
              {process.env['NODE_ENV'] === 'development' && this.state.error && (
                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    Error Details (Development)
                  </summary>
                  <pre style={{ 
                    marginTop: '0.5rem', 
                    padding: '1rem', 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    overflow: 'auto'
                  }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              
              <Flex gap="1rem" marginTop="1rem">
                <Button onClick={this.handleReset} variation="primary">
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variation="link">
                  Reload Page
                </Button>
              </Flex>
            </Flex>
          </Alert>
        </Flex>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;