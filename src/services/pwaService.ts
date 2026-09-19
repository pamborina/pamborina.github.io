/**
 * Pamborina PWA Service Worker Registration Utility
 * Compatible with GitHub Pages & custom domain deployments.
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Register on window load to avoid blocking critical page rendering
  window.addEventListener('load', () => {
    try {
      // Compute relative service worker path dynamically based on current origin & pathname
      const swPath = new URL('./sw.js', window.location.href).pathname;

      navigator.serviceWorker
        .register(swPath, { scope: './' })
        .then((registration) => {
          console.log('[Pamborina PWA] Service Worker active with scope:', registration.scope);

          // Listen for SW updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[Pamborina PWA] New content available; ready to reload.');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[Pamborina PWA] SW registration failed:', err);
        });
    } catch (err) {
      console.warn('[Pamborina PWA] Could not resolve Service Worker URL:', err);
    }
  });
}
