/**
 * PamborinaInstallManager
 *
 * Single Source of Truth for PWA Installation.
 * - Strict Separation of INSTALLABILITY vs INSTALLATION vs INSTALLED.
 * - Zero Fake Success / Zero Fake Toasts / Zero Fake Ready States.
 * - Captures & stores native BeforeInstallPromptEvent (deferredPrompt).
 * - Real appinstalled event and standalone display-mode verification.
 * - State Machine:
 *     NOT_READY | READY_TO_INSTALL | INSTALLING | INSTALLED | DISMISSED | UNAVAILABLE | ERROR
 */

export type InstallState =
  | 'NOT_READY'
  | 'READY_TO_INSTALL'
  | 'INSTALLING'
  | 'INSTALLED'
  | 'DISMISSED'
  | 'UNAVAILABLE'
  | 'ERROR';

export type InstallOutcome =
  | 'accepted'
  | 'dismissed'
  | 'manual_ios'
  | 'opened_top_window'
  | 'already_installed'
  | 'unavailable'
  | 'failed';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface InstallDebugInfo {
  installPromptAvailable: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  isInIframe: boolean;
  installState: InstallState;
  lastInstallOutcome: InstallOutcome | null;
  appInstalledEventReceived: boolean;
  hasDeferredPrompt: boolean;
}

class PamborinaInstallManager {
  private state: InstallState = 'NOT_READY';
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private listeners = new Set<(state: InstallState) => void>();
  private appInstalledListeners = new Set<() => void>();
  private promptWaiters: Array<(prompt: BeforeInstallPromptEvent | null) => void> = [];
  private appInstalledEventReceived = false;
  private lastInstallOutcome: InstallOutcome | null = null;

  public isIOS = false;
  public isAndroid = false;
  public isDesktop = false;
  public isInIframe = false;

  constructor() {
    if (typeof window === 'undefined') return;

    this.detectEnvironment();
    this.initListeners();
    this.checkInitialState();
    this.handleAutoInstallParam();
  }

