import { Message } from '../models';
import { config } from '../config';
import { llmService, ChatMessage } from './llmService';

export interface ContextResult {
  messages: ChatMessage[];
  needSummary: boolean;
  summary?: string;
}

class ContextManager {
  private maxRounds: number;

  constructor() {
    this.maxRounds = config.maxHistoryRounds;
  }

  async buildContext(conversationId: string, systemPrompt?: string): Promise<ContextResult> {
    const dbMessages = await Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']]
    });

    const userAssistantPairs = this.extractPairs(dbMessages);
    const totalPairs = userAssistantPairs.length;

    let summary: string | undefined;
    let recentMessages: typeof dbMessages;

    if (totalPairs > this.maxRounds) {
      const overflowCount = totalPairs - this.maxRounds;
      const overflowEndIdx = overflowCount * 2;
      const toSummarize = dbMessages.slice(0, overflowEndIdx);
      summary = await this.summarizeMessages(toSummarize);
      recentMessages = dbMessages.slice(overflowEndIdx);
    } else {
      recentMessages = dbMessages;
    }

    const chatMessages: ChatMessage[] = [];

    let finalPrompt = systemPrompt || '你是一个智能客服助手，礼貌、专业地回答用户的问题。';
    if (summary) {
      finalPrompt += `\n\n【历史对话摘要】：${summary}`;
    }
    chatMessages.push({ role: 'system', content: finalPrompt });

    for (const msg of recentMessages) {
      const role: 'user' | 'assistant' | 'system' =
        msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'system';
      chatMessages.push({ role, content: msg.content });
    }

    return {
      messages: chatMessages,
      needSummary: !!summary,
      summary
    };
  }

  private extractPairs(messages: Message[]): Array<[Message, Message]> {
    const pairs: Array<[Message, Message]> = [];
    let userMsg: Message | null = null;

    for (const msg of messages) {
      if (msg.role === 'user') {
        userMsg = msg;
      } else if (msg.role === 'assistant' && userMsg) {
        pairs.push([userMsg, msg]);
        userMsg = null;
      }
    }

    return pairs;
  }

  private async summarizeMessages(messages: Message[]): Promise<string> {
    const text = messages
      .map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
      .join('\n');
    return llmService.summarize(text);
  }
}

export const contextManager = new ContextManager();
