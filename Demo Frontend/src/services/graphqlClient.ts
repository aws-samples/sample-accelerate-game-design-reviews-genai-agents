import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import type { 
  CreateProjectInput, 
  CreateAgentSessionInput, 
  CreateMessageInput,
  UpdateProjectInput,
  CreateDocumentInput,
  CreateSessionSummaryInput,
  Message
} from '../types/graphql';

class GraphQLClientService {
  private amplifyClient = generateClient();

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      await getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  // Project operations
  async listProjects() {
    try {
      const result = await this.amplifyClient.graphql({
        query: `
          query ListProjects {
            listProjects {
              items {
                id
                name
                description
                status
                documentID
                createdAt
                updatedAt
                collaborators
              }
            }
          }
        `
      });
      return result;
    } catch (error) {
      console.error('Failed to list projects:', error);
      throw error;
    }
  }

  async getProject(id: string) {
    try {
      const result = await this.amplifyClient.graphql({
        query: `
          query GetProject($id: ID!) {
            getProject(id: $id) {
              id
              name
              description
              status
              documentID
              memoryEnabled
              selectedAgents
              createdAt
              updatedAt
              collaborators
              document {
                id
                title
                content
                type
                uploadedAt
              }
              sessions {
                items {
                  id
                  startedAt
                  endedAt
                  status
                  sessionType
                  summary {
                    id
                    findings
                    recommendations
                    keyInsights
                    conversationHighlights
                  }
                }
              }
            }
          }
        `,
        variables: { id }
      });
      return result;
    } catch (error) {
      console.error('Failed to get project:', error);
      throw error;
    }
  }

  async createProject(input: CreateProjectInput) {
    try {
      // Ensure user is authenticated
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('User must be authenticated to create projects');
      }

      const result = await this.amplifyClient.graphql({
        query: `
          mutation CreateProject($input: CreateProjectInput!) {
            createProject(input: $input) {
              id
              name
              description
              status
              documentID
              memoryEnabled
              selectedAgents
              createdAt
              updatedAt
              collaborators
            }
          }
        `,
        variables: { input }
      });
      return result;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }

  async updateProject(id: string, input: Omit<UpdateProjectInput, 'id'>) {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('User must be authenticated to update projects');
      }

