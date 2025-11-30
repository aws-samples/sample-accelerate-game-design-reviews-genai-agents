import React from 'react';
import {
  Flex,
  useTheme,
  View,
  Text,
} from '@aws-amplify/ui-react';

export interface MessageMetricsProps {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  invocationDurationMs?: number | undefined;
}

export const MessageMetrics: React.FC<MessageMetricsProps> = ({
  inputTokens = 0,
  outputTokens = 0,
  invocationDurationMs = 0,
}) => {
  const { tokens } = useTheme();

  // Calculate total tokens
  const totalTokens = inputTokens + outputTokens;
  
  // Convert duration to seconds with 2 decimal places
  const durationSeconds = (invocationDurationMs / 1000).toFixed(2);
  
  // Approximate cost calculation (example rates for Claude 3.5 Sonnet)
  // Note: Token counts are estimated based on text length (~4 chars per token)
  // Actual token counts may vary. These rates should be updated based on actual pricing.
  const inputCostPer1k = 0.003; // $0.003 per 1k input tokens
  const outputCostPer1k = 0.015; // $0.015 per 1k output tokens
  const estimatedCost = (
    (inputTokens / 1000) * inputCostPer1k +
    (outputTokens / 1000) * outputCostPer1k
  ).toFixed(4);

  // Don't render if no metrics available
  if (totalTokens === 0 && invocationDurationMs === 0) {
    return null;
  }

  return (
    <View
      className="message-metrics"
      role="status"
      aria-label="Message performance metrics"
      style={{
        marginTop: tokens.space.small.value,
        padding: tokens.space.small.value,
        backgroundColor: tokens.colors.background.secondary.value,
        borderRadius: tokens.radii.small.value,
        border: `1px solid ${tokens.colors.border.secondary.value}`,
      }}
    >
      <Flex
        gap={tokens.space.medium}
        wrap="wrap"
        justifyContent="flex-start"
        alignItems="center"
        className="metrics-container"
      >
        {/* Token Count Metric */}
        {totalTokens > 0 && (
          <Flex
            alignItems="center"
            gap={tokens.space.xs}
            className="metric metric-tokens"
            style={{
              flex: '0 1 auto',
            }}
          >
            <span
              className="metric-icon"
              style={{
                fontSize: '1rem',
                lineHeight: 1,
              }}
              aria-hidden="true"
            >
              🔢
            </span>
            <Flex
              direction="column"
              gap="0"
              style={{
                lineHeight: 1.2,
              }}
            >
              <Text
                fontSize={tokens.fontSizes.small}
                fontWeight="bold"
                color={tokens.colors.font.primary}
                style={{ margin: 0 }}
              >
                {totalTokens.toLocaleString()}
              </Text>
              <Text
                fontSize={tokens.fontSizes.xs}
                color={tokens.colors.font.tertiary}
                style={{ margin: 0 }}
                title="Estimated token count based on text length"
              >
                tokens ({inputTokens.toLocaleString()} in / {outputTokens.toLocaleString()} out)
              </Text>
            </Flex>
          </Flex>
        )}

        {/* Response Time Metric */}
        {invocationDurationMs > 0 && (
          <Flex
            alignItems="center"
            gap={tokens.space.xs}
            className="metric metric-duration"
            style={{
              flex: '0 1 auto',
            }}
          >
            <span
              className="metric-icon"
              style={{
                fontSize: '1rem',
                lineHeight: 1,
              }}
              aria-hidden="true"
            >
              ⚡
            </span>
            <Flex
              direction="column"
              gap="0"
              style={{
                lineHeight: 1.2,
              }}
            >
              <Text
                fontSize={tokens.fontSizes.small}
                fontWeight="bold"
                color={tokens.colors.font.primary}
                style={{ margin: 0 }}
              >
                {durationSeconds}s
              </Text>
              <Text
                fontSize={tokens.fontSizes.xs}
                color={tokens.colors.font.tertiary}
                style={{ margin: 0 }}
              >
                response time
              </Text>
            </Flex>
          </Flex>
        )}

        {/* Estimated Cost Metric */}
        {totalTokens > 0 && (
          <Flex
            alignItems="center"
            gap={tokens.space.xs}
            className="metric metric-cost"
            style={{
              flex: '0 1 auto',
            }}
          >
            <span
              className="metric-icon"
              style={{
                fontSize: '1rem',
                lineHeight: 1,
              }}
              aria-hidden="true"
            >
              💰
            </span>
            <Flex
              direction="column"
              gap="0"
              style={{
                lineHeight: 1.2,
              }}
            >
              <Text
                fontSize={tokens.fontSizes.small}
                fontWeight="bold"
                color={tokens.colors.font.primary}
                style={{ margin: 0 }}
              >
                ${estimatedCost}
              </Text>
              <Text
                fontSize={tokens.fontSizes.xs}
                color={tokens.colors.font.tertiary}
                style={{ margin: 0 }}
                title="Estimated cost based on approximate token counts"
              >
                estimated cost
              </Text>
            </Flex>
          </Flex>
        )}
      </Flex>
    </View>
  );
};

export default MessageMetrics;
