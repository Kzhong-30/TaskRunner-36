import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Conversation, Message } from '../types';
import { loadConversations, saveConversations, generateId, loadActiveConversationId, saveActiveConversationId } from '../utils/storage';
import { getRandomResponse, simulateStream } from '../utils/aiSimulator';

interface ConversationContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  isGenerating: boolean;
  streamingContent: string;
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  setActiveConversation: (id: string | null) => void;
  sendMessage: (content: string, typingSpeed?: number) => void;
  stopGeneration: () => void;
  clearMessages: () => void;
  importConversations: (convs: Conversation[]) => number;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(loadActiveConversationId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    saveActiveConversationId(activeConversationId);
  }, [activeConversationId]);

  const activeConversation = conversations.find(c => c.id === activeConversationId) ?? null;

  const createConversation = useCallback((): string => {
    const id = generateId();
    const newConv: Conversation = {
      id,
      title: '新的对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(id);
    return id;
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    setActiveConversationId(prev => prev === id ? null : prev);
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title, updatedAt: Date.now() } : c));
  }, []);

  const setActiveConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
  }, []);

  const sendMessage = useCallback((content: string, typingSpeed: number = 15) => {
    let convId = activeConversationId;

    if (!convId) {
      const id = generateId();
      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      const newConv: Conversation = {
        id,
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        messages: [userMsg],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(id);
      convId = id;
    } else {
      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      setConversations(prev => prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() }
          : c
      ));
    }

    setIsGenerating(true);
    setStreamingContent('');

    const aiResponse = getRandomResponse();
    let accumulated = '';

    const cancel = simulateStream(
      aiResponse,
      (chunk) => {
        accumulated += chunk;
        setStreamingContent(accumulated);
      },
      () => {
        const aiMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: accumulated,
          timestamp: Date.now(),
        };
        setConversations(prev => prev.map(c =>
          c.id === convId
            ? { ...c, messages: [...c.messages, aiMsg], updatedAt: Date.now() }
            : c
        ));
        setStreamingContent('');
        setIsGenerating(false);
        cancelRef.current = null;
      },
      typingSpeed
    );

    cancelRef.current = cancel;
  }, [activeConversationId]);

  const stopGeneration = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;

      if (streamingContent) {
        const convId = activeConversationId;
        if (convId) {
          const aiMsg: Message = {
            id: generateId(),
            role: 'assistant',
            content: streamingContent,
            timestamp: Date.now(),
          };
          setConversations(prev => prev.map(c =>
            c.id === convId
              ? { ...c, messages: [...c.messages, aiMsg], updatedAt: Date.now() }
              : c
          ));
        }
      }

      setStreamingContent('');
      setIsGenerating(false);
    }
  }, [activeConversationId, streamingContent]);

  const clearMessages = useCallback(() => {
    if (!activeConversationId) return;
    setConversations(prev => prev.map(c =>
      c.id === activeConversationId
        ? { ...c, messages: [], updatedAt: Date.now() }
        : c
    ));
  }, [activeConversationId]);

  const importConversations = useCallback((convs: Conversation[]): number => {
    const existingIds = new Set(conversations.map(c => c.id));
    const newConvs = convs.filter(c => !existingIds.has(c.id));
    if (newConvs.length > 0) {
      setConversations(prev => [...newConvs, ...prev]);
    }
    return newConvs.length;
  }, [conversations]);

  return (
    <ConversationContext.Provider value={{
      conversations,
      activeConversationId,
      activeConversation,
      isGenerating,
      streamingContent,
      createConversation,
      deleteConversation,
      renameConversation,
      setActiveConversation,
      sendMessage,
      stopGeneration,
      clearMessages,
      importConversations,
    }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error('useConversation must be used within ConversationProvider');
  return ctx;
}
