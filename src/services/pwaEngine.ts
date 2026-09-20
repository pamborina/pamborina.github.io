/**
 * ========================================================================
 * Pamborina PWA — Central Smart Installation Engine
 * High-precision cross-platform detection & native install flow execution
 * Supports: Android, iOS (iPhone/iPad), Desktop (Windows/macOS/Linux),
 * Chrome, Edge, Safari, Firefox, Samsung Internet, and more.
 * ========================================================================
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PWAInstallOutcome =
  | 'accepted'
  | 'dismissed'
  | 'opened_native_prompt'
  | 'ios_safari_guide'
  | 'ios_other_browser'
  | 'browser_menu_guide'
  | 'already_installed'
  | 'opened_top_window'
  | 'error';

export interface DevicePWAProfile {
  isInstalled: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isIPhone: boolean;
  isIPad: boolean;
  isWindows: boolean;
  isMac: boolean;
  isDesktop: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isEdge: boolean;
  isFirefox: boolean;
  isSamsung: boolean;
  isIOSOtherBrowser: boolean; // Chrome/Firefox/Edge on iOS
  hasNativePrompt: boolean;
  isInIframe: boolean;
  browserName: string;
  osName: string;
}

class PWAEngine {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private listeners = new Set<() => void>();
  private updateListeners = new Set<(registration: ServiceWorkerRegistration) => void>();
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // 1. Pick up any early captured prompt from window
    const winPrompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
    if (winPrompt) {
      this.deferredPrompt = winPrompt;
    }

    // 2. Listen to standard beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      this.deferredPrompt = promptEvent;
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = promptEvent;
      this.notifyListeners();
    });

    // 3. Listen to pwa-prompt-ready custom event
    window.addEventListener('pwa-prompt-ready', () => {
      const early = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
      if (early && !this.deferredPrompt) {
        this.deferredPrompt = early;
        this.notifyListeners();
      }
    });

    // 4. Listen to appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('[Pamborina PWA Engine] Application was officially installed on device.');
      this.deferredPrompt = null;
      if (typeof window !== 'undefined') {
        (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
      }
      this.notifyListeners();
    });
  }

  /**
   * Comprehensive Feature & Environment Detection
   */
  public getProfile(): DevicePWAProfile {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        isInstalled: false,
        isAndroid: false,
        isIOS: false,
        isIPhone: false,
        isIPad: false,
        isWindows: false,
        isMac: false,
        isDesktop: false,
        isSafari: false,
        isChrome: false,
        isEdge: false,
        isFirefox: false,
        isSamsung: false,
        isIOSOtherBrowser: false,
        hasNativePrompt: false,
        isInIframe: false,
        browserName: 'Unknown',
        osName: 'Unknown',
      };
    }

    const ua = navigator.userAgent.toLowerCase();

    // 1. Installed Detection: Standalone display-mode, navigator.standalone (iOS), android-app referrer
    const isStandaloneMedia =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches;

    const isIOSNavStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const isAndroidAppReferrer = typeof document !== 'undefined' && document.referrer.includes('android-app://');

    const isInstalled = Boolean(isStandaloneMedia || isIOSNavStandalone || isAndroidAppReferrer);

    // 2. OS & Device Detection
    const isIPad =
      /ipad/.test(ua) ||
      (Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 2) && /macintosh/.test(ua));
    const isIPhone = /iphone|ipod/.test(ua);
    const isIOS = isIPhone || isIPad;
    const isAndroid = /android/.test(ua);
    const isWindows = /windows|win32/i.test(ua);
    const isMac = !isIOS && /macintosh|mac os x/i.test(ua);
    const isDesktop = isWindows || isMac || (!isAndroid && !isIOS);

    // 3. Browser Detection
    const isSamsung = /samsungbrowser/i.test(ua);
    const isEdge = /edg\/|edgios\/|edge/i.test(ua);
    const isFirefox = /firefox|fxios/i.test(ua);
    const isChrome = !isEdge && !isSamsung && /chrome|crios/i.test(ua);
    const isSafari = !isChrome && !isEdge && !isFirefox && !isSamsung && /safari/i.test(ua);

    // iOS non-Safari detection (Chrome, Firefox, Edge, Opera on iOS)
    const isIOSOtherBrowser = isIOS && (/crios|fxios|edgios|optios|opios/.test(ua) || !isSafari);

    // 4. Iframe Detection
    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch {
      isInIframe = true;
    }

    // 5. Native Prompt Availability
    const hasNativePrompt = Boolean(
      this.deferredPrompt ||
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt
    );

    let osName = 'جهاز غير معروف';
    if (isAndroid) osName = 'Android';
    else if (isIPhone) osName = 'iPhone (iOS)';
    else if (isIPad) osName = 'iPad (iPadOS)';
    else if (isWindows) osName = 'Windows';
    else if (isMac) osName = 'macOS';

    let browserName = 'المتصفح';
    if (isSafari) browserName = 'Safari';
    else if (isChrome) browserName = 'Chrome';
    else if (isEdge) browserName = 'Edge';
    else if (isFirefox) browserName = 'Firefox';
    else if (isSamsung) browserName = 'Samsung Internet';

    return {
      isInstalled,
      isAndroid,
      isIOS,
      isIPhone,
      isIPad,
      isWindows,
      isMac,
      isDesktop,
      isSafari,
      isChrome,
      isEdge,
      isFirefox,
      isSamsung,
      isIOSOtherBrowser,
      hasNativePrompt,
      isInIframe,
      browserName,
      osName,
    };
  }

  /**
   * Subscribe to PWA state changes
   */
  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn('Listener error:', err);
      }
    });
  }

  /**
   * Get the active deferred prompt event
   */
  public getDeferredPrompt(): BeforeInstallPromptEvent | null {
    return (
      this.deferredPrompt ||
      (typeof window !== 'undefined'
        ? (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt || null
        : null)
    );
  }

  /**
   * Central Smart Installation Trigger
   * Evaluates the best official installation method for the current device and executes it.
   */
  public async executeInstall(): Promise<{ outcome: PWAInstallOutcome; error?: string }> {
    const profile = this.getProfile();

    // 1. If already installed
    if (profile.isInstalled) {
      return { outcome: 'already_installed' };
    }

    // 2. If running inside an iframe (like AI Studio preview sandbox)
    if (profile.isInIframe && typeof window !== 'undefined') {
      try {
        const topUrl = new URL(window.location.href);
        topUrl.searchParams.set('pwa_install', '1');
        window.open(topUrl.toString(), '_blank');
        return { outcome: 'opened_top_window' };
      } catch (err) {
        console.warn('Failed to open top window:', err);
      }
    }

    // 3. Android / Chrome / Edge Desktop: Native Install Prompt
    const promptEvent = this.getDeferredPrompt();
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;

        if (choice && choice.outcome === 'accepted') {
          this.deferredPrompt = null;
          if (typeof window !== 'undefined') {
            (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
          }
          this.notifyListeners();
          return { outcome: 'accepted' };
        } else {
          return { outcome: 'dismissed' };
        }
      } catch (err) {
        console.warn('[Pamborina PWA Engine] Native prompt execution error:', err);
        return { outcome: 'error', error: String(err) };
      }
    }

    // 4. iOS Flow
    if (profile.isIOS) {
      if (profile.isIOSOtherBrowser) {
        return { outcome: 'ios_other_browser' };
      }
      return { outcome: 'ios_safari_guide' };
    }

    // 5. Fallback for browsers where beforeinstallprompt is not supported or was already dismissed
    return { outcome: 'browser_menu_guide' };
  }

  /**
   * Register Service Worker registration object for update handling
   */
  public setServiceWorkerRegistration(reg: ServiceWorkerRegistration) {
    this.swRegistration = reg;
  }

  /**
   * Listen for updates when a new service worker is waiting
   */
  public onUpdateAvailable(callback: (reg: ServiceWorkerRegistration) => void): () => void {
    this.updateListeners.add(callback);
    return () => {
      this.updateListeners.delete(callback);
    };
  }

  public notifyUpdateAvailable(reg: ServiceWorkerRegistration) {
    this.swRegistration = reg;
    this.updateListeners.forEach((fn) => {
      try {
        fn(reg);
      } catch (err) {
        console.warn('Update listener error:', err);
      }
    });
  }

  /**
   * Apply update immediately: post SKIP_WAITING and reload
   */
  public applyUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}

export const pwaEngine = new PWAEngine();
