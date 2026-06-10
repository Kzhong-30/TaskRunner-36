import { Router, Request, Response } from 'express';
import multer from 'multer';
import { knowledgeService } from '../services/knowledgeService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /knowledge:
 *   post:
 *     summary: 上传 FAQ 知识库文档（支持 JSON 格式或文件上传）
 *     tags: [Knowledge]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             oneOf:
 *               - type: object
 *                 required: [items]
 *                 properties:
 *                   items:
 *                     type: array
 *                     items:
 *                       type: object
 *                       required: [question, answer]
 *                       properties:
 *                         question:
 *                           type: string
 *                         answer:
 *                           type: string
 *                         category:
 *                           type: string
 *                         keywords:
 *                           type: array
 *                           items:
 *                             type: string
 *               - type: object
 *                 required: [question, answer]
 *                 properties:
 *                   question:
 *                     type: string
 *                   answer:
 *                     type: string
 *                   category:
 *                     type: string
 *                   keywords:
 *                     type: array
 *                     items:
 *                       type: string
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: JSON 格式 FAQ 文件
 *     responses:
 *       201:
 *         description: 上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Knowledge'
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let items: Array<{ question: string; answer: string; category?: string; keywords?: string[] }> = [];

    if (req.file) {
      try {
        const content = req.file.buffer.toString('utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (Array.isArray(parsed.items)) {
          items = parsed.items;
        } else {
          items = [parsed];
        }
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Invalid JSON file format' });
      }
    } else {
      const body = req.body;
      if (Array.isArray(body.items)) {
        items = body.items;
      } else if (body.question && body.answer) {
        items = [body];
      } else if (Array.isArray(body)) {
        items = body;
      }
    }

    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items to upload' });
    }

    const valid = items.filter(i => i.question && i.answer);
    if (valid.length === 0) {
      return res.status(400).json({ success: false, error: 'Items must contain question and answer' });
    }

    const created = await knowledgeService.uploadFAQ(valid);

    res.status(201).json({
      success: true,
      count: created.length,
      items: created
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /knowledge:
 *   get:
 *     summary: 获取知识库列表
 *     tags: [Knowledge]
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
 *         description: 知识库列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await knowledgeService.list(page, pageSize);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /knowledge/search:
 *   post:
 *     summary: 搜索知识库
 *     tags: [Knowledge]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *               topK:
 *                 type: integer
 *                 default: 3
 *     responses:
 *       200:
 *         description: 搜索结果
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, topK } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    const matches = await knowledgeService.search(query, topK || 3);
    res.json({
      success: true,
      results: matches.map(m => ({
        id: m.knowledge.id,
        question: m.knowledge.question,
        answer: m.knowledge.answer,
        category: m.knowledge.category,
        score: m.score,
        matchedBy: m.matchedBy
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /knowledge/{id}:
 *   get:
 *     summary: 获取单个知识条目
 *     tags: [Knowledge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 知识条目
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await knowledgeService.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Knowledge not found' });
    }
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /knowledge/{id}:
 *   delete:
 *     summary: 删除知识条目
 *     tags: [Knowledge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await knowledgeService.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Knowledge not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
