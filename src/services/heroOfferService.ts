import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { HeroOffer, HeroOffersConfig } from '../types';
import { Images } from '../data/images';
import { auditLogService } from './auditLogService';

export const HERO_OFFERS_COLLECTION = 'hero_offers';
export const HERO_OFFERS_SETTINGS_DOC = 'hero_offers_config';
export const SETTINGS_COLLECTION = 'settings';

const HERO_OFFERS_CACHE_KEY = 'pamborina_hero_offers_cache_v2';
const HERO_OFFERS_CONFIG_CACHE_KEY = 'pamborina_hero_offers_config_cache_v2';

export const HERO_OFFERS_CHANGED_EVENT = 'pamborina_hero_offers_changed';
export const HERO_OFFERS_CONFIG_CHANGED_EVENT = 'pamborina_hero_offers_config_changed';

export const DEFAULT_HERO_OFFERS: HeroOffer[] = [
  {
    id: 'hero-offer-1',
    titleAr: 'علب كحك وبسكويت العيد الفاخر',
    subtitleAr: 'دايب بالسمن البلدي الصافي ومحشو بأفخر أنواع المكسرات والفستق الحلبي.',
    badgeAr: '🌙 الموسم والتشكيلة الملكية',
    discountBadgeAr: 'خصم 20% لفترة محدودة',
    trustBadge1Ar: 'ضمان السمن البلدي 100%',
    trustBadge2Ar: 'طلبها +1,850 عميل اليوم',
    ctaTextAr: 'اطلب تشكيلة كحك العيد',
    imageUrl: Images.heroBanner1 || 'https://images.unsplash.com/photo-1579372786545-d24232daf58c?auto=format&fit=crop&w=1000&q=80',
    categoryId: 'kahk-el-eid',
    targetType: 'category',
    hasCountdown: true,
    countdownType: 'daily_recurring',
    countdownHours: 4,
    countdownLabelAr: 'ينتهي العرض خلال:',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'hero-offer-2',
    titleAr: 'كشري المانجو وقشطوطة اللوتس',
    subtitleAr: 'ابتكار بامبورينا الأكثر مبيعاً! طبقات القشطة واللوتس مع المانجو الفريش.',
    badgeAr: '🔥 الأكثر طلباً في الجيزة',
    discountBadgeAr: 'توفير 40 ج.م على العلبة',
    trustBadge1Ar: 'ضمان السمن البلدي 100%',
    trustBadge2Ar: 'طلبها +1,850 عميل اليوم',
    ctaTextAr: 'جرب الكشري الحلو',
    imageUrl: Images.heroBanner2 || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1000&q=80',
    categoryId: 'koshary',
    targetType: 'category',
    hasCountdown: true,
    countdownType: 'daily_recurring',
    countdownHours: 4,
    countdownLabelAr: 'ينتهي العرض خلال:',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'hero-offer-3',
    titleAr: 'كريبات وشاورما بامبورينا المكس',
    subtitleAr: 'وجبات حادقة سخنة ومقرمشة محضرة طازجة من فرع شارع العشرين بفيصل.',
    badgeAr: '⚡ توصيل صاروخي 20 دقيقة',
    discountBadgeAr: 'توصيل مجاني للوجبات',
    trustBadge1Ar: 'ضمان السمن البلدي 100%',
    trustBadge2Ar: 'طلبها +1,850 عميل اليوم',
    ctaTextAr: 'اطلب وجبتك الحادقة',
    imageUrl: Images.heroBanner3 || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80',
    categoryId: 'sandwiches-french',
    targetType: 'category',
    hasCountdown: true,
    countdownType: 'daily_recurring',
    countdownHours: 4,
    countdownLabelAr: 'ينتهي العرض خلال:',
    isActive: true,
    sortOrder: 3,
  },
];

export const DEFAULT_HERO_OFFERS_CONFIG: HeroOffersConfig = {
  isEnabled: true,
  autoSlideIntervalSeconds: 6,
  sectionTitleAr: 'العروض والخصومات الحصرية',
};

// In-memory caches for 0ms response
let memoryOffers: HeroOffer[] = loadOffersFromLocalStorage();
let memoryConfig: HeroOffersConfig = loadConfigFromLocalStorage();
let isFirestoreSeeded = false;

