/**
 * Robust, cross-platform clipboard copy helper.
 * Protects against:
 * 1. "Illegal invocation" when navigator.clipboard.writeText is unbound or called in restricted context.
 * 2. Permissions / NotAllowedError / SecurityError in iframe preview sandboxes.
 * 3. Older mobile browsers / webviews lacking navigator.clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern navigator.clipboard with explicit bind/call protection
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      // Must call with navigator.clipboard as `this` context to prevent "Illegal invocation"
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // 2. Universal textarea execCommand fallback
  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.setAttribute('readonly', '');
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      textArea.style.zIndex = '-9999';

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) return true;
    }
  } catch {
    // Both failed
  }

  return false;
}
