import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { startAgentSession } from '../functions/start-agent-session/resource';
import { sendMessageToAgent } from '../functions/send-message-to-agent/resource';
import { endAgentSession } from '../functions/end-agent-session/resource';
import { deleteProject } from '../functions/delete-project/resource';

const schema = a.schema({
  // Enums
  ProjectStatus: a.enum(['SUBMITTED', 'IN_PROGRESS', 'COMPLETED']),
  DocumentType: a.enum(['TEXT', 'FILE']),
  SessionStatus: a.enum(['ACTIVE', 'COMPLETED']),
  SessionType: a.enum(['INITIAL', 'FOLLOWUP']),
  MessageSender: a.enum(['USER', 'AGENT']),
  MessageType: a.enum(['TEXT', 'SYSTEM']),

  // Models
  Project: a
    .model({
      name: a.string().required(),
      description: a.string(),
      status: a.ref('ProjectStatus').required(),
      documentID: a.id(), // Direct reference to document for efficient lookups
      document: a.hasOne('Document', 'projectID'),
      sessions: a.hasMany('AgentSession', 'projectID'),
      collaborators: a.string().array(),
      memoryEnabled: a.boolean().default(false),
      selectedAgents: a.string().array(),
    })
    .authorization((allow) => [allow.owner()]),

  Document: a
    .model({
      title: a.string().required(),
      content: a.string().required(),
      type: a.ref('DocumentType').required(),
      uploadedAt: a.datetime().required(),
      projectID: a.id().required(),
      project: a.belongsTo('Project', 'projectID'),
    })
    .authorization((allow) => [allow.owner()]),

  AgentSession: a
    .model({
      projectID: a.id().required(),
      project: a.belongsTo('Project', 'projectID'),
      startedAt: a.datetime().required(),
      endedAt: a.datetime(),
      status: a.ref('SessionStatus').required(),
      sessionType: a.ref('SessionType').required(),
      messages: a.hasMany('Message', 'sessionID'),
      summary: a.hasOne('SessionSummary', 'agentSessionID'),
    })
    .secondaryIndexes((index) => [
      index('projectID').sortKeys(['startedAt']).queryField('sessionsByProject'),
    ])
    .authorization((allow) => [allow.owner()]),

  Message: a
    .model({
      sessionID: a.id().required(),
      session: a.belongsTo('AgentSession', 'sessionID'),
      sender: a.ref('MessageSender').required(),
      content: a.string().required(),
      timestamp: a.datetime().required(),
      type: a.ref('MessageType').required(),
      agentTopic: a.string(),
      inputTokens: a.integer(),
      outputTokens: a.integer(),
      invocationDurationMs: a.integer(),
    })
    .secondaryIndexes((index) => [
      index('sessionID').sortKeys(['timestamp']).queryField('messagesBySession'),
    ])
    .authorization((allow) => [allow.owner(), allow.authenticated().to(['create', 'read'])]),

  SessionSummary: a
    .model({
      findings: a.string().array(),
      recommendations: a.string().array(),
      keyInsights: a.string().array(),
      conversationHighlights: a.string().array(),
      agentSessionID: a.id().required(),
      session: a.belongsTo('AgentSession', 'agentSessionID'),
    })
    .secondaryIndexes((index) => [
      index('agentSessionID').queryField('summariesBySession'),
    ])
    .authorization((allow) => [allow.owner()]),

  // Custom Mutations
  startAgentSession: a
    .mutation()
    .arguments({
      projectId: a.string().required(),
      selectedAgents: a.string().array(),
      memoryEnabled: a.boolean(),
      sessionType: a.string(),
    })
    .returns(a.ref('AgentSession'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(startAgentSession)),

  sendMessageToAgent: a
    .mutation()
    .arguments({
      sessionId: a.string().required(),
      content: a.string().required(),
      topic: a.string(),
      memoryEnabled: a.boolean(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      userMessageId: a.string().required(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(sendMessageToAgent)),

  endAgentSession: a
    .mutation()
    .arguments({
      sessionId: a.string().required(),
    })
    .returns(a.ref('AgentSession'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(endAgentSession)),

  deleteProjectCascade: a
    .mutation()
    .arguments({
      projectId: a.string().required(),
    })
    .returns(
      a.customType({
        id: a.string().required(),
        name: a.string().required(),
        deleted: a.boolean().required(),
      })
    )
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(deleteProject)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
