/**
 * Pamborina PWA Service Worker Registration Utility
 * Integrates directly with central PWA Engine
 */
import { pwaEngine } from './pwaEngine';

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Register on window load to avoid blocking critical rendering or Firebase initialization
  window.addEventListener('load', () => {
    try {
      const swPath = '/sw.js';

      navigator.serviceWorker
        .register(swPath, { scope: '/' })
        .then((registration) => {
          console.log('[Pamborina PWA] Service Worker registered with scope:', registration.scope);
          pwaEngine.setServiceWorkerRegistration(registration);

          // Check if an updated worker is already waiting
          if (registration.waiting) {
            pwaEngine.notifyUpdateAvailable(registration);
          }

          // Listen for newly installed updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[Pamborina PWA] New update available; ready to reload.');
                  pwaEngine.notifyUpdateAvailable(registration);
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[Pamborina PWA] SW registration note:', err);
        });

      // Handle controllerchange event to refresh page smoothly upon update
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } catch (err) {
      console.warn('[Pamborina PWA] Could not initialize Service Worker:', err);
    }
  });
}
