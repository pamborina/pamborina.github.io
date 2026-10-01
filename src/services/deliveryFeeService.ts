/**
 * Delivery Fee Configuration Service
 * Manages store-wide delivery fee, free delivery threshold, and status via Firestore `settings/delivery`.
 */

import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DeliveryFeeConfig } from '../types';
import { storageService } from './storageService';
import { firebaseAuthService } from './firebaseAuthService';
import { siteSettingsService } from './siteSettingsService';

const DELIVERY_SETTINGS_DOC_PATH = 'settings';
const DELIVERY_DOC_ID = 'delivery';
const LOCAL_STORAGE_KEY = 'pamborina_delivery_fee_config';

export const DEFAULT_DELIVERY_CONFIG: DeliveryFeeConfig = {
  fee: 30,
  currency: 'EGP',
  enabled: true,
  freeDeliveryThreshold: 200,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
  notesAr: 'خدمة التوصيل السريع لجميع المناطق المحيطة بالفروع',
};

class DeliveryFeeService {
  private currentConfig: DeliveryFeeConfig = { ...DEFAULT_DELIVERY_CONFIG };
  private listeners: Set<(config: DeliveryFeeConfig) => void> = new Set();
  private hasInitializedFromFirestore = false;
  private unsubscribeFirestore: (() => void) | null = null;

