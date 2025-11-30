import { useState, useCallback } from 'react';
import { graphqlClient } from '../services/graphqlClient';
import type { Project, AgentSession } from '../types/graphql';
import { SessionStatus, MessageSender, MessageType } from '../types/graphql';

interface UseFollowUpChatOptions {
  project: Project;
  onSessionCreated?: (session: AgentSession) => void;
  onSessionEnded?: (session: AgentSession) => void;
  onError?: (error: string) => void;
}

interface FollowUpChatState {
  isCreating: boolean;
  activeSession: AgentSession | null;
  error: string | null;
}

export const useFollowUpChat = ({
  project,
  onSessionCreated,
  onSessionEnded,
  onError
}: UseFollowUpChatOptions) => {
  const [state, setState] = useState<FollowUpChatState>({
    isCreating: false,
    activeSession: null,
    error: null
  });

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
    if (error && onError) {
      onError(error);
    }
  }, [onError]);

  const generateContextMessage = useCallback((sessions: AgentSession[]): string => {
    if (sessions.length === 0) return '';

    let context = 'I have access to the following previous analysis context:\n\n';
    
    sessions.forEach((session, index) => {
      if (session.summary) {
        context += `**Session ${index + 1}** (${new Date(session.startedAt).toLocaleDateString()}):\n`;
        
        if (session.summary.findings && session.summary.findings.length > 0) {
          context += `- Key findings: ${session.summary.findings.slice(0, 2).join('; ')}\n`;
        }
        
        if (session.summary.recommendations && session.summary.recommendations.length > 0) {
          context += `- Recommendations: ${session.summary.recommendations.slice(0, 2).join('; ')}\n`;
        }
        
        if (session.summary.keyInsights && session.summary.keyInsights.length > 0) {
          context += `- Key insights: ${session.summary.keyInsights.slice(0, 1).join('; ')}\n`;
        }
        
        context += '\n';
      }
    });

    context += 'I can reference this information to provide more contextual and relevant responses. How can I help you with follow-up questions or further analysis?';
    
    return context;
  }, []);

  const createFollowUpSession = useCallback(async (options: {
    contextSessions?: AgentSession[];
    initialQuestion?: string;
    includeContext?: boolean;
  } = {}) => {
    const { contextSessions = [], initialQuestion, includeContext = true } = options;

    try {
      setState(prev => ({ ...prev, isCreating: true, error: null }));

      // Create new agent session
      const sessionResult = await graphqlClient.createAgentSession({
        projectID: project.id,
        startedAt: new Date().toISOString(),
        status: SessionStatus.ACTIVE
      });

      const sessionData = 'data' in sessionResult ? sessionResult.data : null;
      if (!sessionData?.createAgentSession) {
        throw new Error('Failed to create follow-up session');
      }

      const newSession = sessionData.createAgentSession;

      // Send context message if requested and context is available
      if (includeContext && contextSessions.length > 0) {
        const contextMessage = generateContextMessage(contextSessions);
        
        await graphqlClient.createMessage({
          sessionID: newSession.id,
          sender: MessageSender.AGENT,
          content: contextMessage,
          timestamp: new Date().toISOString(),
          type: MessageType.SYSTEM
        });
      }

      // Send initial question if provided
      if (initialQuestion?.trim()) {
        await graphqlClient.createMessage({
          sessionID: newSession.id,
          sender: MessageSender.USER,
          content: initialQuestion.trim(),
          timestamp: new Date().toISOString(),
          type: MessageType.TEXT
        });
      }

      setState(prev => ({ 
        ...prev, 
        activeSession: newSession, 
        isCreating: false 
      }));

      if (onSessionCreated) {
        onSessionCreated(newSession);
      }

      return newSession;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create follow-up session';
      setError(errorMessage);
      setState(prev => ({ ...prev, isCreating: false }));
      throw err;
    }
  }, [project.id, generateContextMessage, onSessionCreated, setError]);

  const endFollowUpSession = useCallback(async (session: AgentSession) => {
    try {
      const updatedSession = await graphqlClient.updateAgentSession(session.id, {
        endedAt: new Date().toISOString(),
        status: SessionStatus.COMPLETED
      });

      setState(prev => ({ ...prev, activeSession: null }));

      const sessionData = 'data' in updatedSession ? updatedSession.data : null;
      const finalSession = sessionData?.updateAgentSession || session;

      if (onSessionEnded) {
        onSessionEnded(finalSession);
      }

      return finalSession;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end session';
      setError(errorMessage);
      throw err;
    }
  }, [onSessionEnded, setError]);

  const createQuickFollowUp = useCallback(async (
    type: 'expand-recommendations' | 'add-information' | 'prioritize-actions' | 'discuss-implementation',
    contextSessions: AgentSession[] = []
  ) => {
    const quickQuestions = {
      'expand-recommendations': 'Can you provide more details about your recommendations and how to implement them?',
      'add-information': 'I have some additional information that might change the analysis. Can we discuss it?',
      'prioritize-actions': 'Can you help me prioritize the recommendations based on impact and feasibility?',
      'discuss-implementation': 'What are the potential risks or challenges with implementing these recommendations?'
    };

    return createFollowUpSession({
      contextSessions,
      initialQuestion: quickQuestions[type],
      includeContext: true
    });
  }, [createFollowUpSession]);

  const getCompletedSessions = useCallback((): AgentSession[] => {
    return (project.sessions?.items?.filter(session => 
      session && 
      session.status === SessionStatus.COMPLETED && 
      session.summary
    ) || []).filter(Boolean) as AgentSession[];
  }, [project.sessions]);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  return {
    // State
    isCreating: state.isCreating,
    activeSession: state.activeSession,
    error: state.error,
    
    // Actions
    createFollowUpSession,
    endFollowUpSession,
    createQuickFollowUp,
    clearError,
    
    // Helpers
    getCompletedSessions,
    generateContextMessage
  };
};

export default useFollowUpChat;