function loadOffersFromLocalStorage(): HeroOffer[] {
  try {
    const raw = localStorage.getItem(HERO_OFFERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached hero offers:', e);
  }
  return DEFAULT_HERO_OFFERS;
}

function saveOffersToLocalStorage(offers: HeroOffer[]): void {
  try {
    memoryOffers = [...offers];
    localStorage.setItem(HERO_OFFERS_CACHE_KEY, JSON.stringify(offers));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(HERO_OFFERS_CHANGED_EVENT, { detail: offers })
      );
    }
  } catch (e) {
    console.warn('Could not save cached hero offers:', e);
  }
}

function loadConfigFromLocalStorage(): HeroOffersConfig {
  try {
    const raw = localStorage.getItem(HERO_OFFERS_CONFIG_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.isEnabled === 'boolean') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached hero offers config:', e);
  }
  return DEFAULT_HERO_OFFERS_CONFIG;
}

function saveConfigToLocalStorage(config: HeroOffersConfig): void {
  try {
    memoryConfig = { ...config };
    localStorage.setItem(HERO_OFFERS_CONFIG_CACHE_KEY, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(HERO_OFFERS_CONFIG_CHANGED_EVENT, { detail: config })
      );
    }
  } catch (e) {
    console.warn('Could not save cached hero offers config:', e);
  }
}

/**
 * Ensures Firestore is properly initialized with default offers on first run if empty
 */
async function ensureOffersSeededInFirestore(): Promise<void> {
  if (!isFirebaseConfigured() || !db || isFirestoreSeeded) return;

  try {
    const snap = await getDocs(collection(db, HERO_OFFERS_COLLECTION));
    if (snap.empty) {
      const batch = writeBatch(db);
      DEFAULT_HERO_OFFERS.forEach((offer) => {
        const ref = doc(db, HERO_OFFERS_COLLECTION, offer.id);
        batch.set(ref, offer);
      });
      // Also write default config
      const configRef = doc(db, SETTINGS_COLLECTION, HERO_OFFERS_SETTINGS_DOC);
      batch.set(configRef, DEFAULT_HERO_OFFERS_CONFIG);

      await batch.commit();
      console.log('✅ [HeroOfferService] Seeded default 3 hero offers to Firestore');
    }
    isFirestoreSeeded = true;
  } catch (e) {
    console.warn('⚠️ [HeroOfferService] Seeding notice:', e);
  }
}

