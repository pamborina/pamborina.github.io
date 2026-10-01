/**
 * ========================================================================
 * PamborinaInstallManager — Central Smart Universal Install Engine
 * ========================================================================
 * Automates cross-platform PWA installation with ZERO friction.
 * - Auto-detects OS, Browser, Standalone mode, and Native Prompt capability.
 * - Prioritizes official Native Install Prompt (`beforeinstallprompt`).
 * - Strictly prevents fake installs or fake downloads.
 * - Zero breaking changes to Firebase or app business logic.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallOutcome =
  | 'accepted'
  | 'dismissed'
  | 'native_prompt_unavailable'
  | 'already_installed'
  | 'opened_top_window'
  | 'error';

export interface DeviceInstallProfile {
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
  hasNativePrompt: boolean;
  isInIframe: boolean;
  browserName: string;
  osName: string;
}

class PamborinaInstallManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private changeListeners = new Set<() => void>();
  private updateListeners = new Set<(registration: ServiceWorkerRegistration) => void>();
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.bootstrap();
    }
  }

  private bootstrap() {
    // 1. Pick up any early prompt captured on window object
    const early = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
    if (early) {
      this.deferredPrompt = early;
      console.log('[PWA] beforeinstallprompt received (early capture)');
    }

    const isTopLevel = typeof window !== 'undefined' ? window.self === window.top : true;
    const isIframe = !isTopLevel;
    const isSecureContext = typeof window !== 'undefined' ? window.isSecureContext : true;

    console.log('[PWA] Environment:', {
      isTopLevel,
      isIframe,
      isSecureContext,
      isInstalled: this.getProfile().isInstalled,
      hasDeferredPrompt: Boolean(this.deferredPrompt),
    });

    // 2. Capture native beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      this.deferredPrompt = promptEvent;
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = promptEvent;
      console.log('[PWA] beforeinstallprompt received');
      this.notifyListeners();
    });

    // 3. Custom trigger for early listener sync
    window.addEventListener('pwa-prompt-ready', () => {
      const prompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
      if (prompt && !this.deferredPrompt) {
        this.deferredPrompt = prompt;
        console.log('[PWA] beforeinstallprompt received (synced)');
        this.notifyListeners();
      }
    });

    // 4. Listen for real system installation
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] appinstalled');
      this.deferredPrompt = null;
      if (typeof window !== 'undefined') {
        (window as unknown as { __pwaInstallPrompt?: null }).__pwaInstallPrompt = null;
      }
      this.notifyListeners();
    });

    // 5. Reactive listener for display-mode change (e.g. user installs or launches in standalone)
    try {
      const standaloneQuery = window.matchMedia('(display-mode: standalone)');
      if (standaloneQuery && typeof standaloneQuery.addEventListener === 'function') {
        standaloneQuery.addEventListener('change', () => {
          this.notifyListeners();
        });
      }
    } catch {}
  }

  /**
   * Universal Feature & Platform Detection (No technical info shown to user)
   */
  public getProfile(): DeviceInstallProfile {
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
        hasNativePrompt: false,
        isInIframe: false,
        browserName: 'Browser',
        osName: 'Device',
      };
    }

    const ua = navigator.userAgent.toLowerCase();

    // 1. Standalone / Already Installed Detection
    const isStandaloneMedia =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches;

    const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const isAndroidReferrer = typeof document !== 'undefined' && document.referrer.includes('android-app://');

    const isInstalled = Boolean(isStandaloneMedia || isIOSStandalone || isAndroidReferrer);

    // 2. Platform & OS Detection
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

    // 4. Iframe Detection
    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch {
      isInIframe = true;
    }

    const hasNativePrompt = Boolean(
      this.deferredPrompt ||
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt
    );

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
      hasNativePrompt,
      isInIframe,
      browserName: isChrome ? 'Chrome' : isSafari ? 'Safari' : isEdge ? 'Edge' : isFirefox ? 'Firefox' : 'Browser',
      osName: isAndroid ? 'Android' : isIOS ? 'iOS' : isWindows ? 'Windows' : isMac ? 'macOS' : 'Device',
    };
  }

  public getDeferredPrompt(): BeforeInstallPromptEvent | null {
    return (
      this.deferredPrompt ||
      (typeof window !== 'undefined'
        ? (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt || null
        : null)
    );
  }

  public subscribe(callback: () => void): () => void {
    this.changeListeners.add(callback);
    return () => this.changeListeners.delete(callback);
  }

  private notifyListeners() {
    this.changeListeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn('Listener notification err:', err);
      }
    });
  }

  /**
   * Executes installation using the official Native Browser PWA Installation API.
   * Directly invokes deferredPrompt.prompt() upon user gesture.
   */
  public async executeInstall(): Promise<{ outcome: InstallOutcome; error?: string }> {
    console.log('[PWA] executeInstall called');
    const profile = this.getProfile();

    if (profile.isInstalled) {
      return { outcome: 'already_installed' };
    }

    if (profile.isInIframe) {
      console.warn('[PWA] Install prompt unavailable because application is running inside an iframe.');
      return { outcome: 'native_prompt_unavailable' };
    }

    // Direct Native Chrome / Edge / Chromium Android Install Prompt
    const prompt = this.getDeferredPrompt();
    if (prompt) {
      try {
        console.log('[PWA] Native install prompt opened');
        await prompt.prompt();
        const choice = await prompt.userChoice;
        console.log(`[PWA] User choice: ${choice?.outcome || 'unknown'}`);

        if (choice && choice.outcome === 'accepted') {
          this.deferredPrompt = null;
          if (typeof window !== 'undefined') {
            (window as unknown as { __pwaInstallPrompt?: null }).__pwaInstallPrompt = null;
          }
          this.notifyListeners();
          return { outcome: 'accepted' };
        } else {
          return { outcome: 'dismissed' };
        }
      } catch (err) {
        console.warn('[PWA] Prompt call error:', err);
        return { outcome: 'error', error: String(err) };
      }
    }

    console.warn('[PWA] Native install prompt is not currently available.');

    // If native programmatic prompt is not yet ready or unsupported on browser
    return { outcome: 'native_prompt_unavailable' };
  }

  public setServiceWorkerRegistration(reg: ServiceWorkerRegistration) {
    this.swRegistration = reg;
  }

  public onUpdateAvailable(callback: (reg: ServiceWorkerRegistration) => void): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  public notifyUpdateAvailable(reg: ServiceWorkerRegistration) {
    this.swRegistration = reg;
    this.updateListeners.forEach((fn) => {
      try {
        fn(reg);
      } catch (err) {
        console.warn('SW update notification err:', err);
      }
    });
  }

  public applyUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}

export const pamborinaInstallManager = new PamborinaInstallManager();
export const pwaEngine = pamborinaInstallManager;
