import React from 'react';
import {
  Flex,
  Button,
  useTheme,
  View,
  Text
} from '@aws-amplify/ui-react';

export interface StageSelectorProps {
  currentStage: string;
  onStageChange: (stage: string) => void;
  disabled?: boolean;
}

interface Stage {
  value: string;
  label: string;
  icon: string;
  description: string;
}

const stages: Stage[] = [
  { 
    value: 'gameplay', 
    label: 'Gameplay', 
    icon: '🎮',
    description: 'Analyze game mechanics and systems'
  },
  { 
    value: 'lore', 
    label: 'Lore', 
    icon: '📖',
    description: 'Explore narrative and world-building'
  },
  { 
    value: 'analyst', 
    label: 'Analyst', 
    icon: '🔍',
    description: 'Get analytical insights'
  },
  { 
    value: 'analysis', 
    label: 'Analysis', 
    icon: '📊',
    description: 'Perform detailed analysis'
  },
];

export const StageSelector: React.FC<StageSelectorProps> = ({
  currentStage,
  onStageChange,
  disabled = false,
}) => {
  const { tokens } = useTheme();

  return (
    <View
      role="group"
      aria-label="Stage selection"
      className="stage-selector"
    >
      <Flex
        gap={tokens.space.small}
        wrap="wrap"
        justifyContent="flex-start"
        alignItems="stretch"
      >
        {stages.map((stage) => {
          const isActive = currentStage === stage.value;
          
          const buttonProps = {
            key: stage.value,
            onClick: () => onStageChange(stage.value),
            disabled,
            size: 'small' as const,
            className: `stage-button ${isActive ? 'stage-button-active' : ''}`,
            'aria-pressed': isActive,
            'aria-label': `${stage.label}: ${stage.description}`,
            style: {
              flex: '1 1 auto',
              minWidth: '120px',
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center' as const,
              gap: tokens.space.xs.value,
              padding: tokens.space.medium.value,
              transition: 'all 0.2s ease',
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
              backgroundColor: isActive 
                ? '#007EB9' 
                : tokens.colors.background.secondary.value,
              border: isActive
                ? '2px solid #007EB9'
                : `1px solid ${tokens.colors.border.primary.value}`,
              color: isActive
                ? tokens.colors.font.inverse.value
                : tokens.colors.font.primary.value,
            }
          };

          return (
            <Button
              {...buttonProps}
              {...(isActive ? { variation: 'primary' as const } : {})}
            >
              <span 
                className="stage-icon"
                style={{ 
                  fontSize: '1.5rem',
                  lineHeight: 1,
                }}
                aria-hidden="true"
              >
                {stage.icon}
              </span>
              <Text
                className="stage-label"
                fontWeight={isActive ? 'bold' : 'normal'}
                fontSize={tokens.fontSizes.small}
                color={isActive ? 'inherit' : tokens.colors.font.primary}
                style={{
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                {stage.label}
              </Text>
            </Button>
          );
        })}
      </Flex>
    </View>
  );
};

export default StageSelector;
