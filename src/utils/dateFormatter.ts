/**
 * Utility functions for precise Date & Time formatting in Cairo/Egypt timezone (Africa/Cairo)
 */

let clockOffset = 0;

export function setClockOffset(offset: number) {
  clockOffset = offset;
}

export function getAccurateNow(): Date {
  return new Date(Date.now() + clockOffset);
}

export async function syncTimeWithServer() {
  try {
    const start = Date.now();
    const res = await fetch('/api/health');
    const data = await res.json();
    const end = Date.now();
    
    // Round-trip latency
    const rtt = end - start;
    const serverTime = new Date(data.timestamp).getTime();
    
    // Correct server time by adding half of the round-trip latency
    const correctedServerTime = serverTime + (rtt / 2);
    
    // Calculate global offset to adjust client clock
    clockOffset = correctedServerTime - end;
    console.log(`[TimeSync] Cairo Server clock offset synchronized: ${clockOffset}ms (RTT: ${rtt}ms)`);
  } catch (err) {
    console.warn('[TimeSync] Failed to sync clock with server, using local clock fallback:', err);
  }
}

export function formatCairoDateTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return 'غير محدد';
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'غير محدد';

    const timeStr = date.toLocaleTimeString('ar-EG', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const dateStr = date.toLocaleDateString('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });

    return `${timeStr} • ${dateStr}`;
  } catch (err) {
    return String(dateInput);
  }
}

export function formatCairoTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '--:--';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('ar-EG', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '--:--';
  }
}

export function formatCairoDate(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '--/--/----';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '--/--/----';
    return date.toLocaleDateString('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  } catch {
    return '--/--/----';
  }
}

/**
 * Returns formatted relative or exact time in Arabic
 */
export function formatTimeAgoArabic(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    const now = getAccurateNow();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    
    return formatCairoDateTime(date);
  } catch {
    return '';
  }
}
