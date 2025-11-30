import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Flex,
  Text,
  TextField,
  Button,
  Card,
  Badge,
  Alert,
  Loader,
  useTheme
} from '@aws-amplify/ui-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { graphqlClient } from '../services/graphqlClient';
import { useRealTimeMessaging } from '../hooks';
import { formatMessageForDisplay } from '../utils/messageFormatter';
import type { Message, AgentSession } from '../types/graphql';
import { MessageSender, MessageType } from '../types/graphql';
import { MessageMetrics } from './MessageMetrics';
import ChatTabs, { type AgentTopic } from './ChatTabs';

interface ChatInterfaceProps {
  session: AgentSession;
  onSessionEnd?: () => void;
  enabledAgents?: AgentTopic[]; // Which agents are enabled for this project
}

interface MessageBubbleProps {
  message: Message;
  'aria-label'?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, 'aria-label': ariaLabel }) => {
  const { tokens } = useTheme();
  const isUser = message.sender === MessageSender.USER;
  const isSystem = message.type === MessageType.SYSTEM;

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isSystem) {
    return (
      <Flex justifyContent="center" marginBottom={tokens.space.small}>
        <Badge variation="info" size="small">
          {formatMessageForDisplay(message.content)}
        </Badge>
      </Flex>
    );
  }

  return (
    <Flex
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      marginBottom={tokens.space.medium}
      role="article"
      aria-label={ariaLabel}
    >
      <View maxWidth="70%">
        <Card
          padding={tokens.space.medium}
          backgroundColor={
            isUser 
              ? '#007EB9'
              : tokens.colors.background.secondary.value
          }
          style={{
            borderRadius: tokens.radii.medium.value,
            border: isUser 
              ? 'none' 
              : `1px solid ${tokens.colors.border.primary.value}`
          }}
        >
          {isUser ? (
            <Text
              color={tokens.colors.font.inverse.value}
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {formatMessageForDisplay(message.content)}
            </Text>
          ) : (
            <div
              style={{
                color: tokens.colors.font.primary.value,
                wordBreak: 'break-word'
              }}
              className="markdown-content"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {formatMessageForDisplay(message.content)}
              </ReactMarkdown>
            </div>
          )}
          
          <Text
            fontSize={tokens.fontSizes.xs}
            color={
              isUser 
                ? tokens.colors.font.inverse.value
                : tokens.colors.font.tertiary.value
            }
            marginTop={tokens.space.xs}
            textAlign={isUser ? 'right' : 'left'}
          >
            {formatTimestamp(message.timestamp)}
          </Text>
        </Card>
        
        {!isUser && (
          <>
            <Flex alignItems="center" gap={tokens.space.xs} marginTop={tokens.space.xs}>
              <View
                width="6px"
                height="6px"
                backgroundColor="#0099CC"
                style={{ borderRadius: '50%' }}
              />
              <Text fontSize={tokens.fontSizes.xs} color={tokens.colors.font.tertiary}>
                AI Agent
              </Text>
            </Flex>
            
            {/* Display metrics for agent messages */}
            <MessageMetrics
              inputTokens={message.inputTokens || undefined}
              outputTokens={message.outputTokens || undefined}
              invocationDurationMs={message.invocationDurationMs || undefined}
            />
          </>
        )}
      </View>
    </Flex>
  );
};

