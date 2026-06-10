import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI 智能客服系统 API',
      version: '1.0.0',
      description: '智能对话机器人客服系统，支持对话管理、知识库检索、意图识别、人工转接和对话分析。',
      contact: {
        name: 'AI Customer Service'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/v1`,
        description: '开发服务器'
      }
    ],
    tags: [
      { name: 'Conversations', description: '对话管理' },
      { name: 'Knowledge', description: '知识库管理' },
      { name: 'Intents', description: '意图管理' },
      { name: 'Analysis', description: '对话分析' }
    ],
    components: {
      schemas: {
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string' },
            status: { type: 'string', enum: ['active', 'waiting_for_human', 'closed'] },
            summary: { type: 'string', nullable: true },
            intent: { type: 'string', nullable: true },
            assignedAgent: { type: 'string', nullable: true },
            satisfactionScore: { type: 'number', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            conversationId: { type: 'string', format: 'uuid' },
            role: { type: 'string', enum: ['user', 'assistant', 'system', 'human'] },
            content: { type: 'string' },
            emotion: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Knowledge: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            question: { type: 'string' },
            answer: { type: 'string' },
            category: { type: 'string', nullable: true },
            keywords: { type: 'array', items: { type: 'string' } },
            views: { type: 'integer' },
            enabled: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        IntentDetection: {
          type: 'object',
          properties: {
            intent: { type: 'string', enum: ['consultation', 'complaint', 'after_sales', 'order_query', 'human_transfer', 'unknown'] },
            displayName: { type: 'string' },
            confidence: { type: 'number' },
            matchedKeywords: { type: 'array', items: { type: 'string' } }
          }
        },
        ConversationAnalysis: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
            totalMessages: { type: 'integer' },
            sentiment: {
              type: 'object',
              properties: {
                label: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                score: { type: 'number' },
                confidence: { type: 'number' }
              }
            },
            satisfactionScore: { type: 'integer' },
            keywords: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  word: { type: 'string' },
                  count: { type: 'integer' }
                }
              }
            },
            topics: { type: 'array', items: { type: 'string' } },
            humanTransferRequested: { type: 'boolean' }
          }
        }
      }
    }
  },
  apis: [path.join(__dirname, '../routes/*.ts'), path.join(__dirname, '../routes/*.js')]
};

export const swaggerSpec = swaggerJsdoc(options);
