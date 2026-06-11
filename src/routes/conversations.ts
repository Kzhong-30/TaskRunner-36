import { Router, Request, Response } from 'express';
import { conversationService } from '../services/conversationService';
import { analysisService } from '../services/analysisService';
import { KnowledgeMatch } from '../services/knowledgeService';
import { config } from '../config';

const router = Router();

/**
 * @swagger
 * /conversations:
 *   post:
 *     summary: 创建新对话
 *     tags: [Conversations]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 用户标识
 *     responses:
 *       201:
 *         description: 对话创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 conversationId:
 *                   type: string
 *                   format: uuid
 *                 conversation:
 *                   $ref: '#/components/schemas/Conversation'
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const conversation = await conversationService.createConversation(userId);
    res.status(201).json({
      success: true,
      conversationId: conversation.id,
      conversation
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /conversations:
 *   get:
 *     summary: 获取对话列表
 *     tags: [Conversations]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 对话列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await conversationService.listConversations(page, pageSize);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /conversations/{id}:
 *   get:
 *     summary: 获取单个对话详情
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 对话详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const conversation = await conversationService.getConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    const messages = await conversationService.getMessages(req.params.id);
    res.json({ success: true, conversation, messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /conversations/{id}/messages:
 *   post:
 *     summary: 发送用户消息并获取机器人回复（支持SSE流式）
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: Accept
 *         schema:
 *           type: string
 *           enum: [application/json, text/event-stream]
 *         description: 设置为 text/event-stream 启用流式响应
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 description: 用户发送的消息
 *               stream:
 *                 type: boolean
 *                 default: false
 *                 description: 是否使用 SSE 流式响应
 *     responses:
 *       200:
 *         description: 机器人回复
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reply:
 *                   type: string
 *                 intent:
 *                   $ref: '#/components/schemas/IntentDetection'
 *                 knowledgeMatches:
 *                   type: array
 *                 humanTransfer:
 *                   type: boolean
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: SSE 流式 token 输出，事件类型：token | meta | done
 */
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, stream } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const useStream = stream === true || req.headers.accept === 'text/event-stream';

    if (useStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      let isClientConnected: boolean = true;
      let heartbeatTimer: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (!isClientConnected) return;
        isClientConnected = false;
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
      };

      req.on('close', () => {
        cleanup();
      });

      heartbeatTimer = setInterval(() => {
        if (isClientConnected) {
          res.write(': heartbeat\n\n');
        }
      }, config.sse.heartbeatInterval);

      let finalResult: any = null;

      try {
        finalResult = await conversationService.processMessage(
          id,
          message.trim(),
          (token) => {
            if (!isClientConnected) return;
            res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
          }
        );

        if (!isClientConnected) {
          return;
        }

        res.write(`event: meta\ndata: ${JSON.stringify({
          intent: finalResult.intentResult,
          knowledgeMatches: finalResult.knowledgeMatches.map((k: KnowledgeMatch) => ({
            id: k.knowledge.id,
            question: k.knowledge.question,
            score: k.score,
            matchedBy: k.matchedBy
          })),
          humanTransfer: finalResult.humanTransfer
        })}\n\n`);

        res.write(`event: done\ndata: ${JSON.stringify({ success: true, reply: finalResult.reply })}\n\n`);
      } catch (err: any) {
        if (isClientConnected) {
          res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
        }
      } finally {
        if (isClientConnected) res.end();
        cleanup();
      }
      return;
    }

    const result = await conversationService.processMessage(id, message.trim());
    res.json({
      success: true,
      reply: result.reply,
      intent: result.intentResult,
      knowledgeMatches: result.knowledgeMatches.map(k => ({
        id: k.knowledge.id,
        question: k.knowledge.question,
        answer: k.knowledge.answer,
        score: k.score,
        matchedBy: k.matchedBy
      })),
      humanTransfer: result.humanTransfer
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /conversations/{id}/messages:
 *   get:
 *     summary: 获取对话的所有消息
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 消息列表
 */
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const messages = await conversationService.getMessages(req.params.id);
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /conversations/{id}/human-reply:
 *   post:
 *     summary: 人工客服回复消息
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [agentName, content]
 *             properties:
 *               agentName:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: 回复成功
 */
router.post('/:id/human-reply', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agentName, content } = req.body;
    if (!agentName || !content) {
      return res.status(400).json({ success: false, error: 'agentName and content are required' });
    }
    const message = await conversationService.addHumanReply(id, agentName, content);
    res.json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /conversations/{id}/close:
 *   post:
 *     summary: 关闭对话
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               satisfactionScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: 关闭成功
 */
router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { satisfactionScore } = req.body;
    const conversation = await conversationService.closeConversation(id, satisfactionScore);
    res.json({ success: true, conversation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /conversations/{id}/analysis:
 *   get:
 *     summary: 获取对话分析（情感分析、满意度、关键词提取）
 *     tags: [Analysis]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 对话分析结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analysis:
 *                   $ref: '#/components/schemas/ConversationAnalysis'
 */
router.get('/:id/analysis', async (req: Request, res: Response) => {
  try {
    const analysis = await analysisService.analyzeConversation(req.params.id);
    res.json({ success: true, analysis });
  } catch (err: any) {
    if (err.message === 'Conversation not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
