import { useEffect, useRef, useCallback } from 'react';
import { graphqlClient } from '../services/graphqlClient';
import type { Message, AgentSession } from '../types/graphql';

interface UseRealTimeMessagingProps {
  session: AgentSession | null;
  onMessageReceived: (message: Message) => void;
  onSessionStatusChanged?: (session: AgentSession) => void;
}

interface UseRealTimeMessagingReturn {
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
}

export const useRealTimeMessaging = ({
  session,
  onMessageReceived,
  onSessionStatusChanged
}: UseRealTimeMessagingProps): UseRealTimeMessagingReturn => {
  const messageUnsubscribeRef = useRef<(() => void) | null>(null);
  const sessionUnsubscribeRef = useRef<(() => void) | null>(null);
  const isConnectedRef = useRef(false);

  // Clean up subscriptions
  const disconnect = useCallback(() => {
    if (messageUnsubscribeRef.current) {
      messageUnsubscribeRef.current();
      messageUnsubscribeRef.current = null;
    }
    
    if (sessionUnsubscribeRef.current) {
      sessionUnsubscribeRef.current();
      sessionUnsubscribeRef.current = null;
    }
    
    isConnectedRef.current = false;
  }, []);

  // Set up subscriptions
  const connect = useCallback(() => {
    if (!session) return;

    disconnect(); // Clean up existing subscriptions

    try {
      // Subscribe to messages
      messageUnsubscribeRef.current = graphqlClient.subscribeToMessages(
        session.id,
        (message: Message) => {
          onMessageReceived(message);
        }
      );

      // Subscribe to session status changes
      if (onSessionStatusChanged) {
        sessionUnsubscribeRef.current = graphqlClient.subscribeToSessionStatus(
          session.id,
          (updatedSession: AgentSession) => {
            onSessionStatusChanged(updatedSession);
          }
        );
      }

      isConnectedRef.current = true;
    } catch (error) {
      console.error('Failed to establish real-time connection:', error);
      isConnectedRef.current = false;
    }
  }, [session, onMessageReceived, onSessionStatusChanged, disconnect]);

  // Reconnect function
  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  // Set up subscriptions when session changes
  useEffect(() => {
    if (session) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return disconnect;
  }, [session, connect, disconnect]);

  // Handle page visibility changes to reconnect when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session && !isConnectedRef.current) {
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, reconnect]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (session) {
        reconnect();
      }
    };

    const handleOffline = () => {
      isConnectedRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [session, reconnect]);

  return {
    isConnected: isConnectedRef.current,
    reconnect,
    disconnect
  };
};

export default useRealTimeMessaging;