// Core type definitions for the Project Portal

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'analyzing' | 'completed';
  document: Document;
  sessions: AgentSession[];
  collaborators: string[]; // user IDs
}

export interface Document {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'file';
  uploadedAt: Date;
}

export interface AgentSession {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'completed';
  messages: Message[];
  summary?: SessionSummary;
}

export interface Message {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

export interface SessionSummary {
  findings: string[];
  recommendations: string[];
  keyInsights: string[];
  conversationHighlights: string[];
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Form types
export interface CreateProjectInput {
  name: string;
  description?: string;
  document: {
    title: string;
    content: string;
    type: 'text' | 'file';
  };
}

// Auth types
export interface AuthContextType {
  user: User | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}