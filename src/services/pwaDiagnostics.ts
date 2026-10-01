/**
 * PWA Diagnostics & State Machine Engine
 * 
 * Provides robust, non-UI-exposing PWA diagnostics:
 * - Manifest availability & structure verification
 * - Service Worker registration, activation & controller validation
 * - HTTPS / Secure Context compliance checks
 * - Validated state machine for 'CHECKING', 'NOT_INSTALLABLE', 'INSTALLABLE',
 *   'PROMPTING', 'USER_ACCEPTED', 'USER_DISMISSED', 'INSTALLING', 'INSTALLED',
 *   'MANUAL_REQUIRED', 'UNSUPPORTED', 'UNKNOWN'
 * - Secure in-memory ring-buffer logging without generating fake alerts or UI popups
 */

import { pwaInstallManager, PWAInstallState } from './pwaInstallManager';

export const PWAState = {
  CHECKING: 'CHECKING',
  INITIALIZING: 'CHECKING', // Alias for backward compatibility
  NOT_INSTALLABLE: 'NOT_INSTALLABLE',
  INSTALLABLE: 'INSTALLABLE',
  PROMPTING: 'PROMPTING',
  USER_ACCEPTED: 'USER_ACCEPTED',
  USER_DISMISSED: 'USER_DISMISSED',
  INSTALLING: 'INSTALLING',
  INSTALLED: 'INSTALLED',
  MANUAL_REQUIRED: 'MANUAL_REQUIRED',
  UNSUPPORTED: 'UNSUPPORTED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type PWAState = typeof PWAState[keyof typeof PWAState];

export interface PWADiagnosticLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  level: 'info' | 'warn' | 'error' | 'debug';
  source: 'state-machine' | 'diagnostics' | 'event-listener' | 'security';
  state: PWAState;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface HttpsDiagnosticResult {
  isSecure: boolean;
  protocol: string;
  isLocalhost: boolean;
  isSecureContext: boolean;
  status: 'compliant' | 'non-compliant' | 'development-loopback';
  message: string;
}

export interface ManifestDiagnosticResult {
  isPresent: boolean;
  href: string | null;
  isAccessible?: boolean;
  httpStatus?: number;
  hasRequiredFields?: boolean;
  details?: {
    id?: string;
    name?: string;
    shortName?: string;
    display?: string;
    startUrl?: string;
    iconCount?: number;
    has192Icon?: boolean;
    has512Icon?: boolean;
    hasMaskableIcon?: boolean;
    missingFields?: string[];
  };
  error?: string;
}

export interface ServiceWorkerDiagnosticResult {
  isSupported: boolean;
  isControlling: boolean;
  isRegistered: boolean;
  scopes: string[];
  activeState?: string;
  registrationsCount: number;
  hasWaitingWorker: boolean;
  message: string;
}

export interface PWADiagnosticReport {
  timestamp: string;
  currentState: PWAState;
  isStandalone: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  https: HttpsDiagnosticResult;
  manifest: ManifestDiagnosticResult;
  serviceWorker: ServiceWorkerDiagnosticResult;
  summary: {
    readyForInstallation: boolean;
    passedChecks: number;
    totalChecks: number;
    issues: string[];
    recommendations: string[];
  };
}

export type StateChangeCallback = (
  newState: PWAState,
  prevState: PWAState,
  logEntry: PWADiagnosticLogEntry
) => void;

export type LogSubscriber = (entry: PWADiagnosticLogEntry) => void;

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const MAX_LOG_ENTRIES = 100;

export class PWADiagnosticsEngine {
  private currentState: PWAState = PWAState.CHECKING;
  private logs: PWADiagnosticLogEntry[] = [];
  private stateSubscribers: Set<StateChangeCallback> = new Set();
  private logSubscribers: Set<LogSubscriber> = new Set();
  private debugMode: boolean = false;

  constructor(options?: { debug?: boolean; autoInit?: boolean }) {
    this.debugMode = options?.debug ?? false;

    if (options?.autoInit !== false && typeof window !== 'undefined') {
      this.init();
    }
  }

  /**
   * Initializes diagnostics and syncs with pwaInstallManager.
   */
  public init(): void {
    if (typeof window === 'undefined') {
      this.currentState = PWAState.NOT_INSTALLABLE;
      this.recordLog('info', 'state-machine', 'Diagnostics initialized in non-browser environment');
      return;
    }

    // Synchronize with install manager
    pwaInstallManager.subscribe((managerState) => {
      this.transitionTo(managerState as PWAState, { source: 'pwaInstallManager' });
    });

    const currentManagerState = pwaInstallManager.getState();
    this.currentState = currentManagerState as PWAState;
  }

  /**
   * Detects if the app is currently running in standalone (installed) mode.
   */
  public checkStandaloneMode(): boolean {
    if (typeof window === 'undefined') return false;
    const mediaQueryMatch = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
    const navStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return Boolean(mediaQueryMatch || navStandalone);
  }

  /**
   * Returns current PWA state.
   */
  public getState(): PWAState {
    return this.currentState;
  }

  /**
   * Validated transition to target state with safe logging.
   */
  public transitionTo(nextState: PWAState, metadata?: Record<string, unknown>): boolean {
    const prevState = this.currentState;

    if (prevState === nextState) {
      if (metadata) {
        this.recordLog('debug', 'state-machine', `State reaffirmed: ${nextState}`, metadata);
      }
      return true;
    }

    this.currentState = nextState;
    const logEntry = this.recordLog(
      'info',
      'state-machine',
      `State transition: ${prevState} -> ${nextState}`,
      { prevState, nextState, ...metadata }
    );

    // Notify state subscribers safely
    this.stateSubscribers.forEach((subscriber) => {
      try {
        subscriber(nextState, prevState, logEntry);
      } catch (err) {
        this.recordLog('error', 'state-machine', 'Error in state change subscriber', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    return true;
  }

  /**
   * Transitions to 'INSTALLABLE' state when install criteria are satisfied.
   */
  public markInstallable(event?: BeforeInstallPromptEvent | Event): void {
    this.transitionTo(PWAState.INSTALLABLE, {
      hasPromptEvent: Boolean(event),
    });
  }

  /**
   * Transitions to 'PROMPTING' state when the browser native prompt is invoked.
   */
  public markPrompting(): void {
    this.transitionTo(PWAState.PROMPTING, {
      promptInvokedAt: new Date().toISOString(),
    });
  }

  /**
   * Transitions to 'USER_ACCEPTED' state when the user accepts the install prompt.
   */
  public markUserAccepted(platform?: string): void {
    this.transitionTo(PWAState.USER_ACCEPTED, {
      platform: platform || 'unspecified',
      acceptedAt: new Date().toISOString(),
    });
  }

  /**
   * Transitions to 'INSTALLING' state when OS is handling installation.
   */
  public markInstalling(): void {
    this.transitionTo(PWAState.INSTALLING, {
      installingAt: new Date().toISOString(),
    });
  }

  /**
   * Transitions to 'INSTALLED' state upon actual browser/OS evidence.
   */
  public markInstalled(): void {
    this.transitionTo(PWAState.INSTALLED, {
      installedAt: new Date().toISOString(),
    });
  }

  /**
   * Handles user dismissal of prompt without throwing errors.
   */
  public markUserDismissed(reason?: string): void {
    this.transitionTo(PWAState.USER_DISMISSED, {
      reason: reason || 'user-dismissed',
      dismissedAt: new Date().toISOString(),
    });
  }

  /**
   * Subscribes to state machine transitions.
   */
  public onStateChange(callback: StateChangeCallback): () => void {
    this.stateSubscribers.add(callback);
    return () => {
      this.stateSubscribers.delete(callback);
    };
  }

  /**
   * Subscribes to the internal diagnostic log stream.
   */
  public onLog(callback: LogSubscriber): () => void {
    this.logSubscribers.add(callback);
    return () => {
      this.logSubscribers.delete(callback);
    };
  }

  /**
   * Checks HTTPS compliance and secure context requirements.
   */
  public checkHttps(): HttpsDiagnosticResult {
    if (typeof window === 'undefined') {
      return {
        isSecure: false,
        protocol: 'unknown',
        isLocalhost: false,
        isSecureContext: false,
        status: 'non-compliant',
        message: 'Cannot evaluate HTTPS outside browser window context',
      };
    }

    const { protocol, hostname } = window.location;
    const isLocalhost = Boolean(
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.localhost')
    );

    const isHttps = protocol === 'https:';
    const isSecureContext = Boolean(window.isSecureContext);
    const isSecure = (isHttps || isLocalhost) && isSecureContext;

    let status: HttpsDiagnosticResult['status'] = 'non-compliant';
    let message = 'Insecure context detected. PWAs require HTTPS or localhost.';

    if (isSecure) {
      if (isLocalhost) {
        status = 'development-loopback';
        message = 'Local development loopback detected (Compliant secure context for testing).';
      } else {
        status = 'compliant';
        message = 'HTTPS secure context verified.';
      }
    }

    const result: HttpsDiagnosticResult = {
      isSecure,
      protocol,
      isLocalhost,
      isSecureContext,
      status,
      message,
    };

    this.recordLog(
      isSecure ? 'info' : 'warn',
      'diagnostics',
      `HTTPS Diagnostic: ${result.message}`,
      { protocol, isSecureContext, isLocalhost }
    );

    return result;
  }

  /**
   * Validates Service Worker registration, controller, and active worker status.
   */
  public async checkServiceWorker(): Promise<ServiceWorkerDiagnosticResult> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      const result: ServiceWorkerDiagnosticResult = {
        isSupported: false,
        isControlling: false,
        isRegistered: false,
        scopes: [],
        registrationsCount: 0,
        hasWaitingWorker: false,
        message: 'Service Worker API is not supported in this environment.',
      };
      this.recordLog('warn', 'diagnostics', result.message);
      return result;
    }

    try {
      const isControlling = Boolean(navigator.serviceWorker.controller);
      const registrations = await navigator.serviceWorker.getRegistrations();
      const scopes = registrations.map((r) => r.scope);
      const isRegistered = registrations.length > 0;

      let activeState: string | undefined;
      let hasWaitingWorker = false;

      if (registrations.length > 0) {
        const primaryReg = registrations[0];
        if (primaryReg.active) {
          activeState = primaryReg.active.state;
        } else if (primaryReg.installing) {
          activeState = `installing (${primaryReg.installing.state})`;
        } else if (primaryReg.waiting) {
          activeState = 'waiting';
        }
        hasWaitingWorker = Boolean(primaryReg.waiting);
      }

      let message = 'Service Worker is active and controlling.';
      if (!isRegistered) {
        message = 'No Service Worker registration found.';
      } else if (!isControlling) {
        message = 'Service Worker registered, but page is not yet controlled (first load or hard refresh).';
      }

      const result: ServiceWorkerDiagnosticResult = {
        isSupported: true,
        isControlling,
        isRegistered,
        scopes,
        activeState,
        registrationsCount: registrations.length,
        hasWaitingWorker,
        message,
      };

      this.recordLog(
        isRegistered ? 'info' : 'warn',
        'diagnostics',
        `Service Worker Diagnostic: ${result.message}`,
        { registrationsCount: registrations.length, isControlling, activeState }
      );

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const result: ServiceWorkerDiagnosticResult = {
        isSupported: true,
        isControlling: false,
        isRegistered: false,
        scopes: [],
        registrationsCount: 0,
        hasWaitingWorker: false,
        message: `Service Worker check failed: ${errorMsg}`,
      };
      this.recordLog('error', 'diagnostics', result.message);
      return result;
    }
  }

  /**
   * Checks manifest availability in the DOM and validates required PWA fields.
   */
  public async checkManifest(): Promise<ManifestDiagnosticResult> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        isPresent: false,
        href: null,
        error: 'Cannot evaluate manifest outside DOM context',
      };
    }

    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;

    if (!manifestLink) {
      const result: ManifestDiagnosticResult = {
        isPresent: false,
        href: null,
        error: 'No <link rel="manifest"> tag found in document head',
      };
      this.recordLog('warn', 'diagnostics', 'Manifest Diagnostic: Missing <link rel="manifest"> tag');
      return result;
    }

    const href = manifestLink.getAttribute('href');
    if (!href) {
      const result: ManifestDiagnosticResult = {
        isPresent: true,
        href: null,
        error: '<link rel="manifest"> has an empty href attribute',
      };
      this.recordLog('warn', 'diagnostics', 'Manifest Diagnostic: href is empty');
      return result;
    }

    // Fetch manifest to validate required fields
    try {
      const absoluteUrl = new URL(href, window.location.href).href;
      const response = await fetch(absoluteUrl, { credentials: 'omit' });

      if (!response.ok) {
        const result: ManifestDiagnosticResult = {
          isPresent: true,
          href,
          isAccessible: false,
          httpStatus: response.status,
          error: `HTTP ${response.status} ${response.statusText} when fetching manifest`,
        };
        this.recordLog('warn', 'diagnostics', `Manifest Diagnostic: Failed to fetch at ${href}`, {
          status: response.status,
        });
        return result;
      }

      const manifestData = await response.json();
      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
      const missingFields: string[] = [];

      for (const field of requiredFields) {
        if (!manifestData[field]) {
          missingFields.push(field);
        }
      }

      const icons = Array.isArray(manifestData.icons) ? manifestData.icons : [];
      const has192 = icons.some((i: { sizes?: string }) => i.sizes?.includes('192x192'));
      const has512 = icons.some((i: { sizes?: string }) => i.sizes?.includes('512x512'));
      const hasMaskable = icons.some((i: { purpose?: string }) => i.purpose?.includes('maskable'));

      if (!has192) missingFields.push('icons (192x192)');
      if (!has512) missingFields.push('icons (512x512)');

      const hasRequiredFields = missingFields.length === 0;

      const result: ManifestDiagnosticResult = {
        isPresent: true,
        href,
        isAccessible: true,
        httpStatus: response.status,
        hasRequiredFields,
        details: {
          id: manifestData.id,
          name: manifestData.name,
          shortName: manifestData.short_name,
          display: manifestData.display,
          startUrl: manifestData.start_url,
          iconCount: icons.length,
          has192Icon: has192,
          has512Icon: has512,
          hasMaskableIcon: hasMaskable,
          missingFields,
        },
      };

      this.recordLog(
        hasRequiredFields ? 'info' : 'warn',
        'diagnostics',
        hasRequiredFields
          ? 'Manifest Diagnostic: Valid manifest verified with all required fields'
          : `Manifest Diagnostic: Missing required fields: ${missingFields.join(', ')}`,
        result.details
      );

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const result: ManifestDiagnosticResult = {
        isPresent: true,
        href,
        isAccessible: false,
        error: `Could not parse manifest: ${errorMsg}`,
      };
      this.recordLog('warn', 'diagnostics', `Manifest Diagnostic: Parse error - ${errorMsg}`);
      return result;
    }
  }

  /**
   * Executes a comprehensive diagnostic scan across HTTPS, Manifest, and Service Worker.
   */
  public async runDiagnostics(): Promise<PWADiagnosticReport> {
    const isStandalone = this.checkStandaloneMode();
    const https = this.checkHttps();
    const manifest = await this.checkManifest();
    const serviceWorker = await this.checkServiceWorker();

    const issues: string[] = [];
    const recommendations: string[] = [];
    let passedChecks = 0;
    const totalChecks = 3;

    // Check 1: HTTPS
    if (https.isSecure) {
      passedChecks++;
    } else {
      issues.push('Insecure connection: HTTPS or localhost loopback is required.');
      recommendations.push('Deploy behind a valid SSL/TLS certificate.');
    }

    // Check 2: Manifest
    if (manifest.isPresent && manifest.isAccessible && manifest.hasRequiredFields) {
      passedChecks++;
    } else {
      if (!manifest.isPresent) {
        issues.push('Web App Manifest tag is missing from document.');
        recommendations.push('Add <link rel="manifest" href="/site.webmanifest"> to <head>.');
      } else if (!manifest.isAccessible) {
        issues.push(`Manifest could not be fetched (${manifest.error || 'Network error'}).`);
      } else if (manifest.details?.missingFields && manifest.details.missingFields.length > 0) {
        issues.push(`Manifest is missing required fields: ${manifest.details.missingFields.join(', ')}`);
        recommendations.push('Specify name, short_name, start_url, display: standalone, and 192/512px icons in manifest.');
      }
    }

    // Check 3: Service Worker
    if (serviceWorker.isSupported && serviceWorker.isRegistered) {
      passedChecks++;
    } else {
      if (!serviceWorker.isSupported) {
        issues.push('Browser does not support Service Workers.');
      } else if (!serviceWorker.isRegistered) {
        issues.push('No Service Worker is registered.');
        recommendations.push('Call navigator.serviceWorker.register() on page load.');
      }
    }

    const readyForInstallation = passedChecks === totalChecks;

    const report: PWADiagnosticReport = {
      timestamp: new Date().toISOString(),
      currentState: this.currentState,
      isStandalone,
      isInstallable: this.currentState === PWAState.INSTALLABLE,
      isInstalled: isStandalone || this.currentState === PWAState.INSTALLED,
      https,
      manifest,
      serviceWorker,
      summary: {
        readyForInstallation,
        passedChecks,
        totalChecks,
        issues,
        recommendations,
      },
    };

    this.recordLog('info', 'diagnostics', `PWA Diagnostics Scan Completed: ${passedChecks}/${totalChecks} checks passed`, {
      readyForInstallation,
      issuesCount: issues.length,
    });

    return report;
  }

  /**
   * Secure, non-UI-exposing logging mechanism.
   * Keeps entries in a bounded in-memory ring-buffer.
   * Never displays alert dialogs or intrusive user-facing overlays.
   */
  private recordLog(
    level: PWADiagnosticLogEntry['level'],
    source: PWADiagnosticLogEntry['source'],
    message: string,
    metadata?: Record<string, unknown>
  ): PWADiagnosticLogEntry {
    const sanitizedMetadata = metadata ? this.sanitizeMetadata(metadata) : undefined;

    const entry: PWADiagnosticLogEntry = {
      id: `pwa_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      source,
      state: this.currentState,
      message,
      metadata: sanitizedMetadata,
    };

    this.logs.push(entry);
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs.shift();
    }

    if (this.debugMode && typeof console !== 'undefined') {
      const prefix = `[PWA Diagnostics | ${entry.state}]`;
      if (level === 'error') {
        console.error(prefix, message, sanitizedMetadata || '');
      } else if (level === 'warn') {
        console.warn(prefix, message, sanitizedMetadata || '');
      } else {
        console.debug(prefix, message, sanitizedMetadata || '');
      }
    }

    this.logSubscribers.forEach((sub) => {
      try {
        sub(entry);
      } catch {
        // Never surface errors from subscribers to the UI
      }
    });

    return entry;
  }

  /**
   * Sanitizes diagnostic metadata to guarantee no tokens or sensitive information leak into memory.
   */
  private sanitizeMetadata(data: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {};
    const SENSITIVE_KEYS = /token|auth|key|secret|password|bearer|cookie/i;

    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.test(key)) {
        clean[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        clean[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else {
        clean[key] = value;
      }
    }

    return clean;
  }

  public getLogs(filter?: { level?: PWADiagnosticLogEntry['level']; state?: PWAState }): PWADiagnosticLogEntry[] {
    let result = [...this.logs];
    if (filter?.level) {
      result = result.filter((l) => l.level === filter.level);
    }
    if (filter?.state) {
      result = result.filter((l) => l.state === filter.state);
    }
    return result;
  }

  public getLatestLog(): PWADiagnosticLogEntry | undefined {
    return this.logs[this.logs.length - 1];
  }

  public clearLogs(): void {
    this.logs = [];
    this.recordLog('debug', 'state-machine', 'Diagnostics logs cleared');
  }

  public setDebug(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

export const pwaDiagnostics = new PWADiagnosticsEngine({
  debug: false,
  autoInit: true,
});

export function checkHttpsCompliance(): HttpsDiagnosticResult {
  return pwaDiagnostics.checkHttps();
}

export async function checkManifestAvailability(): Promise<ManifestDiagnosticResult> {
  return pwaDiagnostics.checkManifest();
}

export async function checkServiceWorkerStatus(): Promise<ServiceWorkerDiagnosticResult> {
  return pwaDiagnostics.checkServiceWorker();
}

export async function runPWADiagnostics(): Promise<PWADiagnosticReport> {
  return pwaDiagnostics.runDiagnostics();
}