  constructor() {
    this.loadFromLocalStorage();
    this.initializeRealtimeSync();
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.fee === 'number') {
          this.currentConfig = {
            ...DEFAULT_DELIVERY_CONFIG,
            ...parsed,
          };
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private saveToLocalStorage(config: DeliveryFeeConfig): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore
    }
  }

  private initializeRealtimeSync(): void {
    if (this.unsubscribeFirestore) return;

    try {
      const docRef = doc(db, DELIVERY_SETTINGS_DOC_PATH, DELIVERY_DOC_ID);
      this.unsubscribeFirestore = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const resolved: DeliveryFeeConfig = {
              fee: typeof data.fee === 'number' && data.fee >= 0 ? data.fee : DEFAULT_DELIVERY_CONFIG.fee,
              currency: data.currency || 'EGP',
              enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
              freeDeliveryThreshold:
                typeof data.freeDeliveryThreshold === 'number'
                  ? data.freeDeliveryThreshold
                  : DEFAULT_DELIVERY_CONFIG.freeDeliveryThreshold,
              updatedAt: data.updatedAt?.toDate
                ? data.updatedAt.toDate().toISOString()
                : data.updatedAt || new Date().toISOString(),
              updatedBy: data.updatedBy || '',
              notesAr: data.notesAr || '',
            };

            this.currentConfig = resolved;
            this.hasInitializedFromFirestore = true;
            this.saveToLocalStorage(resolved);
            this.notifyListeners();
          } else {
            // First time seeding if not exists
            this.hasInitializedFromFirestore = true;
            this.notifyListeners();
          }
        },
        (error) => {
          console.warn('[DeliveryFeeService] Firestore snapshot error, using cached config:', error);
          this.notifyListeners();
        }
      );
    } catch (err) {
      console.warn('[DeliveryFeeService] Setup listener failed:', err);
    }
  }

  private notifyListeners(): void {
    const configCopy = { ...this.currentConfig };
    this.listeners.forEach((listener) => {
      try {
        listener(configCopy);
      } catch (err) {
        console.error('[DeliveryFeeService] Listener callback error:', err);
      }
    });
  }

  /**
   * Returns the synchronously cached delivery fee config (zero latency)
   */
  public getDeliveryFeeConfigSync(): DeliveryFeeConfig {
    return { ...this.currentConfig };
  }

  /**
   * Fetches latest configuration from Firestore
   */
  public async getDeliveryFeeConfig(): Promise<DeliveryFeeConfig> {
    try {
      const docRef = doc(db, DELIVERY_SETTINGS_DOC_PATH, DELIVERY_DOC_ID);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        this.currentConfig = {
          fee: typeof data.fee === 'number' && data.fee >= 0 ? data.fee : DEFAULT_DELIVERY_CONFIG.fee,
          currency: data.currency || 'EGP',
          enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
          freeDeliveryThreshold:
            typeof data.freeDeliveryThreshold === 'number'
              ? data.freeDeliveryThreshold
              : DEFAULT_DELIVERY_CONFIG.freeDeliveryThreshold,
          updatedAt: data.updatedAt?.toDate
            ? data.updatedAt.toDate().toISOString()
            : data.updatedAt || new Date().toISOString(),
          updatedBy: data.updatedBy || '',
          notesAr: data.notesAr || '',
        };
        this.saveToLocalStorage(this.currentConfig);
      }
    } catch (err) {
      console.warn('[DeliveryFeeService] Failed to fetch doc directly, using local:', err);
    }

    return { ...this.currentConfig };
  }

  /**
   * Subscribes to real-time delivery fee updates
   */
  public subscribeToDeliveryFee(callback: (config: DeliveryFeeConfig) => void): () => void {
    this.listeners.add(callback);
    // Fire immediately with cached value
    callback({ ...this.currentConfig });

    return () => {
      this.listeners.delete(callback);
    };
  }

  public subscribeToDeliveryFeeConfig(callback: (config: DeliveryFeeConfig) => void): () => void {
    return this.subscribeToDeliveryFee(callback);
  }

  /**
   * Updates delivery fee configuration in Firestore (Admin only)
   */
  public async updateDeliveryFeeConfig(updates: Partial<DeliveryFeeConfig>): Promise<void> {
    // Validation
    if (updates.fee !== undefined) {
      if (typeof updates.fee !== 'number' || isNaN(updates.fee) || updates.fee < 0) {
        throw new Error('يرجى إدخال سعر توصيل صحيح (رقم لا يقل عن صفر)');
      }
    }

    if (updates.freeDeliveryThreshold !== undefined && updates.freeDeliveryThreshold !== null) {
      if (typeof updates.freeDeliveryThreshold !== 'number' || isNaN(updates.freeDeliveryThreshold) || updates.freeDeliveryThreshold < 0) {
        throw new Error('يرجى إدخال حد أدنى صحيح للتوصيل المجاني');
      }
    }

    const adminUser = firebaseAuthService.getCurrentUser();
    const updatedBy = adminUser?.email || 'admin@pamborina.com';

    const merged: DeliveryFeeConfig = {
      ...this.currentConfig,
      ...updates,
      currency: 'EGP',
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    // 1. Optimistically update local memory & storage
    this.currentConfig = merged;
    this.saveToLocalStorage(merged);
    this.notifyListeners();

    // 2. Persist to Firestore `settings/delivery`
    try {
      const docRef = doc(db, DELIVERY_SETTINGS_DOC_PATH, DELIVERY_DOC_ID);
      await setDoc(
        docRef,
        {
          fee: merged.fee,
          currency: 'EGP',
          enabled: merged.enabled,
          freeDeliveryThreshold: merged.freeDeliveryThreshold ?? 0,
          notesAr: merged.notesAr || '',
          updatedAt: serverTimestamp(),
          updatedBy,
        },
        { merge: true }
      );

      // 3. Sync with siteSettingsService for global consistency
      try {
        await siteSettingsService.updateSiteSettings({
          freeDeliveryThreshold: merged.freeDeliveryThreshold,
          freeDeliveryBarEnabled: merged.enabled,
        });
      } catch (err) {
        console.warn('[DeliveryFeeService] Note: Site settings sync warning:', err);
      }

      // 4. Log audit event
      await storageService.logActivity(
        'تعديل سعر التوصيل',
        `السعر: ${merged.fee} ج.م | الحالة: ${merged.enabled ? 'مفعل' : 'معطل'} | الحد المجاني: ${merged.freeDeliveryThreshold} ج.م`
      );
    } catch (err: any) {
      console.error('[DeliveryFeeService] Update Firestore error:', err);
      throw new Error(err.message || 'حدث خطأ أثناء حفظ سعر التوصيل في قاعدة البيانات');
    }
  }
}

export const deliveryFeeService = new DeliveryFeeService();
