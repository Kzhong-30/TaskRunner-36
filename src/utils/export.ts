import { Conversation } from '../types';

export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

export function exportConversationJSON(conv: Conversation): void {
  const data = JSON.stringify(conv, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(conv.title)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportConversationMarkdown(conv: Conversation): void {
  const lines: string[] = [`# ${conv.title}`, ''];
  for (const msg of conv.messages) {
    const label = msg.role === 'user' ? '**用户**' : '**AI**';
    lines.push(`${label}:`, '');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(conv.title)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAllConversationsJSON(conversations: Conversation[]): void {
  const data = JSON.stringify(conversations, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chatgpt_all_conversations_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAllConversationsMarkdown(conversations: Conversation[]): void {
  const lines: string[] = ['# 全部对话记录', ''];
  for (const conv of conversations) {
    lines.push(`## ${conv.title}`, '');
    for (const msg of conv.messages) {
      const label = msg.role === 'user' ? '**用户**' : '**AI**';
      lines.push(`${label}:`, '');
      lines.push(msg.content);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chatgpt_all_conversations_${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
