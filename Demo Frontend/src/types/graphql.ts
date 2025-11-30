// Generated GraphQL Types for Project Portal

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };

// AWS Scalar Types
export type AWSDateTime = string;
export type AWSDate = string;
export type AWSTime = string;
export type AWSTimestamp = number;
export type AWSEmail = string;
export type AWSJSON = string;
export type AWSURL = string;
export type AWSPhone = string;
export type AWSIPAddress = string;

// Enums as const objects for better TypeScript compatibility
export const ProjectStatus = {
  SUBMITTED: 'SUBMITTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
} as const;

export const DocumentType = {
  TEXT: 'TEXT',
  FILE: 'FILE'
} as const;

export const SessionStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED'
} as const;

export const SessionType = {
  INITIAL: 'INITIAL',
  FOLLOWUP: 'FOLLOWUP'
} as const;

export const MessageSender = {
  USER: 'USER',
  AGENT: 'AGENT'
} as const;

export const MessageType = {
  TEXT: 'TEXT',
  SYSTEM: 'SYSTEM'
} as const;

// Type definitions for the enums
export type ProjectStatus = typeof ProjectStatus[keyof typeof ProjectStatus];
export type DocumentType = typeof DocumentType[keyof typeof DocumentType];
export type SessionStatus = typeof SessionStatus[keyof typeof SessionStatus];
export type SessionType = typeof SessionType[keyof typeof SessionType];
export type MessageSender = typeof MessageSender[keyof typeof MessageSender];
export type MessageType = typeof MessageType[keyof typeof MessageType];

// Core Types
export interface Project {
  id: string;
  name: string;
  description?: Maybe<string>;
  status: ProjectStatus;
  documentID?: Maybe<string>; // Direct reference to document for efficient lookups
  document?: Maybe<Document>;
  sessions?: Maybe<AgentSessionConnection>;
  collaborators?: Maybe<Array<Maybe<string>>>;
  memoryEnabled?: Maybe<boolean>;
  selectedAgents?: Maybe<Array<Maybe<string>>>;
  createdAt: AWSDateTime;
  updatedAt: AWSDateTime;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  type: DocumentType;
  uploadedAt: AWSDateTime;
  projectID: string;
}

export interface AgentSession {
  id: string;
  projectID: string;
  project?: Maybe<Project>;
  startedAt: AWSDateTime;
  endedAt?: Maybe<AWSDateTime>;
  status: SessionStatus;
  sessionType: SessionType;
  messages?: Maybe<MessageConnection>;
  summary?: Maybe<SessionSummary>;
}

export interface Message {
  id: string;
  sessionID: string;
  sender: MessageSender;
  content: string;
  timestamp: AWSDateTime;
  type: MessageType;
  agentTopic?: Maybe<string>;
  inputTokens?: Maybe<number>;
  outputTokens?: Maybe<number>;
  invocationDurationMs?: Maybe<number>;
}

export interface SessionSummary {
  id: string;
  findings?: Maybe<Array<Maybe<string>>>;
  recommendations?: Maybe<Array<Maybe<string>>>;
  keyInsights?: Maybe<Array<Maybe<string>>>;
  conversationHighlights?: Maybe<Array<Maybe<string>>>;
  agentSessionID: string;
}

// Connection Types
export interface ProjectConnection {
  items?: Maybe<Array<Maybe<Project>>>;
  nextToken?: Maybe<string>;
}

export interface AgentSessionConnection {
  items?: Maybe<Array<Maybe<AgentSession>>>;
  nextToken?: Maybe<string>;
}

export interface MessageConnection {
  items?: Maybe<Array<Maybe<Message>>>;
  nextToken?: Maybe<string>;
}

// Input Types
export interface CreateProjectInput {
  id?: InputMaybe<string>;
  name: string;
  description?: InputMaybe<string>;
  status: ProjectStatus;
  documentID?: InputMaybe<string>;
  collaborators?: InputMaybe<Array<InputMaybe<string>>>;
  memoryEnabled?: InputMaybe<boolean>;
  selectedAgents?: InputMaybe<Array<InputMaybe<string>>>;
}

export interface UpdateProjectInput {
  id: string;
  name?: InputMaybe<string>;
  description?: InputMaybe<string>;
  status?: InputMaybe<ProjectStatus>;
  documentID?: InputMaybe<string>;
  collaborators?: InputMaybe<Array<InputMaybe<string>>>;
}

export interface DeleteProjectInput {
  id: string;
}

export interface CreateDocumentInput {
  id?: InputMaybe<string>;
  title: string;
  content: string;
  type: DocumentType;
  uploadedAt: AWSDateTime;
  projectID: string;
}

export interface CreateAgentSessionInput {
  id?: InputMaybe<string>;
  projectID: string;
  startedAt: AWSDateTime;
  status: SessionStatus;
  sessionType: SessionType;
}

export interface UpdateAgentSessionInput {
  id: string;
  endedAt?: InputMaybe<AWSDateTime>;
  status?: InputMaybe<SessionStatus>;
}

export interface CreateMessageInput {
  id?: InputMaybe<string>;
  sessionID: string;
  sender: MessageSender;
  content: string;
  timestamp: AWSDateTime;
  type: MessageType;
}

