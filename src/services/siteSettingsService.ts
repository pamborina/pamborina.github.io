import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { SiteSettings, Coupon, StoreFeatureItem, CustomerTestimonialItem } from '../types';
import { STORE_CONFIG } from '../config/storeConfig';
import { auditLogService } from './auditLogService';

export const SETTINGS_COLLECTION = 'settings';
export const SITE_CONFIG_DOC = 'siteConfig';
const SETTINGS_CACHE_KEY = 'pamborina_site_settings_fallback_v2';
const SETTINGS_EVENT = 'pamborina_settings_changed';

export const DEFAULT_PRESET_COUPONS: Coupon[] = [
  { id: 'c1', code: 'BAMBORINA20', discountPercent: 20, description: 'خصم 20% لعملاء بامبورينا', enabled: true },
  { id: 'c2', code: 'WELCOME10', discountPercent: 10, description: 'خصم 10% للطلب الأول', enabled: true },
  { id: 'c3', code: 'FREEDELIVERY', freeShipping: true, description: 'توصيل مجاني لجميع الطلبات', enabled: true },
];

export const DEFAULT_FEATURES: StoreFeatureItem[] = [
  { id: 'f1', emoji: '🚚', titleAr: 'توصيل سريع', descAr: 'فيصل والطالبية والمناطق المجاورة' },
  { id: 'f2', emoji: '👑', titleAr: 'سمن بلدي 100%', descAr: 'خامات فاخرة عالية الجودة' },
  { id: 'f3', emoji: '🔥', titleAr: 'تحضير طازج', descAr: 'تُعد فور الطلب خصيصاً لك' },
  { id: 'f4', emoji: '💬', titleAr: 'طلب مباشر', descAr: 'مباشرة وبكل سهولة من خلال الموقع' },
];

export const DEFAULT_TESTIMONIALS: CustomerTestimonialItem[] = [
  {
    id: 'rev-1',
    nameAr: 'م. خالد الفولي',
    locationAr: 'شارع العشرين - فيصل',
    rating: 5,
    commentAr: 'الكحك والقشطوطة عندهم ملهاش حل! السمن البلدي ريحته وطعمه بيبانوا من أول قطمة، والتوصيل وصل في أقل من 20 دقيقة سخن وطازة.',
    orderedItemAr: 'كحك سوبر لوكس + كشري مانجو',
    timeAr: 'منذ يومين',
  },
  {
    id: 'rev-2',
    nameAr: 'أ. داليا السعيد',
    locationAr: 'الطالبية - هرم',
    rating: 5,
    commentAr: 'ساندوتش الفرنساوي والكريب مكس عندهم مش طبيعي! التغليف ممتاز جداً وحافظ على القرمشة والحلويات تحفة بجد.',
    orderedItemAr: 'كريب بامبورينا مكس + قشطوطة لوتس',
    timeAr: 'منذ 3 أيام',
  },
  {
    id: 'rev-3',
    nameAr: 'د. محمود حسن',
    locationAr: 'شارع فيصل الرئيسي',
    rating: 5,
    commentAr: 'أفخم حلواني في فيصل بدون منازع. التعامل راقي جداً والطلبات دايماً بتوصل مضبوطة ومغلفة بشكل ملكي.',
    orderedItemAr: 'علبة العيد المشكلة 2 كيلو',
    timeAr: 'منذ أسبوع',
  },
];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  storeNameAr: STORE_CONFIG.nameAr || 'حلواني بامبورينا',
  storeDescriptionAr: 'عنوان الرقي والأصالة في صناعة الحلويات الشرقية والغربية والمعجنات والوجبات السريعة. نستخدم السمن البلدي الأصلي 100% يومياً من فرعنا بالطالبية هرم.',
  storeBadgeAr: 'منتجات طازجة 100% بسمن بلدي صافي',
  phone: STORE_CONFIG.hotline || '01121778205',
  whatsapp: STORE_CONFIG.whatsappCleanNumber || '01121778205',
  customerServiceWhatsApp: STORE_CONFIG.whatsappPrimary || '01121778205',
  customerServicePhone: STORE_CONFIG.hotline || '01121778205',
  addressAr: '97 شارع عثمان محرم، الطالبية، هرم، الجيزة',
  defaultDeliveryFee: STORE_CONFIG.defaultDeliveryFee || 15,
  minOrderAmount: 50,
  isStoreOpen: true,
  storeStatusMode: 'manual_open',
  workingHours: {
    openTime: '10:00',
    closeTime: '02:00',
    workingDays: [0, 1, 2, 3, 4, 5, 6],
    scheduleEnabled: true,
  },
  temporaryClosureReasonAr: 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..',
  announcementEnabled: false,
  announcementTextAr: 'أهلاً بكم في بامبورينا - مواعيد العمل اليومية من 10:00 صباحاً حتى 02:00 صباحاً',
  couponsEnabled: true,
  coupons: DEFAULT_PRESET_COUPONS,
  facebookUrl: 'https://facebook.com',
  instagramUrl: 'https://instagram.com',
  tiktokUrl: 'https://tiktok.com',
  features: DEFAULT_FEATURES,
  testimonials: DEFAULT_TESTIMONIALS,
  testimonialsRating: '4.9',
  testimonialsTrustCount: '15,000',
  testimonialsTitle: 'آراء وتقييمات عملاء بامبورينا',
  testimonialsSubtitle: 'أكثر من 15,000 عميل يثقون في جودة حلويات ومأكولات بامبورينا',
};

