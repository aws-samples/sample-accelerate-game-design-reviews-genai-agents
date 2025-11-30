import React from 'react';
import {
  Flex,
  SwitchField,
  useTheme,
  View,
  Text,
  Badge,
} from '@aws-amplify/ui-react';

export interface MemoryToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const MemoryToggle: React.FC<MemoryToggleProps> = ({
  enabled,
  onToggle,
}) => {
  const { tokens } = useTheme();

  return (
    <View
      className="memory-toggle"
      role="group"
      aria-label="Memory mode control"
      style={{
        padding: tokens.space.medium.value,
        backgroundColor: tokens.colors.background.secondary.value,
        borderRadius: tokens.radii.medium.value,
        border: `1px solid ${tokens.colors.border.primary.value}`,
        marginBottom: tokens.space.medium.value,
      }}
    >
      <Flex
        direction="column"
        gap={tokens.space.small}
      >
        <Flex
          justifyContent="space-between"
          alignItems="center"
          gap={tokens.space.medium}
        >
          <Flex
            direction="column"
            gap={tokens.space.xs}
            style={{ flex: 1 }}
          >
            <Text
              fontWeight="bold"
              fontSize={tokens.fontSizes.medium}
              color={tokens.colors.font.primary}
            >
              Memory Mode
            </Text>
            <Text
              fontSize={tokens.fontSizes.small}
              color={tokens.colors.font.secondary}
            >
              {enabled 
                ? 'Agent maintains conversation context automatically' 
                : 'Full context passed with each message'}
            </Text>
          </Flex>
          
          <SwitchField
            label=""
            isChecked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            labelHidden
            className="memory-toggle-switch"
            aria-label={enabled ? 'Memory enabled' : 'Memory disabled'}
            style={{
              marginBottom: 0,
            }}
          />
        </Flex>

        {!enabled && (
          <Flex
            alignItems="center"
            gap={tokens.space.small}
            className="context-indicator"
            style={{
              padding: tokens.space.small.value,
              backgroundColor: tokens.colors.background.info.value,
              borderRadius: tokens.radii.small.value,
              border: `1px solid ${tokens.colors.border.info.value}`,
            }}
          >
            <span
              style={{
                fontSize: '1.25rem',
                lineHeight: 1,
              }}
              aria-hidden="true"
            >
              📄
            </span>
            <Text
              fontSize={tokens.fontSizes.small}
              color={tokens.colors.font.info}
              style={{ margin: 0 }}
            >
              Passing full document and conversation history
            </Text>
            <Badge
              variation="info"
              size="small"
            >
              Full Context
            </Badge>
          </Flex>
        )}
      </Flex>
    </View>
  );
};

export default MemoryToggle;
