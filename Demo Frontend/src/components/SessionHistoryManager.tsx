import React, { useState, useMemo } from 'react';
import {
  View,
  Heading,
  Text,
  Card,
  Button,
  Flex,
  Badge,
  useTheme
} from '@aws-amplify/ui-react';
import { SummaryView, SessionSummaryCard } from './';
import type { Project, AgentSession } from '../types/graphql';
import { SessionStatus } from '../types/graphql';

interface SessionHistoryManagerProps {
  project: Project;
  onViewChat?: (session: AgentSession) => void;
  onStartFollowUp?: (session: AgentSession) => void;
}

const SessionHistoryManager: React.FC<SessionHistoryManagerProps> = ({
  project,
  onViewChat,
  onStartFollowUp
}) => {
  const { tokens } = useTheme();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>('overview');

  // Organize sessions chronologically
  const { activeSessions, completedSessions, allSessions } = useMemo(() => {
    const sessions = (project.sessions?.items?.filter(Boolean) || []) as AgentSession[];
    
    const active = sessions.filter(session => session.status === SessionStatus.ACTIVE);
    const completed = sessions.filter(session => session.status === SessionStatus.COMPLETED);
    
    // Sort by start date (newest first)
    const sortedCompleted = completed.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    
    const sortedActive = active.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    const all = [...sortedActive, ...sortedCompleted];

    return {
      activeSessions: sortedActive,
      completedSessions: sortedCompleted,
      allSessions: all
    };
  }, [project.sessions]);

  const selectedSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return allSessions.find(session => session.id === selectedSessionId) || null;
  }, [selectedSessionId, allSessions]);



  const exportSummary = async (session: AgentSession) => {
    if (!session.summary) {
      alert('No summary available for this session');
      return;
    }

    const summaryData = {
      project: {
        name: project.name,
        description: project.description
      },
      session: {
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration: session.endedAt ? 
          Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / (1000 * 60)) + ' minutes' :
          'In progress'
      },
      summary: {
        findings: session.summary.findings || [],
        recommendations: session.summary.recommendations || [],
        keyInsights: session.summary.keyInsights || [],
        conversationHighlights: session.summary.conversationHighlights || []
      },
      exportedAt: new Date().toISOString()
    };

    const jsonString = JSON.stringify(summaryData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/\s+/g, '_')}_session_${session.id.slice(-6)}_summary.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAllSummaries = async () => {
    const sessionsWithSummaries = completedSessions.filter(session => session.summary);
    
    if (sessionsWithSummaries.length === 0) {
      alert('No completed sessions with summaries available');
      return;
    }

    const allSummariesData = {
      project: {
        name: project.name,
        description: project.description || undefined,
        createdAt: project.createdAt
      },
      sessions: sessionsWithSummaries.map(session => ({
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt || undefined,
        duration: session.endedAt ? 
          Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / (1000 * 60)) + ' minutes' :
          'In progress',
        summary: session.summary!
      })),
      exportedAt: new Date().toISOString()
    };

    const jsonString = JSON.stringify(allSummariesData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/\s+/g, '_')}_all_summaries.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleViewSummary = (session: AgentSession) => {
    setSelectedSessionId(session.id);
    setActiveTab('sessions');
  };

  const handleViewChat = (session: AgentSession) => {
    if (onViewChat) {
      onViewChat(session);
    }
  };

  const handleStartFollowUp = (session: AgentSession) => {
    if (onStartFollowUp) {
      onStartFollowUp(session);
    }
  };

  if (allSessions.length === 0) {
    return (
      <Card padding={tokens.space.large}>
        <View textAlign="center">
          <Heading level={4} marginBottom={tokens.space.medium}>
            No Analysis Sessions
          </Heading>
          <Text color={tokens.colors.font.secondary} marginBottom={tokens.space.medium}>
            No AI analysis sessions have been started for this project yet.
          </Text>
          <Button variation="primary">
            Start First Analysis
          </Button>
        </View>
      </Card>
    );
  }

  return (
    <View>
      {/* Header with Export Actions */}
      <Flex justifyContent="space-between" alignItems="center" marginBottom={tokens.space.medium}>
        <View>
          <Heading level={3} marginBottom={tokens.space.xs}>
            Session History
          </Heading>
          <Text color={tokens.colors.font.secondary}>
            {allSessions.length} total sessions • {activeSessions.length} active • {completedSessions.length} completed
          </Text>
        </View>

        <Flex gap={tokens.space.small}>
          {completedSessions.length > 0 && (
            <Button 
              variation="link" 
              size="small"
              onClick={exportAllSummaries}
            >
              Export All Summaries
            </Button>
          )}
        </Flex>
      </Flex>

      {/* Main Content Tabs */}
      <View>
        <Flex marginBottom={tokens.space.medium} style={{ borderBottom: `1px solid ${tokens.colors.border.primary.value}` }}>
          <Button
            variation={activeTab === 'overview' ? 'primary' : 'link'}
            onClick={() => setActiveTab('overview')}
            style={{ borderRadius: '0', borderBottom: activeTab === 'overview' ? '2px solid' : 'none' }}
          >
            Overview
          </Button>
          <Button
            variation={activeTab === 'sessions' ? 'primary' : 'link'}
            onClick={() => setActiveTab('sessions')}
            style={{ borderRadius: '0', borderBottom: activeTab === 'sessions' ? '2px solid' : 'none' }}
          >
            All Sessions
          </Button>
        </Flex>

        {activeTab === 'overview' && (
          <View marginTop={tokens.space.medium}>
            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <View marginBottom={tokens.space.large}>
                <Flex alignItems="center" gap={tokens.space.small} marginBottom={tokens.space.medium}>
                  <Heading level={4}>Active Sessions</Heading>
                  <Badge variation="warning" size="small">{activeSessions.length}</Badge>
                </Flex>
                
                <View style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: tokens.space.medium.value }}>
                  {activeSessions.map((session) => (
                    <SessionSummaryCard
                      key={session.id}
                      session={session}
                      onViewChat={() => handleViewChat(session)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Recent Completed Sessions */}
            {completedSessions.length > 0 && (
              <View>
                <Flex alignItems="center" gap={tokens.space.small} marginBottom={tokens.space.medium}>
                  <Heading level={4}>Recent Sessions</Heading>
                  <Badge variation="success" size="small">{completedSessions.length}</Badge>
                </Flex>
                
                <View style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: tokens.space.medium.value }}>
                  {completedSessions.slice(0, 6).map((session) => (
                    <SessionSummaryCard
                      key={session.id}
                      session={session}
                      onViewSummary={() => handleViewSummary(session)}
                      onViewChat={() => handleViewChat(session)}
                      onStartFollowUp={() => handleStartFollowUp(session)}
                    />
                  ))}
                </View>

                {completedSessions.length > 6 && (
                  <View textAlign="center" marginTop={tokens.space.medium}>
                    <Button 
                      variation="link"
                      onClick={() => setActiveTab('sessions')}
                    >
                      View All {completedSessions.length} Sessions
                    </Button>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'sessions' && (
          <View marginTop={tokens.space.medium}>
            {selectedSession ? (
              <View>
                <Flex alignItems="center" gap={tokens.space.small} marginBottom={tokens.space.medium}>
                  <Button 
                    variation="link" 
                    size="small"
                    onClick={() => setSelectedSessionId(null)}
                  >
                    ← Back to Sessions
                  </Button>
                  <Text color={tokens.colors.font.secondary}>
                    Session {selectedSession.id.slice(-6)}
                  </Text>
                </Flex>

                <SummaryView
                  session={selectedSession}
                  onViewChat={() => handleViewChat(selectedSession)}
                  onExportSummary={() => exportSummary(selectedSession)}
                />
              </View>
            ) : (
              <View>
                {/* Chronological Session List */}
                <View>
                  {allSessions.map((session, index) => {
                    const isFirstOfDay = index === 0 || 
                      new Date(session.startedAt).toDateString() !== 
                      new Date(allSessions[index - 1]?.startedAt || '').toDateString();

                    return (
                      <View key={session.id}>
                        {isFirstOfDay && (
                          <View marginTop={index > 0 ? tokens.space.large : '0'} marginBottom={tokens.space.medium}>
                            <Text fontWeight="bold" color={tokens.colors.font.secondary}>
                              {new Date(session.startedAt).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </Text>
                          </View>
                        )}
                        
                        <View marginBottom={tokens.space.medium}>
                          <SessionSummaryCard
                            session={session}
                            onViewSummary={() => handleViewSummary(session)}
                            onViewChat={() => handleViewChat(session)}
                            onStartFollowUp={() => handleStartFollowUp(session)}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Summary Statistics */}
      {completedSessions.length > 0 && !selectedSession && (
        <Card padding={tokens.space.medium} marginTop={tokens.space.large}>
          <Heading level={5} marginBottom={tokens.space.medium}>
            Project Analytics
          </Heading>
          
          <Flex gap={tokens.space.large} wrap="wrap">
            <View>
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                Total Sessions
              </Text>
              <Text fontSize={tokens.fontSizes.large} fontWeight="bold">
                {allSessions.length}
              </Text>
            </View>
            
            <View>
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                Completed Sessions
              </Text>
              <Text fontSize={tokens.fontSizes.large} fontWeight="bold">
                {completedSessions.length}
              </Text>
            </View>
            
            <View>
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                Total Findings
              </Text>
              <Text fontSize={tokens.fontSizes.large} fontWeight="bold">
                {completedSessions.reduce((total, session) => 
                  total + (session?.summary?.findings?.length || 0), 0
                )}
              </Text>
            </View>
            
            <View>
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                Total Recommendations
              </Text>
              <Text fontSize={tokens.fontSizes.large} fontWeight="bold">
                {completedSessions.reduce((total, session) => 
                  total + (session?.summary?.recommendations?.length || 0), 0
                )}
              </Text>
            </View>
          </Flex>
        </Card>
      )}
    </View>
  );
};

export default SessionHistoryManager;