export function formatWorkingHoursAr(openTime = '10:00', closeTime = '02:00'): string {
  const formatTimeStr = (tStr: string) => {
    if (!tStr) return '';
    const parts = tStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    if (isNaN(h)) return tStr;
    let period = 'صباحاً';
    if (h === 0) {
      period = 'منتصف الليل';
    } else if (h >= 1 && h < 4) {
      period = 'فجراً';
    } else if (h >= 4 && h < 12) {
      period = 'صباحاً';
    } else if (h === 12) {
      period = 'ظهراً';
    } else if (h >= 13 && h < 17) {
      period = 'عصراً';
    } else {
      period = 'مساءً';
    }
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const minStr = m > 0 ? `:${m < 10 ? '0' + m : m}` : '';
    return `${hour12}${minStr} ${period}`;
  };
  return `من ${formatTimeStr(openTime)} حتى ${formatTimeStr(closeTime)}`;
}

export function isStoreCurrentlyOpen(settings: SiteSettings): {
  isOpen: boolean;
  reasonAr: string;
  formattedHoursAr: string;
} {
  const workingHours = settings.workingHours || {
    openTime: '10:00',
    closeTime: '02:00',
    workingDays: [0, 1, 2, 3, 4, 5, 6],
    scheduleEnabled: true,
  };

  const formattedHoursAr = formatWorkingHoursAr(workingHours.openTime, workingHours.closeTime);

  // Determine mode
  let mode = settings.storeStatusMode;
  if (!mode) {
    mode = settings.isStoreOpen ? 'manual_open' : 'manual_closed';
  }

  // Explicit Manual Closed Override
  if (mode === 'manual_closed' || settings.isStoreOpen === false) {
    return {
      isOpen: false,
      reasonAr: settings.temporaryClosureReasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..',
      formattedHoursAr,
    };
  }

  // Explicit Manual Open Override
  if (mode === 'manual_open') {
    return {
      isOpen: true,
      reasonAr: '',
      formattedHoursAr,
    };
  }

  // Automatic Schedule Mode
  if (mode === 'auto_schedule') {
    const now = new Date();
    const openTimeStr = workingHours.openTime || '10:00';
    const closeTimeStr = workingHours.closeTime || '02:00';
    const daysList = workingHours.workingDays && workingHours.workingDays.length > 0
      ? workingHours.workingDays
      : [0, 1, 2, 3, 4, 5, 6];

    const [openH, openM] = openTimeStr.split(':').map((v) => parseInt(v, 10) || 0);
    const [closeH, closeM] = closeTimeStr.split(':').map((v) => parseInt(v, 10) || 0);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const currentDay = now.getDay(); // 0 = Sunday
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let isOpenNow = false;

    if (openMinutes === closeMinutes) {
      isOpenNow = daysList.includes(currentDay);
    } else if (closeMinutes > openMinutes) {
      // Standard same-day shift
      if (daysList.includes(currentDay) && currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
        isOpenNow = true;
      }
    } else {
      // Overnight shift
      if (currentMinutes >= openMinutes) {
        if (daysList.includes(currentDay)) {
          isOpenNow = true;
        }
      } else if (currentMinutes < closeMinutes) {
        const yesterday = (currentDay + 6) % 7;
        if (daysList.includes(yesterday)) {
          isOpenNow = true;
        }
      }
    }

    if (!isOpenNow) {
      const isTodayWorkingDay = daysList.includes(currentDay);
      const customClosureReason = settings.temporaryClosureReasonAr;
      let defaultReason = '';
      if (!isTodayWorkingDay) {
        defaultReason = `الفرع مغلق اليوم. مواعيد العمل الرسمية: (${formattedHoursAr}).`;
      } else {
        defaultReason = `عذراً، الفرع مغلق الآن نظراً لانتهاء ساعات العمل الرسمية (${formattedHoursAr}). لا يمكن استقبال الطلبات حالياً.`;
      }

      return {
        isOpen: false,
        reasonAr: customClosureReason || defaultReason,
        formattedHoursAr,
      };
    }
  }

  return {
    isOpen: true,
    reasonAr: '',
    formattedHoursAr,
  };
}

