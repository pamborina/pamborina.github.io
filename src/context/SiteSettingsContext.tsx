import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { SiteSettings, Branch, Coupon, StoreFeatureItem, CustomerTestimonialItem } from '../types';
import {
  siteSettingsService,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_PRESET_COUPONS,
  isStoreCurrentlyOpen,
  DEFAULT_FEATURES,
  DEFAULT_TESTIMONIALS,
} from '../services/siteSettingsService';
import { firebaseBranchService } from '../services/firebaseBranchService';

interface SiteSettingsContextType {
  settings: SiteSettings;
  isLoading: boolean;
  updateSettings: (updates: Partial<SiteSettings>) => Promise<void>;
  isStoreOpen: boolean;
  closureReasonAr: string;
  formattedWorkingHoursAr: string;
  announcementEnabled: boolean;
  announcementTextAr: string;
  temporaryClosureReasonAr: string;
  phone: string;
  whatsapp: string;
  customerServiceWhatsApp: string;
  customerServicePhone: string;
  storeNameAr: string;
  storeDescriptionAr: string;
  storeBadgeAr: string;
  addressAr: string;
  defaultDeliveryFee: number;
  minOrderAmount: number;
  couponsEnabled: boolean;
  coupons: Coupon[];
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  
  // Expose features and testimonials fields
  features: StoreFeatureItem[];
  testimonials: CustomerTestimonialItem[];
  testimonialsRating: string;
  testimonialsTrustCount: string;
  testimonialsTitle: string;
  testimonialsSubtitle: string;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | null>(null);

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    try {
      const cached = localStorage.getItem('pamborina_site_settings_fallback_v2');
      if (cached) {
        return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(cached) };
      }
    } catch {}
    return DEFAULT_SITE_SETTINGS;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);

  // Interval timer every 30s to recheck schedule automatically
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = siteSettingsService.subscribeToSiteSettings(
      (liveSettings) => {
        setSettings(liveSettings);
        setIsLoading(false);
      },
      (err) => {
        console.warn('⚠️ [SiteSettingsProvider] Realtime stream error, using fallback:', err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Subscribe to branch updates in real time
    const unsubscribe = firebaseBranchService.subscribeToBranches((updatedBranches) => {
      const savedId = localStorage.getItem('pamborina_selected_branch');
      if (updatedBranches && updatedBranches.length > 0) {
        const match = updatedBranches.find((b) => b.id === savedId) || updatedBranches[0];
        setActiveBranch(match || null);
      }
    });

    // Handle branch select updates
    const handleBranchSelect = () => {
      const savedId = localStorage.getItem('pamborina_selected_branch');
      const branches = firebaseBranchService.getBranchesSync();
      if (branches && branches.length > 0) {
        const match = branches.find((b) => b.id === savedId) || branches[0];
        setActiveBranch(match || null);
      }
    };

    window.addEventListener('pamborina_branches_changed', handleBranchSelect);
    window.addEventListener('storage', handleBranchSelect);

    return () => {
      unsubscribe();
      window.removeEventListener('pamborina_branches_changed', handleBranchSelect);
      window.removeEventListener('storage', handleBranchSelect);
    };
  }, []);

  const updateSettings = async (updates: Partial<SiteSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    await siteSettingsService.updateSiteSettings(updates);
  };

  // Compute live open/closed status with tick dependency for auto-refresh
  const storeCheck = useMemo(() => {
    return isStoreCurrentlyOpen(settings);
  }, [settings, tick]);

  const finalIsStoreOpen = useMemo(() => {
    const isGlobalOpen = storeCheck.isOpen;
    const isBranchOpen = activeBranch ? activeBranch.isOpen !== false : true;
    return isGlobalOpen && isBranchOpen;
  }, [storeCheck.isOpen, activeBranch]);

  const finalClosureReasonAr = useMemo(() => {
    if (activeBranch && activeBranch.isOpen === false) {
      return `عذراً، فرع (${activeBranch.nameAr}) مغلق حالياً. تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..`;
    }
    return storeCheck.reasonAr || settings.temporaryClosureReasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..';
  }, [storeCheck.reasonAr, settings.temporaryClosureReasonAr, activeBranch]);

  const value: SiteSettingsContextType = {
    settings,
    isLoading,
    updateSettings,
    isStoreOpen: finalIsStoreOpen,
    closureReasonAr: finalClosureReasonAr,
    formattedWorkingHoursAr: storeCheck.formattedHoursAr,
    announcementEnabled: !!settings.announcementEnabled,
    announcementTextAr: settings.announcementTextAr || '',
    temporaryClosureReasonAr:
      activeBranch && activeBranch.isOpen === false
        ? `عذراً، فرع (${activeBranch.nameAr}) مغلق حالياً. تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..`
        : settings.temporaryClosureReasonAr ||
          'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..',
    phone: settings.phone || DEFAULT_SITE_SETTINGS.phone,
    whatsapp: settings.whatsapp || DEFAULT_SITE_SETTINGS.whatsapp,
    customerServiceWhatsApp: settings.customerServiceWhatsApp || settings.whatsapp || DEFAULT_SITE_SETTINGS.whatsapp,
    customerServicePhone: settings.customerServicePhone || settings.phone || DEFAULT_SITE_SETTINGS.phone,
    storeNameAr: settings.storeNameAr || DEFAULT_SITE_SETTINGS.storeNameAr,
    storeDescriptionAr: settings.storeDescriptionAr || DEFAULT_SITE_SETTINGS.storeDescriptionAr || 'عنوان الرقي والأصالة في صناعة الحلويات الشرقية والغربية والمعجنات والوجبات السريعة. نستخدم السمن البلدي الأصلي 100% يومياً من فرعنا بالطالبية هرم.',
    storeBadgeAr: settings.storeBadgeAr || DEFAULT_SITE_SETTINGS.storeBadgeAr || 'منتجات طازجة 100% بسمن بلدي صافي',
    addressAr: settings.addressAr || DEFAULT_SITE_SETTINGS.addressAr,
    defaultDeliveryFee:
      typeof settings.defaultDeliveryFee === 'number'
        ? settings.defaultDeliveryFee
        : DEFAULT_SITE_SETTINGS.defaultDeliveryFee,
    minOrderAmount:
      typeof settings.minOrderAmount === 'number'
        ? settings.minOrderAmount
        : DEFAULT_SITE_SETTINGS.minOrderAmount,
    couponsEnabled: settings.couponsEnabled !== undefined ? settings.couponsEnabled : true,
    coupons: Array.isArray(settings.coupons) ? settings.coupons : DEFAULT_PRESET_COUPONS,
    facebookUrl: settings.facebookUrl || 'https://facebook.com',
    instagramUrl: settings.instagramUrl || 'https://instagram.com',
    tiktokUrl: settings.tiktokUrl || 'https://tiktok.com',
    features: Array.isArray(settings.features) ? settings.features : DEFAULT_FEATURES,
    testimonials: Array.isArray(settings.testimonials) ? settings.testimonials : DEFAULT_TESTIMONIALS,
    testimonialsRating: settings.testimonialsRating || '4.9',
    testimonialsTrustCount: settings.testimonialsTrustCount || '15,000',
    testimonialsTitle: settings.testimonialsTitle || 'آراء وتقييمات عملاء بامبورينا',
    testimonialsSubtitle: settings.testimonialsSubtitle || 'أكثر من 15,000 عميل يثقون في جودة حلويات ومأكولات بامبورينا',
  };

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = (): SiteSettingsContextType => {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    const defaultCheck = isStoreCurrentlyOpen(DEFAULT_SITE_SETTINGS);
    return {
      settings: DEFAULT_SITE_SETTINGS,
      isLoading: false,
      updateSettings: async () => {},
      isStoreOpen: defaultCheck.isOpen,
      closureReasonAr: defaultCheck.reasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..',
      formattedWorkingHoursAr: defaultCheck.formattedHoursAr,
      announcementEnabled: false,
      announcementTextAr: '',
      temporaryClosureReasonAr: 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..',
      phone: DEFAULT_SITE_SETTINGS.phone,
      whatsapp: DEFAULT_SITE_SETTINGS.whatsapp,
      customerServiceWhatsApp: DEFAULT_SITE_SETTINGS.customerServiceWhatsApp || DEFAULT_SITE_SETTINGS.whatsapp,
      customerServicePhone: DEFAULT_SITE_SETTINGS.customerServicePhone || DEFAULT_SITE_SETTINGS.phone,
      storeNameAr: DEFAULT_SITE_SETTINGS.storeNameAr,
      storeDescriptionAr: DEFAULT_SITE_SETTINGS.storeDescriptionAr || 'عنوان الرقي والأصالة في صناعة الحلويات الشرقية والغربية والمعجنات والوجبات السريعة. نستخدم السمن البلدي الأصلي 100% يومياً من فرعنا بالطالبية هرم.',
      storeBadgeAr: DEFAULT_SITE_SETTINGS.storeBadgeAr || 'منتجات طازجة 100% بسمن بلدي صافي',
      addressAr: DEFAULT_SITE_SETTINGS.addressAr,
      defaultDeliveryFee: DEFAULT_SITE_SETTINGS.defaultDeliveryFee,
      minOrderAmount: DEFAULT_SITE_SETTINGS.minOrderAmount,
      couponsEnabled: true,
      coupons: DEFAULT_PRESET_COUPONS,
      facebookUrl: DEFAULT_SITE_SETTINGS.facebookUrl || 'https://facebook.com',
      instagramUrl: DEFAULT_SITE_SETTINGS.instagramUrl || 'https://instagram.com',
      tiktokUrl: DEFAULT_SITE_SETTINGS.tiktokUrl || 'https://tiktok.com',
      features: DEFAULT_FEATURES,
      testimonials: DEFAULT_TESTIMONIALS,
      testimonialsRating: '4.9',
      testimonialsTrustCount: '15,000',
      testimonialsTitle: 'آراء وتقييمات عملاء بامبورينا',
      testimonialsSubtitle: 'أكثر من 15,000 عميل يثقون في جودة حلويات ومأكولات بامبورينا',
    };
  }
  return context;
};
