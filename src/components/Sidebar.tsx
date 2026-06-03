import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useConversation } from '../contexts/ConversationContext';
import { useToast } from '../contexts/ToastContext';
import { exportConversationJSON, exportConversationMarkdown } from '../utils/export';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface SidebarRef {
  focusSearch: () => void;
}

const Sidebar = forwardRef<SidebarRef, SidebarProps>(function Sidebar({ isOpen, onClose }, ref) {
  const {
    conversations,
    activeConversationId,
    createConversation,
    deleteConversation,
    renameConversation,
    setActiveConversation,
  } = useConversation();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      searchInputRef.current?.focus();
    },
  }));

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    if (menuOpenId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpenId]);

  const keywords = searchQuery
    .trim()
    .split(/\s+/)
    .filter(k => k.length > 0)
    .map(k => k.toLowerCase());

  const filtered = conversations.filter(c => {
    if (keywords.length === 0) return true;
    const titleLower = c.title.toLowerCase();
    const contentLower = c.messages.map(m => m.content.toLowerCase()).join(' ');
    const searchable = titleLower + ' ' + contentLower;
    return keywords.every(kw => searchable.includes(kw));
  });

  const handleNewChat = () => {
    createConversation();
  };

  const handleSelect = (id: string) => {
    setActiveConversation(id);
  };

  const handleStartRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
    setMenuOpenId(null);
  };

  const handleFinishRename = () => {
    if (editingId && editTitle.trim()) {
      renameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = (id: string) => {
    deleteConversation(id);
    setMenuOpenId(null);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:relative z-30 h-full w-[280px] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--color-bg-sidebar)' }}
      >
        <div className="p-3 flex-shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-white/20 text-sm transition-colors hover:bg-white/10"
            style={{ color: 'var(--color-text-sidebar)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新建对话
          </button>
        </div>

        <div className="px-3 pb-2 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-sidebar-secondary)' }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="搜索对话... (⌘K)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md text-sm outline-none transition-colors placeholder:opacity-50"
              style={{
                backgroundColor: 'var(--color-bg-hover)',
                color: 'var(--color-text-sidebar)',
                border: '1px solid var(--color-border-sidebar)',
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 && (
            <p className="text-center text-xs mt-4 opacity-50" style={{ color: 'var(--color-text-sidebar-secondary)' }}>
              {searchQuery ? '未找到匹配的对话' : '暂无对话'}
            </p>
          )}
          {filtered.map(conv => (
            <div
              key={conv.id}
              className={`group relative flex items-center rounded-lg mb-0.5 cursor-pointer transition-colors ${
                conv.id === activeConversationId ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
              onClick={() => handleSelect(conv.id)}
            >
              {editingId === conv.id ? (
                <input
                  ref={editInputRef}
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleFinishRename();
                    if (e.key === 'Escape') {
                      setEditingId(null);
                      setEditTitle('');
                    }
                  }}
                  className="flex-1 px-3 py-2.5 text-sm rounded-lg outline-none bg-white/10"
                  style={{ color: 'var(--color-text-sidebar)' }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  <div className="flex-1 px-3 py-2.5 text-sm truncate" style={{ color: 'var(--color-text-sidebar)' }}>
                    {conv.title}
                  </div>
                  <div
                    className={`flex-shrink-0 pr-1 ${
                      menuOpenId === conv.id ? 'flex' : 'hidden group-hover:flex'
                    } items-center gap-0.5`}
                  >
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                      }}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      style={{ color: 'var(--color-text-sidebar-secondary)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>
                  </div>

                  {menuOpenId === conv.id && (
                    <div
                      className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[140px]"
                      style={{ backgroundColor: 'var(--color-bg-hover)', border: '1px solid var(--color-border-sidebar)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleStartRename(conv.id, conv.title)}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--color-text-sidebar)' }}
                      >
                        重命名
                      </button>
                      <button
                        onClick={() => { exportConversationJSON(conv); setMenuOpenId(null); showToast('已导出 1 个会话'); }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--color-text-sidebar)' }}
                      >
                        导出 JSON
                      </button>
                      <button
                        onClick={() => { exportConversationMarkdown(conv); setMenuOpenId(null); showToast('已导出 1 个会话'); }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--color-text-sidebar)' }}
                      >
                        导出 Markdown
                      </button>
                      <div className="my-1" style={{ borderTop: '1px solid var(--color-border-sidebar)' }} />
                      <button
                        onClick={() => handleDelete(conv.id)}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 text-red-400 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div
          className="flex-shrink-0 p-3 border-t"
          style={{ borderColor: 'var(--color-border-sidebar)' }}
        >
          <div className="flex items-center gap-2 px-2 text-xs" style={{ color: 'var(--color-text-sidebar-secondary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            ChatGPT UI
          </div>
        </div>
      </aside>
    </>
  );
});

export default Sidebar;
