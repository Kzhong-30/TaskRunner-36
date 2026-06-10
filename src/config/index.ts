import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5173', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  useMockLlm: process.env.USE_MOCK_LLM !== 'false',
  maxHistoryRounds: parseInt(process.env.MAX_HISTORY_ROUNDS || '10', 10),
  databasePath: process.env.DATABASE_PATH || './database.sqlite',
  apiKey: process.env.API_KEY || '',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  sse: {
    heartbeatInterval: parseInt(process.env.SSE_HEARTBEAT_INTERVAL || '15000', 10)
  }
};
