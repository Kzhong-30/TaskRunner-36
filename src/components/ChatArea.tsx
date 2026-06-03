import React, { useState, useRef, useEffect } from 'react';
import { useConversation } from '../contexts/ConversationContext';
import { useTheme } from '../contexts/ThemeContext';
import ChatMessage from './ChatMessage';

export default function ChatArea() {
  const { activeConversation, isGenerating, streamingContent, sendMessage, stopGeneration } = useConversation();
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, streamingContent]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    sendMessage(trimmed, theme.typingSpeed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = activeConversation?.messages ?? [];
  const hasMessages = messages.length > 0 || streamingContent;

  return (
    <div className="flex-1 flex flex-col h-full" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              ChatGPT
            </h2>
            <p className="text-center max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
              开始一段新的对话，向我提出任何问题，我会尽力为你解答。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-lg">
              {[
                { icon: '💡', text: '解释量子计算的基本原理' },
                { icon: '💻', text: '用 TypeScript 实现一个链表' },
                { icon: '📝', text: '帮我写一封求职信' },
                { icon: '🎨', text: '推荐几种配色方案' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    sendMessage(item.text, theme.typingSpeed);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl text-left text-sm transition-colors border"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {messages.map(msg => (
              <ChatMessage
                key={msg.id}
                message={msg}
                fontSize={theme.fontSize}
              />
            ))}
            {streamingContent && (
              <ChatMessage
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingContent,
                  timestamp: Date.now(),
                }}
                isStreaming
                fontSize={theme.fontSize}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-3 sm:px-4 pb-3 sm:pb-4 pt-2" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div
          className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl border px-3 sm:px-4 py-2.5 sm:py-3 transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-input)',
            borderColor: 'var(--color-border)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="发送消息..."
            rows={1}
            className="flex-1 resize-none outline-none bg-transparent leading-relaxed"
            style={{
              color: 'var(--color-text-primary)',
              fontSize: theme.fontSize,
              maxHeight: '200px',
            }}
          />

          {isGenerating ? (
            <button
              onClick={stopGeneration}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--color-text-secondary)', color: 'white' }}
              title="停止生成"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
              style={{
                backgroundColor: input.trim() ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                color: 'white',
              }}
              title="发送"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-center text-xs mt-2 opacity-50" style={{ color: 'var(--color-text-secondary)' }}>
          ChatGPT 也可能会犯错。请核查重要信息。
        </p>
      </div>
    </div>
  );
}
