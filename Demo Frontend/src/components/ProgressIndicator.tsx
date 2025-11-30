import React from 'react';
import { Flex, Text, Badge } from '@aws-amplify/ui-react';

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep?: string;
  showPercentage?: boolean;
  variant?: 'linear' | 'steps';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  showPercentage = true,
  variant = 'linear'
}) => {
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const percentage = Math.round((completedSteps / totalSteps) * 100);

  if (variant === 'linear') {
    return (
      <Flex direction="column" gap="1rem">
        <Flex justifyContent="space-between" alignItems="center">
          <Text fontWeight="medium">
            {currentStep ? 
              steps.find(step => step.id === currentStep)?.label || 'Processing...' :
              'Processing...'
            }
          </Text>
          {showPercentage && (
            <Text fontSize="small" color="neutral.60">
              {percentage}%
            </Text>
          )}
        </Flex>
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: '#3b82f6',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="1.5rem">
      <Text fontWeight="medium" textAlign="center">
        Document Analysis Progress
      </Text>
      
      <Flex direction="column" gap="1rem">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.status === 'completed';
          const isError = step.status === 'error';
          
          return (
            <Flex key={step.id} alignItems="center" gap="1rem">
              {/* Step indicator */}
              <Flex
                alignItems="center"
                justifyContent="center"
                width="2rem"
                height="2rem"
                borderRadius="50%"
                backgroundColor={
                  isError ? 'red.20' :
                  isCompleted ? 'green.20' :
                  isActive ? 'blue.20' :
                  'neutral.20'
                }
                color={
                  isError ? 'red.80' :
                  isCompleted ? 'green.80' :
                  isActive ? 'blue.80' :
                  'neutral.60'
                }
                fontSize="small"
                fontWeight="medium"
              >
                {isError ? '!' :
                 isCompleted ? '✓' :
                 index + 1}
              </Flex>
              
              {/* Step content */}
              <Flex direction="column" gap="0.25rem" flex="1">
                <Flex alignItems="center" gap="0.5rem">
                  <Text
                    fontWeight={isActive ? 'medium' : 'normal'}
                    color={
                      isError ? 'red.80' :
                      isCompleted ? 'green.80' :
                      isActive ? 'blue.80' :
                      'neutral.80'
                    }
                  >
                    {step.label}
                  </Text>
                  
                  {/* Status badge */}
                  {isActive && (
                    <Badge variation="info" size="small">
                      In Progress
                    </Badge>
                  )}
                  {isCompleted && (
                    <Badge variation="success" size="small">
                      Complete
                    </Badge>
                  )}
                  {isError && (
                    <Badge variation="error" size="small">
                      Error
                    </Badge>
                  )}
                </Flex>
              </Flex>
              
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '2rem',
                    width: '2px',
                    height: '1rem',
                    backgroundColor: isCompleted ? '#10b981' : '#e5e7eb',
                    marginLeft: '-1px'
                  }}
                />
              )}
            </Flex>
          );
        })}
      </Flex>
      
      {showPercentage && (
        <Text textAlign="center" fontSize="small" color="neutral.60">
          {completedSteps} of {totalSteps} steps completed ({percentage}%)
        </Text>
      )}
    </Flex>
  );
};

export default ProgressIndicator;