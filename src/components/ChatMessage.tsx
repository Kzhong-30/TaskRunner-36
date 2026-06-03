import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  fontSize?: number;
}

function CodeBlock({ language, children }: { language?: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let buttonColor: string;
  if (copied) {
    buttonColor = '#68d391';
  } else if (hovered) {
    buttonColor = '#ffffff';
  } else {
    buttonColor = '#cbd5e0';
  }

  const handleMouseEnter = () => setHovered(true);
  const handleMouseLeave = () => setHovered(false);

  return (
    <div className="relative group rounded-lg overflow-hidden my-3" style={{ backgroundColor: 'var(--color-code-bg)' }}>
      <div className="flex items-center justify-between px-4 py-2 text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <span style={{ color: '#a0aec0' }}>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 transition-colors cursor-pointer"
          style={{ color: buttonColor }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              已复制
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              复制代码
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          padding: '1rem',
          fontSize: '0.85em',
          background: 'var(--color-code-bg)',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export default function ChatMessage({ message, isStreaming, fontSize = 14 }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className="w-full py-4 sm:py-6"
      style={{ backgroundColor: isUser ? 'var(--color-bg-message-user)' : 'var(--color-bg-message-ai)' }}
    >
      <div className="max-w-3xl mx-auto px-3 sm:px-4 flex gap-3 sm:gap-4">
        <div
          className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium"
          style={{ backgroundColor: isUser ? '#5436da' : 'var(--color-accent)' }}
        >
          {isUser ? 'U' : 'AI'}
        </div>

        <div className="flex-1 min-w-0" style={{ fontSize }}>
          {isUser ? (
            <div className="whitespace-pre-wrap break-words leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
              {message.content}
            </div>
          ) : (
            <div className="markdown-body leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    if (match) {
                      return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
                    }

                    return (
                      <code
                        className="px-1.5 py-0.5 rounded text-sm"
                        style={{ backgroundColor: 'var(--color-code-bg)', color: '#e2e8f0' }}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return <p className="mb-3 last:mb-0">{children}</p>;
                  },
                  h1({ children }) {
                    return <h1 className="text-lg sm:text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-base sm:text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-sm sm:text-base font-bold mb-2 mt-3 first:mt-0">{children}</h3>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="leading-relaxed">{children}</li>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote
                        className="border-l-4 pl-4 my-3 italic opacity-80"
                        style={{ borderColor: 'var(--color-accent)' }}
                      >
                        {children}
                      </blockquote>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-3 -mx-1 px-1">
                        <table className="min-w-full border-collapse border text-xs sm:text-sm" style={{ borderColor: 'var(--color-border)' }}>
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className="px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm border" style={{ borderColor: 'var(--color-border)' }}>
                        {children}
                      </td>
                    );
                  },
                  a({ children, href }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--color-accent)' }}>
                        {children}
                      </a>
                    );
                  },
                  hr() {
                    return <hr className="my-4 border-0" style={{ borderTop: '1px solid var(--color-border)' }} />;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="typing-cursor" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
