import React, { useState, useEffect } from 'react';
import {
  View,
  Flex,
  Text,
  Button,
  Card,
  Alert,
  Loader,
  Badge,
  useTheme
} from '@aws-amplify/ui-react';
import { graphqlClient } from '../services/graphqlClient';
import type { AgentSession, Project, Message } from '../types/graphql';
import { SessionStatus, MessageSender, MessageType } from '../types/graphql';

interface SessionManagerProps {
  project: Project;
  onSessionCreated?: (session: AgentSession) => void;
  onSessionEnded?: (session: AgentSession) => void;
  onSessionSelected?: (session: AgentSession) => void;
}

interface SessionContextData {
  previousSessions: AgentSession[];
  totalMessages: number;
  lastActivity: string | null;
}

const SessionManager: React.FC<SessionManagerProps> = ({
  project,
  onSessionCreated,
  onSessionEnded,
  onSessionSelected
}) => {
  const { tokens } = useTheme();
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionContext, setSessionContext] = useState<SessionContextData | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  // Get active sessions
  const getActiveSessions = () => {
    return project.sessions?.items?.filter(session => 
      session && session.status === SessionStatus.ACTIVE
    ) || [];
  };

  // Get completed sessions
  const getCompletedSessions = () => {
    return project.sessions?.items?.filter(session => 
      session && session.status === SessionStatus.COMPLETED
    ) || [];
  };

  // Load session context for better session management
  useEffect(() => {
    const loadSessionContext = async () => {
      setIsLoadingContext(true);
      try {
        const completedSessions = getCompletedSessions();
        let totalMessages = 0;
        let lastActivity: string | null = null;

        // Calculate total messages and last activity from completed sessions
        for (const session of completedSessions) {
          if (session) {
            const messagesResult = await graphqlClient.listMessagesBySession(session.id);
            const messagesData = 'data' in messagesResult ? messagesResult.data : null;
            
            if (messagesData?.listMessages?.items) {
              totalMessages += messagesData.listMessages.items.length;
              
              // Find the most recent message timestamp
              const sessionMessages = messagesData.listMessages.items.filter((m: any): m is Message => m !== null);
              if (sessionMessages.length > 0) {
                const latestMessage = sessionMessages.reduce((latest: Message, current: Message) => 
                  new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
                );
                
                if (!lastActivity || new Date(latestMessage.timestamp) > new Date(lastActivity)) {
                  lastActivity = latestMessage.timestamp;
                }
              }
            }
          }
        }

        setSessionContext({
          previousSessions: completedSessions.filter((s): s is AgentSession => s !== null),
          totalMessages,
          lastActivity
        });
      } catch (err) {
        console.error('Error loading session context:', err);
      } finally {
        setIsLoadingContext(false);
      }
    };

    if (project.sessions?.items && project.sessions.items.length > 0) {
      loadSessionContext();
    }
  }, [project.sessions]);

  // Start new agent session
  const handleStartSession = async (withContext: boolean = false) => {
    setIsStarting(true);
    setError(null);

    try {
      // Try to use the enhanced startAgentSession operation first
      let result;
      try {
        result = await graphqlClient.startAgentSession(project.id, undefined, undefined, 'INITIAL');
      } catch (agentError) {
        // Fallback to standard createAgentSession
        result = await graphqlClient.createAgentSession({
          projectID: project.id,
          startedAt: new Date().toISOString(),
          status: SessionStatus.ACTIVE,
          sessionType: 'INITIAL'
        });
      }

      const sessionData = 'data' in result ? result.data : null;
      const newSession = sessionData?.createAgentSession || sessionData?.startAgentSession;
      
      if (newSession) {
        
        // Add system message to indicate session start
        let welcomeMessage = 'Session started. I\'m ready to analyze your document and answer questions.';
        
        if (withContext && sessionContext && sessionContext.previousSessions.length > 0) {
          welcomeMessage += ` I have context from ${sessionContext.previousSessions.length} previous session(s) with ${sessionContext.totalMessages} messages.`;
        }

        await graphqlClient.createMessage({
          sessionID: newSession.id,
          sender: MessageSender.AGENT,
          content: welcomeMessage,
          timestamp: new Date().toISOString(),
          type: MessageType.SYSTEM
        });

        onSessionCreated?.(newSession);
      }
    } catch (err) {
      console.error('Error starting session:', err);
      setError('Failed to start analysis session. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  // End active session
  const handleEndSession = async (session: AgentSession) => {
    setIsEnding(true);
    setError(null);

    try {
      // Try to use the enhanced endAgentSession operation first
      let updateResult;
      try {
        updateResult = await graphqlClient.endAgentSession(session.id);
      } catch (agentError) {
        // Fallback to standard updateAgentSession
        updateResult = await graphqlClient.updateAgentSession(session.id, {
          endedAt: new Date().toISOString(),
          status: SessionStatus.COMPLETED
        });
      }

      const updateData = 'data' in updateResult ? updateResult.data : null;
      const endedSession = updateData?.updateAgentSession || updateData?.endAgentSession || {
        ...session,
        endedAt: new Date().toISOString(),
        status: SessionStatus.COMPLETED
      };

      // Add system message to indicate session end
      await graphqlClient.createMessage({
        sessionID: session.id,
        sender: MessageSender.AGENT,
        content: 'Session ended. Thank you for the conversation! You can start a new session anytime.',
        timestamp: new Date().toISOString(),
        type: MessageType.SYSTEM
      });

      onSessionEnded?.(endedSession);
    } catch (err) {
      console.error('Error ending session:', err);
      setError('Failed to end session. Please try again.');
    } finally {
      setIsEnding(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeSessions = getActiveSessions();
  const completedSessions = getCompletedSessions();
  const canStartNewSession = activeSessions.length === 0 && project.document;

  return (
    <View>
      {error && (
        <Alert variation="error" marginBottom={tokens.space.medium}>
          {error}
        </Alert>
      )}

      {/* Session Context Summary */}
      {sessionContext && completedSessions.length > 0 && (
        <Card padding={tokens.space.medium} marginBottom={tokens.space.medium}>
          <Text fontWeight="bold" marginBottom={tokens.space.small}>
            Session History
          </Text>
          
          <Flex direction="column" gap={tokens.space.xs}>
            <Flex justifyContent="space-between">
              <Text fontSize={tokens.fontSizes.small}>Previous Sessions:</Text>
              <Badge variation="info" size="small">
                {sessionContext.previousSessions.length}
              </Badge>
            </Flex>
            
            <Flex justifyContent="space-between">
              <Text fontSize={tokens.fontSizes.small}>Total Messages:</Text>
              <Text fontSize={tokens.fontSizes.small} fontWeight="bold">
                {sessionContext.totalMessages}
              </Text>
            </Flex>
            
            {sessionContext.lastActivity && (
              <Flex justifyContent="space-between">
                <Text fontSize={tokens.fontSizes.small}>Last Activity:</Text>
                <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                  {formatDate(sessionContext.lastActivity)}
                </Text>
              </Flex>
            )}
          </Flex>
        </Card>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <View marginBottom={tokens.space.medium}>
          <Text fontWeight="bold" marginBottom={tokens.space.small}>
            Active Sessions
          </Text>
          
          {activeSessions.map((session) => (
            session && (
              <Card key={session.id} padding={tokens.space.medium} marginBottom={tokens.space.small}>
                <Flex justifyContent="space-between" alignItems="center">
                  <View>
                    <Flex alignItems="center" gap={tokens.space.small} marginBottom={tokens.space.xs}>
                      <Text fontWeight="bold">
                        Session {session.id.slice(-6)}
                      </Text>
                      <Badge variation="success" size="small">
                        Active
                      </Badge>
                    </Flex>
                    <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                      Started: {formatDate(session.startedAt)}
                    </Text>
                  </View>
                  
                  <Flex gap={tokens.space.small}>
                    {onSessionSelected && (
                      <Button
                        variation="primary"
                        size="small"
                        onClick={() => onSessionSelected(session)}
                      >
                        Join Chat
                      </Button>
                    )}
                    <Button
                      variation="destructive"
                      size="small"
                      onClick={() => handleEndSession(session)}
                      isLoading={isEnding}
                      disabled={isEnding}
                    >
                      End Session
                    </Button>
                  </Flex>
                </Flex>
              </Card>
            )
          ))}
        </View>
      )}

      {/* Recent Completed Sessions */}
      {completedSessions.length > 0 && (
        <View marginBottom={tokens.space.medium}>
          <Text fontWeight="bold" marginBottom={tokens.space.small}>
            Recent Sessions
          </Text>
          
          {completedSessions.slice(0, 3).map((session) => (
            session && (
              <Card key={session.id} padding={tokens.space.medium} marginBottom={tokens.space.small}>
                <Flex justifyContent="space-between" alignItems="center">
                  <View>
                    <Flex alignItems="center" gap={tokens.space.small} marginBottom={tokens.space.xs}>
                      <Text fontWeight="bold">
                        Session {session.id.slice(-6)}
                      </Text>
                      <Badge variation="info" size="small">
                        Completed
                      </Badge>
                    </Flex>
                    <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                      {formatDate(session.startedAt)} - {session.endedAt ? formatDate(session.endedAt) : 'Ongoing'}
                    </Text>
                  </View>
                  
                  {onSessionSelected && (
                    <Button
                      variation="link"
                      size="small"
                      onClick={() => onSessionSelected(session)}
                    >
                      View History
                    </Button>
                  )}
                </Flex>
              </Card>
            )
          ))}
          
          {completedSessions.length > 3 && (
            <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary} textAlign="center">
              +{completedSessions.length - 3} more sessions
            </Text>
          )}
        </View>
      )}

      {/* Start New Session */}
      {canStartNewSession && (
        <Card padding={tokens.space.medium}>
          <View textAlign="center">
            <Text fontWeight="bold" marginBottom={tokens.space.small}>
              Start AI Analysis
            </Text>
            <Text 
              fontSize={tokens.fontSizes.small} 
              color={tokens.colors.font.secondary}
              marginBottom={tokens.space.medium}
            >
              Begin a new analysis session to chat with AI agents about your document.
            </Text>
            
            <Flex direction="column" gap={tokens.space.small} alignItems="center">
              <Button
                variation="primary"
                onClick={() => handleStartSession(false)}
                isLoading={isStarting}
                disabled={isStarting}
              >
                {isStarting ? 'Starting Session...' : 'Start Fresh Session'}
              </Button>
              
              {sessionContext && sessionContext.previousSessions.length > 0 && (
                <>
                  <Text fontSize={tokens.fontSizes.xs} color={tokens.colors.font.tertiary}>
                    or
                  </Text>
                  <Button
                    variation="link"
                    size="small"
                    onClick={() => handleStartSession(true)}
                    isLoading={isStarting}
                    disabled={isStarting}
                  >
                    Continue with Previous Context
                  </Button>
                </>
              )}
            </Flex>
          </View>
        </Card>
      )}

      {/* No Document Warning */}
      {!project.document && (
        <Alert variation="warning">
          A document must be uploaded before starting an analysis session.
        </Alert>
      )}

      {/* Multiple Sessions Info */}
      {activeSessions.length > 1 && (
        <Alert variation="info" marginTop={tokens.space.medium}>
          Multiple active sessions detected. Consider ending unused sessions for better performance.
        </Alert>
      )}

      {/* Loading Context */}
      {isLoadingContext && (
        <Flex justifyContent="center" alignItems="center" padding={tokens.space.medium}>
          <Loader size="small" />
          <Text marginLeft={tokens.space.small} fontSize={tokens.fontSizes.small}>
            Loading session context...
          </Text>
        </Flex>
      )}
    </View>
  );
};

export default SessionManager;