      const updateInput: UpdateProjectInput = { id, ...input };
      const result = await this.amplifyClient.graphql({
        query: `
          mutation UpdateProject($input: UpdateProjectInput!) {
            updateProject(input: $input) {
              id
              name
              description
              status
              documentID
              createdAt
              updatedAt
              collaborators
            }
          }
        `,
        variables: { input: updateInput }
      });
      return result;
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  }

  async deleteProject(id: string) {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('User must be authenticated to delete projects');
      }

      const result = await this.amplifyClient.graphql({
        query: `
          mutation DeleteProject($input: DeleteProjectInput!) {
            deleteProject(input: $input) {
              id
              name
            }
          }
        `,
        variables: { input: { id } }
      });
      return result;
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }

  // Document operations
  async createDocument(input: CreateDocumentInput) {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('User must be authenticated to create documents');
      }

      const result = await this.amplifyClient.graphql({
        query: `
          mutation CreateDocument($input: CreateDocumentInput!) {
            createDocument(input: $input) {
              id
              title
              content
              type
              uploadedAt
              projectID
            }
          }
        `,
        variables: { input }
      });
      return result;
    } catch (error) {
      console.error('Failed to create document:', error);
      throw error;
    }
  }

  // Session operations
  async createAgentSession(input: CreateAgentSessionInput) {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('User must be authenticated to create agent sessions');
      }

      const result = await this.amplifyClient.graphql({
        query: `
          mutation CreateAgentSession($input: CreateAgentSessionInput!) {
            createAgentSession(input: $input) {
              id
              projectID
              startedAt
              endedAt
              status
              messages {
                items {
                  id
                  sender
                  content
                  timestamp
                  type
                }
              }
            }
          }
        `,
        variables: { input }
      });
      return result;
    } catch (error) {
      console.error('Failed to create agent session:', error);
      throw error;
    }
  }

  async updateAgentSession(id: string, input: { endedAt?: string; status?: string }) {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('User must be authenticated to update agent sessions');
      }

      const result = await this.amplifyClient.graphql({
        query: `
          mutation UpdateAgentSession($input: UpdateAgentSessionInput!) {
            updateAgentSession(input: $input) {
              id
              projectID
              startedAt
              endedAt
              status
              summary {
                id
                findings
                recommendations
                keyInsights
                conversationHighlights
              }
            }
          }
        `,
        variables: { 
          input: { 
            id, 
            ...input 
          } 
        }
      });
      return result;
    } catch (error) {
      console.error('Failed to update agent session:', error);
      throw error;
    }
  }

  async getAgentSession(id: string) {
    try {
      const result = await this.amplifyClient.graphql({
        query: `
          query GetAgentSession($id: ID!) {
            getAgentSession(id: $id) {
              id
              projectID
              startedAt
              endedAt
              status
              messages {
                items {
                  id
                  sender
                  content
                  timestamp
                  type
                }
              }
            }
          }
        `,
        variables: { id }
      });
      return result;
    } catch (error) {
      console.error('Failed to get agent session:', error);
      throw error;
    }
  }

  // Message operations
  async createMessage(input: CreateMessageInput) {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('User must be authenticated to send messages');
      }

      const result = await this.amplifyClient.graphql({
        query: `
          mutation CreateMessage($input: CreateMessageInput!) {
            createMessage(input: $input) {
              id
              sessionID
              sender
              content
              timestamp
              type
            }
          }
        `,
        variables: { input }
      });
      return result;
    } catch (error) {
      console.error('Failed to create message:', error);
      throw error;
    }
  }

  // Session Summary operations
  async createSessionSummary(input: CreateSessionSummaryInput) {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('User must be authenticated to create session summaries');
      }

      const result = await this.amplifyClient.graphql({
        query: `
          mutation CreateSessionSummary($input: CreateSessionSummaryInput!) {
            createSessionSummary(input: $input) {
              id
              findings
              recommendations
              keyInsights
              conversationHighlights
              agentSessionID
            }
          }
        `,
        variables: { input }
      });
      return result;
    } catch (error) {
      console.error('Failed to create session summary:', error);
      throw error;
    }
  }

  async listMessagesBySession(sessionID: string) {
    try {
      const result = await this.amplifyClient.graphql({
        query: `
          query ListMessagesBySession($sessionID: ID!) {
            listMessages(filter: { sessionID: { eq: $sessionID } }) {
              items {
                id
                sender
                content
                timestamp
                type
                agentTopic
                inputTokens
                outputTokens
                invocationDurationMs
              }
            }
          }
        `,
        variables: { sessionID }
      });
      return result;
    } catch (error) {
      console.error('Failed to list messages:', error);
      throw error;
    }
  }

  // Custom agent interaction mutations - these use server-side Lambda functions
  async startAgentSession(
    projectId: string, 
    selectedAgents?: string[], 
    memoryEnabled?: boolean,
    sessionType?: string
  ) {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      throw new Error('User must be authenticated to start agent sessions');
    }

    const result = await this.amplifyClient.graphql({
      query: `
        mutation StartAgentSession(
          $projectId: String!, 
          $selectedAgents: [String], 
          $memoryEnabled: Boolean,
          $sessionType: String
        ) {
          startAgentSession(
            projectId: $projectId, 
            selectedAgents: $selectedAgents, 
            memoryEnabled: $memoryEnabled,
            sessionType: $sessionType
          ) {
            id
            projectID
            startedAt
            status
            sessionType
            createdAt
            updatedAt
          }
        }
      `,
      variables: { projectId, selectedAgents, memoryEnabled, sessionType }
    });
    return result;
  }

  async sendMessageToAgent(
    sessionId: string, 
    content: string, 
    topic?: string, 
    memoryEnabled?: boolean
  ) {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      throw new Error('User must be authenticated to send messages to agents');
    }

    const result = await this.amplifyClient.graphql({
      query: `
        mutation SendMessageToAgent(
          $sessionId: String!, 
          $content: String!, 
          $topic: String, 
          $memoryEnabled: Boolean
        ) {
          sendMessageToAgent(
            sessionId: $sessionId, 
            content: $content, 
            topic: $topic, 
            memoryEnabled: $memoryEnabled
          ) {
            success
            userMessageId
          }
        }
      `,
      variables: { sessionId, content, topic, memoryEnabled }
    });
    return result;
  }

  async endAgentSession(sessionId: string) {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      throw new Error('User must be authenticated to end agent sessions');
    }

    const result = await this.amplifyClient.graphql({
      query: `
        mutation EndAgentSession($sessionId: String!) {
          endAgentSession(sessionId: $sessionId) {
            id
            projectID
            startedAt
            endedAt
            status
            createdAt
            updatedAt
            summary {
              id
              findings
              recommendations
              keyInsights
              conversationHighlights
            }
          }
        }
      `,
      variables: { sessionId }
    });
    return result;
  }

  async deleteProjectCascade(projectId: string) {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      throw new Error('User must be authenticated to delete projects');
    }

    const result = await this.amplifyClient.graphql({
      query: `
        mutation DeleteProjectCascade($projectId: String!) {
          deleteProjectCascade(projectId: $projectId) {
            id
            name
            deleted
          }
        }
      `,
      variables: { projectId }
    });
    return result;
  }

  // Subscription operations
  subscribeToMessages(sessionID: string, callback: (message: Message) => void) {
    try {
      const subscription = this.amplifyClient.graphql({
        query: `
          subscription OnMessageCreated($sessionID: ID!) {
            onCreateMessage(filter: {sessionID: {eq: $sessionID}}) {
              id
              sessionID
              sender
              content
              timestamp
              type
              agentTopic
              inputTokens
              outputTokens
              invocationDurationMs
            }
          }
        `,
        variables: { sessionID }
      });

      // Handle subscription
      if ('subscribe' in subscription) {
        const sub = subscription.subscribe({
          next: ({ data }) => {
            if (data?.onCreateMessage) {
              callback(data.onCreateMessage as Message);
            }
          },
          error: (error) => {
            console.error('Message subscription error:', error);
          }
        });

        return () => sub.unsubscribe();
      }

      return () => {};
    } catch (error) {
      console.error('Failed to subscribe to messages:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  subscribeToSessionStatus(projectID: string, callback: (session: any) => void) {
    try {
      const subscription = this.amplifyClient.graphql({
        query: `
          subscription OnSessionStatusChanged($projectID: ID!) {
            onUpdateAgentSession(filter: {projectID: {eq: $projectID}}) {
              id
              projectID
              startedAt
              endedAt
              status
              summary {
                id
                findings
                recommendations
                keyInsights
                conversationHighlights
              }
            }
          }
        `,
        variables: { projectID }
      });

      // Handle subscription
      if ('subscribe' in subscription) {
        const sub = subscription.subscribe({
          next: ({ data }) => {
            if (data?.onUpdateAgentSession) {
              callback(data.onUpdateAgentSession);
            }
          },
          error: (error) => {
            console.error('Session status subscription error:', error);
          }
        });

        return () => sub.unsubscribe();
      }

      return () => {};
    } catch (error) {
      console.error('Failed to subscribe to session status:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

}

// Export singleton instance
export const graphqlClient = new GraphQLClientService();