export const heroOfferService = {
  /**
   * Subscribe to realtime offers list with instant local fallback
   */
  subscribeToHeroOffers(
    callback: (offers: HeroOffer[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    // 1. Notify immediately from memory
    callback(memoryOffers.length > 0 ? memoryOffers : DEFAULT_HERO_OFFERS);

    // 2. Listen to local broadcast event for 0ms cross-tab & component sync
    const handleLocalEvent = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        callback(e.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(HERO_OFFERS_CHANGED_EVENT, handleLocalEvent);
    }

    if (!isFirebaseConfigured() || !db) {
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener(HERO_OFFERS_CHANGED_EVENT, handleLocalEvent);
        }
      };
    }

    // Trigger seeding check in background
    ensureOffersSeededInFirestore().catch(() => {});

    try {
      const unsubFirestore = onSnapshot(
        collection(db, HERO_OFFERS_COLLECTION),
        (snap) => {
          const list: HeroOffer[] = [];
          snap.forEach((d) => {
            if (d.exists()) {
              list.push({
                ...(d.data() as HeroOffer),
                id: d.id,
              });
            }
          });

          list.sort((a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1));

          if (list.length > 0 || isFirestoreSeeded) {
            saveOffersToLocalStorage(list);
            callback(list);
          }
        },
        (err) => {
          console.warn('⚠️ [HeroOfferService] Snapshot notice:', err);
          if (onError) onError(err);
        }
      );

      return () => {
        unsubFirestore();
        if (typeof window !== 'undefined') {
          window.removeEventListener(HERO_OFFERS_CHANGED_EVENT, handleLocalEvent);
        }
      };
    } catch (e: any) {
      console.warn('⚠️ [HeroOfferService] Failed to establish listener:', e);
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener(HERO_OFFERS_CHANGED_EVENT, handleLocalEvent);
        }
      };
    }
  },

  /**
   * Subscribe to realtime offers section configuration (Master Switch & Settings)
   */
  subscribeToOffersConfig(
    callback: (config: HeroOffersConfig) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    callback(memoryConfig);

    const handleConfigEvent = (e: any) => {
      if (e.detail) {
        callback(e.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(HERO_OFFERS_CONFIG_CHANGED_EVENT, handleConfigEvent);
    }

    if (!isFirebaseConfigured() || !db) {
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener(HERO_OFFERS_CONFIG_CHANGED_EVENT, handleConfigEvent);
        }
      };
    }

    try {
      const configRef = doc(db, SETTINGS_COLLECTION, HERO_OFFERS_SETTINGS_DOC);
      const unsubFirestore = onSnapshot(
        configRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as HeroOffersConfig;
            saveConfigToLocalStorage(data);
            callback(data);
          }
        },
        (err) => {
          console.warn('⚠️ [HeroOfferService] Config snapshot notice:', err);
          if (onError) onError(err);
        }
      );

      return () => {
        unsubFirestore();
        if (typeof window !== 'undefined') {
          window.removeEventListener(HERO_OFFERS_CONFIG_CHANGED_EVENT, handleConfigEvent);
        }
      };
    } catch (e: any) {
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener(HERO_OFFERS_CONFIG_CHANGED_EVENT, handleConfigEvent);
        }
      };
    }
  },

  /**
   * Get all offers currently saved
   */
  async getHeroOffers(): Promise<HeroOffer[]> {
    if (!isFirebaseConfigured() || !db) {
      return memoryOffers;
    }

    try {
      await ensureOffersSeededInFirestore();
      const snap = await getDocs(collection(db, HERO_OFFERS_COLLECTION));
      if (!snap.empty) {
        const list: HeroOffer[] = [];
        snap.forEach((d) => {
          if (d.exists()) {
            list.push({ ...(d.data() as HeroOffer), id: d.id });
          }
        });
        list.sort((a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1));
        saveOffersToLocalStorage(list);
        return list;
      }
    } catch (e) {
      console.warn('Failed to load hero offers from Firestore:', e);
    }

    return memoryOffers;
  },

  /**
   * Save or update an offer (with instant 0ms optimistic update)
   */
  async saveHeroOffer(offer: Partial<HeroOffer> & { titleAr: string }): Promise<HeroOffer> {
    const id = offer.id || `hero-offer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const fullOffer: HeroOffer = {
      id,
      titleAr: offer.titleAr,
      subtitleAr: offer.subtitleAr || '',
      badgeAr: offer.badgeAr || '🔥 عرض حصري',
      discountBadgeAr: offer.discountBadgeAr || 'خصم مميز',
      trustBadge1Ar: offer.trustBadge1Ar || 'ضمان السمن البلدي 100%',
      trustBadge2Ar: offer.trustBadge2Ar || 'طلبها +1,850 عميل اليوم',
      ctaTextAr: offer.ctaTextAr || 'اطلب الآن',
      imageUrl: offer.imageUrl || Images.heroBanner1,
      categoryId: offer.categoryId || '',
      productId: offer.productId || '',
      targetType: offer.targetType || 'category',
      hasCountdown: offer.hasCountdown ?? true,
      countdownType: offer.countdownType || 'daily_recurring',
      countdownHours: offer.countdownHours ?? 4,
      countdownEndDateTime: offer.countdownEndDateTime || '',
      countdownLabelAr: offer.countdownLabelAr || 'ينتهي العرض خلال:',
      isActive: offer.isActive ?? true,
      sortOrder: offer.sortOrder ?? (memoryOffers.length + 1),
      createdAt: offer.createdAt || now,
      updatedAt: now,
    };

    // 1. Optimistic Local Update
    const existingIdx = memoryOffers.findIndex((o) => o.id === id);
    let updatedList: HeroOffer[];
    if (existingIdx >= 0) {
      updatedList = [...memoryOffers];
      updatedList[existingIdx] = fullOffer;
    } else {
      updatedList = [...memoryOffers, fullOffer];
    }
    updatedList.sort((a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1));
    saveOffersToLocalStorage(updatedList);

    // 2. Persist to Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const ref = doc(db, HERO_OFFERS_COLLECTION, id);
        await setDoc(ref, fullOffer, { merge: true });
      } catch (err: any) {
        console.warn('⚠️ [HeroOfferService] Firestore save notice:', err);
      }
    }

    // 3. Log Audit
    auditLogService.logAdminAction({
      action: existingIdx >= 0 ? 'update_settings' : 'create_product',
      targetType: 'settings',
      targetId: id,
      summaryAr: `تم ${existingIdx >= 0 ? 'تعديل' : 'إضافة'} بانر العرض: (${fullOffer.titleAr})`,
      metadata: { offerId: id, titleAr: fullOffer.titleAr },
    });

    return fullOffer;
  },

  /**
   * Delete an offer (Instant removal)
   */
  async deleteHeroOffer(offerId: string): Promise<void> {
    const deletedOffer = memoryOffers.find((o) => o.id === offerId);

    // 1. Optimistic Local Update
    const updatedList = memoryOffers.filter((o) => o.id !== offerId);
    saveOffersToLocalStorage(updatedList);

    // 2. Remove from Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const ref = doc(db, HERO_OFFERS_COLLECTION, offerId);
        await deleteDoc(ref);
      } catch (err: any) {
        console.warn('⚠️ [HeroOfferService] Firestore delete notice:', err);
      }
    }

    // 3. Audit log
    auditLogService.logAdminAction({
      action: 'delete_product',
      targetType: 'settings',
      targetId: offerId,
      summaryAr: `تم حذف بانر العرض: (${deletedOffer?.titleAr || offerId})`,
      metadata: { offerId },
    });
  },

  /**
   * Fast toggle offer active status
   */
  async toggleOfferActive(offerId: string, isActive: boolean): Promise<void> {
    const offer = memoryOffers.find((o) => o.id === offerId);
    if (!offer) return;

    const updated = { ...offer, isActive, updatedAt: new Date().toISOString() };
    await this.saveHeroOffer(updated);
  },

  /**
   * Update Master Offers Section Configuration
   */
  async updateOffersConfig(config: Partial<HeroOffersConfig>): Promise<HeroOffersConfig> {
    const updated: HeroOffersConfig = {
      ...memoryConfig,
      ...config,
      updatedAt: new Date().toISOString(),
    };

    saveConfigToLocalStorage(updated);

    if (isFirebaseConfigured() && db) {
      try {
        const ref = doc(db, SETTINGS_COLLECTION, HERO_OFFERS_SETTINGS_DOC);
        await setDoc(ref, updated, { merge: true });
      } catch (err) {
        console.warn('⚠️ [HeroOfferService] Config save error:', err);
      }
    }

    auditLogService.logAdminAction({
      action: 'update_settings',
      targetType: 'settings',
      targetId: 'hero_offers_config',
      summaryAr: `تم تحديث إعدادات خانة العروض: ${updated.isEnabled ? 'تفعيل الخانة' : 'إيقاف الخانة كلياً'}`,
      metadata: { config: updated },
    });

    return updated;
  },

  /**
   * Reorder offers in batch
   */
  async reorderOffers(reorderedList: HeroOffer[]): Promise<void> {
    const sorted = reorderedList.map((item, index) => ({
      ...item,
      sortOrder: index + 1,
      updatedAt: new Date().toISOString(),
    }));

    saveOffersToLocalStorage(sorted);

    if (isFirebaseConfigured() && db) {
      try {
        const batch = writeBatch(db);
        sorted.forEach((offer) => {
          const ref = doc(db, HERO_OFFERS_COLLECTION, offer.id);
          batch.update(ref, { sortOrder: offer.sortOrder, updatedAt: offer.updatedAt });
        });
        await batch.commit();
      } catch (e) {
        console.warn('⚠️ [HeroOfferService] Reorder batch failed:', e);
      }
    }
  },

  /**
   * Reset to default initial 3 offers
   */
  async resetToDefaultOffers(): Promise<void> {
    saveOffersToLocalStorage(DEFAULT_HERO_OFFERS);
    saveConfigToLocalStorage(DEFAULT_HERO_OFFERS_CONFIG);

    if (isFirebaseConfigured() && db) {
      try {
        const batch = writeBatch(db);
        // Clear existing
        const snap = await getDocs(collection(db, HERO_OFFERS_COLLECTION));
        snap.forEach((d) => batch.delete(d.ref));

        // Insert defaults
        DEFAULT_HERO_OFFERS.forEach((o) => {
          const ref = doc(db, HERO_OFFERS_COLLECTION, o.id);
          batch.set(ref, o);
        });

        const configRef = doc(db, SETTINGS_COLLECTION, HERO_OFFERS_SETTINGS_DOC);
        batch.set(configRef, DEFAULT_HERO_OFFERS_CONFIG);

        await batch.commit();
      } catch (e) {
        console.warn('⚠️ [HeroOfferService] Reset to defaults error:', e);
      }
    }

    auditLogService.logAdminAction({
      action: 'update_settings',
      targetType: 'settings',
      targetId: 'hero_offers_reset',
      summaryAr: 'تم استعادة عروض البانر الافتراضية الأصلية',
      metadata: {},
    });
  },
};
