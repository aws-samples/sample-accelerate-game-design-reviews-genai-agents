import React, { useState } from 'react';
import {
  View,
  Heading,
  Text,
  Card,
  Button,
  Flex,
  Alert,
  Badge,
  TextAreaField,
  SelectField,
  useTheme
} from '@aws-amplify/ui-react';
import { ChatInterface } from './';
import { graphqlClient } from '../services/graphqlClient';
import type { Project, AgentSession } from '../types/graphql';
import { SessionStatus } from '../types/graphql';

interface FollowUpChatManagerProps {
  project: Project;
  referenceSession?: AgentSession;
  onSessionCreated?: (session: AgentSession) => void;
  onSessionEnded?: (session: AgentSession) => void;
}

const FollowUpChatManager: React.FC<FollowUpChatManagerProps> = ({
  project,
  referenceSession,
  onSessionCreated,
  onSessionEnded
}) => {
  const { tokens } = useTheme();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [activeFollowUpSession, setActiveFollowUpSession] = useState<AgentSession | null>(null);
  const [initialQuestion, setInitialQuestion] = useState('');
  const [contextType, setContextType] = useState<'all' | 'specific' | 'none'>('all');
  const [error, setError] = useState<string | null>(null);

  // Get completed sessions for context selection
  const completedSessions = project.sessions?.items?.filter(session => 
    session && session.status === SessionStatus.COMPLETED && session.summary
  ) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateContextSummary = (sessions: AgentSession[]): string => {
    if (sessions.length === 0) return '';

    let context = 'Previous analysis context:\n\n';
    
    sessions.forEach((session, index) => {
      if (session.summary) {
        context += `Session ${index + 1} (${formatDate(session.startedAt)}):\n`;
        
        if (session.summary.findings && session.summary.findings.length > 0) {
          context += `Key findings: ${session.summary.findings.slice(0, 2).join('; ')}\n`;
        }
        
        if (session.summary.recommendations && session.summary.recommendations.length > 0) {
          context += `Recommendations: ${session.summary.recommendations.slice(0, 2).join('; ')}\n`;
        }
        
        context += '\n';
      }
    });

    return context;
  };

  const createFollowUpSession = async () => {
    try {
      setIsCreatingSession(true);
      setError(null);

      // Create new agent session using server-side mutation with FOLLOWUP type
      const sessionResult = await graphqlClient.startAgentSession(
        project.id,
        undefined,
        project.memoryEnabled ?? false,
        'FOLLOWUP'
      );

      const sessionData = 'data' in sessionResult ? sessionResult.data : null;
      if (!sessionData?.startAgentSession) {
        throw new Error('Failed to create follow-up session');
      }

      const newSession = sessionData.startAgentSession;
      setActiveFollowUpSession(newSession);

      // Send context message if requested
      if (contextType !== 'none') {
        const contextSessions = contextType === 'all' ? completedSessions.filter(Boolean) : 
                               referenceSession ? [referenceSession] : [];
        
        if (contextSessions.length > 0) {
          const contextSummary = generateContextSummary(contextSessions.filter(Boolean) as AgentSession[]);
          
          // Send context message using server-side mutation
          await graphqlClient.sendMessageToAgent(
            newSession.id,
            `Context from previous sessions: ${contextSummary}\n\nHow can I help you with follow-up questions or further analysis?`
          );
        }
      }

      // Send initial question if provided
      if (initialQuestion.trim()) {
        await graphqlClient.sendMessageToAgent(newSession.id, initialQuestion.trim());
      }

      if (onSessionCreated) {
        onSessionCreated(newSession);
      }

    } catch (err) {
      console.error('Error creating follow-up session:', err);
      setError('Failed to start follow-up conversation. Please try again.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSessionEnd = (session: AgentSession) => {
    setActiveFollowUpSession(null);
    if (onSessionEnded) {
      onSessionEnded(session);
    }
  };

  // If there's an active follow-up session, show the chat interface
  if (activeFollowUpSession) {
    return (
      <View>
        <Flex alignItems="center" gap={tokens.space.small} marginBottom={tokens.space.medium}>
          <Badge variation="warning" size="small">Follow-up Chat</Badge>
          <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
            Session {activeFollowUpSession.id.slice(-6)} • Started {formatDate(activeFollowUpSession.startedAt)}
          </Text>
        </Flex>

        <ChatInterface
          session={activeFollowUpSession}
          onSessionEnd={() => handleSessionEnd(activeFollowUpSession)}
        />
      </View>
    );
  }

  return (
    <View>
      <Card padding={tokens.space.large}>
        <Heading level={4} marginBottom={tokens.space.medium}>
          Start Follow-up Conversation
        </Heading>

        {completedSessions.length === 0 ? (
          <Alert variation="info" marginBottom={tokens.space.medium}>
            No completed analysis sessions available for context. 
            You can still start a new conversation about this project.
          </Alert>
        ) : (
          <Alert variation="info" marginBottom={tokens.space.medium}>
            Start a new conversation with the AI agent. You can reference insights from {completedSessions.length} previous session{completedSessions.length > 1 ? 's' : ''}.
          </Alert>
        )}

        {error && (
          <Alert variation="error" marginBottom={tokens.space.medium}>
            {error}
          </Alert>
        )}

        {/* Context Selection */}
        {completedSessions.length > 0 && (
          <View marginBottom={tokens.space.medium}>
            <SelectField
              label="Include Previous Context"
              value={contextType}
              onChange={(e) => setContextType(e.target.value as 'all' | 'specific' | 'none')}
              marginBottom={tokens.space.small}
            >
              <option value="all">All previous sessions ({completedSessions.length} sessions)</option>
              {referenceSession && (
                <option value="specific">
                  Only Session {referenceSession.id.slice(-6)} ({formatDate(referenceSession.startedAt)})
                </option>
              )}
              <option value="none">No previous context (fresh start)</option>
            </SelectField>
            
            <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
              {contextType === 'all' && 'The agent will have access to findings and recommendations from all previous sessions.'}
              {contextType === 'specific' && referenceSession && 'The agent will have access to the selected session context only.'}
              {contextType === 'none' && 'The agent will start fresh without previous session context.'}
            </Text>
          </View>
        )}

        {/* Initial Question */}
        <View marginBottom={tokens.space.medium}>
          <TextAreaField
            label="Initial Question (Optional)"
            placeholder="What would you like to discuss? e.g., 'Can you elaborate on the first recommendation?' or 'I have new information to add...'"
            value={initialQuestion}
            onChange={(e) => setInitialQuestion(e.target.value)}
            rows={3}
          />
          <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
            You can start the conversation with a specific question or leave blank to begin with a general greeting.
          </Text>
        </View>

        {/* Previous Sessions Preview */}
        {completedSessions.length > 0 && contextType !== 'none' && (
          <View marginBottom={tokens.space.medium}>
            <Text fontWeight="bold" marginBottom={tokens.space.small}>
              Context Preview:
            </Text>
            
            <View
              padding={tokens.space.small}
              backgroundColor={tokens.colors.background.secondary}
              style={{
                borderRadius: tokens.radii.small.value,
                border: `1px solid ${tokens.colors.border.primary.value}`,
                maxHeight: '200px',
                overflowY: 'auto'
              }}
            >
              {(contextType === 'all' ? completedSessions : referenceSession ? [referenceSession] : [])
                .filter(Boolean)
                .slice(0, 3)
                .map((session) => {
                  if (!session || !session.summary) return null;
                  
                  return (
                    <View key={session.id} marginBottom={tokens.space.small}>
                      <Text fontSize={tokens.fontSizes.small} fontWeight="bold">
                        Session {session.id.slice(-6)} ({formatDate(session.startedAt)}):
                      </Text>
                      
                      {session.summary.findings && session.summary.findings.length > 0 && (
                        <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                          • {session.summary.findings[0]}
                        </Text>
                      )}
                      
                      {session.summary.recommendations && session.summary.recommendations.length > 0 && (
                        <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                          • {session.summary.recommendations[0]}
                        </Text>
                      )}
                    </View>
                  );
                })}
              
              {contextType === 'all' && completedSessions.length > 3 && (
                <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.tertiary} style={{ fontStyle: 'italic' }}>
                  ... and {completedSessions.length - 3} more sessions
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <Flex gap={tokens.space.small} justifyContent="flex-end">
          <Button
            variation="primary"
            onClick={createFollowUpSession}
            isLoading={isCreatingSession}
            loadingText="Starting conversation..."
          >
            Start Follow-up Chat
          </Button>
        </Flex>
      </Card>

      {/* Quick Actions for Common Follow-ups */}
      {completedSessions.length > 0 && (
        <Card padding={tokens.space.medium} marginTop={tokens.space.medium}>
          <Heading level={5} marginBottom={tokens.space.medium}>
            Quick Follow-up Topics
          </Heading>
          
          <Flex gap={tokens.space.small} wrap="wrap">
            <Button
              variation="link"
              size="small"
              onClick={() => {
                setInitialQuestion('Can you provide more details about your recommendations?');
                setContextType('all');
              }}
            >
              Expand on Recommendations
            </Button>
            
            <Button
              variation="link"
              size="small"
              onClick={() => {
                setInitialQuestion('I have some additional information that might change the analysis. Can we discuss it?');
                setContextType('all');
              }}
            >
              Add New Information
            </Button>
            
            <Button
              variation="link"
              size="small"
              onClick={() => {
                setInitialQuestion('Can you help me prioritize the recommendations based on impact and feasibility?');
                setContextType('all');
              }}
            >
              Prioritize Actions
            </Button>
            
            <Button
              variation="link"
              size="small"
              onClick={() => {
                setInitialQuestion('What are the potential risks or challenges with implementing these recommendations?');
                setContextType('all');
              }}
            >
              Discuss Implementation
            </Button>
          </Flex>
        </Card>
      )}
    </View>
  );
};

export default FollowUpChatManager;