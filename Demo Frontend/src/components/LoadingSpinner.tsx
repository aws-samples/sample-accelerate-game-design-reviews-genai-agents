import React from 'react';
import { Flex, Loader, Text } from '@aws-amplify/ui-react';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'large', 
  message,
  fullScreen = false 
}) => {
  const content = (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      gap="1rem"
      padding="2rem"
    >
      <Loader size={size} />
      {message && (
        <Text textAlign="center" color="neutral.60">
          {message}
        </Text>
      )}
    </Flex>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;