export interface CreateSessionSummaryInput {
  id?: InputMaybe<string>;
  findings?: InputMaybe<Array<InputMaybe<string>>>;
  recommendations?: InputMaybe<Array<InputMaybe<string>>>;
  keyInsights?: InputMaybe<Array<InputMaybe<string>>>;
  conversationHighlights?: InputMaybe<Array<InputMaybe<string>>>;
  agentSessionID: string;
}

export interface SendMessageToAgentInput {
  sessionId: string;
  content: string;
  topic?: InputMaybe<string>;
  memoryEnabled?: InputMaybe<boolean>;
}

export interface UpdateDocumentInput {
  id: string;
  title?: InputMaybe<string>;
  content?: InputMaybe<string>;
  type?: InputMaybe<DocumentType>;
}

export interface DeleteDocumentInput {
  id: string;
}

// Filter Types
export interface ModelProjectFilterInput {
  id?: InputMaybe<ModelIDInput>;
  name?: InputMaybe<ModelStringInput>;
  description?: InputMaybe<ModelStringInput>;
  status?: InputMaybe<ModelProjectStatusInput>;
  and?: InputMaybe<Array<InputMaybe<ModelProjectFilterInput>>>;
  or?: InputMaybe<Array<InputMaybe<ModelProjectFilterInput>>>;
  not?: InputMaybe<ModelProjectFilterInput>;
}

export interface ModelStringInput {
  ne?: InputMaybe<string>;
  eq?: InputMaybe<string>;
  le?: InputMaybe<string>;
  lt?: InputMaybe<string>;
  ge?: InputMaybe<string>;
  gt?: InputMaybe<string>;
  contains?: InputMaybe<string>;
  notContains?: InputMaybe<string>;
  between?: InputMaybe<Array<InputMaybe<string>>>;
  beginsWith?: InputMaybe<string>;
  attributeExists?: InputMaybe<boolean>;
  attributeType?: InputMaybe<ModelAttributeTypes>;
  size?: InputMaybe<ModelSizeInput>;
}

export interface ModelIDInput {
  ne?: InputMaybe<string>;
  eq?: InputMaybe<string>;
  le?: InputMaybe<string>;
  lt?: InputMaybe<string>;
  ge?: InputMaybe<string>;
  gt?: InputMaybe<string>;
  contains?: InputMaybe<string>;
  notContains?: InputMaybe<string>;
  between?: InputMaybe<Array<InputMaybe<string>>>;
  beginsWith?: InputMaybe<string>;
  attributeExists?: InputMaybe<boolean>;
  attributeType?: InputMaybe<ModelAttributeTypes>;
  size?: InputMaybe<ModelSizeInput>;
}

export interface ModelProjectStatusInput {
  eq?: InputMaybe<ProjectStatus>;
  ne?: InputMaybe<ProjectStatus>;
}

export interface ModelSizeInput {
  ne?: InputMaybe<number>;
  eq?: InputMaybe<number>;
  le?: InputMaybe<number>;
  lt?: InputMaybe<number>;
  ge?: InputMaybe<number>;
  gt?: InputMaybe<number>;
  between?: InputMaybe<Array<InputMaybe<number>>>;
}

export const ModelAttributeTypes = {
  BINARY: 'binary',
  BINARY_SET: 'binarySet',
  BOOL: 'bool',
  LIST: 'list',
  MAP: 'map',
  NUMBER: 'number',
  NUMBER_SET: 'numberSet',
  STRING: 'string',
  STRING_SET: 'stringSet',
  NULL: '_null'
} as const;

export type ModelAttributeTypes = typeof ModelAttributeTypes[keyof typeof ModelAttributeTypes];

// Query and Mutation Response Types
export interface ListProjectsQuery {
  listProjects?: Maybe<ProjectConnection>;
}

export interface GetProjectQuery {
  getProject?: Maybe<Project>;
}

export interface CreateProjectMutation {
  createProject?: Maybe<Project>;
}

export interface UpdateProjectMutation {
  updateProject?: Maybe<Project>;
}

export interface DeleteProjectMutation {
  deleteProject?: Maybe<Project>;
}

export interface GetAgentSessionQuery {
  getAgentSession?: Maybe<AgentSession>;
}

export interface CreateAgentSessionMutation {
  createAgentSession?: Maybe<AgentSession>;
}

export interface UpdateAgentSessionMutation {
  updateAgentSession?: Maybe<AgentSession>;
}

export interface CreateMessageMutation {
  createMessage?: Maybe<Message>;
}

export interface StartAgentSessionMutation {
  startAgentSession?: Maybe<AgentSession>;
}

export interface SendMessageToAgentMutation {
  sendMessageToAgent?: Maybe<Message>;
}

export interface EndAgentSessionMutation {
  endAgentSession?: Maybe<AgentSession>;
}

// Subscription Types
export interface OnMessageCreatedSubscription {
  onMessageCreated?: Maybe<Message>;
}

export interface OnSessionStatusChangedSubscription {
  onSessionStatusChanged?: Maybe<AgentSession>;
}