const TypingIndicator: React.FC = () => {
  const { tokens } = useTheme();
  
  return (
    <Flex justifyContent="flex-start" marginBottom={tokens.space.medium}>
      <View maxWidth="70%">
        <Card
          padding={tokens.space.medium}
          backgroundColor={tokens.colors.background.secondary.value}
          style={{
            borderRadius: tokens.radii.medium.value,
            border: `1px solid ${tokens.colors.border.primary.value}`
          }}
        >
          <Flex alignItems="center" gap={tokens.space.small}>
            <Loader size="small" />
            <Text color={tokens.colors.font.secondary}>
              AI Agent is typing...
            </Text>
          </Flex>
        </Card>
      </View>
    </Flex>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  session, 
  onSessionEnd,
  enabledAgents: enabledAgentsProp
}) => {
  const { tokens } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  
  // Get enabled agents from props or default to all
  const enabledAgents = enabledAgentsProp && enabledAgentsProp.length > 0 
    ? enabledAgentsProp 
    : (['gameplay', 'lore', 'strategic', 'analyst'] as AgentTopic[]);
  
  // Tab state for agent selection - default to first enabled agent
  const [activeTab, setActiveTab] = useState<AgentTopic>(enabledAgents[0] || 'gameplay');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textFieldRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Handle real-time message reception
  const handleMessageReceived = useCallback((message: Message) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some((msg: Message) => msg.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });

    // Handle typing indicator
    if (message.sender === MessageSender.AGENT) {
      setIsTyping(false);
    }
  }, []);

  // Set up real-time messaging
  const { isConnected, reconnect } = useRealTimeMessaging({
    session,
    onMessageReceived: handleMessageReceived
  });

  // Update connection status
  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Load messages function
  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await graphqlClient.listMessagesBySession(session.id);
      const messagesData = 'data' in result ? result.data : null;
      
      if (messagesData?.listMessages?.items) {
        const sortedMessages = messagesData.listMessages.items
          .filter((msg: any): msg is Message => msg !== null)
          .sort((a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        setMessages(sortedMessages);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  }, [session.id]);

  // Load existing messages on mount
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Filter messages by active tab
  const filteredMessages = messages.filter(msg => 
    msg.agentTopic === activeTab || msg.type === MessageType.SYSTEM
  );

  // Get empty state message for current tab
  const getEmptyStateMessage = (tab: AgentTopic): string => {
    const messages: Record<AgentTopic, string> = {
      gameplay: "Start a conversation with the Gameplay agent to discuss game mechanics, balance, and player experience!",
      lore: "Ask the Lore agent about story, world-building, characters, and narrative elements!",
      strategic: "Get insights from the Strategic agent about planning, tactics, and high-level strategy!",
      analyst: "Request detailed analysis from the Analyst agent for comprehensive document review!"
    };
    return messages[tab];
  };

  // Handle connection status changes
  const handleReconnect = useCallback(() => {
    setConnectionStatus('reconnecting');
    reconnect();
  }, [reconnect]);

  // Send message handler
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || isProcessing) return;

    const messageContent = newMessage.trim();
    const sendTimestamp = new Date().toISOString();
    setNewMessage('');
    setIsSending(true);
    setIsProcessing(true);
    setError(null);

    // Create optimistic user message immediately
    const optimisticUserMessage: Message = {
      id: `temp-${Date.now()}`,
      sessionID: session.id,
      sender: MessageSender.USER,
      content: messageContent,
      timestamp: sendTimestamp,
      type: MessageType.TEXT,
      agentTopic: activeTab,
    };

    // Add user message to UI immediately (optimistic update)
    setMessages(prev => [...prev, optimisticUserMessage]);
    
    // Show typing indicator for agent response
    setIsTyping(true);

    try {
      // Get memory setting from project (default to false if not set)
      const memoryEnabled = session.project?.memoryEnabled ?? false;
      
      // Send message to agent - returns immediately with success status
      const result = await graphqlClient.sendMessageToAgent(
        session.id, 
        messageContent,
        activeTab,
        memoryEnabled
      );

      const resultData = 'data' in result ? result.data : null;
      if (resultData?.sendMessageToAgent?.success) {
        console.log('Message sent successfully, user message ID:', resultData.sendMessageToAgent.userMessageId);
        // Messages will arrive via subscription
      }

    } catch (err: any) {
      // Handle errors
      const errorString = JSON.stringify(err).toLowerCase();
      const isTimeout = errorString.includes('timeout') || 
                       errorString.includes('timed out');
      
      if (isTimeout) {
        console.log('Timeout occurred, relying on subscriptions');
        // Keep optimistic message and typing indicator
      } else {
        // Real error
        console.error('Error sending message:', err);
        setMessages(prev => prev.filter((m: Message) => m.id !== optimisticUserMessage.id));
        setError('Failed to send message. Please try again.');
        setNewMessage(messageContent);
        setIsTyping(false);
      }
    } finally {
      setIsSending(false);
      setIsProcessing(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Focus text field when component mounts
  useEffect(() => {
    textFieldRef.current?.focus();
  }, []);

  // Announce new messages to screen readers
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.sender === 'AGENT') {
        // Announce agent messages to screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.textContent = `AI Agent: ${formatMessageForDisplay(latestMessage.content)}`;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
          document.body.removeChild(announcement);
        }, 1000);
      }
    }
  }, [messages]);

  if (isLoading) {
    return (
      <View textAlign="center" padding={tokens.space.large}>
        <Loader size="large" />
        <Text marginTop={tokens.space.medium}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <View 
      height="600px" 
      style={{ display: 'flex', flexDirection: 'column' }}
      role="region"
      aria-label="Chat interface"
    >
      {/* Chat Header */}
      <Card padding={tokens.space.medium} marginBottom={tokens.space.small}>
        <Flex justifyContent="space-between" alignItems="center">
          <View>
            <Text fontWeight="bold" id="chat-session-title">
              Chat Session {session.id.slice(-6)}
            </Text>
            <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
              Started: {new Date(session.startedAt).toLocaleString()}
            </Text>
          </View>
          
          <Flex alignItems="center" gap={tokens.space.small}>
            <Badge variation="success" size="small" aria-label="Session status: Active">
              Active
            </Badge>
            
            {/* Connection Status */}
            <Flex alignItems="center" gap={tokens.space.xs}>
              <View
                width="6px"
                height="6px"
                backgroundColor={
                  connectionStatus === 'connected' 
                    ? '#22c55e'
                    : connectionStatus === 'reconnecting'
                    ? '#eab308'
                    : '#ef4444'
                }
                style={{ borderRadius: '50%' }}
                aria-hidden="true"
              />
              <Text 
                fontSize={tokens.fontSizes.xs} 
                color={tokens.colors.font.tertiary}
                aria-label={`Connection status: ${connectionStatus}`}
              >
                {connectionStatus === 'connected' && 'Live'}
                {connectionStatus === 'reconnecting' && 'Reconnecting...'}
                {connectionStatus === 'disconnected' && (
                  <Button 
                    variation="link" 
                    size="small" 
                    onClick={handleReconnect}
                    style={{ padding: 0, minHeight: 'auto' }}
                    aria-label="Reconnect to chat"
                  >
                    Reconnect
                  </Button>
                )}
              </Text>
            </Flex>
            
            {onSessionEnd && (
              <Button 
                variation="link" 
                size="small"
                onClick={onSessionEnd}
                aria-label="End chat session"
              >
                End Session
              </Button>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Chat Tabs */}
      <Card padding={0} marginBottom={tokens.space.small}>
        <ChatTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          disabled={isProcessing || isSending}
          enabledAgents={enabledAgents}
        />
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variation="error" marginBottom={tokens.space.medium}>
          {error}
        </Alert>
      )}

      {/* Messages Container */}
      <View
        ref={messagesContainerRef}
        flex="1"
        padding={tokens.space.medium}
        role="tabpanel"
        id={`${activeTab}-panel`}
        aria-labelledby={`${activeTab}-tab`}
        aria-live="polite"
        aria-label={`${activeTab} agent messages`}
        style={{
          overflowY: 'auto',
          backgroundColor: tokens.colors.background.primary.value,
          border: `1px solid ${tokens.colors.border.primary.value}`,
          borderRadius: tokens.radii.medium.value
        }}
      >
        {filteredMessages.length === 0 ? (
          <View textAlign="center" padding={tokens.space.large}>
            <Text color={tokens.colors.font.secondary} marginBottom={tokens.space.small}>
              {getEmptyStateMessage(activeTab)}
            </Text>
            <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.tertiary}>
              Type a message below to get started.
            </Text>
          </View>
        ) : (
          <>
            {filteredMessages.map((message, index) => (
              <MessageBubble 
                key={message.id} 
                message={message}
                aria-label={`Message ${index + 1} from ${message.sender === 'USER' ? 'you' : 'AI agent'}`}
              />
            ))}
            
            {isTyping && (
              <div aria-live="polite" aria-label="AI agent is typing">
                <TypingIndicator />
              </div>
            )}
            
            <div ref={messagesEndRef} aria-hidden="true" />
          </>
        )}
      </View>

      {/* Message Input */}
      <View marginTop={tokens.space.medium} role="region" aria-label="Message input">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
          <Flex gap={tokens.space.small}>
            <TextField
              ref={textFieldRef}
              flex="1"
              label="Message"
              labelHidden
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending}
              maxLength={1000}
              aria-describedby="message-help"
              aria-label="Type your message to the AI agent"
            />
            <Button
              type="submit"
              variation="primary"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              isLoading={isSending}
              aria-label={isSending ? 'Sending message...' : 'Send message'}
            >
              Send
            </Button>
          </Flex>
        </form>
        
        <Text 
          id="message-help"
          fontSize={tokens.fontSizes.xs} 
          color={tokens.colors.font.tertiary}
          marginTop={tokens.space.xs}
        >
          Press Enter to send, Shift+Enter for new line. {1000 - newMessage.length} characters remaining.
        </Text>
      </View>
    </View>
  );
};

export default ChatInterface;