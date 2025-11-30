import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  View,
  Heading,
  Text,
  Card,
  Button,
  Badge,
  Flex,
  Grid,
  Alert,
  Loader,
  useTheme
} from '@aws-amplify/ui-react';
import { graphqlClient } from '../services/graphqlClient';
import { 
  ChatInterface, 
  SessionManager, 
  SummaryView, 
  SessionHistoryManager, 
  FollowUpChatManager,
  DeleteProjectDialog
} from '../components';
import type { Project, AgentSession } from '../types/graphql';
import { ProjectStatus, SessionStatus } from '../types/graphql';

interface ProjectDetailPageProps {}

const ProjectDetailPage: React.FC<ProjectDetailPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tokens } = useTheme();
  
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSession, setActiveSession] = useState<AgentSession | null>(null);
  const [selectedSessionForSummary, setSelectedSessionForSummary] = useState<AgentSession | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  const TabButton: React.FC<{ value: string; children: React.ReactNode; isActive: boolean }> = ({ value, children, isActive }) => (
    <Button
      variation={isActive ? 'primary' : 'link'}
      onClick={() => setActiveTab(value)}
      style={{ borderRadius: '0', borderBottom: isActive ? '2px solid' : 'none' }}
    >
      {children}
    </Button>
  );

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      if (!id) {
        setError('Project ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const result = await graphqlClient.getProject(id);
        const projectData = 'data' in result ? result.data : null;
        
        if (projectData?.getProject) {
          setProject(projectData.getProject);
        } else {
          setError('Project not found');
        }
      } catch (err) {
        console.error('Error loading project:', err);
        setError('Failed to load project details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [id]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case ProjectStatus.COMPLETED:
        return 'success';
      case ProjectStatus.IN_PROGRESS:
        return 'warning';
      case ProjectStatus.SUBMITTED:
        return 'info';
      default:
        return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActiveSessions = () => {
    return project?.sessions?.items?.filter(session => 
      session && 
      session.status === SessionStatus.ACTIVE &&
      session.sessionType === 'INITIAL'
    ) || [];
  };

  const getCompletedSessions = () => {
    return project?.sessions?.items?.filter(session => 
      session && 
      session.status === SessionStatus.COMPLETED &&
      session.sessionType === 'INITIAL'
    ) || [];
  };

  // Session management handlers
  const handleSessionCreated = (session: AgentSession) => {
    setActiveSession(session);
    setActiveTab('chat');
    
    // Update project with new session
    if (project) {
      const updatedProject = {
        ...project,
        sessions: {
          ...project.sessions,
          items: [...(project.sessions?.items || []), session]
        }
      };
      setProject(updatedProject);
    }
  };

  const handleSessionEnded = async (session: AgentSession) => {
    if (!project) return;
    
    try {
      // Call the endAgentSession mutation to end the session and generate summary
      const result = await graphqlClient.endAgentSession(session.id);
      const endData = 'data' in result ? result.data : null;
      const endedSession = endData?.endAgentSession;
      
      if (endedSession) {
        // Update project status to COMPLETED
        try {
          await graphqlClient.updateProject(project.id, {
            status: ProjectStatus.COMPLETED
          });
        } catch (error) {
          console.error('Failed to update project status:', error);
        }
        
        // Update local state
        const updatedSessions = project.sessions?.items?.map(s => 
          s?.id === session.id ? endedSession : s
        ) || [];
        
        const updatedProject = {
          ...project,
          status: ProjectStatus.COMPLETED,
          sessions: {
            ...project.sessions,
            items: updatedSessions
          }
        };
        setProject(updatedProject);
      }
      
      setActiveSession(null);
    } catch (error) {
      console.error('Error ending session:', error);
      // Still clear the active session even if the API call fails
      setActiveSession(null);
    }
  };

  const handleJoinSession = (session: AgentSession) => {
    setActiveSession(session);
    setActiveTab('chat');
  };

  const handleViewSummary = (session: AgentSession) => {
    setSelectedSessionForSummary(session);
    setActiveTab('summary');
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    
    setIsDeleting(true);
    try {
      await graphqlClient.deleteProjectCascade(project.id);
      navigate('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('Failed to delete project. Please try again.');
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartFollowUp = () => {
    setActiveTab('followup');
  };

  const handleStartAnalysis = async () => {
    if (!project) return;

    try {
      setError(null);
      
      // Start agent session
      const sessionResult = await graphqlClient.startAgentSession(project.id);
      const sessionData = 'data' in sessionResult ? sessionResult.data : null;
      
      if (sessionData?.startAgentSession) {
        const newSession = sessionData.startAgentSession;
        setActiveSession(newSession);
        
        // Note: Project status will be automatically updated to IN_PROGRESS 
        // by the Lambda function after the agent completes initial analysis
        
        // Update local project state
        setProject({
          ...project,
          sessions: {
            items: [...(project.sessions?.items || []), newSession]
          }
        });
        
        // Switch to chat tab
        setActiveTab('chat');
      }
    } catch (err) {
      console.error('Error starting analysis:', err);
      setError('Failed to start analysis session. Please try again.');
    }
  };

  const handleFollowUpSessionCreated = (session: AgentSession) => {
    setActiveSession(session);
    setActiveTab('chat');
    
    // Update project with new session
    if (project) {
      const updatedProject = {
        ...project,
        sessions: {
          ...project.sessions,
          items: [...(project.sessions?.items || []), session]
        }
      };
      setProject(updatedProject);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View textAlign="center" padding={tokens.space.xxl}>
        <Loader size="large" />
        <Text marginTop={tokens.space.medium}>Loading project details...</Text>
      </View>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <View>
        <Alert variation="error" marginBottom={tokens.space.medium}>
          {error || 'Project not found'}
        </Alert>
        <Button onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </View>
    );
  }

  const activeSessions = getActiveSessions();
  const completedSessions = getCompletedSessions();

  return (
    <View>
      {/* Header Section */}
      <Flex justifyContent="space-between" alignItems="flex-start" marginBottom={tokens.space.large}>
        <View flex="1">
          <Flex alignItems="center" gap={tokens.space.medium} marginBottom={tokens.space.small}>
            <Heading level={2} margin="none">
              {project.name}
            </Heading>
            <Badge variation={getStatusColor(project.status)} size="large">
              {project.status.toLowerCase()}
            </Badge>
          </Flex>
          
          {project.description && (
            <Text color={tokens.colors.font.secondary} marginBottom={tokens.space.small}>
              {project.description}
            </Text>
          )}
          
          <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.tertiary}>
            Created: {formatDate(project.createdAt)} • 
            Last updated: {formatDate(project.updatedAt)}
          </Text>
        </View>

        <Flex gap={tokens.space.small}>
          <Link to="/projects" style={{ textDecoration: 'none' }}>
            <Button variation="link">
              ← Back to Projects
            </Button>
          </Link>
          
          {project.status === ProjectStatus.COMPLETED && (
            <Button variation="primary" onClick={() => handleStartFollowUp()}>
              Start New Chat
            </Button>
          )}
          
          <Button 
            variation="destructive" 
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete Project
          </Button>
        </Flex>
      </Flex>

      {/* Main Content Tabs */}
      <View>
        <Flex marginBottom={tokens.space.medium} style={{ borderBottom: `1px solid ${tokens.colors.border.primary.value}` }}>
          <TabButton value="overview" isActive={activeTab === 'overview'}>
            Overview
          </TabButton>
          <TabButton value="sessions" isActive={activeTab === 'sessions'}>
            Sessions
          </TabButton>
          <TabButton value="chat" isActive={activeTab === 'chat'}>
            Chat {activeSessions.length > 0 && <Badge variation="success" size="small" style={{ marginLeft: '4px' }}>Active</Badge>}
          </TabButton>
          <TabButton value="summary" isActive={activeTab === 'summary'}>
            Summary
          </TabButton>
          <TabButton value="history" isActive={activeTab === 'history'}>
            History
          </TabButton>
          <TabButton value="followup" isActive={activeTab === 'followup'}>
            Follow-up Chat
          </TabButton>
        </Flex>

        {activeTab === 'overview' && (
          <Grid templateColumns={{ base: '1fr', large: '2fr 1fr' }} gap={tokens.space.large}>
            {/* Document Content */}
            <View>
              <Card padding={tokens.space.large}>
                <Heading level={4} marginBottom={tokens.space.medium}>
                  Document Content
                </Heading>
                
                {project.document ? (
                  <View>
                    <Flex justifyContent="space-between" alignItems="center" marginBottom={tokens.space.medium}>
                      <Text fontWeight="bold">{project.document.title}</Text>
                      <Badge variation="info" size="small">
                        {project.document.type.toLowerCase()}
                      </Badge>
                    </Flex>
                    
                    <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.tertiary} marginBottom={tokens.space.medium}>
                      Uploaded: {formatDate(project.document.uploadedAt)}
                    </Text>
                    
                    <View
                      padding={tokens.space.medium}
                      backgroundColor={tokens.colors.background.secondary}
                      style={{
                        borderRadius: tokens.radii.medium.value,
                        border: `1px solid ${tokens.colors.border.primary.value}`,
                        maxHeight: '400px',
                        overflowY: 'auto'
                      }}
                    >
                      <Text
                        fontSize={tokens.fontSizes.small}
                        style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {project.document.content}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Alert variation="warning">
                    No document content available for this project.
                  </Alert>
                )}
              </Card>
            </View>

            {/* Project Information Sidebar */}
            <View>
              {/* Project Status Card */}
              <Card padding={tokens.space.medium} marginBottom={tokens.space.medium}>
                <Heading level={5} marginBottom={tokens.space.medium}>
                  Project Status
                </Heading>
                
                <Flex direction="column" gap={tokens.space.small}>
                  <Flex justifyContent="space-between">
                    <Text fontSize={tokens.fontSizes.small}>Status:</Text>
                    <Badge variation={getStatusColor(project.status)} size="small">
                      {project.status.toLowerCase()}
                    </Badge>
                  </Flex>
                  
                  <Flex justifyContent="space-between">
                    <Text fontSize={tokens.fontSizes.small}>Active Sessions:</Text>
                    <Text fontSize={tokens.fontSizes.small} fontWeight="bold">
                      {activeSessions.length}
                    </Text>
                  </Flex>
                  
                  <Flex justifyContent="space-between">
                    <Text fontSize={tokens.fontSizes.small}>Completed Sessions:</Text>
                    <Text fontSize={tokens.fontSizes.small} fontWeight="bold">
                      {completedSessions.length}
                    </Text>
                  </Flex>
                </Flex>

                {project.status === ProjectStatus.IN_PROGRESS && (
                  <Alert variation="info" marginTop={tokens.space.medium}>
                    Chat is ready! Start a session to interact with AI agents about your document.
                  </Alert>
                )}

                {project.status === ProjectStatus.SUBMITTED && (
                  <Alert variation="warning" marginTop={tokens.space.medium}>
                    Project submitted. Start a chat session to begin the analysis.
                  </Alert>
                )}
              </Card>

              {/* Collaborators Card */}
              {project.collaborators && project.collaborators.length > 0 && (
                <Card padding={tokens.space.medium} marginBottom={tokens.space.medium}>
                  <Heading level={5} marginBottom={tokens.space.medium}>
                    Collaborators
                  </Heading>
                  
                  <Flex direction="column" gap={tokens.space.xs}>
                    {project.collaborators.map((email, index) => (
                      email && (
                        <Text key={index} fontSize={tokens.fontSizes.small}>
                          {email}
                        </Text>
                      )
                    ))}
                  </Flex>
                </Card>
              )}

              {/* Quick Actions Card */}
              <Card padding={tokens.space.medium}>
                <Heading level={5} marginBottom={tokens.space.medium}>
                  Quick Actions
                </Heading>
                
                <Flex direction="column" gap={tokens.space.small}>
                  {activeSessions.length > 0 && (
                    <Button 
                      variation="primary" 
                      size="small"
                      onClick={() => activeSessions[0] && handleJoinSession(activeSessions[0])}
                    >
                      Join Active Chat
                    </Button>
                  )}
                  
                  {project.status === ProjectStatus.COMPLETED && (
                    <Button 
                      variation="primary" 
                      size="small"
                      onClick={() => handleStartFollowUp()}
                    >
                      Start Follow-up Chat
                    </Button>
                  )}
                  
                  <Button variation="link" size="small">
                    Download Summary
                  </Button>
                  
                  <Button variation="link" size="small">
                    Share Project
                  </Button>
                </Flex>
              </Card>
            </View>
          </Grid>
        )}

        {activeTab === 'sessions' && (
          <View>
            <Heading level={4} marginBottom={tokens.space.medium}>
              Analysis Sessions
            </Heading>

            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <View marginBottom={tokens.space.large}>
                <Heading level={5} marginBottom={tokens.space.medium}>
                  Active Sessions
                </Heading>
                
                <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={tokens.space.medium}>
                  {activeSessions.map((session) => (
                    session && (
                      <Card key={session.id} padding={tokens.space.medium}>
                        <Flex justifyContent="space-between" alignItems="center" marginBottom={tokens.space.small}>
                          <Text fontWeight="bold">Session {session.id.slice(-6)}</Text>
                          <Badge variation="warning" size="small">active</Badge>
                        </Flex>
                        
                        <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary} marginBottom={tokens.space.medium}>
                          Started: {formatDate(session.startedAt)}
                        </Text>
                        
                        <Button 
                          variation="primary" 
                          size="small"
                          onClick={() => handleJoinSession(session)}
                        >
                          Join Chat
                        </Button>
                      </Card>
                    )
                  ))}
                </Grid>
              </View>
            )}

            {/* Completed Sessions */}
            {completedSessions.length > 0 && (
              <View>
                <Heading level={5} marginBottom={tokens.space.medium}>
                  Completed Sessions
                </Heading>
                
                <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={tokens.space.medium}>
                  {completedSessions.map((session) => (
                    session && (
                      <Card key={session.id} padding={tokens.space.medium}>
                        <Flex justifyContent="space-between" alignItems="center" marginBottom={tokens.space.small}>
                          <Text fontWeight="bold">Session {session.id.slice(-6)}</Text>
                          <Badge variation="success" size="small">completed</Badge>
                        </Flex>
                        
                        <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary} marginBottom={tokens.space.small}>
                          Started: {formatDate(session.startedAt)}
                        </Text>
                        
                        {session.endedAt && (
                          <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary} marginBottom={tokens.space.medium}>
                            Ended: {formatDate(session.endedAt)}
                          </Text>
                        )}
                        
                        <Flex gap={tokens.space.small}>
                          <Button 
                            variation="primary" 
                            size="small"
                            onClick={() => handleViewSummary(session)}
                          >
                            View Summary
                          </Button>
                          <Button 
                            variation="link" 
                            size="small"
                            onClick={() => handleJoinSession(session)}
                          >
                            View Chat
                          </Button>
                        </Flex>
                      </Card>
                    )
                  ))}
                </Grid>
              </View>
            )}

            {/* No Sessions State */}
            {activeSessions.length === 0 && completedSessions.length === 0 && (
              <Card padding={tokens.space.large} textAlign="center">
                <Heading level={5} marginBottom={tokens.space.medium}>
                  No Analysis Sessions
                </Heading>
                <Text color={tokens.colors.font.secondary} marginBottom={tokens.space.medium}>
                  No AI analysis sessions have been started for this project yet.
                </Text>
                <Button variation="primary" onClick={handleStartAnalysis}>
                  Start Analysis
                </Button>
              </Card>
            )}
          </View>
        )}

        {activeTab === 'chat' && (
          <View>
            <Heading level={4} marginBottom={tokens.space.medium}>
              AI Chat Session
            </Heading>

            {activeSession ? (
              <ChatInterface
                session={activeSession}
                onSessionEnd={() => handleSessionEnded(activeSession)}
                enabledAgents={project.selectedAgents?.filter((a): a is 'gameplay' | 'lore' | 'strategic' | 'analyst' => 
                  a !== null && ['gameplay', 'lore', 'strategic', 'analyst'].includes(a)
                ) as ('gameplay' | 'lore' | 'strategic' | 'analyst')[]}
              />
            ) : activeSessions.length > 0 ? (
              <View>
                <Alert variation="info" marginBottom={tokens.space.medium}>
                  Select an active session to join the chat.
                </Alert>
                
                <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={tokens.space.medium}>
                  {activeSessions.map((session) => (
                    session && (
                      <Card key={session.id} padding={tokens.space.medium}>
                        <Flex justifyContent="space-between" alignItems="center" marginBottom={tokens.space.small}>
                          <Text fontWeight="bold">Session {session.id.slice(-6)}</Text>
                          <Badge variation="success" size="small">active</Badge>
                        </Flex>
                        
                        <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary} marginBottom={tokens.space.medium}>
                          Started: {formatDate(session.startedAt)}
                        </Text>
                        
                        <Button 
                          variation="primary" 
                          size="small"
                          onClick={() => handleJoinSession(session)}
                        >
                          Join Chat
                        </Button>
                      </Card>
                    )
                  ))}
                </Grid>
              </View>
            ) : (
              <SessionManager
                project={project}
                onSessionCreated={handleSessionCreated}
                onSessionEnded={handleSessionEnded}
                onSessionSelected={handleJoinSession}
              />
            )}
          </View>
        )}

        {activeTab === 'summary' && (
          <View>
            {selectedSessionForSummary ? (
              <View>
                <Flex alignItems="center" gap={tokens.space.small} marginBottom={tokens.space.medium}>
                  <Button 
                    variation="link" 
                    size="small"
                    onClick={() => setSelectedSessionForSummary(null)}
                  >
                    ← Back to Sessions
                  </Button>
                </Flex>

                <SummaryView
                  session={selectedSessionForSummary}
                  onViewChat={() => handleJoinSession(selectedSessionForSummary)}
                />
              </View>
            ) : (
              <View>
                <Heading level={4} marginBottom={tokens.space.medium}>
                  Session Summaries
                </Heading>
                
                {completedSessions.length > 0 ? (
                  <View style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: tokens.space.medium.value }}>
                    {completedSessions.map((session) => (
                      session && (
                        <Card key={session.id} padding={tokens.space.medium}>
                          <Flex justifyContent="space-between" alignItems="center" marginBottom={tokens.space.small}>
                            <Text fontWeight="bold">Session {session.id.slice(-6)}</Text>
                            <Badge variation="success" size="small">completed</Badge>
                          </Flex>
                          
                          <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary} marginBottom={tokens.space.medium}>
                            {formatDate(session.startedAt)}
                          </Text>
                          
                          <Flex gap={tokens.space.small}>
                            <Button 
                              variation="primary" 
                              size="small"
                              onClick={() => handleViewSummary(session)}
                            >
                              View Summary
                            </Button>
                            <Button 
                              variation="link" 
                              size="small"
                              onClick={() => handleStartFollowUp()}
                            >
                              Follow-up Chat
                            </Button>
                          </Flex>
                        </Card>
                      )
                    ))}
                  </View>
                ) : (
                  <Card padding={tokens.space.large} textAlign="center">
                    <Heading level={5} marginBottom={tokens.space.medium}>
                      No Summaries Available
                    </Heading>
                    <Text color={tokens.colors.font.secondary}>
                      Complete an analysis session to view summaries here.
                    </Text>
                  </Card>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <SessionHistoryManager
            project={project}
            onViewChat={handleJoinSession}
            onStartFollowUp={handleStartFollowUp}
          />
        )}

        {activeTab === 'followup' && (
          <View>
            <Heading level={4} marginBottom={tokens.space.medium}>
              Follow-up Conversation
            </Heading>
            
            <FollowUpChatManager
              project={project}
              onSessionCreated={handleFollowUpSessionCreated}
              onSessionEnded={handleSessionEnded}
            />
          </View>
        )}
      </View>

      {/* Delete Project Dialog */}
      <DeleteProjectDialog
        project={project}
        isOpen={showDeleteDialog}
        isDeleting={isDeleting}
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </View>
  );
};

export default ProjectDetailPage;