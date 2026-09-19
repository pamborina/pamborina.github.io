import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'manual_guide' | 'opened_new_window' | 'failed';

let globalBannerOpen = false;
const bannerListeners = new Set<(open: boolean) => void>();

export function triggerOpenInstallBanner() {
  globalBannerOpen = true;
  bannerListeners.forEach(fn => fn(true));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pamborina_open_install_banner'));
  }
}

export function triggerCloseInstallBanner() {
  globalBannerOpen = false;
  bannerListeners.forEach(fn => fn(false));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pamborina_close_install_banner'));
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (typeof window !== 'undefined' && (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt) || null;
  });
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isSafari, setIsSafari] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isBannerOpen, setIsBannerOpen] = useState<boolean>(globalBannerOpen);

  useEffect(() => {
    const listener = (val: boolean) => setIsBannerOpen(val);
    bannerListeners.add(listener);
    const handleOpenEvt = () => setIsBannerOpen(true);
    const handleCloseEvt = () => setIsBannerOpen(false);

    window.addEventListener('pamborina_open_install_banner', handleOpenEvt);
    window.addEventListener('pamborina_close_install_banner', handleCloseEvt);

    return () => {
      bannerListeners.delete(listener);
      window.removeEventListener('pamborina_open_install_banner', handleOpenEvt);
      window.removeEventListener('pamborina_close_install_banner', handleCloseEvt);
    };
  }, []);

  useEffect(() => {
    // 1. Check if already installed or running standalone
    const checkStandalone = () => {
      if (typeof window === 'undefined') return false;
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      return Boolean(isStandaloneMedia || isNavStandalone);
    };

    const standaloneState = checkStandalone();
    setIsInstalled(standaloneState);

    // 2. Check if running inside iframe
    let inIframe = false;
    if (typeof window !== 'undefined') {
      try {
        inIframe = window.self !== window.top;
      } catch {
        inIframe = true;
      }
    }
    setIsInIframe(inIframe);

    // 3. Check session dismissal state
    const dismissedSession = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pamborina_pwa_dismissed') : null;
    if (dismissedSession === 'true') {
      setIsDismissed(true);
    }

    // 4. Detect iOS, Android, Safari, and Desktop
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(ua) || (Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 2) && /macintosh/.test(ua));
      const isSafariBrowser = isIOSDevice && /safari/.test(ua) && !/crios|fxios|edgios|optios/.test(ua);
      const isAndroidDevice = /android/.test(ua);
      const isDesktopDevice = !isIOSDevice && !isAndroidDevice;

      setIsIOS(Boolean(isIOSDevice));
      setIsSafari(Boolean(isSafariBrowser));
      setIsAndroid(Boolean(isAndroidDevice));
      setIsDesktop(Boolean(isDesktopDevice));
    }

    // 5. Synchronize beforeinstallprompt
    const syncPrompt = () => {
      const winPrompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
      if (winPrompt) {
        setDeferredPrompt(winPrompt);
      }
    };

    syncPrompt();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvt = e as BeforeInstallPromptEvent;
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = promptEvt;
      setDeferredPrompt(promptEvt);

      // Auto-open if query param ?install=now is present
      if (typeof window !== 'undefined' && window.location.search.includes('install=now')) {
        triggerOpenInstallBanner();
      }
    };

    // 6. Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') {
        (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', syncPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 7. Auto check url param ?install=now
    if (typeof window !== 'undefined' && window.location.search.includes('install=now') && !standaloneState) {
      setTimeout(async () => {
        const winPrompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
        if (winPrompt) {
          try {
            await winPrompt.prompt();
          } catch (e) {
            console.warn('Auto prompt failed:', e);
          }
        }
      }, 500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', syncPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    // 1. If running in an iframe (e.g. AI Studio preview), open in top-level window directly with install flag
    if (typeof window !== 'undefined' && window.self !== window.top) {
      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set('install', 'now');
      window.open(targetUrl.toString(), '_blank');
      return 'opened_new_window';
    }

    // 2. Get prompt directly from React state or early window capture
    const promptEvent =
      deferredPrompt ||
      (typeof window !== 'undefined'
        ? (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt || null
        : null);

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') {
            (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
          }
          return 'accepted';
        }
        return 'dismissed';
      } catch (err) {
        console.warn('PWA install prompt execution:', err);
        return 'failed';
      }
    }

    // 3. If native prompt is not available (e.g. iOS Safari, or prompt not triggered yet), require visual guide
    return 'manual_guide';
  }, [deferredPrompt]);

  const openInstallBanner = useCallback(() => {
    triggerOpenInstallBanner();
  }, []);

  const closeInstallBanner = useCallback(() => {
    triggerCloseInstallBanner();
  }, []);

  const dismiss = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pamborina_pwa_dismissed', 'true');
    }
    setIsDismissed(true);
    triggerCloseInstallBanner();
  }, []);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isSafari,
    isAndroid,
    isDesktop,
    isInIframe,
    isDismissed,
    isBannerOpen,
    openInstallBanner,
    closeInstallBanner,
    install,
    dismiss,
  };
}
