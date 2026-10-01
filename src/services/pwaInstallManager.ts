/**
 * PAMBORINA PWA INSTALL MANAGER — PRODUCTION HARDENED
 * 
 * Strict Standards:
 * - Distinguishes Top-Level Production Window vs Embedded Preview Iframe.
 * - Captures real `beforeinstallprompt` from browser without faking.
 * - Calls `deferredPrompt.prompt()` only on explicit user click tick.
 * - Handles `appinstalled` & `display-mode: standalone` as the only true evidence of installation.
 * - Completely suppresses duplicate logging & StrictMode loops.
 */

export type PWAInstallState =
  | 'checking'
  | 'installable'
  | 'installing'
  | 'installed'
  | 'embedded-preview'
  | 'ios-manual'
  | 'unsupported'
  | 'not-installable';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PlatformDetails {
  platform: 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'other';
  browser: 'chrome' | 'edge' | 'samsung_internet' | 'safari' | 'firefox' | 'opera' | 'other';
  isMobile: boolean;
  isDesktop: boolean;
  isChromium: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isStandalone: boolean;
  isTopLevel: boolean;
  supportsNativePrompt: boolean;
}

export interface InstallResult {
  outcome: 'accepted' | 'dismissed' | 'manual_required' | 'already_installed' | 'preview_environment' | 'unsupported' | 'error';
  platform?: string;
  error?: string;
}

export type PWAStateListener = (state: PWAInstallState, platform: PlatformDetails) => void;

declare global {
  interface Window {
    __PAMBORINA_PWA_INITIALIZED__?: boolean;
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
    __PAMBORINA_PWA_DIAGNOSTICS__?: any;
    getPWADiagnostics?: () => any;
  }
}

/**
 * SSR-safe helper to detect if running in the top-level window (not an iframe)
 */
export const isTopLevelWindow = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.top === window.self;
  } catch {
    return false;
  }
};

/**
 * SSR-safe helper to detect if running in standalone / installed display mode
 */
export const isRunningStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const isStandaloneMedia = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
    const isFullscreenMedia = window.matchMedia?.('(display-mode: fullscreen)')?.matches ?? false;
    const isMinimalUiMedia = window.matchMedia?.('(display-mode: minimal-ui)')?.matches ?? false;
    const navStandalone = (navigator as unknown as { standalone?: boolean })?.standalone === true;
    return isStandaloneMedia || isFullscreenMedia || isMinimalUiMedia || navStandalone;
  } catch {
    return false;
  }
};

export class PamborinaPWAInstallManager {
  private currentState: PWAInstallState = 'checking';
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private platformDetails: PlatformDetails;
  private isTopLevel: boolean = true;
  private listeners: Set<PWAStateListener> = new Set();
  private auditLogs: Array<{ timestamp: string; state: PWAInstallState; message: string }> = [];
  private hasLoggedInit: boolean = false;

  constructor() {
    this.isTopLevel = isTopLevelWindow();
    this.platformDetails = this.detectPlatform();

    if (typeof window !== 'undefined') {
      this.init();
      this.setupGlobalDiagnostics();
    }
  }

