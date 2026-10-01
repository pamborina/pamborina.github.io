import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Standard BeforeInstallPromptEvent interface according to W3C Manifest Incubator Specs
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Result structure returned after triggering the PWA install prompt
 */
export interface InstallPromptResult {
  outcome: 'accepted' | 'dismissed' | 'iframe_blocked' | 'unsupported' | 'already_installed' | 'error';
  message?: string;
  platform?: string;
  error?: unknown;
}

/**
 * Snapshot of the current PWA environment and lifecycle state
 */
export interface PWAEnvironmentState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isTopLevelWindow: boolean;
  isInIframe: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  isOnline: boolean;
  hasDeferredPrompt: boolean;
}

/**
 * Helper to safely check if the current window is the top-level browsing context.
 * Guards against cross-origin SecurityError when accessing window.top.
 */
export function isTopLevelWindowContext(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.top === window.self;
  } catch {
    // Cross-origin iframe will throw a DOMException / SecurityError
    return false;
  }
}

/**
 * Helper to detect if the web app is running in standalone PWA display mode
 */
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    const isStandaloneNav = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const isFullscreenMedia = window.matchMedia('(display-mode: fullscreen)').matches;
    const isMinimalUiMedia = window.matchMedia('(display-mode: minimal-ui)').matches;
    return Boolean(isStandaloneMedia || isStandaloneNav || isFullscreenMedia || isMinimalUiMedia);
  } catch {
    return false;
  }
}

/**
 * Detect user operating system / platform environment
 */
export function detectPWAEnvironment() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isDesktop: true,
      isInIframe: false,
      isTopLevelWindow: true,
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 2) && /macintosh/.test(ua));
  const isAndroid = /android/.test(ua);
  const isDesktop = !isIOS && !isAndroid;
  const isTopWindow = isTopLevelWindowContext();
  const isInIframe = !isTopWindow;

  return {
    isIOS,
    isAndroid,
    isDesktop,
    isInIframe,
    isTopLevelWindow: isTopWindow,
  };
}

/**
 * Conditional developer console logger
 */
