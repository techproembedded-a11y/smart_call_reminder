import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { isIOS, isStandalone } from '../../utils/push';

export const InstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppleDevice, setIsAppleDevice] = useState<boolean>(false);

  useEffect(() => {
    // Check if already installed
    if (isStandalone()) {
      return;
    }

    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      // Dismissed within last 7 days
      return;
    }

    if (isIOS()) {
      setIsAppleDevice(true);
      setShowPrompt(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_dismissed', String(Date.now()));
  };

  if (!showPrompt) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 relative shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Install Smart Call Reminder</h4>
            {isAppleDevice ? (
              <p className="text-xs text-blue-100 flex items-center gap-1.5 flex-wrap">
                <span>On iPhone Safari: Tap</span>
                <span className="inline-flex items-center gap-0.5 bg-white/20 px-1 py-0.5 rounded font-mono text-[10px]">
                  <Share className="w-3 h-3 inline" /> Share
                </span>
                <span>then</span>
                <span className="inline-flex items-center gap-0.5 bg-white/20 px-1 py-0.5 rounded font-mono text-[10px]">
                  <PlusSquare className="w-3 h-3 inline" /> Add to Home Screen
                </span>
                <span>to receive push notifications.</span>
              </p>
            ) : (
              <p className="text-xs text-blue-100">
                Install as a PWA for home screen access, offline caching, and push notifications.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isAppleDevice && deferredPrompt && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-white text-blue-600 hover:bg-blue-50 text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              Install
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1 text-white/80 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
