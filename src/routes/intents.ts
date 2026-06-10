import { Router, Request, Response } from 'express';
import { intentService } from '../services/intentService';

const router = Router();

/**
 * @swagger
 * /intents:
 *   get:
 *     summary: 获取所有意图定义
 *     tags: [Intents]
 *     responses:
 *       200:
 *         description: 意图列表
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const intents = await intentService.listIntents();
    res.json({ success: true, intents });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /intents/detect:
 *   post:
 *     summary: 检测用户消息意图
 *     tags: [Intents]
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
 *                 description: 待检测的用户消息
 *     responses:
 *       200:
 *         description: 检测结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   $ref: '#/components/schemas/IntentDetection'
 */
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    const result = await intentService.detect(message);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
