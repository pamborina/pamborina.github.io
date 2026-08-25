import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely suppress transient IndexedDB/Firestore closing errors during tab visibility change or unload
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || reason?.name || '';
    if (
      msg.includes('database is closing') ||
      msg.includes('Database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('connection is being closed') ||
      msg.includes('IDBDatabase')
    ) {
      event.preventDefault();
      console.warn('ℹ️ [IndexedDB/Firestore] Caught database closing event gracefully:', msg);
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('database is closing') ||
      msg.includes('Database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('connection is being closed') ||
      msg.includes('IDBDatabase')
    ) {
      event.preventDefault();
      console.warn('ℹ️ [IndexedDB/Firestore] Caught database closing error gracefully:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

