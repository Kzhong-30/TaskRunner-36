import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  maxHistoryRounds: parseInt(process.env.MAX_HISTORY_ROUNDS || '10', 10),
  databasePath: process.env.DATABASE_PATH || './database.sqlite'
};
