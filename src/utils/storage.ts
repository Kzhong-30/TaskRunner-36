import { Conversation, ThemeSettings } from './types';

const CONVERSATIONS_KEY = 'chatgpt_conversations';
const THEME_KEY = 'chatgpt_theme';
const ACTIVE_CONVERSATION_KEY = 'chatgpt_active_conversation';
const SIDEBAR_OPEN_KEY = 'chatgpt_sidebar_open';

export function loadConversations(): Conversation[] {
  try {
    const data = localStorage.getItem(CONVERSATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch {
    // storage full, ignore
  }
}

export function loadTheme(): ThemeSettings {
  try {
    const data = localStorage.getItem(THEME_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // ignore
  }
  return { mode: 'light', fontSize: 14, typingSpeed: 15 };
}

export function saveTheme(theme: ThemeSettings): void {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch {
    // ignore
  }
}

export function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CONVERSATION_KEY);
  } catch {
    return null;
  }
}

export function saveActiveConversationId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
    }
  } catch {
    // ignore
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function loadSidebarOpen(): boolean {
  try {
    const data = localStorage.getItem(SIDEBAR_OPEN_KEY);
    return data !== null ? data === 'true' : true;
  } catch {
    return true;
  }
}

export function saveSidebarOpen(open: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_OPEN_KEY, String(open));
  } catch {
    // ignore
  }
}
