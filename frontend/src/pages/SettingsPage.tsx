import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import {
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentPushSubscription,
  isIOS,
  isStandalone,
} from '../utils/push';
import {
  Bell,
  Sun,
  ShieldCheck,
  Smartphone,
  Send,
  Globe,
  Sliders,
} from 'lucide-react';

interface SettingsPageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  darkMode,
  onToggleDarkMode,
  onShowToast,
}) => {
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loadingPush, setLoadingPush] = useState<boolean>(false);
  const [sendingTest, setSendingTest] = useState<boolean>(false);

  // Timezone and preference
  const [defaultLeadDays, setDefaultLeadDays] = useState<number>(() => {
    return Number(localStorage.getItem('default_lead_days') || '1');
  });

  const [selectedTimezone, setSelectedTimezone] = useState<string>(() => {
    return (
      localStorage.getItem('user_timezone') ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'Asia/Kolkata'
    );
  });

  const checkNotificationStatus = async () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    const sub = await getCurrentPushSubscription();
    setIsSubscribed(!!sub);
  };

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const handleTogglePush = async () => {
    setLoadingPush(true);
    try {
      if (isSubscribed) {
        const res = await unsubscribeFromPush();
        if (res.success) {
          setIsSubscribed(false);
          onShowToast('info', 'Push notifications disabled on this device.');
        } else {
          onShowToast('error', res.message || 'Failed to disable notifications.');
        }
      } else {
        const res = await subscribeToPush();
        if (res.success) {
          setIsSubscribed(true);
          setNotificationPermission('granted');
          onShowToast('success', 'Push notifications enabled successfully!');
        } else {
          onShowToast('error', res.message || 'Could not enable push notifications.');
        }
      }
    } finally {
      setLoadingPush(false);
      checkNotificationStatus();
    }
  };

  const handleSendTestNotification = async () => {
    try {
      setSendingTest(true);
      const res = await api.sendTestNotification({
        title: '🔔 Test Call Reminder',
        body: 'Push notifications are operating normally on your device!',
      });
      if (res.success) {
        onShowToast('success', `Test push sent to ${res.dispatched} device(s)!`);
      } else {
        onShowToast('error', res.message || 'No active device subscriptions found.');
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to send test notification.');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('default_lead_days', String(defaultLeadDays));
    localStorage.setItem('user_timezone', selectedTimezone);
    onShowToast('success', 'Preferences saved locally.');
  };

  const isApple = isIOS();
  const standalone = isStandalone();

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Application Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize notifications, privacy safeguards, and interface preferences.
        </p>
      </div>

      {/* 1. Theme Configuration */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Appearance</span>
        </h2>

        <div className="flex items-center justify-between pt-1">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Dark Theme</h3>
            <p className="text-xs text-slate-500">
              Toggle between modern crisp white and dark navy modes.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              darkMode ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
          </button>
        </div>
      </div>

      {/* 2. Web Push Notifications */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <span>Web Push Notifications</span>
          </h2>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              notificationPermission === 'granted'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
            }`}
          >
            Permission: {notificationPermission}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Smart Call Reminder utilizes the browser Web Push API to send deadline reminders even when the application tab is closed.
        </p>

        {isApple && !standalone && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>iOS Web Push Requirement:</span>
            </div>
            <p>
              Apple Safari on iOS 16.4+ enables Web Push notifications exclusively for applications added to the Home Screen. Please tap <strong>Share</strong> 📤 &rarr; <strong>Add to Home Screen</strong> ➕, then open the installed icon to subscribe.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleTogglePush}
            disabled={loadingPush}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isSubscribed
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>{isSubscribed ? 'Disable Push on This Device' : 'Enable Web Push Notifications'}</span>
          </button>

          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={sendingTest}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>Send Test Notification</span>
          </button>
        </div>
      </div>

      {/* 3. Scheduling & Timezone Preferences */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span>Reminder Preferences</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Default Lead Time (Days)
            </label>
            <select
              value={defaultLeadDays}
              onChange={(e) => setDefaultLeadDays(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
            >
              <option value={0}>At due time only (0 days)</option>
              <option value={1}>1 day in advance</option>
              <option value={2}>2 days in advance</option>
              <option value={3}>3 days in advance</option>
              <option value={5}>5 days in advance</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Active Timezone
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSavePreferences}
          className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-opacity"
        >
          Save Preferences
        </button>
      </div>

      {/* 4. Strict Privacy Architecture Card */}
      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
            Privacy Protection Guarantee
          </h2>
        </div>

        <ul className="text-xs text-emerald-800 dark:text-emerald-300/90 space-y-1.5 leading-relaxed">
          <li className="flex items-start gap-1.5">
            <span className="font-bold text-emerald-600">•</span>
            <span><strong>Zero Contact Access:</strong> We never request permissions to inspect your device address book.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="font-bold text-emerald-600">•</span>
            <span><strong>No Contact Names:</strong> All reminders are identified strictly by phone number and call timestamp.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="font-bold text-emerald-600">•</span>
            <span><strong>Automatic Audio Purge:</strong> Uploaded voice recordings are temporarily held for transcription and purged immediately unless explicit retention is enabled.</span>
          </li>
        </ul>
      </div>

      {/* 5. iPhone & PWA Guide */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Smartphone className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold">iPhone (iOS Safari) Installation Guide</h2>
        </div>

        <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside leading-relaxed">
          <li>Open <strong>Smart Call Reminder</strong> in Apple Safari on your iPhone.</li>
          <li>Tap the <strong>Share</strong> button (box with an arrow pointing up) at the bottom toolbar.</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
          <li>Confirm by tapping <strong>Add</strong> at the top right.</li>
          <li>Launch the app from your home screen and enable notifications when prompted.</li>
        </ol>
      </div>
    </div>
  );
};
