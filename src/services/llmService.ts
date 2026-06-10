import { config } from '../config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChunk {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
}

class LLMService {
  private useMock = !config.openaiApiKey || config.openaiApiKey === 'your_openai_api_key_here';

  private mockResponses = [
    '您好，感谢您的咨询。我来帮您解答这个问题...',
    '根据您的描述，建议您可以尝试以下方案...',
    '好的，我理解您的需求。让我为您详细说明...',
    '这个问题很常见，通常有以下几种解决方式...',
    '我已经记录了您的问题，正在为您查询相关信息...'
  ];

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    if (this.useMock) {
      return this.mockGenerate(messages);
    }
    return this.callOpenAI(messages);
  }

  async *streamResponse(messages: ChatMessage[]): AsyncGenerator<StreamChunk> {
    if (this.useMock) {
      yield* this.mockStream(messages);
    } else {
      yield* this.callOpenAIStream(messages);
    }
  }

  private mockGenerate(messages: ChatMessage[]): Promise<string> {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const idx = Math.floor(Math.random() * this.mockResponses.length);
    const base = this.mockResponses[idx];
    return Promise.resolve(`${base}\n\n关于您提到的"${lastUserMsg.slice(0, 50)}"，我建议您可以联系我们的客服热线获取更详细的帮助。`);
  }

  private async *mockStream(messages: ChatMessage[]): AsyncGenerator<StreamChunk> {
    const response = await this.mockGenerate(messages);
    const chars = response.split('');
    for (let i = 0; i < chars.length; i++) {
      await new Promise(r => setTimeout(r, 20));
      yield { type: 'token', content: chars[i] };
    }
    yield { type: 'done' };
  }

  private async callOpenAI(messages: ChatMessage[]): Promise<string> {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openaiApiKey}`
        },
        body: JSON.stringify({
          model: config.openaiModel,
          messages
        })
      });
      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
    } catch (err) {
      return this.mockGenerate(messages);
    }
  }

  private async *callOpenAIStream(messages: ChatMessage[]): AsyncGenerator<StreamChunk> {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openaiApiKey}`
        },
        body: JSON.stringify({
          model: config.openaiModel,
          messages,
          stream: true
        })
      });

      const reader = res.body?.getReader();
      if (!reader) {
        yield* this.mockStream(messages);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            yield { type: 'done' };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield { type: 'token', content: delta };
            }
          } catch {}
        }
      }
      yield { type: 'done' };
    } catch (err) {
      yield* this.mockStream(messages);
    }
  }

  async summarize(text: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个对话摘要助手。请将以下对话内容提炼成一段不超过200字的简洁摘要，保留关键信息。' },
      { role: 'user', content: text }
    ];
    if (this.useMock) {
      return Promise.resolve(`对话摘要：${text.slice(0, 180)}...`);
    }
    return this.callOpenAI(messages);
  }
}

export const llmService = new LLMService();
