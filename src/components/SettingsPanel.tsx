import React, { useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useConversation } from '../contexts/ConversationContext';
import { useToast } from '../contexts/ToastContext';
import { exportConversationJSON, exportConversationMarkdown, exportAllConversationsJSON, exportAllConversationsMarkdown } from '../utils/export';
import { Conversation } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { theme, setMode, setFontSize, setTypingSpeed } = useTheme();
  const { activeConversation, conversations, clearMessages, importConversations } = useConversation();
  const { showToast } = useToast();
  const [exportMenu, setExportMenu] = useState<'current' | 'all' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportCurrent = (format: 'json' | 'md') => {
    if (!activeConversation) return;
    if (format === 'json') {
      exportConversationJSON(activeConversation);
    } else {
      exportConversationMarkdown(activeConversation);
    }
    setExportMenu(null);
    showToast('已导出 1 个会话');
  };

  const handleExportAll = (format: 'json' | 'md') => {
    if (format === 'json') {
      exportAllConversationsJSON(conversations);
    } else {
      exportAllConversationsMarkdown(conversations);
    }
    setExportMenu(null);
    showToast(`已导出 ${conversations.length} 个会话`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const convs: Conversation[] = Array.isArray(data) ? data : [data];
      const imported = importConversations(convs);
      showToast(imported > 0 ? `已导入 ${imported} 个会话` : '无新会话可导入');
    } catch {
      showToast('导入失败：文件格式错误');
    } finally {
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-[340px] z-50 shadow-xl overflow-y-auto"
        style={{ backgroundColor: 'var(--color-bg-primary)', borderLeft: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>设置</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
              主题
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer ${
                  theme.mode === 'light' ? 'ring-2' : ''
                }`}
                style={{
                  borderColor: theme.mode === 'light' ? 'var(--color-accent)' : 'var(--color-border)',
                  ringColor: 'var(--color-accent)',
                  color: 'var(--color-text-primary)',
                  backgroundColor: theme.mode === 'light' ? 'var(--color-bg-secondary)' : 'transparent',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                亮色
              </button>
              <button
                onClick={() => setMode('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer ${
                  theme.mode === 'dark' ? 'ring-2' : ''
                }`}
                style={{
                  borderColor: theme.mode === 'dark' ? 'var(--color-accent)' : 'var(--color-border)',
                  ringColor: 'var(--color-accent)',
                  color: 'var(--color-text-primary)',
                  backgroundColor: theme.mode === 'dark' ? 'var(--color-bg-secondary)' : 'transparent',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                暗色
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
              字体大小: {theme.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="20"
              value={theme.fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              <span>小</span>
              <span>大</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
              字符间隔: {theme.typingSpeed}ms
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={theme.typingSpeed}
              onChange={e => setTypingSpeed(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              <span>更快</span>
              <span>更慢</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
              数据
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              className="w-full py-2.5 rounded-lg border text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 mb-3"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              导入 JSON
            </button>

            {activeConversation && activeConversation.messages.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => setExportMenu(exportMenu === 'current' ? null : 'current')}
                  className="w-full py-2.5 rounded-lg border text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  导出当前会话
                </button>
                {exportMenu === 'current' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleExportCurrent('json')}
                      className="flex-1 py-2 rounded-lg border text-xs transition-colors cursor-pointer hover:opacity-80"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      JSON
                    </button>
                    <button
                      onClick={() => handleExportCurrent('md')}
                      className="flex-1 py-2 rounded-lg border text-xs transition-colors cursor-pointer hover:opacity-80"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      Markdown
                    </button>
                  </div>
                )}
              </div>
            )}

            {conversations.length > 0 && (
              <div>
                <button
                  onClick={() => setExportMenu(exportMenu === 'all' ? null : 'all')}
                  className="w-full py-2.5 rounded-lg border text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  导出所有会话 ({conversations.length})
                </button>
                {exportMenu === 'all' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleExportAll('json')}
                      className="flex-1 py-2 rounded-lg border text-xs transition-colors cursor-pointer hover:opacity-80"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      JSON
                    </button>
                    <button
                      onClick={() => handleExportAll('md')}
                      className="flex-1 py-2 rounded-lg border text-xs transition-colors cursor-pointer hover:opacity-80"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      Markdown
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
              快捷键
            </label>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1">
                <span style={{ color: 'var(--color-text-secondary)' }}>搜索会话</span>
                <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}>
                  ⌘ K
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span style={{ color: 'var(--color-text-secondary)' }}>发送消息</span>
                <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}>
                  Enter
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span style={{ color: 'var(--color-text-secondary)' }}>换行</span>
                <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}>
                  Shift Enter
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span style={{ color: 'var(--color-text-secondary)' }}>停止生成</span>
                <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}>
                  Esc
                </span>
              </div>
            </div>
          </div>

          <div
            className="pt-4"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
              危险操作
            </label>
            <button
              onClick={() => {
                if (window.confirm('确定要清空当前会话的所有消息吗？')) {
                  clearMessages();
                  onClose();
                }
              }}
              className="w-full py-2.5 rounded-lg border border-red-500/50 text-red-500 text-sm transition-colors hover:bg-red-500 hover:text-white cursor-pointer"
            >
              清空当前会话
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
