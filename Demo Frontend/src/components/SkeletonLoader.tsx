import React from 'react';
import { Flex, Placeholder } from '@aws-amplify/ui-react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'card' | 'list' | 'project' | 'chat';
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  variant = 'text', 
  count = 1 
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return (
          <Flex direction="column" gap="0.5rem">
            <Placeholder height="1rem" width="80%" />
            <Placeholder height="1rem" width="60%" />
            <Placeholder height="1rem" width="90%" />
          </Flex>
        );

      case 'card':
        return (
          <Flex
            direction="column"
            gap="1rem"
            padding="1.5rem"
            border="1px solid"
            borderColor="neutral.20"
            borderRadius="medium"
          >
            <Placeholder height="1.5rem" width="70%" />
            <Placeholder height="1rem" width="100%" />
            <Placeholder height="1rem" width="80%" />
            <Flex gap="0.5rem" marginTop="1rem">
              <Placeholder height="2rem" width="5rem" />
              <Placeholder height="2rem" width="4rem" />
            </Flex>
          </Flex>
        );

      case 'list':
        return (
          <Flex direction="column" gap="1rem">
            {Array.from({ length: count }, (_, index) => (
              <Flex key={index} alignItems="center" gap="1rem">
                <Placeholder height="3rem" width="3rem" borderRadius="50%" />
                <Flex direction="column" gap="0.5rem" flex="1">
                  <Placeholder height="1rem" width="60%" />
                  <Placeholder height="0.875rem" width="40%" />
                </Flex>
              </Flex>
            ))}
          </Flex>
        );

      case 'project':
        return (
          <Flex
            direction="column"
            gap="1.5rem"
            padding="2rem"
            border="1px solid"
            borderColor="neutral.20"
            borderRadius="medium"
          >
            {/* Project header */}
            <Flex direction="column" gap="1rem">
              <Placeholder height="2rem" width="50%" />
              <Placeholder height="1rem" width="30%" />
            </Flex>
            
            {/* Project content */}
            <Flex direction="column" gap="0.75rem">
              <Placeholder height="1rem" width="100%" />
              <Placeholder height="1rem" width="90%" />
              <Placeholder height="1rem" width="95%" />
              <Placeholder height="1rem" width="85%" />
            </Flex>
            
            {/* Action buttons */}
            <Flex gap="1rem" marginTop="1rem">
              <Placeholder height="2.5rem" width="8rem" />
              <Placeholder height="2.5rem" width="6rem" />
            </Flex>
          </Flex>
        );

      case 'chat':
        return (
          <Flex direction="column" gap="1rem">
            {Array.from({ length: count }, (_, index) => (
              <Flex 
                key={index} 
                direction="column" 
                gap="0.5rem"
                alignItems={index % 2 === 0 ? 'flex-start' : 'flex-end'}
              >
                <Placeholder 
                  height="3rem" 
                  width={index % 2 === 0 ? "70%" : "60%"}
                  borderRadius="medium"
                />
              </Flex>
            ))}
          </Flex>
        );

      default:
        return <Placeholder height="1rem" width="100%" />;
    }
  };

  if (variant === 'list' || variant === 'chat') {
    return <>{renderSkeleton()}</>;
  }

  return (
    <Flex direction="column" gap="1rem">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </Flex>
  );
};

export default SkeletonLoader;