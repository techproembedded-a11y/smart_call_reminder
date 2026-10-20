import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { InstallPrompt } from './components/layout/InstallPrompt';
import { ToastContainer } from './components/ui/Toast';
import type { ToastMessage } from './components/ui/Toast';
import { registerServiceWorker } from './utils/push';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { AddReminderPage } from './pages/AddReminderPage';
import { CallRecordsPage } from './pages/CallRecordsPage';
import { CalendarPage } from './pages/CalendarPage';
import { ReminderDetailsPage } from './pages/ReminderDetailsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Register service worker on initial mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', message: string, title?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
        {/* PWA Install Banner */}
        <InstallPrompt />

        {/* Global Navigation Bar */}
        <Navbar darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />

        {/* Body Layout */}
        <div className="flex-1 flex max-w-7xl w-full mx-auto pb-20 md:pb-6">
          {/* Desktop Sidebar */}
          <Sidebar />

          {/* Main Content Viewport */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-5xl">
            <Routes>
              <Route path="/" element={<DashboardPage onShowToast={showToast} />} />
              <Route path="/add" element={<AddReminderPage onShowToast={showToast} />} />
              <Route path="/calls" element={<CallRecordsPage onShowToast={showToast} />} />
              <Route path="/calendar" element={<CalendarPage onShowToast={showToast} />} />
              <Route path="/reminder/:id" element={<ReminderDetailsPage onShowToast={showToast} />} />
              <Route
                path="/settings"
                element={
                  <SettingsPage
                    darkMode={darkMode}
                    onToggleDarkMode={() => setDarkMode(!darkMode)}
                    onShowToast={showToast}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav />

        {/* Floating Toast Notification Container */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </BrowserRouter>
  );
};

export default App;