// In-memory runtime store for active settings
let memorySettings: SiteSettings = (() => {
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_SITE_SETTINGS, ...parsed };
      }
    }
  } catch {}
  return { ...DEFAULT_SITE_SETTINGS };
})();

function saveSettingsLocally(settings: SiteSettings) {
  try {
    memorySettings = { ...settings };
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
  } catch (e) {
    console.warn('⚠️ [SiteSettings] Local storage save failed:', e);
  }
}

export const siteSettingsService = {
  /**
   * Returns current settings synchronously from memory/localStorage.
   */
  getSettingsSync(): SiteSettings {
    return memorySettings || DEFAULT_SITE_SETTINGS;
  },

  /**
   * Fetches site settings from Firestore, returning defaults/cached if not yet created.
   */
  async getSiteSettings(): Promise<SiteSettings> {
    if (!isFirebaseConfigured() || !db) {
      return memorySettings;
    }

    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SITE_CONFIG_DOC);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = {
          ...DEFAULT_SITE_SETTINGS,
          ...(snap.data() as Partial<SiteSettings>),
        };
        saveSettingsLocally(data);
        return data;
      }
      return memorySettings;
    } catch (err) {
      console.warn('⚠️ [SiteSettings] Failed to fetch settings, using cached:', err);
      return memorySettings;
    }
  },

  /**
   * Subscribes to real-time site settings changes.
   */
  subscribeToSiteSettings(
    callback: (settings: SiteSettings) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    // Initial notify
    callback(memorySettings);

    // Local broadcast listener
    const handleLocalEvent = (e: any) => {
      if (e.detail && typeof e.detail === 'object') {
        callback(e.detail);
      }
    };
    window.addEventListener(SETTINGS_EVENT, handleLocalEvent);

    let firestoreUnsubscribe: Unsubscribe = () => {};

    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, SETTINGS_COLLECTION, SITE_CONFIG_DOC);
        firestoreUnsubscribe = onSnapshot(
          docRef,
          (snap) => {
            if (snap.exists()) {
              const liveData = {
                ...DEFAULT_SITE_SETTINGS,
                ...(snap.data() as Partial<SiteSettings>),
              };
              memorySettings = liveData;
              try {
                localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(liveData));
              } catch {}
              callback(liveData);
            } else {
              callback(memorySettings);
            }
          },
          (err) => {
            console.log('[SiteSettings] Realtime subscription note:', err?.message || err);
            if (onError) onError(err);
          }
        );
      } catch (err: any) {
        console.warn('⚠️ [SiteSettings] Failed to initialize subscription:', err);
      }
    }

    return () => {
      window.removeEventListener(SETTINGS_EVENT, handleLocalEvent);
      firestoreUnsubscribe();
    };
  },

  /**
   * Saves or updates site settings in Firestore and local store.
   */
  async updateSiteSettings(updates: Partial<SiteSettings>): Promise<void> {
    const updatedSettings = {
      ...memorySettings,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // 1. Immediately update local store & broadcast
    saveSettingsLocally(updatedSettings);

    // 2. Persist to Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, SETTINGS_COLLECTION, SITE_CONFIG_DOC);
        const dataToSave = {
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        Object.keys(dataToSave).forEach((k) => (dataToSave as any)[k] === undefined && delete (dataToSave as any)[k]);

        await setDoc(docRef, dataToSave, { merge: true });
        console.log('✅ [SiteSettings] Updated successfully in Firestore.');
      } catch (err: any) {
        console.warn('⚠️ [SiteSettings] Firestore write note (saved locally):', err);
      }
    }

    try {
      await auditLogService.logAdminAction({
        action: 'update_settings',
        targetType: 'settings',
        targetId: SITE_CONFIG_DOC,
        summaryAr: 'تم تحديث إعدادات المتجر العامة',
        metadata: updates,
      });
    } catch {}
  },
};
