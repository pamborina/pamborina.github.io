import React, { useState, useEffect, useMemo } from 'react';
import { AdminUser } from '../../../services/firebaseAuthService';
import { SiteSettings, StoreWorkingHours, Coupon, ContactNumberItem, ContactChannelCategory, FloatingWhatsAppConfig } from '../../../types';
import {
  siteSettingsService,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_PRESET_COUPONS,
  DEFAULT_CONTACT_CHANNELS,
  DEFAULT_FLOATING_WHATSAPP_CONFIG,
  isStoreCurrentlyOpen,
  formatWorkingHoursAr,
} from '../../../services/siteSettingsService';
import {
  Settings,
  Store,
  Phone,
  MessageSquare,
  MessageCircle,
  Headphones,
  LifeBuoy,
  MapPin,
  Truck,
  DollarSign,
  Megaphone,
  Share2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Power,
  Database,
  Save,
  Clock,
  Calendar,
  Lock,
  Unlock,
  ShieldAlert,
  AlertTriangle,
  ShoppingBag,
  Sparkles,
  Check,
  Zap,
  Building2,
  Tag,
  Gift,
  Percent,
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Star,
  Quote,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { systemResetService } from '../../../services/systemResetService';
import { SystemResetModal } from '../modals/SystemResetModal';
import { BrandGoldWhatsAppIcon } from '../../common/BrandGoldWhatsAppIcon';
import { firebaseBranchService } from '../../../services/firebaseBranchService';
import { phoneUtils } from '../../../utils/phoneUtils';
import { motion, AnimatePresence } from 'motion/react';

interface AdminSettingsTabProps {
  adminUser: AdminUser | null;
}

const WEEKDAYS = [
  { id: 0, label: 'الأحد' },
  { id: 1, label: 'الإثنين' },
  { id: 2, label: 'الثلاثاء' },
  { id: 3, label: 'الأربعاء' },
  { id: 4, label: 'الخميس' },
  { id: 5, label: 'الجمعة' },
  { id: 6, label: 'السبت' },
];

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({ adminUser }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // System Reset States
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetVerificationInput, setResetVerificationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // Subscribe to real-time site settings from Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = siteSettingsService.subscribeToSiteSettings((liveSettings) => {
      setSettings(liveSettings);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Min Order Fast Actions
  const [isSavingMinOrder, setIsSavingMinOrder] = useState(false);
  const [minOrderSuccess, setMinOrderSuccess] = useState<string | null>(null);
  const [syncToBranches, setSyncToBranches] = useState(true);

  // Quick handler to update minOrderAmount instantly
  const handleFastUpdateMinOrder = async (amount: number) => {
    const newAmount = Math.max(0, amount);
    setSettings((prev) => ({ ...prev, minOrderAmount: newAmount }));
    setIsSavingMinOrder(true);
    setMinOrderSuccess(null);
    try {
      await siteSettingsService.updateSiteSettings({ minOrderAmount: newAmount });

      if (syncToBranches) {
        const branches = firebaseBranchService.getBranchesSync();
        for (const branch of branches) {
          await firebaseBranchService.updateBranch(branch.id, { minOrderAmount: newAmount });
        }
      }

      setMinOrderSuccess(
        newAmount === 0
          ? 'تم إلغاء الحد الأدنى للطلب (يمكن للعميل الطلب بأي مبلغ) وانعكاسه على الموقع فوراً!'
          : `تم تعيين الحد الأدنى للطلب إلى (${newAmount} ج.م) وتطبيقه على سلة المشتريات والدفع فوراً!`
      );
      setTimeout(() => setMinOrderSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err?.message || 'فشل حفظ الحد الأدنى للطلب');
    } finally {
      setIsSavingMinOrder(false);
    }
  };

  // Free Delivery Bar Fast Actions
  const [isSavingFreeDelivery, setIsSavingFreeDelivery] = useState(false);
  const [freeDeliverySuccess, setFreeDeliverySuccess] = useState<string | null>(null);

  const handleFastUpdateFreeDelivery = async (
    enabled: boolean,
    threshold: number,
    textUpdates?: {
      freeDeliveryTitleAr?: string;
      freeDeliverySubtitleAr?: string;
      freeDeliveryProgressLabelAr?: string;
      freeDeliveryUnlockedTitleAr?: string;
      freeDeliveryUnlockedSubtitleAr?: string;
    }
  ) => {
    const newThreshold = Math.max(0, threshold);
    const updates = {
      freeDeliveryBarEnabled: enabled,
      freeDeliveryThreshold: newThreshold,
      ...textUpdates,
    };
    setSettings((prev) => ({
      ...prev,
      ...updates,
    }));
    setIsSavingFreeDelivery(true);
    setFreeDeliverySuccess(null);
    try {
      await siteSettingsService.updateSiteSettings(updates);
      setFreeDeliverySuccess(
        enabled
          ? `تم حفظ وتحديث إعدادات ونصوص التوصيل المجاني (${newThreshold} ج.م) وانعكاسها فوراً! 🟢`
          : 'تم إخفاء شريط التوصيل المجاني نهائياً من الموقع بنجاح! 🔴'
      );
      setTimeout(() => setFreeDeliverySuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err?.message || 'فشل تحديث إعدادات التوصيل المجاني');
    } finally {
      setIsSavingFreeDelivery(false);
    }
  };

  // Coupon Management States & Handlers
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponTypeInput, setCouponTypeInput] = useState<'discount' | 'free_shipping'>('discount');
  const [couponPercentInput, setCouponPercentInput] = useState<number>(10);
  const [couponDescInput, setCouponDescInput] = useState('');
  const [couponEnabledInput, setCouponEnabledInput] = useState(true);
  const [isSavingCoupons, setIsSavingCoupons] = useState(false);
  const [couponsFeedback, setCouponsFeedback] = useState<string | null>(null);

  const currentCoupons: Coupon[] = useMemo(() => {
    return Array.isArray(settings.coupons) && settings.coupons.length > 0
      ? settings.coupons
      : DEFAULT_PRESET_COUPONS;
  }, [settings.coupons]);

  const couponsMasterEnabled = settings.couponsEnabled !== false;

  const handleToggleMasterCoupons = async (newVal: boolean) => {
    setSettings((prev) => ({ ...prev, couponsEnabled: newVal }));
    setIsSavingCoupons(true);
    setCouponsFeedback(null);
    try {
      await siteSettingsService.updateSiteSettings({ couponsEnabled: newVal });
      setCouponsFeedback(
        newVal
          ? 'تم تفعيل قسم كوبونات الخصم والعروض في السلة والشراء وانعكاسه على الموقع فوراً!'
          : 'تم إيقاف قسم كوبونات الخصم والعروض كلياً من السلة والشراء بالمتجر!'
      );
      setTimeout(() => setCouponsFeedback(null), 3500);
    } catch (err: any) {
      setSaveError('فشل تحديث حالة قسم الكوبونات');
    } finally {
      setIsSavingCoupons(false);
    }
  };

  const handleToggleIndividualCoupon = async (code: string) => {
    const updatedList = currentCoupons.map((c) =>
      c.code.toUpperCase() === code.toUpperCase() ? { ...c, enabled: !c.enabled } : c
    );
    setSettings((prev) => ({ ...prev, coupons: updatedList }));
    setIsSavingCoupons(true);
    setCouponsFeedback(null);
    try {
      await siteSettingsService.updateSiteSettings({ coupons: updatedList });
      setCouponsFeedback(`تم تحديث حالة الكوبون (${code}) بنجاح وانعكاسه على الموقع!`);
      setTimeout(() => setCouponsFeedback(null), 3500);
    } catch (err: any) {
      setSaveError('تعذر تحديث الكوبون');
    } finally {
      setIsSavingCoupons(false);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    const updatedList = currentCoupons.filter((c) => c.code.toUpperCase() !== code.toUpperCase());
    setSettings((prev) => ({ ...prev, coupons: updatedList }));
    setIsSavingCoupons(true);
    setCouponsFeedback(null);
    try {
      await siteSettingsService.updateSiteSettings({ coupons: updatedList });
      setCouponsFeedback(`تم حذف الكوبون (${code}) بنجاح!`);
      setTimeout(() => setCouponsFeedback(null), 3500);
    } catch (err: any) {
      setSaveError('تعذر حذف الكوبون');
    } finally {
      setIsSavingCoupons(false);
    }
  };

  // Features Local States & Handlers
  const [newFeatureEmoji, setNewFeatureEmoji] = useState('🚚');
  const [newFeatureTitle, setNewFeatureTitle] = useState('');
  const [newFeatureDesc, setNewFeatureDesc] = useState('');

  const handleAddFeature = () => {
    if (!newFeatureTitle.trim() || !newFeatureDesc.trim()) return;
    const newItem = {
      id: `f_${Date.now()}`,
      emoji: newFeatureEmoji.trim(),
      titleAr: newFeatureTitle.trim(),
      descAr: newFeatureDesc.trim(),
    };
    const currentFeatures = settings.features || [];
    setSettings((prev) => ({
      ...prev,
      features: [...currentFeatures, newItem],
    }));
    setNewFeatureEmoji('🚚');
    setNewFeatureTitle('');
    setNewFeatureDesc('');
  };

  const handleDeleteFeature = (id: string) => {
    const currentFeatures = settings.features || [];
    setSettings((prev) => ({
      ...prev,
      features: currentFeatures.filter((f) => f.id !== id),
    }));
  };

  const handleUpdateFeatureField = (id: string, field: 'emoji' | 'titleAr' | 'descAr', value: string) => {
    const currentFeatures = settings.features || [];
    setSettings((prev) => ({
      ...prev,
      features: currentFeatures.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    }));
  };

  // Testimonials Local States & Handlers
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewLocation, setNewReviewLocation] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewItem, setNewReviewItem] = useState('');
  const [newReviewTime, setNewReviewTime] = useState('منذ يومين');

  const handleAddReview = () => {
    if (!newReviewName.trim() || !newReviewComment.trim()) return;
    const newItem = {
      id: `rev_${Date.now()}`,
      nameAr: newReviewName.trim(),
      locationAr: newReviewLocation.trim() || 'فيصل',
      rating: Number(newReviewRating) || 5,
      commentAr: newReviewComment.trim(),
      orderedItemAr: newReviewItem.trim() || 'وجبة بامبورينا',
      timeAr: newReviewTime.trim() || 'منذ يومين',
    };
    const currentReviews = settings.testimonials || [];
    setSettings((prev) => ({
      ...prev,
      testimonials: [...currentReviews, newItem],
    }));
    setNewReviewName('');
    setNewReviewLocation('');
    setNewReviewRating(5);
    setNewReviewComment('');
    setNewReviewItem('');
    setNewReviewTime('منذ يومين');
  };

  const handleDeleteReview = (id: string) => {
    const currentReviews = settings.testimonials || [];
    setSettings((prev) => ({
      ...prev,
      testimonials: currentReviews.filter((r) => r.id !== id),
    }));
  };

  const handleUpdateReviewField = (id: string, field: string, value: any) => {
    const currentReviews = settings.testimonials || [];
    setSettings((prev) => ({
      ...prev,
      testimonials: currentReviews.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
  };

  const handleOpenAddCouponModal = () => {
    setEditingCoupon(null);
    setCouponCodeInput('');
    setCouponTypeInput('discount');
    setCouponPercentInput(15);
    setCouponDescInput('');
    setCouponEnabledInput(true);
    setIsCouponModalOpen(true);
  };

  const handleOpenEditCouponModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponCodeInput(coupon.code);
    setCouponTypeInput(coupon.freeShipping ? 'free_shipping' : 'discount');
    setCouponPercentInput(coupon.discountPercent || 10);
    setCouponDescInput(coupon.description || '');
    setCouponEnabledInput(coupon.enabled !== false);
    setIsCouponModalOpen(true);
  };

  const handleSaveCouponForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    const newCouponItem: Coupon = {
      id: editingCoupon?.id || `c_${Date.now()}`,
      code: cleanCode,
      discountPercent: couponTypeInput === 'discount' ? couponPercentInput : undefined,
      freeShipping: couponTypeInput === 'free_shipping' ? true : undefined,
      description:
        couponDescInput.trim() ||
        (couponTypeInput === 'free_shipping' ? 'توصيل مجاني للطلب' : `خصم ${couponPercentInput}% على الطلب`),
      enabled: couponEnabledInput,
    };

    let updatedList: Coupon[];
    if (editingCoupon) {
      updatedList = currentCoupons.map((c) =>
        c.code.toUpperCase() === editingCoupon.code.toUpperCase() ? newCouponItem : c
      );
    } else {
      const exists = currentCoupons.some((c) => c.code.toUpperCase() === cleanCode);
      if (exists) {
        alert('رمز الكوبون هذا موجود بالفعل! يرجى اختيار رمز آخر.');
        return;
      }
      updatedList = [...currentCoupons, newCouponItem];
    }

    setSettings((prev) => ({ ...prev, coupons: updatedList }));
    setIsCouponModalOpen(false);
    setIsSavingCoupons(true);
    setCouponsFeedback(null);
    try {
      await siteSettingsService.updateSiteSettings({ coupons: updatedList });
      setCouponsFeedback(`تم حفظ الكوبون (${cleanCode}) وانعكاسه على Firestore والموقع فوراً!`);
      setTimeout(() => setCouponsFeedback(null), 3500);
    } catch (err: any) {
      setSaveError('تعذر حفظ الكوبون');
    } finally {
      setIsSavingCoupons(false);
    }
  };

  // WhatsApp & Contact Channels Management States & Handlers
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ContactNumberItem | null>(null);
  const [channelCategoryInput, setChannelCategoryInput] = useState<ContactChannelCategory>('general');
  const [channelTitleInput, setChannelTitleInput] = useState('');
  const [channelPhoneInput, setChannelPhoneInput] = useState('');
  const [channelRoleInput, setChannelRoleInput] = useState('');
  const [channelMessageInput, setChannelMessageInput] = useState('');
  const [channelEnabledInput, setChannelEnabledInput] = useState(true);
  const [isSavingChannels, setIsSavingChannels] = useState(false);
  const [channelsFeedback, setChannelsFeedback] = useState<string | null>(null);
  const [activeAdminCategoryTab, setActiveAdminCategoryTab] = useState<'all' | ContactChannelCategory>('all');

  const currentContactChannels: ContactNumberItem[] = useMemo(() => {
    return Array.isArray(settings.contactChannels) && settings.contactChannels.length > 0
      ? settings.contactChannels
      : DEFAULT_CONTACT_CHANNELS;
  }, [settings.contactChannels]);

  const floatingWhatsAppEnabled = settings.floatingWhatsAppConfig?.enabled !== false;

  const handleToggleFloatingWhatsAppMaster = async (newVal: boolean) => {
    const updatedConfig: FloatingWhatsAppConfig = {
      ...(settings.floatingWhatsAppConfig || DEFAULT_FLOATING_WHATSAPP_CONFIG),
      enabled: newVal,
    };
    setSettings((prev) => ({ ...prev, floatingWhatsAppConfig: updatedConfig }));
    setIsSavingChannels(true);
    setChannelsFeedback(null);
    try {
      await siteSettingsService.updateSiteSettings({ floatingWhatsAppConfig: updatedConfig });
      setChannelsFeedback(
        newVal
          ? 'تم تفعيل زر الواتساب والدعم الفني العائم على يسار الموقع للعملاء فوراً!'
          : 'تم إخفاء زر الواتساب والدعم الفني العائم من واجهة المتجر!'
      );
      setTimeout(() => setChannelsFeedback(null), 3500);
    } catch (err: any) {
      setSaveError('فشل تحديث حالة الزر العائم');
    } finally {
      setIsSavingChannels(false);
    }
  };

  const handleOpenAddChannelModal = (defaultCat?: ContactChannelCategory) => {
    setEditingChannel(null);
    const cat = defaultCat || (activeAdminCategoryTab !== 'all' ? activeAdminCategoryTab : 'general');
    setChannelCategoryInput(cat);
    setChannelTitleInput(
      cat === 'support'
        ? 'الدعم الفني والتقني بامبورينا'
        : cat === 'complaints'
        ? 'قسم الشكاوى والمقترحات بامبورينا'
        : 'خدمة العملاء بامبورينا'
    );
    setChannelPhoneInput(settings.whatsapp || '01121778205');
    setChannelRoleInput(
      cat === 'support'
        ? 'فريق الدعم الفني والتقني المباشر'
        : cat === 'complaints'
        ? 'إدارة الجودة ورضا العملاء (مباشر للإدارة)'
        : 'فريق خدمة العملاء والطلبات المباشرة'
    );
    setChannelMessageInput(
      cat === 'support'
        ? '🛠️ *الدعم الفني والتقني بامبورينا*\n━━━━━━━━━━━━━━━━━━━━━━\nالسلام عليكم ورحمة الله وبركاته،\nأحتاج لمساعدة تقنية بخصوص الطلب أو استخدام موقع بامبورينا 💻'
        : cat === 'complaints'
        ? '⚖️ *قسم الشكاوى والمقترحات بامبورينا*\n━━━━━━━━━━━━━━━━━━━━━━\nالسلام عليكم ورحمة الله وبركاته،\nأود تقديم مقترح / شكوى مباشرة لإدارة حلواني بامبورينا 📋'
        : '🧁 *خدمة العملاء بامبورينا*\n━━━━━━━━━━━━━━━━━━━━━━\nالسلام عليكم ورحمة الله وبركاته،\nأود الاستفسار والطلب من قائمة حلواني بامبورينا 🥐🍰'
    );
    setChannelEnabledInput(true);
    setIsContactModalOpen(true);
  };

  const handleOpenEditChannelModal = (channel: ContactNumberItem) => {
    setEditingChannel(channel);
    setChannelCategoryInput(channel.category);
    setChannelTitleInput(channel.titleAr);
    setChannelPhoneInput(channel.phoneNumber);
    setChannelRoleInput(channel.agentNameOrRole || '');
    setChannelMessageInput(channel.defaultMessageAr || '');
    setChannelEnabledInput(channel.enabled !== false);
    setIsContactModalOpen(true);
  };

  const handleSaveChannelForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = channelPhoneInput.trim();
    if (!cleanPhone || !channelTitleInput.trim()) return;

    const norm = phoneUtils.normalizePhoneNumber(cleanPhone);
    if (!norm.isValid) {
      alert('رقم الهاتف غير صالح. يرجى إدخال رقم صحيح (مثال: 01121778205 أو دولي).');
      return;
    }

    const newChannelItem: ContactNumberItem = {
      id: editingChannel?.id || `contact_${channelCategoryInput}_${Date.now()}`,
      category: channelCategoryInput,
      titleAr: channelTitleInput.trim(),
      phoneNumber: cleanPhone,
      agentNameOrRole: channelRoleInput.trim() || undefined,
      defaultMessageAr: channelMessageInput.trim() || undefined,
      enabled: channelEnabledInput,
      priorityOrder: editingChannel?.priorityOrder || (currentContactChannels.length + 1),
    };

    let updatedList: ContactNumberItem[];
    if (editingChannel) {
      updatedList = currentContactChannels.map((c) =>
        c.id === editingChannel.id ? newChannelItem : c
      );
    } else {
      updatedList = [...currentContactChannels, newChannelItem];
    }

    // Also update main settings whatsapp/complaints if category matches
    let updatedSiteSettings = {
      ...settings,
      contactChannels: updatedList,
    };
    if (channelCategoryInput === 'complaints') {
      updatedSiteSettings.complaintsWhatsApp = cleanPhone;
    } else if (channelCategoryInput === 'general') {
      updatedSiteSettings.whatsapp = cleanPhone;
      updatedSiteSettings.customerServiceWhatsApp = cleanPhone;
    }

    setSettings(updatedSiteSettings);
    setIsContactModalOpen(false);
    setIsSavingChannels(true);
    setChannelsFeedback(null);
    try {
      await siteSettingsService.updateSiteSettings(updatedSiteSettings);
      setChannelsFeedback(`تم حفظ رقم (${channelTitleInput.trim()}) وانعكاسه على الموقع فوراً!`);
      setTimeout(() => setChannelsFeedback(null), 3500);
    } catch (err: any) {
      setSaveError('تعذر حفظ رقم التواصل');
    } finally {
      setIsSavingChannels(false);
    }
  };

  const handleToggleChannel = async (id: string) => {
    const updatedList = currentContactChannels.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    const updatedSiteSettings = { ...settings, contactChannels: updatedList };
    setSettings(updatedSiteSettings);
    setIsSavingChannels(true);
    setChannelsFeedback(null);
    try {
      await siteSettingsService.updateSiteSettings({ contactChannels: updatedList });
      setChannelsFeedback('تم تحديث حالة رقم التواصل بنجاح وانعكاسه على الموقع!');
      setTimeout(() => setChannelsFeedback(null), 3500);
    } catch (err: any) {
      setSaveError('تعذر تحديث رقم التواصل');
    } finally {
      setIsSavingChannels(false);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    const itemToDelete = currentContactChannels.find((c) => c.id === id);
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف رقم (${itemToDelete?.titleAr || 'هذا الرقم'})؟`)) {
      return;
    }

    const updatedList = currentContactChannels.filter((c) => c.id !== id);
    const updatedSiteSettings = { ...settings, contactChannels: updatedList };
    setSettings(updatedSiteSettings);
    setIsSavingChannels(true);
    setChannelsFeedback(null);
    try {
      await siteSettingsService.updateSiteSettings({ contactChannels: updatedList });
      setChannelsFeedback(`تم حذف الرقم بنجاح!`);
      setTimeout(() => setChannelsFeedback(null), 3500);
    } catch (err: any) {
      setSaveError('تعذر حذف الرقم');
    } finally {
      setIsSavingChannels(false);
    }
  };

  const liveCheck = isStoreCurrentlyOpen(settings);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    const targetWa = settings.complaintsWhatsApp || settings.customerServiceWhatsApp || settings.whatsapp;
    if (targetWa && targetWa.trim()) {
      const norm = phoneUtils.normalizePhoneNumber(targetWa);
      if (!norm.isValid) {
        setSaveError('رقم WhatsApp الشكاوى وخدمة العملاء غير صالح. يرجى التأكد من كتابة الأرقام بشكل صحيح.');
        setIsSaving(false);
        return;
      }
    }

    const targetPhone = settings.complaintsPhone || settings.customerServicePhone || settings.phone;
    if (targetPhone && targetPhone.trim()) {
      const normPhone = phoneUtils.normalizePhoneNumber(targetPhone);
      if (!normPhone.isValid) {
        setSaveError('رقم هاتف الشكاوى / الخط الساخن غير صالح. يرجى إدخال رقم هاتف صحيح.');
        setIsSaving(false);
        return;
      }
    }

    try {
      const waNumber = (settings.complaintsWhatsApp || settings.customerServiceWhatsApp || settings.whatsapp || '').trim();
      const phoneNumber = (settings.complaintsPhone || settings.customerServicePhone || settings.phone || '').trim();

      const payloadToSave: SiteSettings = {
        ...settings,
        complaintsWhatsApp: waNumber,
        customerServiceWhatsApp: waNumber,
        whatsapp: waNumber,
        complaintsPhone: phoneNumber,
        customerServicePhone: phoneNumber,
        phone: phoneNumber,
      };

      await siteSettingsService.updateSiteSettings(payloadToSave);

      // Keep default branch in sync with complaints and hotline
      try {
        const currentBranches = firebaseBranchService.getBranchesSync();
        if (currentBranches && currentBranches.length > 0) {
          const mainBranch = currentBranches[0];
          await firebaseBranchService.updateBranch(mainBranch.id, {
            phone: payloadToSave.customerServicePhone,
            hotline: payloadToSave.customerServicePhone,
            whatsapp: payloadToSave.complaintsWhatsApp,
            whatsappUrl: phoneUtils.buildWhatsAppUrl(payloadToSave.complaintsWhatsApp || ''),
          });
        }
      } catch (branchErr) {
        console.warn('⚠️ Branch phone sync note:', branchErr);
      }

      setSaveSuccess('تم حفظ رقم واتساب الشكاوى والإعدادات بنجاح وتطبيقها فوراً على الموقع!');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError('تعذر حفظ رقم التواصل. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFastToggleStore = async () => {
    const isCurrentlyOpen = liveCheck.isOpen;
    const newMode = isCurrentlyOpen ? 'manual_closed' : 'manual_open';
    const newIsStoreOpen = !isCurrentlyOpen;

    const updated = {
      ...settings,
      storeStatusMode: newMode as 'manual_closed' | 'manual_open',
      isStoreOpen: newIsStoreOpen,
    };

    setSettings(updated);
    try {
      await siteSettingsService.updateSiteSettings({
        storeStatusMode: newMode as any,
        isStoreOpen: newIsIsStoreOpen(newMode),
      });
      setSaveSuccess(`تم ${newIsStoreOpen ? 'فتح' : 'إغلاق'} المتجر بنجاح (${newIsStoreOpen ? 'استقبال الطلبات نشط' : 'المتجر مغلق مؤقتاً'})`);
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      setSaveError(err?.message || 'فشل تغيير حالة المتجر');
    }
  };

  function newIsIsStoreOpen(mode: string) {
    if (mode === 'manual_closed') return false;
    if (mode === 'manual_open') return true;
    return true;
  }

  const handleModeChange = async (newMode: 'auto_schedule' | 'manual_closed' | 'manual_open') => {
    const newIsStoreOpen = newIsIsStoreOpen(newMode);
    const updated = {
      ...settings,
      storeStatusMode: newMode,
      isStoreOpen: newIsStoreOpen,
    };
    setSettings(updated);
    try {
      await siteSettingsService.updateSiteSettings({
        storeStatusMode: newMode,
        isStoreOpen: newIsStoreOpen,
      });
      const modeLabels: Record<string, string> = {
        auto_schedule: 'التشغيل التلقائي حسب مواعيد العمل اليومية',
        manual_open: 'الفتح اليدوي المستمر',
        manual_closed: 'الإغلاق اليدوي المؤقت',
      };
      setSaveSuccess(`تم تفعيل نظام (${modeLabels[newMode]}) وانعكاسه على المتجر فوراً!`);
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      setSaveError(err?.message || 'فشل التحديث الفوري لحالة المتجر');
    }
  };

  const workingHours: StoreWorkingHours = settings.workingHours || {
    openTime: '10:00',
    closeTime: '02:00',
    workingDays: [0, 1, 2, 3, 4, 5, 6],
    scheduleEnabled: true,
  };

  const currentMode = settings.storeStatusMode || (settings.isStoreOpen ? 'manual_open' : 'manual_closed');

  const handleDayToggle = (dayId: number) => {
    const currentDays = workingHours.workingDays || [0, 1, 2, 3, 4, 5, 6];
    let newDays: number[];
    if (currentDays.includes(dayId)) {
      newDays = currentDays.filter((d) => d !== dayId);
    } else {
      newDays = [...currentDays, dayId].sort();
    }

    setSettings({
      ...settings,
      workingHours: {
        ...workingHours,
        workingDays: newDays,
      },
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-400" />
            <span>إعدادات المتجر وساعات العمل الرسمية</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            التحكم الكامل في مواعيد عمل الفرع، الإغلاق التلقائي أو اليدوي بضغط زر، وتأمين السلة والأصناف.
          </p>
        </div>

        {/* Quick Fast Store Toggle Button */}
        <button
          type="button"
          onClick={handleFastToggleStore}
          className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all shadow-xl cursor-pointer ${
            liveCheck.isOpen
              ? 'bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 hover:scale-105'
              : 'bg-rose-500/20 border-2 border-rose-500/50 text-rose-300 hover:bg-rose-500/30 hover:scale-105'
          }`}
        >
          <Power className={`w-4 h-4 ${liveCheck.isOpen ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span>{liveCheck.isOpen ? 'المتجر مفتوح (زر إغلاق مؤقت)' : 'المتجر مغلق مؤقتاً (زر فتح المتجر)'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{saveError}</span>
        </div>
      )}

      {/* Live Store Status Preview Banner */}
      <div className={`p-5 rounded-2xl border transition-all shadow-xl ${
        liveCheck.isOpen
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${liveCheck.isOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {liveCheck.isOpen ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white">الحالة اللحظية للفرع الآن:</span>
                <span className={`px-3 py-0.5 rounded-full text-xs font-black ${
                  liveCheck.isOpen ? 'bg-emerald-500 text-neutral-950' : 'bg-rose-600 text-white'
                }`}>
                  {liveCheck.isOpen ? 'مفتوح ومتاح للطلبات 🟢' : 'مغلق ومُتوقف بالكامل 🔴'}
                </span>
              </div>
              <p className="text-xs text-neutral-300">
                {liveCheck.isOpen
                  ? `الفرع يعمل الآن بشكل طبيعي ومستعد لاستقبال كافة الطلبات (${liveCheck.formattedHoursAr}).`
                  : liveCheck.reasonAr}
              </p>
            </div>
          </div>

          <div className="text-xs font-bold px-3 py-2 rounded-xl bg-neutral-900/80 border border-neutral-700/80 text-neutral-300 shrink-0">
            النظام الحالي: {currentMode === 'auto_schedule' ? '⏰ إغلاق/فتح تلقائي حسب الساعات' : currentMode === 'manual_closed' ? '🔒 إغلاق يدوي مؤقت' : '🔓 فتح يدوي دائماً'}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Store Operating Mode & Working Hours */}
        <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-700/60">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">نظام التشغيل ومواعيد العمل الرسمية</h3>
            </div>
            <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              تحكم كلي وبث مباشر
            </span>
          </div>

          {/* Mode Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Auto Schedule Mode */}
            <div
              onClick={() => handleModeChange('auto_schedule')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                currentMode === 'auto_schedule'
                  ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/30'
                  : 'bg-neutral-900/80 border-neutral-700/80 text-neutral-400 hover:border-neutral-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-amber-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>تلقائي (جدول الساعات)</span>
                </span>
                <input
                  type="radio"
                  name="storeStatusMode"
                  checked={currentMode === 'auto_schedule'}
                  onChange={() => handleModeChange('auto_schedule')}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                يقفل ويفتح النظام تلقائياً حسب مواعيد العمل اليومية المحددة أدناه.
              </p>
            </div>

            {/* Manual Closed Mode */}
            <div
              onClick={() => handleModeChange('manual_closed')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                currentMode === 'manual_closed'
                  ? 'bg-rose-500/15 border-rose-500/60 text-white shadow-lg shadow-rose-500/10 ring-2 ring-rose-500/30'
                  : 'bg-neutral-900/80 border-neutral-700/80 text-neutral-400 hover:border-neutral-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-rose-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>يدوي: مغلق مؤقتاً</span>
                </span>
                <input
                  type="radio"
                  name="storeStatusMode"
                  checked={currentMode === 'manual_closed'}
                  onChange={() => handleModeChange('manual_closed')}
                  className="accent-rose-500 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                إغلاق فوري وشامل لجميع الأصناف واستقبال الطلبات بقرار الإدارة.
              </p>
            </div>

            {/* Manual Open Mode */}
            <div
              onClick={() => handleModeChange('manual_open')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                currentMode === 'manual_open'
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                  : 'bg-neutral-900/80 border-neutral-700/80 text-neutral-400 hover:border-neutral-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-emerald-300 flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-emerald-400" />
                  <span>يدوي: مفتوح دائماً</span>
                </span>
                <input
                  type="radio"
                  name="storeStatusMode"
                  checked={currentMode === 'manual_open'}
                  onChange={() => handleModeChange('manual_open')}
                  className="accent-emerald-500 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                استقبال الطلبات متواصل ومفتوح على مدار الساعة بغض النظر عن الوقت.
              </p>
            </div>
          </div>

          {/* Working Hours Times Setup */}
          <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 space-y-4">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>مواعيد العمل الرسمية للفرع:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                  وقت بدء العمل اليومي (ساعة الفتح)
                </label>
                <input
                  type="time"
                  value={workingHours.openTime || '10:00'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workingHours: {
                        ...workingHours,
                        openTime: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">مثال: 10:00 صباحاً</span>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                  وقت انتهاء العمل اليومي (ساعة الإغلاق)
                </label>
                <input
                  type="time"
                  value={workingHours.closeTime || '02:00'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workingHours: {
                        ...workingHours,
                        closeTime: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">يدعم العمل بعد منتصف الليل (مثال: 02:00 فجراً)</span>
              </div>
            </div>

            {/* Days Picker */}
            <div className="pt-2 border-t border-neutral-800 space-y-2">
              <label className="block text-xs text-neutral-300 font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>أيام العمل الرسمية في الأسبوع:</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const isSelected = (workingHours.workingDays || [0, 1, 2, 3, 4, 5, 6]).includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => handleDayToggle(day.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                          : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Closure Reason Input */}
          <div>
            <label className="block text-xs text-neutral-300 mb-1.5 font-semibold flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
              <span>رسالة تنبيه الإغلاق (تظهر للعميل أعلى المتجر وعند محاولة الطلب):</span>
            </label>
            <input
              type="text"
              value={settings.temporaryClosureReasonAr || ''}
              onChange={(e) => setSettings({ ...settings, temporaryClosureReasonAr: e.target.value })}
              placeholder="تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً.."
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Top Announcement Bar Control */}
          <div className="p-4 rounded-xl bg-neutral-900/70 border border-neutral-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white block">شريط الإعلانات العلوية</span>
                <span className="text-xs text-neutral-400">
                  عرض شريط ترحيبي أو ترويجي أعلى المتجر للزوار.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.announcementEnabled}
                onChange={(e) => setSettings({ ...settings, announcementEnabled: e.target.checked })}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {settings.announcementEnabled && (
              <input
                type="text"
                value={settings.announcementTextAr || ''}
                onChange={(e) => setSettings({ ...settings, announcementTextAr: e.target.value })}
                placeholder="خصم 10% بمناسبة الافتتاح، التوصيل متاح يومياً..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
              />
            )}
          </div>
        </div>

        {/* Section 2: Minimum Order Amount Control (التحكم في الحد الأدنى للطلب) */}
        <div className="bg-neutral-800/80 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-5 relative overflow-hidden">
          {/* Subtle Golden Glow Indicator */}
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 opacity-70" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-700/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>إعدادات الحد الأدنى للطلب (Minimum Order)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    تحديث فوري للموقع
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  التحكم في أقل قيمة مالية مسموح بها لإتمام الطلب من السلة وصفحة الدفع.
                </p>
              </div>
            </div>

            {/* Current Active Badge */}
            <div className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-700/80 px-3.5 py-1.5 rounded-xl">
              <span className="text-xs text-neutral-400">الحد الفعّال حالياً:</span>
              <span className="text-sm font-black text-amber-400 font-mono">
                {settings.minOrderAmount > 0 ? `${settings.minOrderAmount} ج.م` : 'لا يوجد (متاح بأي مبلغ)'}
              </span>
            </div>
          </div>

          {/* Quick Presets Buttons */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-300">
              خيارات سريعة لتحديد الحد الأدنى:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { label: 'بدون حد (0 ج.م)', val: 0 },
                { label: '30 ج.م', val: 30 },
                { label: '50 ج.م', val: 50 },
                { label: '75 ج.م', val: 75 },
                { label: '100 ج.م', val: 100 },
                { label: '150 ج.م', val: 150 },
                { label: '200 ج.م', val: 200 },
              ].map((preset) => {
                const isSelected = settings.minOrderAmount === preset.val;
                return (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => {
                      setSettings({ ...settings, minOrderAmount: preset.val });
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                        : 'bg-neutral-900 border-neutral-700/80 text-neutral-300 hover:text-white hover:border-neutral-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Input & Sync Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Custom Input Box */}
            <div className="bg-neutral-900/80 border border-neutral-700/70 p-4 rounded-xl space-y-3">
              <label className="block text-xs text-neutral-300 font-bold">
                أو اكتب قيمة مخصصة للحد الأدنى (ج.م):
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={settings.minOrderAmount}
                    onChange={(e) =>
                      setSettings({ ...settings, minOrderAmount: Math.max(0, Number(e.target.value) || 0) })
                    }
                    placeholder="مثال: 50"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-sm font-bold text-white font-mono focus:outline-none focus:border-amber-500 pl-14"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400 pointer-events-none">
                    ج.م
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        minOrderAmount: Math.max(0, (settings.minOrderAmount || 0) - 10),
                      })
                    }
                    className="px-2.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-neutral-200 font-black text-xs cursor-pointer active:scale-95 transition-all"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        minOrderAmount: (settings.minOrderAmount || 0) + 10,
                      })
                    }
                    className="px-2.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-neutral-200 font-black text-xs cursor-pointer active:scale-95 transition-all"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Sync to all branches toggle */}
              <label className="flex items-center gap-2.5 pt-2 border-t border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncToBranches}
                  onChange={(e) => setSyncToBranches(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="text-xs text-neutral-300 font-medium">
                  تطبيق وتوحيد هذا الحد الأدنى على كافة الفروع المسجلة تلقائياً
                </span>
              </label>
            </div>

            {/* Live Customer Preview Simulator */}
            <div className="bg-gradient-to-br from-[#1A120B] to-[#120B07] border border-[#3D2C1E] p-4 rounded-xl space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#A89C8C] mb-1.5">
                  <span className="flex items-center gap-1 font-bold text-[#D4AF37]">
                    <Sparkles className="w-3.5 h-3.5" />
                    معاينة حية لتجربة العميل في السلة:
                  </span>
                  <span>تجربة فورية</span>
                </div>

                {settings.minOrderAmount > 0 ? (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        الحد الأدنى للطلب: {settings.minOrderAmount} ج.م
                      </span>
                      <span className="text-[11px] text-amber-200">
                        يتبقى {Math.max(0, settings.minOrderAmount - 30)} ج.م (إذا طلب بـ 30 ج)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round((30 / settings.minOrderAmount) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-400 block pt-0.5">
                      لن يتمكن العميل من الضغط على "إتمام الطلب" حتى تصل قيمة مشترياته إلى {settings.minOrderAmount} ج.م على الأقل.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>الطلب متاح بأي مبلغ (بدون حد أدنى)</span>
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      يستطيع العميل إتمام أي طلب مباشرة حتى لو اشترى صنفاً واحداً بأي قيمة.
                    </p>
                  </div>
                )}
              </div>

              {/* Fast Instant Apply Button for Min Order */}
              <div className="pt-2">
                <Button
                  type="button"
                  disabled={isSavingMinOrder}
                  onClick={() => handleFastUpdateMinOrder(settings.minOrderAmount)}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs py-2.5 rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSavingMinOrder ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري التطبيق الفوري على الموقع...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>حفظ وتطبيق الحد الأدنى ({settings.minOrderAmount} ج.م) الآن ⚡</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Min Order Instant Success Message */}
          {minOrderSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
              <span className="font-bold">{minOrderSuccess}</span>
            </div>
          )}
        </div>

        {/* Free Delivery Motivation Bar Control Card */}
        <div className="bg-[#18120B] border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-white">التحكم في شريط التوصيل المجاني للموقع 🚀</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-[10px]">
                    تطبيق فوري بضغطة زر
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  تفعيل أو إخفاء الخانة بالكامل من الموقع، وتحديد مبلغ الفاتورة المطلوب للحصول على توصيل مجاني.
                </p>
              </div>
            </div>

            {/* Direct One-Click Toggle Switch */}
            <button
              type="button"
              onClick={() =>
                handleFastUpdateFreeDelivery(
                  !(settings.freeDeliveryBarEnabled !== false),
                  settings.freeDeliveryThreshold ?? 200
                )
              }
              disabled={isSavingFreeDelivery}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black border flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                settings.freeDeliveryBarEnabled !== false
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80 shadow-lg shadow-emerald-950/40'
                  : 'bg-rose-950/80 border-rose-500/60 text-rose-300 hover:bg-rose-900/80 shadow-lg shadow-rose-950/40'
              }`}
            >
              {settings.freeDeliveryBarEnabled !== false ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>الخانة مفعلة وظاهرة على الموقع 🟢</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>الخانة مغلقة ومخفية من الموقع 🔴</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Input & Quick Options */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300 block">
                  مبلغ الفاتورة المستهدفة للحصول على توصيل مجاني (ج.م):
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={settings.freeDeliveryThreshold ?? 200}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setSettings((prev) => ({ ...prev, freeDeliveryThreshold: val }));
                    }}
                    className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-700 text-white font-mono text-base font-bold focus:border-amber-400 focus:outline-none"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                    ج.م
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] text-neutral-400 font-bold">خيارات سريعة:</span>
                  {[150, 200, 250, 300, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setSettings((prev) => ({ ...prev, freeDeliveryThreshold: preset }));
                        handleFastUpdateFreeDelivery(
                          settings.freeDeliveryBarEnabled !== false,
                          preset,
                          {
                            freeDeliveryTitleAr: settings.freeDeliveryTitleAr,
                            freeDeliverySubtitleAr: settings.freeDeliverySubtitleAr,
                            freeDeliveryProgressLabelAr: settings.freeDeliveryProgressLabelAr,
                          }
                        );
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        (settings.freeDeliveryThreshold ?? 200) === preset
                          ? 'bg-amber-500 text-neutral-950 border-amber-400 font-black shadow-sm'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-amber-500/50'
                      }`}
                    >
                      {preset} ج.م
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Text Fields */}
              <div className="space-y-3 pt-2 border-t border-neutral-800">
                <div>
                  <label className="text-[11px] font-bold text-amber-300 block mb-1">
                    1. نص عنوان التحفيز (استخدم {'{remaining}'} لإظهار المبلغ المتبقي):
                  </label>
                  <input
                    type="text"
                    value={settings.freeDeliveryTitleAr ?? 'أضف منتجات بقيمة {remaining} ج.م أخرى للحصول على توصيل مجاني 🚀'}
                    onChange={(e) => setSettings((prev) => ({ ...prev, freeDeliveryTitleAr: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:border-amber-400 focus:outline-none"
                    placeholder="أضف منتجات بقيمة {remaining} ج.م أخرى للحصول على توصيل مجاني 🚀"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-300 block mb-1">
                    2. نص الفرع والوصف (استخدم {'{branchName}'} و {'{threshold}'}):
                  </label>
                  <input
                    type="text"
                    value={settings.freeDeliverySubtitleAr ?? 'الحد الأدنى للتوصيل المجاني من فرع {branchName} هو {threshold} ج.م'}
                    onChange={(e) => setSettings((prev) => ({ ...prev, freeDeliverySubtitleAr: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:border-amber-400 focus:outline-none"
                    placeholder="الحد الأدنى للتوصيل المجاني من فرع {branchName} هو {threshold} ج.م"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-300 block mb-1">
                    3. نص مؤشر التقدم:
                  </label>
                  <input
                    type="text"
                    value={settings.freeDeliveryProgressLabelAr ?? 'تقدم التوصيل المجاني'}
                    onChange={(e) => setSettings((prev) => ({ ...prev, freeDeliveryProgressLabelAr: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:border-amber-400 focus:outline-none"
                    placeholder="تقدم التوصيل المجاني"
                  />
                </div>
              </div>
            </div>

            {/* Live Text Preview Box */}
            <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3 text-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-300 block mb-2">
                  معاينة النص الظاهر في أعلى الصفحة الرئيسية للعميل:
                </span>
                <div className="space-y-2 text-neutral-300 bg-black/60 p-4 rounded-xl border border-neutral-800 text-[11px] leading-relaxed">
                  <p className="text-amber-200 font-bold text-xs">
                    {(settings.freeDeliveryTitleAr || 'أضف منتجات بقيمة {remaining} ج.م أخرى للحصول على توصيل مجاني 🚀').replace('{remaining}', String(settings.freeDeliveryThreshold ?? 200))}
                  </p>
                  <p className="text-neutral-400 text-xs">
                    {(settings.freeDeliverySubtitleAr || 'الحد الأدنى للتوصيل المجاني من فرع {branchName} هو {threshold} ج.م')
                      .replace('{branchName}', 'الطالبية هرم')
                      .replace('{threshold}', String(settings.freeDeliveryThreshold ?? 200))}
                  </p>
                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-teal-300 font-bold text-[11px]">
                    <span>{settings.freeDeliveryProgressLabelAr || 'تقدم التوصيل المجاني'}</span>
                    <span className="font-mono text-amber-400 font-bold">0%</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-normal">
                💡 <span className="font-bold">ملاحظة الفرع:</span> يتم استبدال متغيّر <code className="text-amber-300 font-mono text-[10px]">{"{branchName}"}</code> تلقائياً باسم فرع العميل النشط (مثل: <strong>الطالبية هرم</strong>).
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 border-t border-neutral-800 flex justify-end">
            <Button
              type="button"
              disabled={isSavingFreeDelivery}
              onClick={() =>
                handleFastUpdateFreeDelivery(
                  settings.freeDeliveryBarEnabled !== false,
                  settings.freeDeliveryThreshold ?? 200,
                  {
                    freeDeliveryTitleAr: settings.freeDeliveryTitleAr,
                    freeDeliverySubtitleAr: settings.freeDeliverySubtitleAr,
                    freeDeliveryProgressLabelAr: settings.freeDeliveryProgressLabelAr,
                  }
                )
              }
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-amber-950/40 flex items-center gap-2 cursor-pointer"
            >
              {isSavingFreeDelivery ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري حفظ وتطبيق إعدادات ونصوص التوصيل المجاني...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 stroke-[2.5]" />
                  <span>حفظ وتطبيق إعدادات ونصوص التوصيل المجاني الآن ⚡</span>
                </>
              )}
            </Button>
          </div>

          {freeDeliverySuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
              <span className="font-bold">{freeDeliverySuccess}</span>
            </div>
          )}
        </div>

        {/* Dedicated Enterprise Hub: WhatsApp, Tech Support, Complaints & Floating Widget Hub */}
        <div className="bg-gradient-to-br from-[#18110B] via-[#140E0A] to-[#0D0805] border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Top Background Glow */}
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500" />
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Hub Header & Master Toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="relative shrink-0">
                <BrandGoldWhatsAppIcon className="w-12 h-12 drop-shadow-md" variant="luxury-glow" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-white">منظومة أرقام الواتساب والدعم الفني والشكاوى</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-black text-[11px] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>انعكاس فوري 100%</span>
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                  تحكم كامل في الزر العائم على يسار واجهة العميل وقائمة الاختيارات (دعم فني، شكاوى، تواصل واتساب). يمكنك إضافة أرقام متعددة لأي قسم وتعديلها أو حذفها في أي وقت.
                </p>
              </div>
            </div>

            {/* Master Floating Widget Toggle & Add Button */}
            <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
              {/* Floating Widget Toggle */}
              <button
                type="button"
                onClick={() => handleToggleFloatingWhatsAppMaster(!floatingWhatsAppEnabled)}
                disabled={isSavingChannels}
                className={`px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-2 transition-all cursor-pointer ${
                  floatingWhatsAppEnabled
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60 shadow-lg shadow-emerald-950/40'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                }`}
              >
                {floatingWhatsAppEnabled ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>الزر العائم مفعل على الموقع 🟢</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>الزر العائم مخفي من الموقع 🔴</span>
                  </>
                )}
              </button>

              {/* Add New Channel Button */}
              <Button
                type="button"
                onClick={() => handleOpenAddChannelModal()}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs px-4 py-2 rounded-xl shadow-lg shadow-amber-950/50 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>إضافة رقم جديد +</span>
              </Button>
            </div>
          </div>

          {/* Feedback Message */}
          {channelsFeedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
              <span className="font-bold">{channelsFeedback}</span>
            </div>
          )}

          {/* Category Filter Tabs */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-neutral-950/60 p-2 rounded-2xl border border-neutral-800">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'جميع الأرقام', icon: Sparkles },
                { id: 'general', label: 'الطلبات والمبيعات', icon: ShoppingBag },
                { id: 'support', label: 'الدعم الفني', icon: Headphones },
                { id: 'complaints', label: 'الشكاوى والمقترحات', icon: ShieldAlert },
              ].map((tab) => {
                const isSelected = activeAdminCategoryTab === tab.id;
                const count =
                  tab.id === 'all'
                    ? currentContactChannels.length
                    : currentContactChannels.filter((c) => c.category === tab.id).length;
                const TabIcon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveAdminCategoryTab(tab.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md font-black'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSelected ? 'bg-neutral-950/40 text-neutral-950' : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Add For Current Tab */}
            <button
              type="button"
              onClick={() => handleOpenAddChannelModal(activeAdminCategoryTab !== 'all' ? activeAdminCategoryTab : undefined)}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة رقم لهذا القسم</span>
            </button>
          </div>

          {/* Channels Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentContactChannels
              .filter((c) => activeAdminCategoryTab === 'all' || c.category === activeAdminCategoryTab)
              .map((channel) => {
                const whatsAppUrl = phoneUtils.buildWhatsAppUrl(
                  channel.phoneNumber,
                  channel.defaultMessageAr || 'مرحباً، أود التواصل معكم.'
                );

                const getBadge = (cat: ContactChannelCategory) => {
                  switch (cat) {
                    case 'support':
                      return {
                        label: 'دعم فني',
                        bg: 'bg-blue-950/80 border-blue-500/40 text-blue-300',
                        icon: Headphones,
                      };
                    case 'complaints':
                      return {
                        label: 'شكاوى ومقترحات',
                        bg: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
                        icon: ShieldAlert,
                      };
                    case 'general':
                    default:
                      return {
                        label: 'تواصل وطلبات',
                        bg: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
                        icon: ShoppingBag,
                      };
                  }
                };

                const badge = getBadge(channel.category);
                const BadgeIcon = badge.icon;
                const isEnabled = channel.enabled !== false;

                return (
                  <div
                    key={channel.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-lg relative ${
                      isEnabled
                        ? 'bg-neutral-900/90 border-neutral-700/80 hover:border-emerald-500/50'
                        : 'bg-neutral-950/60 border-neutral-800/60 opacity-60'
                    }`}
                  >
                    {/* Card Header: Category & Active Switch */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${badge.bg}`}>
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                        {channel.agentNameOrRole && (
                          <span className="text-[10px] text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded-lg border border-neutral-800">
                            {channel.agentNameOrRole}
                          </span>
                        )}
                      </div>

                      {/* On/Off Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleChannel(channel.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 transition-colors cursor-pointer ${
                          isEnabled
                            ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                        }`}
                        title="تفعيل أو تعطيل هذا الرقم"
                      >
                        {isEnabled ? 'مفعل بالموقع' : 'معطل مؤقتاً'}
                      </button>
                    </div>

                    {/* Card Content: Title & Phone */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white leading-tight">
                        {channel.titleAr}
                      </h4>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-neutral-400 font-medium">رقم الهاتف:</span>
                        <span className="text-xs font-mono font-black text-amber-300 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 dir-ltr">
                          {channel.phoneNumber}
                        </span>
                      </div>
                      {channel.defaultMessageAr && (
                        <p className="text-[11px] text-neutral-400 line-clamp-1 italic bg-neutral-950/40 p-1.5 rounded-lg border border-neutral-800/40 mt-1">
                          "{channel.defaultMessageAr}"
                        </p>
                      )}
                    </div>

                    {/* Card Actions: WhatsApp Test + Edit + Delete */}
                    <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-2">
                      <a
                        href={whatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-amber-300 hover:text-white flex items-center gap-1.5 hover:underline bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800"
                      >
                        <BrandGoldWhatsAppIcon className="w-3.5 h-3.5" />
                        <span>تجربة فتح واتساب 💬</span>
                      </a>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditChannelModal(channel)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                          title="تعديل هذا الرقم"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChannel(channel.id)}
                          className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition-colors cursor-pointer"
                          title="حذف هذا الرقم"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* WhatsApp Pro-Tip & Business Name Guide */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs text-neutral-300">
              <h4 className="font-black text-amber-300 text-sm">
                💡 معلومة هامة حول ظهور اسم القسم أعلى صفحة الواتساب:
              </h4>
              <p className="leading-relaxed text-neutral-300">
                1. <strong>الاسم الذي يظهر بالأعلى في صفحة الواتساب (مكان الاسم الشخصي):</strong> يأتي مباشرة من اسم الملف الشخصي (Profile Name) المسجل على تطبيق <strong>WhatsApp Business</strong> في الهاتف الخاص بكل شريحة/رقم (مثال: يمكنك تسمية الحساب في إعدادات واتساب: <em>"حلواني بامبورينا - خدمة العملاء"</em> أو <em>"حلواني بامبورينا - الشكاوى"</em>).
              </p>
              <p className="leading-relaxed text-neutral-300">
                2. <strong>الرسالة الجاهزة المرفقة مع كل زر:</strong> يقوم النظام تلقائياً بتضمين ترويسة ملكية منسقة باسم القسم والعلامة التجارية (مثل: <code>🧁 *حلواني بامبورينا | خدمة العملاء والطلبات*</code> أو <code>🛠️ *الدعم الفني والتقني*</code> أو <code>⚖️ *قسم الشكاوى والمقترحات للإدارة*</code>) متبوعة بنص الاستفسار التلقائي ليتمكن العميل من إرسالها بضغطة زر واحدة بكل سهولة ووضوح!
              </p>
            </div>
          </div>

          {/* Floating WhatsApp Widget Settings Bar */}
          <div className="p-4 rounded-2xl bg-neutral-950/90 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
              <Settings className="w-4 h-4 text-amber-400" />
              <span>تخصيص نص وتصميم الزر العائم على الموقع</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">عنوان الزر الصغير (عند التحويم)</label>
                <input
                  type="text"
                  value={settings.floatingWhatsAppConfig?.buttonTitleAr || 'تواصل و دعم فني'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings((prev) => ({
                      ...prev,
                      floatingWhatsAppConfig: {
                        ...(prev.floatingWhatsAppConfig || DEFAULT_FLOATING_WHATSAPP_CONFIG),
                        buttonTitleAr: val,
                      },
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">شعار الحالة (داخل القائمة)</label>
                <input
                  type="text"
                  value={settings.floatingWhatsAppConfig?.badgeTextAr || 'متصل الآن 🟢'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings((prev) => ({
                      ...prev,
                      floatingWhatsAppConfig: {
                        ...(prev.floatingWhatsAppConfig || DEFAULT_FLOATING_WHATSAPP_CONFIG),
                        badgeTextAr: val,
                      },
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={async () => {
                    setIsSavingChannels(true);
                    try {
                      await siteSettingsService.updateSiteSettings({
                        floatingWhatsAppConfig: settings.floatingWhatsAppConfig || DEFAULT_FLOATING_WHATSAPP_CONFIG,
                      });
                      setChannelsFeedback('تم حفظ تخصيص الزر العائم وتطبيقه على الموقع فوراً!');
                      setTimeout(() => setChannelsFeedback(null), 3000);
                    } catch (err) {
                      setSaveError('تعذر حفظ تخصيص الزر');
                    } finally {
                      setIsSavingChannels(false);
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ نصوص الزر العائم ⚡</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Contact & Ordering Limits */}
        <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-700/60">
            <Phone className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">بيانات الاتصال ومحددات التوصيل</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                اسم المتجر الرسمي
              </label>
              <input
                type="text"
                value={settings.storeNameAr}
                onChange={(e) => setSettings({ ...settings, storeNameAr: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                رقم الخط الساخن / الهاتف
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                رقم واتساب الشكاوى والإدارة
              </label>
              <input
                type="text"
                value={settings.complaintsWhatsApp || settings.whatsapp || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value, complaintsWhatsApp: e.target.value, customerServiceWhatsApp: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                رسوم التوصيل الافتراضية (ج.م)
              </label>
              <input
                type="number"
                min="0"
                value={settings.defaultDeliveryFee}
                onChange={(e) => setSettings({ ...settings, defaultDeliveryFee: Number(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                الحد الأدنى للطلب (ج.م)
              </label>
              <input
                type="number"
                min="0"
                value={settings.minOrderAmount}
                onChange={(e) => setSettings({ ...settings, minOrderAmount: Number(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                العنوان الرئيسي
              </label>
              <input
                type="text"
                value={settings.addressAr}
                onChange={(e) => setSettings({ ...settings, addressAr: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                نص الشعار والوصف التعريفي بالمتجر (يظهر بالفوتر وخانة التعريف)
              </label>
              <textarea
                rows={2}
                value={settings.storeDescriptionAr || ''}
                onChange={(e) => setSettings({ ...settings, storeDescriptionAr: e.target.value })}
                placeholder="عنوان الرقي والأصالة في صناعة الحلويات الشرقية والغربية والمعجنات والوجبات السريعة. نستخدم السمن البلدي الأصلي 100% يومياً من فرعنا بالطالبية هرم."
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
              />
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                نص شارة الضمان والجودة (Badge)
              </label>
              <input
                type="text"
                value={settings.storeBadgeAr || ''}
                onChange={(e) => setSettings({ ...settings, storeBadgeAr: e.target.value })}
                placeholder="منتجات طازجة 100% بسمن بلدي صافي"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Social Links */}
        <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-700/60">
            <Share2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">روابط التواصل الاجتماعي</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                رابط فيسبوك (Facebook)
              </label>
              <input
                type="url"
                value={settings.facebookUrl || ''}
                onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                placeholder="https://facebook.com/pamborina"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                رابط انستغرام (Instagram)
              </label>
              <input
                type="url"
                value={settings.instagramUrl || ''}
                onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                placeholder="https://instagram.com/pamborina"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                رابط تيك توك (TikTok)
              </label>
              <input
                type="url"
                value={settings.tiktokUrl || ''}
                onChange={(e) => setSettings({ ...settings, tiktokUrl: e.target.value })}
                placeholder="https://tiktok.com/@pamborina"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Coupons & Promo Codes Management */}
        <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-700/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>إدارة كوبونات الخصم والعروض</span>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                      couponsMasterEnabled
                        ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                        : 'bg-rose-950/80 border-rose-500/50 text-rose-400'
                    }`}
                  >
                    {couponsMasterEnabled ? 'قسم الكوبونات مفعل' : 'قسم الكوبونات متوقف كلياً'}
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  التحكم الكامل في ظهور وإيقاف خانة الكوبونات في السلة وإدارة الكودات النشطة
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleOpenAddCouponModal}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>إضافة كوبون جديد</span>
            </Button>
          </div>

          {/* Master Switch Banner */}
          <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-neutral-200 block">
                مفتاح التحكم الرئيسي بخانة الكوبونات في الموقع (Master Toggle)
              </span>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                عند إيقاف هذا المفتاح، سيتم إخفاء خانة «كوبونات الخصم والعروض» كلياً من السلة وصفحة الشراء بالمتجر العام وبشكل لحظي دون الحاجة لإعادة التحميل.
              </p>
            </div>

            <button
              type="button"
              disabled={isSavingCoupons}
              onClick={() => handleToggleMasterCoupons(!couponsMasterEnabled)}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all shrink-0 border shadow-lg ${
                couponsMasterEnabled
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-rose-950/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-950/40'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{couponsMasterEnabled ? 'إيقاف قسم الكوبونات' : 'تفعيل قسم الكوبونات'}</span>
            </button>
          </div>

          {couponsFeedback && (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{couponsFeedback}</span>
            </div>
          )}

          {/* Coupons Table / Cards List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 flex items-center justify-between">
              <span>قائمة كودات الخصم المتاحة بالنظام ({currentCoupons.length}):</span>
            </h4>

            {currentCoupons.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-neutral-900/60 border border-neutral-700/60 text-xs text-neutral-400">
                لا توجد كوبونات خصم مضافة حالياً. انقر على زر «إضافة كوبون جديد» بالأعلى لإضافة كود جديد.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {currentCoupons.map((c) => {
                  const isEnabled = c.enabled !== false;
                  return (
                    <div
                      key={c.code}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                        isEnabled
                          ? 'bg-neutral-900/90 border-amber-500/30 hover:border-amber-500/60 shadow-lg'
                          : 'bg-neutral-900/40 border-neutral-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-lg border border-amber-500/40 dir-ltr inline-block tracking-wider">
                              ⚡ {c.code}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isEnabled
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                              }`}
                            >
                              {isEnabled ? 'مفعل' : 'موقوف'}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-200 font-medium pt-1">
                            {c.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs">
                        <span className="font-bold text-amber-400/90">
                          {c.freeShipping ? 'توصيل مجاني' : `خصم ${c.discountPercent}%`}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleIndividualCoupon(c.code)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer border transition-colors ${
                              isEnabled
                                ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border-neutral-700'
                                : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-700/50'
                            }`}
                            title={isEnabled ? 'إيقاف هذا الكوبون' : 'تفعيل هذا الكوبون'}
                          >
                            {isEnabled ? 'إيقاف' : 'تفعيل'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditCouponModal(c)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer"
                            title="تعديل الكوبون"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(c.code)}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 cursor-pointer"
                            title="حذف الكوبون"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Homepage Features Management */}
        <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-700/60">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">إدارة ميزات المتجر (الصفحة الرئيسية)</h3>
          </div>

          {/* Add New Feature */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-amber-300">✨ إضافة بطاقة ميزة جديدة</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">الرمز التعبيري (Emoji)</label>
                <input
                  type="text"
                  value={newFeatureEmoji}
                  onChange={(e) => setNewFeatureEmoji(e.target.value)}
                  placeholder="🚚"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">العنوان الرئيسي (AR)</label>
                <input
                  type="text"
                  value={newFeatureTitle}
                  onChange={(e) => setNewFeatureTitle(e.target.value)}
                  placeholder="مثال: توصيل سريع"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">الوصف الفرعي (AR)</label>
                <input
                  type="text"
                  value={newFeatureDesc}
                  onChange={(e) => setNewFeatureDesc(e.target.value)}
                  placeholder="مثال: لجميع أحياء فيصل والهرم"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-black rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة الميزة</span>
              </button>
            </div>
          </div>

          {/* List existing features */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-300">البطاقات الحالية المعروضة على الموقع:</h4>
            {(settings.features || []).length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-4 bg-neutral-900/40 rounded-xl">لا توجد بطاقات ميزات حالية مضافة. يرجى إضافة واحدة أعلاه.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(settings.features || []).map((feat) => (
                  <div key={feat.id} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-700/50 flex items-start gap-3 relative">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-1">
                          <label className="block text-[9px] text-neutral-400 mb-0.5">رمز</label>
                          <input
                            type="text"
                            value={feat.emoji}
                            onChange={(e) => handleUpdateFeatureField(feat.id, 'emoji', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white text-center focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[9px] text-neutral-400 mb-0.5">العنوان</label>
                          <input
                            type="text"
                            value={feat.titleAr}
                            onChange={(e) => handleUpdateFeatureField(feat.id, 'titleAr', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] text-neutral-400 mb-0.5">الوصف</label>
                        <input
                          type="text"
                          value={feat.descAr}
                          onChange={(e) => handleUpdateFeatureField(feat.id, 'descAr', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFeature(feat.id)}
                      className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/40 absolute top-2 left-2 cursor-pointer transition-colors"
                      title="حذف هذه الميزة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 6: Customer Reviews & Testimonials Management */}
        <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-700/60">
            <Quote className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">إدارة آراء وتقييمات العملاء (شريط الآراء)</h3>
          </div>

          {/* Testimonials Header Meta Edits */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-amber-300">⚙️ إعدادات ترويسة قسم الآراء</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">العنوان الرئيسي لقسم الآراء</label>
                <input
                  type="text"
                  value={settings.testimonialsTitle || ''}
                  onChange={(e) => setSettings({ ...settings, testimonialsTitle: e.target.value })}
                  placeholder="آراء وتقييمات عملاء بامبورينا"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">الوصف الفرعي لقسم الآراء</label>
                <input
                  type="text"
                  value={settings.testimonialsSubtitle || ''}
                  onChange={(e) => setSettings({ ...settings, testimonialsSubtitle: e.target.value })}
                  placeholder="أكثر من 15,000 عميل يثقون في جودة حلويات ومأكولات بامبورينا"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">معدل التقييم المعروض (مثال: 4.9)</label>
                <input
                  type="text"
                  value={settings.testimonialsRating || ''}
                  onChange={(e) => setSettings({ ...settings, testimonialsRating: e.target.value })}
                  placeholder="4.9"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">عدد العملاء الواثقين (مثال: 15,000)</label>
                <input
                  type="text"
                  value={settings.testimonialsTrustCount || ''}
                  onChange={(e) => setSettings({ ...settings, testimonialsTrustCount: e.target.value })}
                  placeholder="15,000"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 text-center"
                />
              </div>
            </div>
          </div>

          {/* Add New Review */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-amber-300">🌟 إضافة رأي عميل جديد</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">اسم العميل</label>
                <input
                  type="text"
                  value={newReviewName}
                  onChange={(e) => setNewReviewName(e.target.value)}
                  placeholder="مثال: م. أحمد يحيى"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">المنطقة والمدينة</label>
                <input
                  type="text"
                  value={newReviewLocation}
                  onChange={(e) => setNewReviewLocation(e.target.value)}
                  placeholder="مثال: الطالبية - هرم"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">التقييم (النجوم)</label>
                <select
                  value={newReviewRating}
                  onChange={(e) => setNewReviewRating(Number(e.target.value) || 5)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                  <option value={4}>⭐⭐⭐⭐ (4/5)</option>
                  <option value={3}>⭐⭐⭐ (3/5)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">الصنف المطلوب</label>
                <input
                  type="text"
                  value={newReviewItem}
                  onChange={(e) => setNewReviewItem(e.target.value)}
                  placeholder="مثال: قشطوطة باللوتس"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">التوقيت</label>
                <input
                  type="text"
                  value={newReviewTime}
                  onChange={(e) => setNewReviewTime(e.target.value)}
                  placeholder="منذ يومين"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-300 mb-1">التعليق المباشر</label>
                <input
                  type="text"
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  placeholder="جودة رائعة وسرعة استثنائية"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddReview}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة التقييم</span>
              </button>
            </div>
          </div>

          {/* List existing reviews */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-300">الآراء المعروضة حالياً على الموقع:</h4>
            {(settings.testimonials || []).length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-4 bg-neutral-900/40 rounded-xl">لا توجد آراء عملاء مضافة حالياً. يرجى إضافة رأي أعلاه.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(settings.testimonials || []).map((review) => (
                  <div key={review.id} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-700/50 flex flex-col gap-3 relative">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] text-neutral-400">اسم العميل</label>
                        <input
                          type="text"
                          value={review.nameAr}
                          onChange={(e) => handleUpdateReviewField(review.id, 'nameAr', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-neutral-400">المنطقة</label>
                        <input
                          type="text"
                          value={review.locationAr}
                          onChange={(e) => handleUpdateReviewField(review.id, 'locationAr', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-neutral-400">توقيت</label>
                        <input
                          type="text"
                          value={review.timeAr}
                          onChange={(e) => handleUpdateReviewField(review.id, 'timeAr', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-neutral-400">الصنف المذكور</label>
                        <input
                          type="text"
                          value={review.orderedItemAr}
                          onChange={(e) => handleUpdateReviewField(review.id, 'orderedItemAr', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-neutral-400">النجوم (1-5)</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={review.rating}
                          onChange={(e) => handleUpdateReviewField(review.id, 'rating', Number(e.target.value) || 5)}
                          className="w-full px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] text-neutral-400 mb-0.5">التعليق والتقييم المكتوب</label>
                      <textarea
                        rows={2}
                        value={review.commentAr}
                        onChange={(e) => handleUpdateReviewField(review.id, 'commentAr', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none resize-none leading-normal"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/40 absolute top-2 left-2 cursor-pointer transition-colors"
                      title="حذف هذا التقييم"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black px-8 py-3.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                <span>جاري حفظ التعديلات...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-1" />
                <span>حفظ التغييرات في قاعدة البيانات</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Danger Zone / System Reset Section */}
      <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-6 shadow-xl space-y-5 mt-6">
        <div className="flex items-center gap-2.5 pb-2 border-b border-rose-900/40">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h3 className="text-base font-bold text-rose-300">منطقة الصيانة وإعادة ضبط النظام</h3>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-white">إعادة ضبط النظام والبدء من الصفر</h4>
            <p className="text-xs text-neutral-300 leading-relaxed max-w-2xl">
              إجراء صيانة شامل يقوم بحذف كافة الطلبات النشطة بشكل آمن بعد أرشفتها في السجلات الدائمة، وتصفير عداد الطلبات التسلسلي ليبدأ النظام من الصفر تماماً برقم <span className="font-mono text-amber-400 font-extrabold">#ORDER-01</span>.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => {
              setResetSuccess(null);
              setResetError(null);
              setIsResetConfirmOpen(true);
            }}
            className="bg-rose-600 hover:bg-rose-500 text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            <span>البدء من الصفر وتصفير السجلات</span>
          </Button>
        </div>

        {resetSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-300">
            <CheckCircle2 className="w-5 h-5 shrink-0 animate-bounce" />
            <span className="font-semibold">{resetSuccess}</span>
          </div>
        )}

        {resetError && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{resetError}</span>
          </div>
        )}
      </div>

      {/* System Reset Modal Component */}
      <SystemResetModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onSuccess={() => {
          setResetSuccess('تمت إعادة ضبط النظام بالكامل بنجاح والبدء من الصفر!');
        }}
        showToast={(title, message, type) => {
          if (type === 'success') {
            setResetSuccess(`${title} - ${message}`);
          } else if (type === 'error') {
            setResetError(`${title}: ${message}`);
          }
        }}
      />

      {/* Add / Edit Coupon Modal Component */}
      <AnimatePresence>
        {isCouponModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm dir-rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black text-white">
                    {editingCoupon ? 'تعديل كوبون الخصم' : 'إضافة كوبون خصم جديد'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg bg-neutral-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCouponForm} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    رمز الكوبون (Coupon Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="مثال: BAMBORINA20"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-sm font-black text-amber-300 font-mono tracking-wider focus:outline-none focus:border-amber-500 uppercase dir-ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    نوع الخصم
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCouponTypeInput('discount')}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                        couponTypeInput === 'discount'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <Percent className="w-4 h-4" />
                      <span>خصم مئوي (%)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCouponTypeInput('free_shipping')}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                        couponTypeInput === 'free_shipping'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                      <span>توصيل مجاني</span>
                    </button>
                  </div>
                </div>

                {couponTypeInput === 'discount' && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      نسبة الخصم المئوية (%) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={couponPercentInput}
                      onChange={(e) => setCouponPercentInput(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    الوصف المختصر للكوبون (يظهر للعميل)
                  </label>
                  <input
                    type="text"
                    value={couponDescInput}
                    onChange={(e) => setCouponDescInput(e.target.value)}
                    placeholder={
                      couponTypeInput === 'free_shipping'
                        ? 'توصيل مجاني لجميع الطلبات'
                        : 'خصم 20% لعملاء بامبورينا'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="coupon_enabled"
                    checked={couponEnabledInput}
                    onChange={(e) => setCouponEnabledInput(e.target.checked)}
                    className="w-4 h-4 rounded bg-neutral-950 border-neutral-700 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="coupon_enabled" className="text-xs font-bold text-neutral-200 cursor-pointer">
                    تفعيل هذا الكوبون فوراً للعملاء
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCouponModalOpen(false)}
                    className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs cursor-pointer"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                  >
                    حفظ الكوبون
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Contact Channel Add/Edit Modal */}
        {isContactModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#140E0A] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-1 rounded-xl bg-neutral-950 border border-amber-500/40">
                    <BrandGoldWhatsAppIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {editingChannel ? 'تعديل رقم قناة التواصل' : 'إضافة رقم جديد لقنوات التواصل'}
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      يظهر هذا الرقم للعملاء مباشرة في قائمة الزر العائم على الموقع
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="p-1.5 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveChannelForm} className="space-y-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    القسم / نوع الخدمة *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'general', label: 'طلبات ومبيعات', icon: ShoppingBag },
                      { id: 'support', label: 'دعم فني', icon: Headphones },
                      { id: 'complaints', label: 'شكاوى ومقترحات', icon: ShieldAlert },
                    ].map((cat) => {
                      const isSel = channelCategoryInput === cat.id;
                      const CatIcon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setChannelCategoryInput(cat.id as any);
                            if (!editingChannel) {
                              if (cat.id === 'support') {
                                setChannelTitleInput('الدعم الفني والتقني (الخط المباشر)');
                                setChannelRoleInput('فريق الدعم الفني 24/7');
                                setChannelMessageInput('🛠️ *الدعم الفني والتقني | حلواني بامبورينا*\n\nمرحباً فريق الدعم الفني، أحتاج لمساعدة بخصوص الحساب أو عملية الطلب على الموقع.');
                              } else if (cat.id === 'complaints') {
                                setChannelTitleInput('قسم الشكاوى والمقترحات (مباشر للإدارة)');
                                setChannelRoleInput('إدارة الجودة ورضا العملاء');
                                setChannelMessageInput('⚖️ *قسم الشكاوى والمقترحات للإدارة | حلواني بامبورينا*\n\nمرحباً إدارة حلواني بامبورينا، أود تقديم شكوى أو مقترح لتحسين مستوى الخدمة.');
                              } else {
                                setChannelTitleInput('خدمة العملاء والطلبات المباشرة');
                                setChannelRoleInput('خدمة العملاء والمبيعات');
                                setChannelMessageInput('🧁 *خدمة العملاء والطلبات | حلواني بامبورينا*\n\nمرحباً بكم، أود الاستفسار والطلب من قائمة حلواني بامبورينا.');
                              }
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            isSel
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <CatIcon className="w-4 h-4" />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    اسم / عنوان الزر للعميل *
                  </label>
                  <input
                    type="text"
                    required
                    value={channelTitleInput}
                    onChange={(e) => setChannelTitleInput(e.target.value)}
                    placeholder="مثال: الدعم الفني 2 - واتساب واستفسارات"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5 flex items-center justify-between">
                    <span>رقم الهاتف أو الواتساب *</span>
                    <span className="text-[10px] text-neutral-500 font-mono">01121778205 أو صيغة دولية</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={channelPhoneInput}
                    onChange={(e) => setChannelPhoneInput(e.target.value)}
                    placeholder="01121778205"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-sm font-black text-amber-300 focus:outline-none focus:border-emerald-500 font-mono dir-ltr tracking-wider"
                  />
                </div>

                {/* Role / Agent / Working Hours */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    اسم الفريق أو مواعيد العمل (اختياري)
                  </label>
                  <input
                    type="text"
                    value={channelRoleInput}
                    onChange={(e) => setChannelRoleInput(e.target.value)}
                    placeholder="مثال: متاح 24 ساعة أو فريق الدعم الفني"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Default WhatsApp Message */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    الرسالة التلقائية في واتساب (تظهر للعميل عند فتح المحادثة)
                  </label>
                  <textarea
                    rows={2}
                    value={channelMessageInput}
                    onChange={(e) => setChannelMessageInput(e.target.value)}
                    placeholder="مرحباً، أود التواصل معكم عبر واتساب بخصوص..."
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* Enabled Toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="channel_enabled"
                    checked={channelEnabledInput}
                    onChange={(e) => setChannelEnabledInput(e.target.checked)}
                    className="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="channel_enabled" className="text-xs font-bold text-neutral-200 cursor-pointer">
                    تفعيل هذا الرقم للظهور فوراً في الزر العائم وقائمة التواصل
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsContactModalOpen(false)}
                    className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs cursor-pointer"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs px-6 py-2.5 rounded-xl cursor-pointer shadow-lg shadow-emerald-950/60"
                  >
                    حفظ وتطبيق على الموقع ⚡
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
