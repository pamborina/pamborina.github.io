import { useState, useEffect, useCallback } from 'react';
import {
  pamborinaInstallManager,
  DeviceInstallProfile,
  InstallOutcome,
} from '../services/pamborinaInstallManager';

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
  const [profile, setProfile] = useState<DeviceInstallProfile>(() => pamborinaInstallManager.getProfile());
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

    // 2. Subscribe to PamborinaInstallManager profile changes
    const unsubManager = pamborinaInstallManager.subscribe(() => {
      setProfile(pamborinaInstallManager.getProfile());
    });

    // 3. Subscribe to service worker update availability
    const unsubUpdates = pamborinaInstallManager.onUpdateAvailable(() => {
      setHasUpdate(true);
    });

    return () => {
      modalListeners.delete(listener);
      window.removeEventListener('pamborina_open_install_modal', handleOpenEvt);
      window.removeEventListener('pamborina_close_install_modal', handleCloseEvt);
      unsubManager();
      unsubUpdates();
    };
  }, []);

  const openInstallModal = useCallback(() => {
    triggerOpenInstallBanner();
  }, []);

  const closeInstallModal = useCallback(() => {
    triggerCloseInstallBanner();
  }, []);

  const executeInstall = useCallback(async (): Promise<{ outcome: InstallOutcome; error?: string }> => {
    const result = await pamborinaInstallManager.executeInstall();
    setProfile(pamborinaInstallManager.getProfile());
    return result;
  }, []);

  const applyUpdate = useCallback(() => {
    pamborinaInstallManager.applyUpdate();
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
    hasNativePrompt: profile.hasNativePrompt,
    isInIframe: profile.isInIframe,
    browserName: profile.browserName,
    osName: profile.osName,
    isModalOpen,
    isBannerOpen: isModalOpen,
    isInstallable: profile.hasNativePrompt,
    hasUpdate,
    isDismissed,
    openInstallModal,
    openInstallBanner: openInstallModal,
    closeInstallModal,
    closeInstallBanner: closeInstallModal,
    executeInstall,
    install: async () => {
      const res = await executeInstall();
      return res.outcome;
    },
    applyUpdate,
    dismiss,
  };
}
