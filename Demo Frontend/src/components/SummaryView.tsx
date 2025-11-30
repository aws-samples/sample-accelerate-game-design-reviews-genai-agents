import React from 'react';
import {
  View,
  Heading,
  Text,
  Card,
  Badge,
  Flex,
  Button,
  Divider,
  useTheme
} from '@aws-amplify/ui-react';
import { formatMessageForDisplay } from '../utils/messageFormatter';
import type { AgentSession } from '../types/graphql';

interface SummaryViewProps {
  session: AgentSession;
  onViewChat?: () => void;
  onExportSummary?: () => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({
  session,
  onViewChat,
  onExportSummary
}) => {
  const { tokens } = useTheme();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateSessionDuration = () => {
    if (!session.endedAt) return 'In progress';
    
    const start = new Date(session.startedAt);
    const end = new Date(session.endedAt);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const summary = session.summary;

  if (!summary) {
    return (
      <Card padding={tokens.space.large}>
        <View textAlign="center">
          <Heading level={4} marginBottom={tokens.space.medium}>
            No Summary Available
          </Heading>
          <Text color={tokens.colors.font.secondary} marginBottom={tokens.space.medium}>
            This session hasn't been completed yet or no summary was generated.
          </Text>
          {onViewChat && (
            <Button variation="primary" onClick={onViewChat}>
              View Chat History
            </Button>
          )}
        </View>
      </Card>
    );
  }

  return (
    <View>
      {/* Session Header */}
      <Card padding={tokens.space.large} marginBottom={tokens.space.medium}>
        <Flex justifyContent="space-between" alignItems="flex-start" marginBottom={tokens.space.medium}>
          <View>
            <Flex alignItems="center" gap={tokens.space.small} marginBottom={tokens.space.small}>
              <Heading level={3} margin="none">
                Analysis Summary
              </Heading>
              <Badge variation="success" size="small">
                Session {session.id.slice(-6)}
              </Badge>
            </Flex>
            
            <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
              Started: {formatDate(session.startedAt)}
              {session.endedAt && (
                <> • Ended: {formatDate(session.endedAt)} • Duration: {calculateSessionDuration()}</>
              )}
            </Text>
          </View>

          <Flex gap={tokens.space.small}>
            {onViewChat && (
              <Button variation="link" size="small" onClick={onViewChat}>
                View Chat
              </Button>
            )}
            {onExportSummary && (
              <Button variation="primary" size="small" onClick={onExportSummary}>
                Export Summary
              </Button>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Summary Content */}
      <Flex direction={{ base: 'column', large: 'row' }} gap={tokens.space.large}>
        {/* Main Findings and Recommendations */}
        <View flex="2">
          {/* Key Findings */}
          {summary.findings && summary.findings.length > 0 && (
            <Card padding={tokens.space.large} marginBottom={tokens.space.medium}>
              <Heading level={4} marginBottom={tokens.space.medium}>
                Key Findings
              </Heading>
              
              <View>
                {summary.findings.map((finding, index) => (
                  finding && (
                    <View key={index} marginBottom={tokens.space.medium}>
                      <Flex alignItems="flex-start" gap={tokens.space.small}>
                        <View
                          width="6px"
                          height="6px"
                          backgroundColor={tokens.colors.blue[60]}
                          style={{ 
                            borderRadius: '50%', 
                            marginTop: '8px',
                            flexShrink: 0
                          }}
                        />
                        <Text style={{ whiteSpace: 'pre-wrap' }}>{formatMessageForDisplay(finding)}</Text>
                      </Flex>
                    </View>
                  )
                ))}
              </View>
            </Card>
          )}

          {/* Recommendations */}
          {summary.recommendations && summary.recommendations.length > 0 && (
            <Card padding={tokens.space.large} marginBottom={tokens.space.medium}>
              <Heading level={4} marginBottom={tokens.space.medium}>
                Recommendations
              </Heading>
              
              <View>
                {summary.recommendations.map((recommendation, index) => (
                  recommendation && (
                    <View key={index} marginBottom={tokens.space.medium}>
                      <Flex alignItems="flex-start" gap={tokens.space.small}>
                        <Badge variation="info" size="small" style={{ marginTop: '2px', flexShrink: 0 }}>
                          {index + 1}
                        </Badge>
                        <Text style={{ whiteSpace: 'pre-wrap' }}>{formatMessageForDisplay(recommendation)}</Text>
                      </Flex>
                    </View>
                  )
                ))}
              </View>
            </Card>
          )}
        </View>

        {/* Sidebar with Insights and Highlights */}
        <View flex="1">
          {/* Key Insights */}
          {summary.keyInsights && summary.keyInsights.length > 0 && (
            <Card padding={tokens.space.medium} marginBottom={tokens.space.medium}>
              <Heading level={5} marginBottom={tokens.space.medium}>
                Key Insights
              </Heading>
              
              <View>
                {summary.keyInsights.map((insight, index) => (
                  insight && (
                    <View 
                      key={index} 
                      padding={tokens.space.small}
                      backgroundColor={tokens.colors.background.secondary}
                      marginBottom={tokens.space.small}
                      style={{ 
                        borderRadius: tokens.radii.small.value,
                        borderLeft: `3px solid ${tokens.colors.blue[60]}`
                      }}
                    >
                      <Text fontSize={tokens.fontSizes.small} style={{ whiteSpace: 'pre-wrap' }}>
                        {formatMessageForDisplay(insight)}
                      </Text>
                    </View>
                  )
                ))}
              </View>
            </Card>
          )}

          {/* Conversation Highlights */}
          {summary.conversationHighlights && summary.conversationHighlights.length > 0 && (
            <Card padding={tokens.space.medium}>
              <Heading level={5} marginBottom={tokens.space.medium}>
                Conversation Highlights
              </Heading>
              
              <View>
                {summary.conversationHighlights.map((highlight, index) => (
                  highlight && (
                    <View key={index} marginBottom={tokens.space.small}>
                      <Text 
                        fontSize={tokens.fontSizes.small}
                        color={tokens.colors.font.secondary}
                        style={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}
                      >
                        {formatMessageForDisplay(highlight)}
                      </Text>
                      {index < summary.conversationHighlights!.length - 1 && (
                        <Divider marginTop={tokens.space.small} />
                      )}
                    </View>
                  )
                ))}
              </View>
            </Card>
          )}
        </View>
      </Flex>

      {/* Empty State for Missing Summary Data */}
      {(!summary.findings || summary.findings.length === 0) &&
       (!summary.recommendations || summary.recommendations.length === 0) &&
       (!summary.keyInsights || summary.keyInsights.length === 0) &&
       (!summary.conversationHighlights || summary.conversationHighlights.length === 0) && (
        <Card padding={tokens.space.large}>
          <View textAlign="center">
            <Heading level={4} marginBottom={tokens.space.medium}>
              Summary In Progress
            </Heading>
            <Text color={tokens.colors.font.secondary} marginBottom={tokens.space.medium}>
              The AI is still processing the analysis results. 
              Summary data will appear here once the session is complete.
            </Text>
            {onViewChat && (
              <Button variation="primary" onClick={onViewChat}>
                View Live Chat
              </Button>
            )}
          </View>
        </Card>
      )}
    </View>
  );
};

export default SummaryView;