  /**
   * Device, browser, and environment detection.
   */
  public detectPlatform(): PlatformDetails {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        platform: 'other',
        browser: 'other',
        isMobile: false,
        isDesktop: true,
        isChromium: false,
        isIOS: false,
        isAndroid: false,
        isSafari: false,
        isStandalone: false,
        isTopLevel: false,
        supportsNativePrompt: false,
      };
    }

    const ua = navigator.userAgent.toLowerCase();
    const isStandalone = isRunningStandalone();
    const isTopLevel = isTopLevelWindow();

    const isIOS = /iphone|ipad|ipod/.test(ua) || (Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 2) && /macintosh/.test(ua));
    const isAndroid = /android/.test(ua);
    const isWindows = /windows/.test(ua);
    const isMacOS = /macintosh|mac os x/.test(ua) && !isIOS;
    const isLinux = /linux/.test(ua) && !isAndroid;

    let platform: PlatformDetails['platform'] = 'other';
    if (isIOS) platform = 'ios';
    else if (isAndroid) platform = 'android';
    else if (isWindows) platform = 'windows';
    else if (isMacOS) platform = 'macos';
    else if (isLinux) platform = 'linux';

    const isSamsung = /samsungbrowser/.test(ua);
    const isEdge = /edg|edge|edga|edgios/.test(ua);
    const isOpera = /opr|opera/.test(ua);
    const isFirefox = /firefox|fxios/.test(ua);
    const isChrome = (/chrome|crios/.test(ua) || (Boolean((window as unknown as { chrome?: any }).chrome) && !isEdge && !isOpera)) && !isSamsung && !isEdge;
    const isSafari = /safari/.test(ua) && !isChrome && !isEdge && !isSamsung && !isFirefox && !isOpera;

    let browser: PlatformDetails['browser'] = 'other';
    if (isSamsung) browser = 'samsung_internet';
    else if (isEdge) browser = 'edge';
    else if (isChrome) browser = 'chrome';
    else if (isSafari) browser = 'safari';
    else if (isFirefox) browser = 'firefox';
    else if (isOpera) browser = 'opera';

    const isChromium = isChrome || isEdge || isSamsung || isOpera || Boolean((window as unknown as { chrome?: any }).chrome);
    const isMobile = isIOS || isAndroid || /mobile|tablet/.test(ua);
    const isDesktop = !isMobile;
    const supportsNativePrompt = isChromium || (!isIOS && !isSafari);

    return {
      platform,
      browser,
      isMobile,
      isDesktop,
      isChromium,
      isIOS,
      isAndroid,
      isSafari,
      isStandalone,
      isTopLevel,
      supportsNativePrompt,
    };
  }

  /**
   * Initializes listeners once on the window.
   */
  private init(): void {
    // 1. If running in standalone mode (already installed)
    if (this.platformDetails.isStandalone) {
      this.currentState = 'installed';
      this.log('Initial display-mode: standalone detected');
      return;
    }

    // 2. If running inside embedded iframe preview (Chromium blocks beforeinstallprompt in iframes)
    if (!this.isTopLevel) {
      this.currentState = 'embedded-preview';
      this.log('Running in embedded iframe preview');
    } else if (this.platformDetails.isIOS) {
      this.currentState = 'ios-manual';
      this.log('iOS WebKit requires Safari Share menu');
    } else {
      // 3. Check early captured prompt from window
      const earlyPrompt = window.__pwaInstallPrompt;
      if (earlyPrompt) {
        this.deferredPrompt = earlyPrompt;
        this.currentState = 'installable';
        this.log('Early captured beforeinstallprompt loaded');
        console.log('[PWA] Native install prompt captured');
      } else {
        this.currentState = 'checking';
      }
    }

    // Guard against multiple window registrations
    if (window.__PAMBORINA_PWA_INITIALIZED__) {
      return;
    }
    window.__PAMBORINA_PWA_INITIALIZED__ = true;

    // 4. Capture native beforeinstallprompt (Top-Level Chromium)
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      window.__pwaInstallPrompt = this.deferredPrompt;
      console.log('[PWA] Native install prompt captured');
      this.transitionTo('installable', 'beforeinstallprompt fired');
    });

    // 5. Custom prompt ready bridge for early head script
    window.addEventListener('pwa-prompt-ready', () => {
      if (window.__pwaInstallPrompt && !this.deferredPrompt) {
        this.deferredPrompt = window.__pwaInstallPrompt;
        console.log('[PWA] Native install prompt captured');
        this.transitionTo('installable', 'pwa-prompt-ready captured');
      }
    });

    // 6. Native appinstalled event (Genuine installation confirmation from OS)
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      window.__pwaInstallPrompt = null;
      this.platformDetails.isStandalone = true;
      console.log('[PWA] PWA installed successfully');
      this.transitionTo('installed', 'appinstalled event confirmed');
    });

    // 7. Standalone media query listener
    const mediaStandalone = window.matchMedia?.('(display-mode: standalone)');
    if (mediaStandalone?.addEventListener) {
      mediaStandalone.addEventListener('change', (e) => {
        if (e.matches) {
          this.platformDetails.isStandalone = true;
          this.transitionTo('installed', 'display-mode changed to standalone');
        }
      });
    }
  }

  /**
   * Internal transition handler ensuring valid progression and notifying subscribers.
   */
  public transitionTo(nextState: PWAInstallState, reason?: string): void {
    const prevState = this.currentState;
    if (prevState === nextState) return;

    this.currentState = nextState;
    this.log(`State transition: ${prevState} -> ${nextState} (${reason || 'no reason'})`);

    this.listeners.forEach((listener) => {
      try {
        listener(nextState, this.platformDetails);
      } catch (err) {
        // quiet error handling
      }
    });
  }

  /**
   * Main Smart Install Entrypoint.
   * Invoked DIRECTLY by the user clicking the button.
   * Preserves User Activation and calls prompt() immediately with NO asynchronous delays before it.
   */
  public async executeSmartInstall(): Promise<InstallResult> {
    // 1. If already installed in standalone mode
    if (this.platformDetails.isStandalone || this.currentState === 'installed') {
      return { outcome: 'already_installed' };
    }

    // 2. If running in embedded preview iframe
    if (!this.isTopLevel) {
      return { outcome: 'preview_environment' };
    }

    // 3. If iOS WebKit
    if (this.platformDetails.isIOS) {
      this.transitionTo('ios-manual', 'iOS WebKit manual installation required');
      return { outcome: 'manual_required' };
    }

    // 4. Synchronize prompt event
    const promptEvent = this.deferredPrompt || (typeof window !== 'undefined' ? window.__pwaInstallPrompt : null) || null;

    // 5. Native Prompt Available
    if (promptEvent) {
      console.log('[PWA] Opening native PWA installation prompt');
      this.transitionTo('installing', 'Invoking native browser install prompt');

      // Invalidate deferredPrompt so it cannot be called more than once on the same event
      this.deferredPrompt = null;
      if (typeof window !== 'undefined') {
        window.__pwaInstallPrompt = null;
      }

      try {
        const promptPromise = promptEvent.prompt();
        await promptPromise;
        const choice = await promptEvent.userChoice;

        console.log(`[PWA] Native installation outcome: ${choice?.outcome}`);

        if (choice && choice.outcome === 'accepted') {
          return { outcome: 'accepted', platform: choice.platform };
        } else {
          this.transitionTo('not-installable', 'Native prompt dismissed by user');
          return { outcome: 'dismissed' };
        }
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        this.transitionTo('not-installable', errorMsg);
        return { outcome: 'error', error: errorMsg };
      }
    }

    // 6. Deferred prompt does not exist
    this.transitionTo('not-installable', 'beforeinstallprompt not available');
    return { outcome: 'unsupported' };
  }

  /**
   * Sets up window.__PAMBORINA_PWA_DIAGNOSTICS__ and getPWADiagnostics() for developer audit.
   */
  private setupGlobalDiagnostics(): void {
    if (typeof window === 'undefined') return;

    const getDiagnostics = () => ({
      isTopLevel: this.isTopLevel,
      isStandalone: this.platformDetails.isStandalone,
      hasBeforeInstallPrompt: Boolean(this.deferredPrompt || window.__pwaInstallPrompt),
      serviceWorkerSupported: 'serviceWorker' in navigator,
      serviceWorkerController: typeof navigator !== 'undefined' && Boolean(navigator.serviceWorker?.controller),
      manifestAvailable: true,
      manifestUrl: '/site.webmanifest',
      platform: this.platformDetails,
      installState: this.currentState,
    });

    window.__PAMBORINA_PWA_DIAGNOSTICS__ = getDiagnostics();
    window.getPWADiagnostics = getDiagnostics;
  }

  /**
   * Subscribe to state machine changes.
   */
  public subscribe(listener: PWAStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): PWAInstallState {
    return this.currentState;
  }

  public getPlatformDetails(): PlatformDetails {
    return { ...this.platformDetails };
  }

  public isNativePromptAvailable(): boolean {
    return Boolean(this.deferredPrompt || (typeof window !== 'undefined' && window.__pwaInstallPrompt));
  }

  public getIsTopLevel(): boolean {
    return this.isTopLevel;
  }

  public getAuditLogs() {
    return [...this.auditLogs];
  }

  // Testing helpers
  public __setDeferredPromptForTesting(prompt: BeforeInstallPromptEvent | null) {
    this.deferredPrompt = prompt;
    if (prompt) {
      this.transitionTo('installable', 'Test prompt injected');
    }
  }

  public __simulateAppInstalledForTesting() {
    this.deferredPrompt = null;
    this.platformDetails.isStandalone = true;
    this.transitionTo('installed', 'Test appinstalled triggered');
  }

  public __setIsTopLevelForTesting(val: boolean) {
    this.isTopLevel = val;
    this.platformDetails.isTopLevel = val;
  }

  public __setIsIframeForTesting(val: boolean) {
    this.isTopLevel = !val;
    this.platformDetails.isTopLevel = !val;
  }

  public __setPlatformDetailsForTesting(details: PlatformDetails) {
    this.platformDetails = details;
  }

  private log(message: string): void {
    const entry = {
      timestamp: new Date().toISOString(),
      state: this.currentState,
      message,
    };
    this.auditLogs.push(entry);
    if (this.auditLogs.length > 50) {
      this.auditLogs.shift();
    }
  }
}

export const pwaInstallManager = new PamborinaPWAInstallManager();
export const getPWADiagnostics = () => {
  if (typeof window !== 'undefined' && window.getPWADiagnostics) {
    return window.getPWADiagnostics();
  }
  return {
    isTopLevel: isTopLevelWindow(),
    isStandalone: isRunningStandalone(),
    hasBeforeInstallPrompt: pwaInstallManager.isNativePromptAvailable(),
    installState: pwaInstallManager.getState(),
  };
};
