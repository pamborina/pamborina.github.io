import { useState, useEffect, useCallback } from 'react';
import { pwaEngine, DevicePWAProfile, PWAInstallOutcome, BeforeInstallPromptEvent } from '../services/pwaEngine';

let globalModalOpen = false;
const modalListeners = new Set<(open: boolean) => void>();

export function triggerOpenInstallBanner() {
  globalModalOpen = true;
  modalListeners.forEach((fn) => fn(true));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pamborina_open_install_modal'));
  }
}

export function triggerCloseInstallBanner() {
  globalModalOpen = false;
  modalListeners.forEach((fn) => fn(false));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pamborina_close_install_modal'));
  }
}

export function usePWAInstall() {
  const [profile, setProfile] = useState<DevicePWAProfile>(() => pwaEngine.getProfile());
  const [isModalOpen, setIsModalOpen] = useState<boolean>(globalModalOpen);
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('pamborina_pwa_dismissed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    // 1. Sync modal open/close state
    const listener = (val: boolean) => setIsModalOpen(val);
    modalListeners.add(listener);

    const handleOpenEvt = () => setIsModalOpen(true);
    const handleCloseEvt = () => setIsModalOpen(false);

    window.addEventListener('pamborina_open_install_modal', handleOpenEvt);
    window.addEventListener('pamborina_close_install_modal', handleCloseEvt);

    // 2. Subscribe to PWA Engine profile changes
    const unsubEngine = pwaEngine.subscribe(() => {
      setProfile(pwaEngine.getProfile());
    });

    // 3. Subscribe to service worker update availability
    const unsubUpdates = pwaEngine.onUpdateAvailable(() => {
      setHasUpdate(true);
    });

    // 4. Auto check url param ?install=1 or ?pwa_install=1
    if (typeof window !== 'undefined' && (window.location.search.includes('pwa_install=1') || window.location.search.includes('install=now'))) {
      const current = pwaEngine.getProfile();
      if (!current.isInstalled) {
        setIsModalOpen(true);
      }
    }

    return () => {
      modalListeners.delete(listener);
      window.removeEventListener('pamborina_open_install_modal', handleOpenEvt);
      window.removeEventListener('pamborina_close_install_modal', handleCloseEvt);
      unsubEngine();
      unsubUpdates();
    };
  }, []);

  const openInstallModal = useCallback(() => {
    triggerOpenInstallBanner();
  }, []);

  const closeInstallModal = useCallback(() => {
    triggerCloseInstallBanner();
  }, []);

  const executeInstall = useCallback(async (): Promise<{ outcome: PWAInstallOutcome; error?: string }> => {
    const result = await pwaEngine.executeInstall();
    setProfile(pwaEngine.getProfile());
    return result;
  }, []);

  const applyUpdate = useCallback(() => {
    pwaEngine.applyUpdate();
  }, []);

  const dismiss = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pamborina_pwa_dismissed', 'true');
    }
    setIsDismissed(true);
    triggerCloseInstallBanner();
  }, []);

  return {
    profile,
    isInstalled: profile.isInstalled,
    isAndroid: profile.isAndroid,
    isIOS: profile.isIOS,
    isIPhone: profile.isIPhone,
    isIPad: profile.isIPad,
    isWindows: profile.isWindows,
    isMac: profile.isMac,
    isDesktop: profile.isDesktop,
    isSafari: profile.isSafari,
    isChrome: profile.isChrome,
    isEdge: profile.isEdge,
    isFirefox: profile.isFirefox,
    isSamsung: profile.isSamsung,
    isIOSOtherBrowser: profile.isIOSOtherBrowser,
    hasNativePrompt: profile.hasNativePrompt,
    isInIframe: profile.isInIframe,
    browserName: profile.browserName,
    osName: profile.osName,
    isModalOpen,
    isBannerOpen: isModalOpen, // backward-compatibility
    isInstallable: profile.hasNativePrompt,
    hasUpdate,
    isDismissed,
    openInstallModal,
    openInstallBanner: openInstallModal, // backward-compatibility
    closeInstallModal,
    closeInstallBanner: closeInstallModal, // backward-compatibility
    executeInstall,
    install: async () => {
      const res = await executeInstall();
      return res.outcome;
    }, // backward-compatibility
    applyUpdate,
    dismiss,
  };
}
