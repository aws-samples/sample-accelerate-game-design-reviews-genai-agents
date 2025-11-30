import React from 'react';
import {
  View,
  Text,
  Card,
  Badge,
  Button,
  Flex,
  Divider,
  useTheme
} from '@aws-amplify/ui-react';
import { formatMessageForDisplay } from '../utils/messageFormatter';
import type { AgentSession } from '../types/graphql';
import { SessionStatus } from '../types/graphql';

interface SessionSummaryCardProps {
  session: AgentSession;
  onViewSummary?: () => void;
  onViewChat?: () => void;
  onStartFollowUp?: () => void;
  showActions?: boolean;
}

const SessionSummaryCard: React.FC<SessionSummaryCardProps> = ({
  session,
  onViewSummary,
  onViewChat,
  onStartFollowUp,
  showActions = true
}) => {
  const { tokens } = useTheme();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateSessionDuration = () => {
    if (!session.endedAt) return null;
    
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

  const getStatusBadge = () => {
    switch (session.status) {
      case SessionStatus.ACTIVE:
        return <Badge variation="warning" size="small">Active</Badge>;
      case SessionStatus.COMPLETED:
        return <Badge variation="success" size="small">Completed</Badge>;
      default:
        return <Badge variation="info" size="small">{session.status}</Badge>;
    }
  };

  const summary = session.summary;
  const duration = calculateSessionDuration();

  return (
    <Card padding={tokens.space.medium}>
      {/* Session Header */}
      <Flex justifyContent="space-between" alignItems="center" marginBottom={tokens.space.small}>
        <Flex alignItems="center" gap={tokens.space.small}>
          <Text fontWeight="bold">
            Session {session.id.slice(-6)}
          </Text>
          {getStatusBadge()}
        </Flex>
        
        <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.tertiary}>
          {formatDate(session.startedAt)}
          {duration && ` • ${duration}`}
        </Text>
      </Flex>

      {/* Summary Preview */}
      {summary && session.status === SessionStatus.COMPLETED ? (
        <View marginBottom={tokens.space.medium}>
          {/* Quick Stats */}
          <Flex gap={tokens.space.medium} marginBottom={tokens.space.small}>
            {summary.findings && summary.findings.length > 0 && (
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                {summary.findings.length} findings
              </Text>
            )}
            {summary.recommendations && summary.recommendations.length > 0 && (
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                {summary.recommendations.length} recommendations
              </Text>
            )}
            {summary.keyInsights && summary.keyInsights.length > 0 && (
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                {summary.keyInsights.length} insights
              </Text>
            )}
          </Flex>

          {/* Preview Content */}
          {summary.findings && summary.findings.length > 0 && (
            <View marginBottom={tokens.space.small}>
              <Text fontSize={tokens.fontSizes.small} fontWeight="bold" marginBottom={tokens.space.xs}>
                Top Finding:
              </Text>
              <Text 
                fontSize={tokens.fontSizes.small} 
                color={tokens.colors.font.secondary}
                style={{ 
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {formatMessageForDisplay(summary.findings[0] || '')}
              </Text>
            </View>
          )}

          {summary.recommendations && summary.recommendations.length > 0 && (
            <View>
              <Text fontSize={tokens.fontSizes.small} fontWeight="bold" marginBottom={tokens.space.xs}>
                Key Recommendation:
              </Text>
              <Text 
                fontSize={tokens.fontSizes.small} 
                color={tokens.colors.font.secondary}
                style={{ 
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {formatMessageForDisplay(summary.recommendations[0] || '')}
              </Text>
            </View>
          )}
        </View>
      ) : session.status === SessionStatus.ACTIVE ? (
        <View marginBottom={tokens.space.medium}>
          <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary} style={{ fontStyle: 'italic' }}>
            Analysis in progress... Join the chat to participate in real-time.
          </Text>
        </View>
      ) : (
        <View marginBottom={tokens.space.medium}>
          <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary} style={{ fontStyle: 'italic' }}>
            Session completed but no summary available.
          </Text>
        </View>
      )}

      {/* Actions */}
      {showActions && (
        <>
          <Divider marginBottom={tokens.space.small} />
          <Flex gap={tokens.space.small} justifyContent="flex-end">
            {session.status === SessionStatus.ACTIVE ? (
              <>
                {onViewChat && (
                  <Button variation="primary" size="small" onClick={onViewChat}>
                    Join Chat
                  </Button>
                )}
              </>
            ) : (
              <>
                {onViewChat && (
                  <Button variation="link" size="small" onClick={onViewChat}>
                    View Chat
                  </Button>
                )}
                {summary && onViewSummary && (
                  <Button variation="primary" size="small" onClick={onViewSummary}>
                    View Summary
                  </Button>
                )}
                {onStartFollowUp && (
                  <Button variation="link" size="small" onClick={onStartFollowUp}>
                    Follow-up Chat
                  </Button>
                )}
              </>
            )}
          </Flex>
        </>
      )}
    </Card>
  );
};

export default SessionSummaryCard;