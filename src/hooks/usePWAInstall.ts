import { useCallback, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

let capturedPrompt: BeforeInstallPromptEvent | null =
  typeof window !== 'undefined' ? window.__pwaInstallPrompt ?? null : null;

const promptListeners = new Set<(event: BeforeInstallPromptEvent | null) => void>();

function syncGlobalPrompt(evt: BeforeInstallPromptEvent | null) {
  capturedPrompt = evt;
  if (typeof window !== 'undefined') {
    window.__pwaInstallPrompt = evt;
  }
  promptListeners.forEach((listener) => listener(evt));
}

if (typeof window !== 'undefined') {
  if (window.__pwaInstallPrompt) {
    capturedPrompt = window.__pwaInstallPrompt;
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    syncGlobalPrompt(e as BeforeInstallPromptEvent);
  });

  window.addEventListener('pwa-prompt-ready', () => {
    if (window.__pwaInstallPrompt) {
      syncGlobalPrompt(window.__pwaInstallPrompt);
    }
  });

  window.addEventListener('appinstalled', () => {
    syncGlobalPrompt(null);
  });

  window.addEventListener('pwa-app-installed', () => {
    syncGlobalPrompt(null);
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => capturedPrompt || (typeof window !== 'undefined' ? window.__pwaInstallPrompt ?? null : null),
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSNonSafari, setIsIOSNonSafari] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent;
    const lowerUa = ua.toLowerCase();
    const iosDevice =
      /iphone|ipad|ipod/.test(lowerUa) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iosDevice);

    const inApp =
      /fbav|fban|instagram|whatsapp|line\/|micromessenger|gsa\/|bytedance|tiktok/i.test(ua) ||
      /\bwv\b/.test(lowerUa);
    setIsInAppBrowser(inApp);

    if (iosDevice) {
      const nonSafari = /crios|fxios|edgios|opios|gsa\//i.test(ua);
      setIsIOSNonSafari(nonSafari);
    }

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    const current = capturedPrompt || window.__pwaInstallPrompt || null;
    if (current) {
      setDeferredPrompt(current);
    }

    const listener = (evt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(evt);
    };
    promptListeners.add(listener);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-app-installed', handleAppInstalled);

    return () => {
      promptListeners.delete(listener);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-app-installed', handleAppInstalled);
    };
  }, []);

  const triggerPrompt = useCallback(async (promptEvent: BeforeInstallPromptEvent) => {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      syncGlobalPrompt(null);
      setIsInstalled(true);
      return true;
    }
    return false;
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const immediate = deferredPrompt || capturedPrompt || window.__pwaInstallPrompt || null;
    if (immediate) {
      const accepted = await triggerPrompt(immediate);
      return accepted ? 'accepted' : 'dismissed';
    }

    // Wait briefly in case Service Worker just activated and beforeinstallprompt fires right after
    const awaitedPrompt = await new Promise<BeforeInstallPromptEvent | null>((resolve) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          promptListeners.delete(onReady);
          resolve(null);
        }
      }, 900);

      const onReady = (evt: BeforeInstallPromptEvent | null) => {
        if (!settled && evt) {
          settled = true;
          window.clearTimeout(timer);
          promptListeners.delete(onReady);
          resolve(evt);
        }
      };

      promptListeners.add(onReady);
    });

    if (awaitedPrompt) {
      const accepted = await triggerPrompt(awaitedPrompt);
      return accepted ? 'accepted' : 'dismissed';
    }

    return 'unavailable';
  }, [deferredPrompt, triggerPrompt]);

  return {
    isInstallable: Boolean(
      deferredPrompt || capturedPrompt || (typeof window !== 'undefined' && window.__pwaInstallPrompt),
    ),
    isInstalled,
    isIOS,
    isIOSNonSafari,
    isInAppBrowser,
    isInIframe,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
