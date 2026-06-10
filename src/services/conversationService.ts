import { Conversation, Message } from '../models';
import { contextManager } from './contextManager';
import { llmService, ChatMessage } from './llmService';
import { knowledgeService, KnowledgeMatch } from './knowledgeService';
import { intentService, IntentDetectionResult } from './intentService';
import { analysisService } from './analysisService';

export interface HumanAgentEvent {
  conversationId: string;
  userId: string;
  userMessage: string;
  history: Array<{ role: string; content: string }>;
  timestamp: Date;
}

export type HumanAgentListener = (event: HumanAgentEvent) => void;

class ConversationService {
  private humanAgentListeners: HumanAgentListener[] = [];

  onHumanAgentRequest(listener: HumanAgentListener) {
    this.humanAgentListeners.push(listener);
    return () => {
      this.humanAgentListeners = this.humanAgentListeners.filter(l => l !== listener);
    };
  }

  private notifyHumanAgent(event: HumanAgentEvent) {
    for (const listener of this.humanAgentListeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[HumanAgent] Listener error:', e);
      }
    }
  }

  async createConversation(userId?: string): Promise<Conversation> {
    return Conversation.create({
      userId: userId || `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'active',
      metadata: { createdAt: new Date().toISOString() }
    });
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return Conversation.findByPk(id);
  }

  async listConversations(page = 1, pageSize = 20): Promise<{ rows: Conversation[]; count: number }> {
    return Conversation.findAndCountAll({
      order: [['updatedAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']]
    });
  }

  async processMessage(
    conversationId: string,
    userContent: string,
    onToken?: (chunk: string) => void
  ): Promise<{ reply: string; intentResult: IntentDetectionResult; knowledgeMatches: KnowledgeMatch[]; humanTransfer: boolean }> {
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.status === 'waiting_for_human') {
      await Message.create({
        conversationId,
        role: 'user',
        content: userContent
      });
      return {
        reply: '您的对话已转接人工客服，客服人员会尽快为您处理，请稍候。',
        intentResult: { intent: 'human_transfer', displayName: '人工转接', confidence: 1, matchedTokens: [] },
        knowledgeMatches: [],
        humanTransfer: true
      };
    }

    const userMessage = await Message.create({
      conversationId,
      role: 'user',
      content: userContent,
      emotion: analysisService.analyzeSentiment(userContent).label
    });

    const intentResult = await intentService.detect(userContent);

    if (!conversation.intent) {
      await conversation.update({ intent: intentResult.intent });
    }

    const knowledgeMatches = await knowledgeService.search(userContent);

    let systemPrompt = this.buildSystemPrompt(intentResult, knowledgeMatches);

    const ctxResult = await contextManager.buildContext(conversationId, systemPrompt);

    const llmMessages: ChatMessage[] = ctxResult.messages;

    let humanTransfer = false;
    let reply = '';

    if (intentResult.intent === 'human_transfer' && intentResult.confidence >= 0.5) {
      humanTransfer = true;
      reply = '好的，已为您转接人工客服。请稍候，客服人员会尽快为您服务。';
    } else if (knowledgeMatches.length > 0 && knowledgeMatches[0].score >= 0.6) {
      reply = this.buildKnowledgeReply(knowledgeMatches);
    } else {
      if (onToken) {
        for await (const chunk of llmService.streamResponse(llmMessages)) {
          if (chunk.type === 'token' && chunk.content) {
            reply += chunk.content;
            onToken(chunk.content);
          } else if (chunk.type === 'error') {
            throw new Error(chunk.error || 'LLM error');
          }
        }
      } else {
        reply = await llmService.generateResponse(llmMessages);
      }

      if (this.isUnanswered(reply, knowledgeMatches.length)) {
        humanTransfer = true;
        reply += '\n\n由于该问题较为复杂，已为您转接人工客服，稍后会有客服人员为您处理。';
      }
    }

    if (onToken && knowledgeMatches.length > 0 && knowledgeMatches[0].score >= 0.6) {
      for (const char of reply) {
        onToken(char);
        await new Promise(r => setTimeout(r, 10));
      }
    }

    const assistantMessage = await Message.create({
      conversationId,
      role: humanTransfer ? 'assistant' : 'assistant',
      content: reply,
      metadata: {
        intent: intentResult,
        knowledgeMatched: knowledgeMatches.map(k => ({ id: k.knowledge.id, score: k.score, method: k.matchedBy })),
        fromKnowledge: knowledgeMatches.length > 0 && knowledgeMatches[0].score >= 0.6
      }
    });

    if (ctxResult.needSummary && ctxResult.summary) {
      await conversation.update({ summary: ctxResult.summary });
    }

    if (humanTransfer) {
      await conversation.update({ status: 'waiting_for_human' });
      const history = (await this.getMessages(conversationId)).map(m => ({
        role: m.role,
        content: m.content
      }));
      this.notifyHumanAgent({
        conversationId,
        userId: conversation.userId,
        userMessage: userContent,
        history,
        timestamp: new Date()
      });
    }

    return { reply, intentResult, knowledgeMatches, humanTransfer };
  }

  async addHumanReply(conversationId: string, agentName: string, content: string): Promise<Message> {
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    await conversation.update({ assignedAgent: agentName });

    return Message.create({
      conversationId,
      role: 'human',
      content,
      metadata: { agentName }
    });
  }

  async closeConversation(conversationId: string, satisfactionScore?: number): Promise<Conversation> {
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    await conversation.update({
      status: 'closed',
      satisfactionScore: satisfactionScore !== undefined ? satisfactionScore : conversation.satisfactionScore
    });
    return conversation;
  }

  private buildSystemPrompt(intent: IntentDetectionResult, matches: KnowledgeMatch[]): string {
    let prompt = '你是一个智能客服助手，礼貌、专业、耐心地回答用户问题。\n\n';

    prompt += `【当前识别意图】：${intent.displayName} (置信度 ${(intent.confidence * 100).toFixed(1)}%)\n`;

    if (matches.length > 0) {
      prompt += `\n【知识库匹配结果】：\n`;
      matches.slice(0, 2).forEach((m, i) => {
        prompt += `${i + 1}. Q: ${m.knowledge.question}\n   A: ${m.knowledge.answer}\n   (匹配度: ${(m.score * 100).toFixed(1)}%)\n`;
      });
      prompt += '如果知识库中有合适答案，请基于知识库回答；如果匹配度低，则使用通用知识。\n';
    }

    switch (intent.intent) {
      case 'complaint':
        prompt += '\n用户可能有情绪，请先表达理解和歉意，再解决问题。';
        break;
      case 'after_sales':
        prompt += '\n请提供明确的售后流程，包括退货、换货、保修政策说明。';
        break;
      case 'order_query':
        prompt += '\n请引导用户提供订单号以便查询，若已有信息则直接回答。';
        break;
      case 'human_transfer':
        prompt += '\n用户要求人工服务，请礼貌告知已转接。';
        break;
    }

    prompt += '\n回答要简洁明了，不超过300字。如需更多信息，引导用户提供。';
    return prompt;
  }

  private buildKnowledgeReply(matches: KnowledgeMatch[]): string {
    const top = matches[0];
    let reply = top.knowledge.answer;

    if (matches.length > 1 && matches[1].score >= 0.45) {
      reply += `\n\n您可能还想了解：${matches[1].knowledge.question}\n${matches[1].knowledge.answer.slice(0, 100)}...`;
    }

    reply += `\n\n（以上答案来自知识库，匹配度 ${(top.score * 100).toFixed(1)}%）`;
    return reply;
  }

  private isUnanswered(reply: string, knowledgeCount: number): boolean {
    const patterns = [
      /我(不太|无法|不能|暂时)?(理解|明白|清楚|确定|回答|知道)/,
      /抱歉.*(无法|不能|暂时)/,
      /没有(相关|找到|查到|这个)/,
      /建议您联系(人工|客服)/,
      /转接人工/,
      /(不太|不是很|确实不知道)/
    ];
    const matched = patterns.some(p => p.test(reply));
    return matched && knowledgeCount === 0;
  }
}

export const conversationService = new ConversationService();
