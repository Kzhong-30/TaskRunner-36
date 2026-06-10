import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import { initDatabase } from './config/database';
import { swaggerSpec } from './config/swagger';

import conversationsRouter from './routes/conversations';
import knowledgeRouter from './routes/knowledge';
import intentsRouter from './routes/intents';

import { intentService } from './services/intentService';
import { conversationService } from './services/conversationService';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI 智能客服系统 API'
}));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ai-customer-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mode: config.openaiApiKey && config.openaiApiKey !== 'your_openai_api_key_here' ? 'openai' : 'mock'
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'AI 智能客服系统',
    version: '1.0.0',
    description: '智能对话机器人客服系统 API',
    docs: '/api-docs',
    health: '/health',
    endpoints: {
      conversations: '/api/v1/conversations',
      knowledge: '/api/v1/knowledge',
      intents: '/api/v1/intents'
    }
  });
});

app.use('/api/v1/conversations', conversationsRouter);
app.use('/api/v1/knowledge', knowledgeRouter);
app.use('/api/v1/intents', intentsRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    error: config.nodeEnv === 'development' ? err.message : 'Internal Server Error'
  });
});

conversationService.onHumanAgentRequest((event) => {
  console.log('\n======================================================');
  console.log('[⚠️ 人工转接通知]');
  console.log(`  对话ID: ${event.conversationId}`);
  console.log(`  用户ID: ${event.userId}`);
  console.log(`  最新消息: ${event.userMessage.slice(0, 100)}`);
  console.log(`  历史消息数: ${event.history.length}`);
  console.log(`  时间: ${event.timestamp.toLocaleString()}`);
  console.log('======================================================\n');
});

async function bootstrap() {
  console.log('======================================================');
  console.log('  🤖 AI 智能客服系统启动中...');
  console.log('======================================================');

  await initDatabase();
  await intentService.ensureDefaultIntents();

  app.listen(config.port, () => {
    console.log(`\n✅ 服务启动成功!`);
    console.log(`   本地地址:  http://localhost:${config.port}`);
    console.log(`   API 文档:  http://localhost:${config.port}/api-docs`);
    console.log(`   健康检查:  http://localhost:${config.port}/health`);
    console.log(`   LLM 模式:  ${config.openaiApiKey && config.openaiApiKey !== 'your_openai_api_key_here' ? 'OpenAI API' : 'Mock (模拟模式)'}`);
    console.log(`   上下文轮数: ${config.maxHistoryRounds} 轮\n`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ 启动失败:', err);
  process.exit(1);
});
