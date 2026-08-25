import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Helper to safely read env variables in both Vite client and Node scripts
const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

// Firebase configuration from environment variables with fallback configuration
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || 'AIzaSyA3KZCOwVykq5EUeJsK8RMEE0LMaYZx_nM',
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || 'pamborina-app.firebaseapp.com',
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || 'pamborina-app',
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || 'pamborina-app.firebasestorage.app',
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || '1004537773887',
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || '1:1004537773887:web:e036a8b9761a4207f35d8a',
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID') || 'G-JMYMRX50FV',
};

/**
 * Validates whether essential Firebase credentials are provided.
 */
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'MY_FIREBASE_API_KEY' &&
    firebaseConfig.projectId !== 'MY_FIREBASE_PROJECT_ID'
  );
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

let isInitialized = false;
let initializationError: string | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    // Safely initialize Firestore with multi-tab support and memory cache fallback
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      try {
        db = getFirestore(app);
      } catch {
        db = initializeFirestore(app, {
          localCache: memoryLocalCache(),
        });
      }
    }

    auth = getAuth(app);
    storage = getStorage(app);
    isInitialized = true;
    console.log('[Firestore] Connected with resilient cache');
  } catch (error: any) {
    initializationError = error?.message || 'Unknown initialization error';
    console.warn('⚠️ [Firebase] Initialization error:', initializationError);
  }
} else {
  console.info('ℹ️ [Firebase] Environment variables not set or incomplete. Running in Static Local Data mode.');
}

/**
 * Connectivity test function to verify Firebase initialization status safely.
 */
export const testFirebaseConnection = (): {
  configured: boolean;
  initialized: boolean;
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  error: string | null;
} => {
  return {
    configured: isFirebaseConfigured(),
    initialized: isInitialized,
    app,
    db,
    auth,
    storage,
    error: initializationError,
  };
};

export { app, db, auth, storage };
export default app;
