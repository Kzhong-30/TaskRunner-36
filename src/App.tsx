import { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConversationProvider } from './contexts/ConversationContext';
import { ToastProvider } from './contexts/ToastContext';
import Sidebar, { SidebarRef } from './components/Sidebar';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import SettingsPanel from './components/SettingsPanel';
import { loadSidebarOpen, saveSidebarOpen } from './utils/storage';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(loadSidebarOpen);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sidebarRef = useRef<SidebarRef>(null);

  useEffect(() => {
    saveSidebarOpen(sidebarOpen);
  }, [sidebarOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSidebarOpen(true);
        setTimeout(() => {
          sidebarRef.current?.focusSearch();
        }, 100);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Sidebar ref={sidebarRef} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-full min-w-0">
        <Header
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <ChatArea />
      </div>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ConversationProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ConversationProvider>
    </ThemeProvider>
  );
}
