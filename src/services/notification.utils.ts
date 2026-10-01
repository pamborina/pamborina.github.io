/**
 * NotificationUtils
 * Native Browser Notification API integration, permission handlers,
 * sound/vibration feedback, and formatting helpers.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[NotificationUtils] Failed to request permission:', err);
    return Notification.permission;
  }
}

export function sendNativeBrowserNotification(
  title: string,
  options?: NotificationOptions & { onClick?: () => void }
): Notification | null {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notifOptions: Record<string, any> = {
      dir: 'rtl',
      lang: 'ar',
      badge: '/icon.png',
      icon: options?.icon || '/icon.png',
      body: options?.body || '',
      tag: options?.tag || 'pamborina_smart_notification',
      renotify: true,
      requireInteraction: options?.requireInteraction ?? false,
      ...options,
    };

    const notif = new Notification(title, notifOptions as NotificationOptions);

    if (options?.onClick) {
      notif.onclick = (e) => {
        e.preventDefault();
        try {
          window.focus();
        } catch {
          // Ignore iframe restrictions
        }
        options.onClick?.();
        notif.close();
      };
    }

    return notif;
  } catch (err) {
    console.warn('[NotificationUtils] Native notification failed:', err);
    return null;
  }
}

export function playNotificationSound(): void {
  try {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Audio context may be restricted before user gesture
  }
}

export function formatTimeAgoArabic(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return 'الآن';
  if (diffMinutes === 1) return 'منذ دقيقة';
  if (diffMinutes === 2) return 'منذ دقيقتين';
  if (diffMinutes < 10) return `منذ ${diffMinutes} دقائق`;
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
  if (diffHours === 1) return 'منذ ساعة';
  if (diffHours === 2) return 'منذ ساعتين';
  if (diffHours < 10) return `منذ ${diffHours} ساعات`;
  return `منذ ${diffHours} ساعة`;
}
