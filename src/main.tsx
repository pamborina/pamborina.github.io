import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './services/pwaService';

// Register PWA Service Worker for Progressive Web App capabilities
registerServiceWorker();

// Safely suppress transient IndexedDB/Firestore closing errors, BloomFilter warnings, and Vite HMR websocket noise
if (typeof window !== 'undefined') {
  const originalWarn = console.warn.bind(console);
  const isIgnorable = (text: string): boolean => {
    if (!text) return false;
    const t = text.toLowerCase();
    return (
      t.includes('[vite]') ||
      t.includes('websocket') ||
      t.includes('closed without opened') ||
      t.includes('illegal invocation') ||
      t.includes('[timesync]') ||
      t.includes('database is closing') ||
      t.includes('bloomfilter')
    );
  };

  console.warn = (...args: any[]) => {
    try {
      const fullText = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return `${arg.name} ${arg.message}`;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');

      if (isIgnorable(fullText)) {
        return; // Suppress harmless warnings
      }
    } catch {}
    originalWarn.apply(console, args);
  };

  const originalError = console.error.bind(console);
  console.error = (...args: any[]) => {
    try {
      const fullText = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return `${arg.name} ${arg.message} ${arg.stack || ''}`;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');

      if (isIgnorable(fullText)) {
        return; // Completely suppress harmless logs
      }
    } catch {}
    originalError.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || reason?.name || String(reason || '');
    if (isIgnorable(msg)) {
      event.preventDefault();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || (event.error && event.error.message) || '';
    if (isIgnorable(msg)) {
      event.preventDefault();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

