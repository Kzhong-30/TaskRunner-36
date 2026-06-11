import { Message, Conversation } from '../models';
import { extractTopKeywords } from '../utils/nlp';

export interface SentimentResult {
  label: 'positive' | 'neutral' | 'negative';
  score: number;
  confidence: number;
}

export interface ConversationAnalysis {
  conversationId: string;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  durationMinutes: number;
  sentiment: SentimentResult;
  satisfactionScore: number;
  keywords: Array<{ word: string; count: number; score: number }>;
  intent?: string;
  topics: string[];
  humanTransferRequested: boolean;
  createdAt: string;
  updatedAt: string;
}

class AnalysisService {
  private positiveWords = new Set([
    '好', '棒', '赞', '满意', '谢谢', '感谢', '喜欢', '不错', '优秀', '完美',
    '解决', '开心', '高兴', '满意', '推荐', '超赞', '很好', '非常好', '厉害', '专业',
    'good', 'great', 'excellent', 'thanks', 'thank', 'amazing', 'awesome', 'satisfied', 'love', 'perfect'
  ]);

  private negativeWords = new Set([
    '差', '烂', '糟', '坏', '怒', '气', '烦', '投诉', '失望', '不满',
    '垃圾', '差劲', '太慢', '骗人', '骗钱', '退款', '垃圾', '垃圾玩意', '滚', '恶心',
    'bad', 'terrible', 'awful', 'angry', 'hate', 'disappointed', 'worst', 'horrible', 'broken', 'problem'
  ]);

  analyzeSentiment(text: string): SentimentResult {
    const lower = text.toLowerCase();
    let pos = 0, neg = 0;

    for (const w of this.positiveWords) {
      if (lower.includes(w)) pos++;
    }
    for (const w of this.negativeWords) {
      if (lower.includes(w)) neg++;
    }

    const total = pos + neg;
    if (total === 0) {
      return { label: 'neutral', score: 0, confidence: 0.2 };
    }

    const rawScore = (pos - neg) / total;
    const strength = Math.abs(pos - neg) / total;
    const coverage = Math.min(1, total / 4);
    const confidence = Math.min(1, Math.max(0.3, strength * 0.5 + coverage * 0.5));
    let label: 'positive' | 'neutral' | 'negative';

    if (rawScore > 0.15) label = 'positive';
    else if (rawScore < -0.15) label = 'negative';
    else label = 'neutral';

    return { label, score: rawScore, confidence };
  }



  async analyzeConversation(conversationId: string): Promise<ConversationAnalysis> {
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const messages = await Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']]
    });

    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const userTexts = userMessages.map(m => m.content);
    const allTexts = messages.map(m => m.content);

    const sentiments = userTexts.map(t => this.analyzeSentiment(t));
    const rawAvgScore = sentiments.length > 0
      ? Number(sentiments.reduce((s, r) => Number(s) + Number(r.score), 0)) / sentiments.length
      : 0;
    const avgScore = isNaN(rawAvgScore) ? 0 : rawAvgScore;
    const rawAvgConf = sentiments.length > 0
      ? Number(sentiments.reduce((s, r) => Number(s) + Number(r.confidence), 0)) / sentiments.length
      : 0.5;
    const avgConf = isNaN(rawAvgConf) ? 0.5 : rawAvgConf;

    let sentimentLabel: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (avgScore > 0.15) sentimentLabel = 'positive';
    else if (avgScore < -0.15) sentimentLabel = 'negative';

    const overallSentiment: SentimentResult = {
      label: sentimentLabel,
      score: avgScore,
      confidence: avgConf
    };

    const sentimentNorm = (avgScore + 1) / 2;
    const confWeight = overallSentiment.confidence;
    const baseSat = sentimentNorm * confWeight + 0.5 * (1 - confWeight);

    const humanTransferRequested = userMessages.some(m =>
      /人工|真人|客服人员|不要机器人/.test(m.content)
    ) || conversation.status === 'waiting_for_human';

    const humanPenaltyPct = 15;
    const complaintPenaltyPct = 10;
    const praiseBonusPct = 10;

    const rawSat = baseSat * 100;
    let satisfactionScore = rawSat;
    if (humanTransferRequested) {
      satisfactionScore -= humanPenaltyPct;
    }
    if (overallSentiment.label === 'negative') {
      satisfactionScore -= complaintPenaltyPct;
    }
    if (overallSentiment.label === 'positive' && confWeight > 0.6) {
      satisfactionScore += praiseBonusPct;
    }

    satisfactionScore = Math.max(0, Math.min(100, Math.round(satisfactionScore)));

    const keywords = extractTopKeywords(allTexts, 15);

    const topics = this.extractTopics(allTexts);

    const durationMinutes = messages.length >= 2
      ? Math.max(1, Math.round((messages[messages.length - 1].createdAt.getTime() - messages[0].createdAt.getTime()) / 60000))
      : 0;

    return {
      conversationId: conversation.id,
      totalMessages: messages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      durationMinutes,
      sentiment: overallSentiment,
      satisfactionScore,
      keywords,
      intent: conversation.intent,
      topics,
      humanTransferRequested,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString()
    };
  }

  private extractTopics(texts: string[]): string[] {
    const topicPatterns: Array<{ keywords: string[]; topic: string }> = [
      { keywords: ['价格', '多少钱', '费用', '收费', 'price', 'cost'], topic: '价格咨询' },
      { keywords: ['退货', '退款', '换货', '维修', '保修', '售后'], topic: '售后服务' },
      { keywords: ['物流', '快递', '发货', '订单', '配送'], topic: '物流订单' },
      { keywords: ['投诉', '差评', '不满', '失望', '愤怒'], topic: '投诉建议' },
      { keywords: ['使用', '操作', '怎么用', '功能', '设置'], topic: '使用指南' },
      { keywords: ['产品', '商品', '质量', '材质', '规格'], topic: '产品信息' },
      { keywords: ['人工', '真人', '转人工', '客服'], topic: '人工转接' }
    ];

    const allText = texts.join(' ').toLowerCase();
    const topics: string[] = [];

    for (const { keywords, topic } of topicPatterns) {
      if (keywords.some(k => allText.includes(k.toLowerCase()))) {
        topics.push(topic);
      }
    }

    return topics.slice(0, 5);
  }
}

export const analysisService = new AnalysisService();