function logPWADev(message: string, ...args: unknown[]) {
  const isDev =
    (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') ||
    Boolean(import.meta?.env?.DEV);

  if (isDev) {
    // Styled development log for clarity
    console.log(`%c[usePWA]%c ${message}`, 'color: #D4AF37; font-weight: bold;', 'color: inherit;', ...args);
  }
}

function warnPWADev(message: string, ...args: unknown[]) {
  const isDev =
    (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') ||
    Boolean(import.meta?.env?.DEV);

  if (isDev) {
    console.warn(`%c[usePWA ⚠️]%c ${message}`, 'color: #f59e0b; font-weight: bold;', 'color: inherit;', ...args);
  }
}

/**
 * Custom React Hook: `usePWA`
 *
 * Listens for the browser `beforeinstallprompt` event and exposes a method to trigger the installation prompt.
 * Strictly verifies `window.top === window.self` to prevent execution inside nested iframes.
 * Provides comprehensive console logging for tracking the PWA environment state during development.
 */
export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isRunningStandalone());
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  deferredPromptRef.current = deferredPrompt;

  const env = detectPWAEnvironment();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isTop = isTopLevelWindowContext();
    const isStandalone = isRunningStandalone();

    // Development Environment Diagnostics Logging
    logPWADev('Mounting usePWA hook. Initial environment diagnostics:', {
      isTopLevelWindow: isTop,
      windowTopEqualsSelf: window.top === window.self,
      isInIframe: !isTop,
      isStandalone,
      isIOS: env.isIOS,
      isAndroid: env.isAndroid,
      isDesktop: env.isDesktop,
      isOnline: navigator.onLine,
      hasServiceWorker: 'serviceWorker' in navigator,
    });

    // 1. Safety Check: Verify top-level browsing context (window.top === window.self)
    if (!isTop) {
      warnPWADev(
        'Execution inside an iframe detected (window.top !== window.self). ' +
        'PWA installation listeners & prompt execution are disabled inside embedded frames to prevent security violations.'
      );
      setIsInstallable(false);
      return;
    }

    // 2. Check if already running in standalone PWA mode
    if (isStandalone) {
      logPWADev('Application is running in standalone mode (already installed).');
      setIsInstalled(true);
      setIsInstallable(false);
    }

    // 3. Check for early captured prompt on window object (e.g. from early script in index.html)
    const earlyPrompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
    if (earlyPrompt && !isStandalone) {
      logPWADev('Found early-captured "beforeinstallprompt" event on window.__pwaInstallPrompt.');
      setDeferredPrompt(earlyPrompt);
      setIsInstallable(true);
    }

    // 4. Native `beforeinstallprompt` event listener
    const handleBeforeInstallPrompt = (event: Event) => {
      // Re-verify iframe safety on event arrival
      if (!isTopLevelWindowContext()) {
        warnPWADev('Ignored "beforeinstallprompt" event because window is inside an iframe.');
        return;
      }

      // Prevent the default mini-infobar or ambient banner
      event.preventDefault();

      const pwaPromptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(pwaPromptEvent);
      setIsInstallable(true);

      // Store in window for interoperability
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = pwaPromptEvent;

      logPWADev('📥 "beforeinstallprompt" event received and captured! Application is installable.', {
        platforms: pwaPromptEvent.platforms,
        timestamp: new Date().toISOString(),
      });
    };

    // 5. Native `appinstalled` event listener
    const handleAppInstalled = () => {
      logPWADev('🎉 "appinstalled" event received! PWA was successfully installed to the user device.');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
    };

    // 6. Custom `pwa-prompt-ready` event listener for early script synchronization
    const handleCustomPromptReady = () => {
      const prompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
      if (prompt && !isRunningStandalone() && isTopLevelWindowContext()) {
        logPWADev('📥 "pwa-prompt-ready" custom event handled with active prompt.');
        setDeferredPrompt(prompt);
        setIsInstallable(true);
      }
    };

    // 7. Standalone display-mode media query change listener
    let mediaQueryList: MediaQueryList | null = null;
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      logPWADev(`Display mode changed: standalone matches = ${e.matches}`);
      if (e.matches) {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    };

    try {
      mediaQueryList = window.matchMedia('(display-mode: standalone)');
      if (mediaQueryList.addEventListener) {
        mediaQueryList.addEventListener('change', handleDisplayModeChange);
      } else if (mediaQueryList.addListener) {
        // Fallback for older Safari
        mediaQueryList.addListener(handleDisplayModeChange);
      }
    } catch (err) {
      logPWADev('Display mode media query listener error:', err);
    }

    // 8. Online / Offline connectivity listeners
    const handleOnline = () => {
      logPWADev('🌐 Network state changed: ONLINE');
      setIsOnline(true);
    };
    const handleOffline = () => {
      warnPWADev('📶 Network state changed: OFFLINE (Operating with offline cache)');
      setIsOnline(false);
    };

    // Attach all event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-prompt-ready', handleCustomPromptReady);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-prompt-ready', handleCustomPromptReady);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (mediaQueryList) {
        if (mediaQueryList.removeEventListener) {
          mediaQueryList.removeEventListener('change', handleDisplayModeChange);
        } else if (mediaQueryList.removeListener) {
          mediaQueryList.removeListener(handleDisplayModeChange);
        }
      }

      logPWADev('Unmounted usePWA hook listeners.');
    };
  }, [env.isIOS, env.isAndroid, env.isDesktop]);

  /**
   * Primary method to trigger the installation prompt.
   * Ensures iframe safety with `window.top === window.self` check.
   */
  const triggerInstallPrompt = useCallback(async (): Promise<InstallPromptResult> => {
    // 1. Guard against execution in iframes
    if (!isTopLevelWindowContext()) {
      warnPWADev(
        '⚠️ triggerInstallPrompt called inside an iframe (window.top !== window.self). Execution prevented.'
      );
      return {
        outcome: 'iframe_blocked',
        message: 'Cannot trigger PWA installation prompt inside an iframe. App must run in the top-level browsing context.',
      };
    }

    // 2. Check if already running in standalone mode
    if (isRunningStandalone() || isInstalled) {
      logPWADev('ℹ️ triggerInstallPrompt: App is already installed and running in standalone mode.');
      return {
        outcome: 'already_installed',
        message: 'Application is already installed.',
      };
    }

    // 3. iOS Safari does not support programmatic beforeinstallprompt
    if (env.isIOS) {
      logPWADev('ℹ️ triggerInstallPrompt: iOS device detected. WebKit requires manual "Add to Home Screen" via Share menu.');
      return {
        outcome: 'unsupported',
        message: 'iOS Safari requires manual installation via the Share menu (Add to Home Screen).',
        platform: 'ios',
      };
    }

    const currentPrompt = deferredPromptRef.current;

    // 4. Verify prompt availability
    if (!currentPrompt) {
      warnPWADev('⚠️ triggerInstallPrompt: No deferredPrompt available to trigger.');
      return {
        outcome: 'unsupported',
        message: 'The beforeinstallprompt event has not fired yet or this browser does not support install prompts.',
      };
    }

    // 5. Invoke native installation prompt
    try {
      logPWADev('🚀 Triggering native browser installation prompt (deferredPrompt.prompt())...');
      await currentPrompt.prompt();

      logPWADev('⏳ Waiting for user choice outcome...');
      const choice = await currentPrompt.userChoice;

      logPWADev(`👤 User choice completed with outcome: "${choice.outcome}" on platform: "${choice.platform}"`);

      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
        (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;

        return {
          outcome: 'accepted',
          platform: choice.platform,
          message: 'User accepted the installation prompt.',
        };
      } else {
        logPWADev('User dismissed the installation prompt.');
        return {
          outcome: 'dismissed',
          platform: choice.platform,
          message: 'User dismissed the installation prompt.',
        };
      }
    } catch (error) {
      warnPWADev('❌ Error while prompting PWA installation:', error);
      return {
        outcome: 'error',
        message: 'An error occurred while displaying the installation prompt.',
        error,
      };
    }
  }, [env.isIOS, isInstalled]);

  /**
   * Environment state snapshot object
   */
  const pwaEnvironment: PWAEnvironmentState = {
    isInstallable,
    isInstalled,
    isStandalone: isRunningStandalone(),
    isTopLevelWindow: env.isTopLevelWindow,
    isInIframe: env.isInIframe,
    isIOS: env.isIOS,
    isAndroid: env.isAndroid,
    isDesktop: env.isDesktop,
    isOnline,
    hasDeferredPrompt: Boolean(deferredPrompt),
  };

  return {
    // State flags
    isInstallable,
    isInstalled,
    isStandalone: pwaEnvironment.isStandalone,
    isTopLevelWindow: env.isTopLevelWindow,
    isInIframe: env.isInIframe,
    isIOS: env.isIOS,
    isAndroid: env.isAndroid,
    isDesktop: env.isDesktop,
    isOnline,
    deferredPrompt,

    // Environmental state bundle
    pwaEnvironment,

    // Prompt Trigger Methods
    triggerInstallPrompt,
    /** Alias for triggerInstallPrompt */
    promptInstall: triggerInstallPrompt,
    /** Alias for triggerInstallPrompt */
    install: triggerInstallPrompt,
  };
}

export default usePWA;