  private detectEnvironment(): void {
    const ua = navigator.userAgent.toLowerCase();
    this.isIOS =
      /iphone|ipad|ipod/.test(ua) ||
      (Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 2) && /macintosh/.test(ua));
    this.isAndroid = /android/.test(ua);
    this.isDesktop = !this.isIOS && !this.isAndroid;
    try {
      this.isInIframe = window.top !== window.self;
    } catch {
      this.isInIframe = true;
    }
  }

  public isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    const isStandaloneNavigator = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return Boolean(isStandaloneMedia || isStandaloneNavigator);
  }

  private checkInitialState(): void {
    if (this.isStandalone()) {
      this.setState('INSTALLED');
      return;
    }

    // Check early capture from index.html
    const earlyPrompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
    if (earlyPrompt) {
      this.deferredPrompt = earlyPrompt;
      this.setState('READY_TO_INSTALL');
      this.resolvePromptWaiters(earlyPrompt);
      return;
    }

    this.setState('NOT_READY');
  }

  private initListeners(): void {
    // 1. Native beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = e as BeforeInstallPromptEvent;
      this.setState('READY_TO_INSTALL');
      this.resolvePromptWaiters(this.deferredPrompt);
    });

    // 2. Custom event from index.html in case prompt fired before module execution
    window.addEventListener('pwa-prompt-ready', () => {
      const prompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
      if (prompt) {
        this.deferredPrompt = prompt;
        this.setState('READY_TO_INSTALL');
        this.resolvePromptWaiters(prompt);
      }
    });

    // 3. Native appinstalled event (The ONLY 100% verified installation event from browser/OS)
    window.addEventListener('appinstalled', () => {
      this.appInstalledEventReceived = true;
      this.deferredPrompt = null;
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
      this.setState('INSTALLED');
      this.resolvePromptWaiters(null);

      // Notify installed callbacks
      this.appInstalledListeners.forEach((listener) => {
        try {
          listener();
        } catch (err) {
          if (import.meta.env.DEV) console.warn('[PamborinaInstallManager] appinstalled callback error:', err);
        }
      });
    });

    // 4. Standalone media query change (e.g. user opens in standalone mode)
    try {
      const media = window.matchMedia('(display-mode: standalone)');
      media.addEventListener('change', (e) => {
        if (e.matches) {
          this.deferredPrompt = null;
          this.setState('INSTALLED');
        }
      });
    } catch {
      // Graceful fallback for older browsers
    }
  }

  private handleAutoInstallParam(): void {
    // If opened via ?install=now from an iframe, trigger installation automatically
    if (typeof window === 'undefined' || this.isInIframe) return;

    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('install') === 'now') {
        url.searchParams.delete('install');
        window.history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);

        // Wait briefly for prompt to be ready, then trigger
        this.waitForPrompt(1500).then((prompt) => {
          if (prompt) {
            this.promptInstall();
          }
        });
      }
    } catch {
      // Non-blocking
    }
  }

  private resolvePromptWaiters(prompt: BeforeInstallPromptEvent | null): void {
    const waiters = [...this.promptWaiters];
    this.promptWaiters = [];
    waiters.forEach((resolve) => resolve(prompt));
  }

  private waitForPrompt(timeoutMs: number): Promise<BeforeInstallPromptEvent | null> {
    if (this.deferredPrompt) {
      return Promise.resolve(this.deferredPrompt);
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const idx = this.promptWaiters.indexOf(resolve);
        if (idx !== -1) this.promptWaiters.splice(idx, 1);
        resolve(this.deferredPrompt);
      }, timeoutMs);

      this.promptWaiters.push((prompt) => {
        clearTimeout(timer);
        resolve(prompt);
      });
    });
  }

  private setState(newState: InstallState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.listeners.forEach((listener) => {
      try {
        listener(newState);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[PamborinaInstallManager] Listener error:', err);
      }
    });
  }

  public getState(): InstallState {
    if (this.state !== 'INSTALLED' && this.isStandalone()) {
      this.state = 'INSTALLED';
    }
    return this.state;
  }

  public hasPrompt(): boolean {
    return Boolean(this.deferredPrompt);
  }

  public subscribe(listener: (state: InstallState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onAppInstalled(listener: () => void): () => void {
    this.appInstalledListeners.add(listener);
    return () => {
      this.appInstalledListeners.delete(listener);
    };
  }

  /**
   * Primary entry point: CLICK -> NATIVE PROMPT
   * Invokes native install prompt directly when supported.
   * NEVER returns or asserts fake success.
   */
  public async promptInstall(): Promise<{ outcome: InstallOutcome; message?: string }> {
    // 1. If already installed in standalone mode
    if (this.isStandalone()) {
      this.setState('INSTALLED');
      this.lastInstallOutcome = 'already_installed';
      return { outcome: 'already_installed' };
    }

    // 2. If running inside an iframe (e.g. preview environment)
    if (this.isInIframe) {
      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set('install', 'now');
      window.open(targetUrl.toString(), '_blank');
      this.lastInstallOutcome = 'opened_top_window';
      return { outcome: 'opened_top_window' };
    }

    // 3. If native prompt is not immediately ready, wait briefly (up to 500ms)
    let prompt = this.deferredPrompt;
    if (!prompt && !this.isIOS) {
      prompt = await this.waitForPrompt(500);
    }

    // 4. Native prompt available (Android / Chromium / Edge / Desktop)
    if (prompt) {
      this.setState('INSTALLING');
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;

        if (choice && choice.outcome === 'accepted') {
          this.deferredPrompt = null;
          (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
          this.lastInstallOutcome = 'accepted';
          // User accepted in prompt dialog.
          // Note: Real state transition to INSTALLED will happen on window 'appinstalled' event.
          return { outcome: 'accepted' };
        } else {
          this.setState('DISMISSED');
          this.lastInstallOutcome = 'dismissed';
          return { outcome: 'dismissed' };
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[PamborinaInstallManager] Prompt execution error:', err);
        this.setState('ERROR');
        this.lastInstallOutcome = 'failed';
        return { outcome: 'failed' };
      }
    }

    // 5. iOS Platform Constraints (WebKit does not provide a programmatic prompt API)
    if (this.isIOS) {
      this.lastInstallOutcome = 'manual_ios';
      return { outcome: 'manual_ios' };
    }

    // 6. Browser does not support native installation
    this.setState('UNAVAILABLE');
    this.lastInstallOutcome = 'unavailable';
    return { outcome: 'unavailable' };
  }

  /**
   * Internal Debug State (Never displayed to end user)
   */
  public getDebugInfo(): InstallDebugInfo {
    return {
      installPromptAvailable: Boolean(this.deferredPrompt),
      isStandalone: this.isStandalone(),
      isIOS: this.isIOS,
      isAndroid: this.isAndroid,
      isDesktop: this.isDesktop,
      isInIframe: this.isInIframe,
      installState: this.getState(),
      lastInstallOutcome: this.lastInstallOutcome,
      appInstalledEventReceived: this.appInstalledEventReceived,
      hasDeferredPrompt: Boolean(this.deferredPrompt),
    };
  }
}

// Export singleton instance
export const installManager = new PamborinaInstallManager();
