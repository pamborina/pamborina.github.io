import React, { useState, useEffect, useRef } from 'react';
import { HeroOffer, HeroOffersConfig, Category } from '../../../types';
import {
  heroOfferService,
  DEFAULT_HERO_OFFERS,
  DEFAULT_HERO_OFFERS_CONFIG,
} from '../../../services/heroOfferService';
import {
  Sparkles,
  Clock,
  Zap,
  ArrowLeft,
  ShieldCheck,
  Flame,
  ShoppingBag,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  Power,
  RotateCcw,
  Loader2,
  X,
  Sliders,
  Calendar,
  Layers,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Images } from '../../../data/images';

interface AdminOffersTabProps {
  categories: Category[];
}

export const AdminOffersTab: React.FC<AdminOffersTabProps> = ({ categories }) => {
  const [offers, setOffers] = useState<HeroOffer[]>(DEFAULT_HERO_OFFERS);
  const [config, setConfig] = useState<HeroOffersConfig>(DEFAULT_HERO_OFFERS_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<HeroOffer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Modal State
  const [offerToDelete, setOfferToDelete] = useState<HeroOffer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Form Fields
  const [formTitleAr, setFormTitleAr] = useState('');
  const [formSubtitleAr, setFormSubtitleAr] = useState('');
  const [formBadgeAr, setFormBadgeAr] = useState('⚡ توصيل صاروخي 20 دقيقة');
  const [formDiscountBadgeAr, setFormDiscountBadgeAr] = useState('🔥 خصم خاص لفترة محدودة');
  const [formTrustBadge1Ar, setFormTrustBadge1Ar] = useState('ضمان السمن البلدي 100%');
  const [formTrustBadge2Ar, setFormTrustBadge2Ar] = useState('طلبها +1,850 عميل اليوم');
  const [formCtaTextAr, setFormCtaTextAr] = useState('اطلب الآن');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Timer Fields
  const [formHasCountdown, setFormHasCountdown] = useState(true);
  const [formCountdownType, setFormCountdownType] = useState<'daily_recurring' | 'fixed_datetime'>('daily_recurring');
  const [formCountdownHours, setFormCountdownHours] = useState(4);
  const [formCountdownEndDateTime, setFormCountdownEndDateTime] = useState('');
  const [formCountdownLabelAr, setFormCountdownLabelAr] = useState('ينتهي العرض خلال:');

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Auto clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Subscribe to real-time hero offers and config
  useEffect(() => {
    setIsLoading(true);
    const unsubOffers = heroOfferService.subscribeToHeroOffers(
      (liveOffers) => {
        if (Array.isArray(liveOffers)) {
          setOffers(liveOffers);
        }
        setIsLoading(false);
      },
      (err) => {
        console.warn('Hero offers subscription notice:', err);
        setIsLoading(false);
      }
    );

    const unsubConfig = heroOfferService.subscribeToOffersConfig((liveConfig) => {
      if (liveConfig) {
        setConfig(liveConfig);
      }
    });

    return () => {
      unsubOffers();
      unsubConfig();
    };
  }, []);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingOffer(null);
    setFormTitleAr('');
    setFormSubtitleAr('');
    setFormBadgeAr('⚡ عرض حصري مميز');
    setFormDiscountBadgeAr('🔥 خصم خاص لفترة محدودة');
    setFormTrustBadge1Ar('ضمان السمن البلدي 100%');
    setFormTrustBadge2Ar('طلبها +1,850 عميل اليوم');
    setFormCtaTextAr('اطلب وجبتك الآن');
    setFormImageUrl(Images.heroBanner1 || '');
    setFormCategoryId(categories[0]?.id || '');
    setFormIsActive(true);
    setFormHasCountdown(true);
    setFormCountdownType('daily_recurring');
    setFormCountdownHours(4);
    setFormCountdownEndDateTime('');
    setFormCountdownLabelAr('ينتهي العرض خلال:');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (offer: HeroOffer) => {
    setEditingOffer(offer);
    setFormTitleAr(offer.titleAr || '');
    setFormSubtitleAr(offer.subtitleAr || '');
    setFormBadgeAr(offer.badgeAr || '⚡ عرض حصري');
    setFormDiscountBadgeAr(offer.discountBadgeAr || '🔥 خصم مميز');
    setFormTrustBadge1Ar(offer.trustBadge1Ar || '');
    setFormTrustBadge2Ar(offer.trustBadge2Ar || '');
    setFormCtaTextAr(offer.ctaTextAr || 'اطلب الآن');
    setFormImageUrl(offer.imageUrl || '');
    setFormCategoryId(offer.categoryId || '');
    setFormIsActive(offer.isActive !== false);
    setFormHasCountdown(offer.hasCountdown !== false);
    setFormCountdownType(offer.countdownType || 'daily_recurring');
    setFormCountdownHours(offer.countdownHours ?? 4);
    setFormCountdownEndDateTime(offer.countdownEndDateTime || '');
    setFormCountdownLabelAr(offer.countdownLabelAr || 'ينتهي العرض خلال:');
    setIsModalOpen(true);
  };

  // Handle local image file upload & convert to base64 WebP/data URL
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToastMessage({ type: 'error', text: 'يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)' });
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormImageUrl(result);
      setIsUploadingImage(false);
      setToastMessage({ type: 'success', text: 'تم تحميل ومعاينة الصورة بنجاح!' });
    };
    reader.onerror = () => {
      setIsUploadingImage(false);
      setToastMessage({ type: 'error', text: 'فشل قراءة ملف الصورة' });
    };
    reader.readAsDataURL(file);
  };

  // Save / Update Offer
  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitleAr.trim()) {
      setToastMessage({ type: 'error', text: 'يرجى كتابة العنوان الرئيسي للعرض' });
      return;
    }

    if (!formImageUrl.trim()) {
      setToastMessage({ type: 'error', text: 'يرجى رفع أو إضافة رابط صورة العرض' });
      return;
    }

    setIsSaving(true);
    try {
      const offerData: Partial<HeroOffer> & { titleAr: string } = {
        ...(editingOffer ? { id: editingOffer.id } : {}),
        titleAr: formTitleAr.trim(),
        subtitleAr: formSubtitleAr.trim(),
        badgeAr: formBadgeAr.trim(),
        discountBadgeAr: formDiscountBadgeAr.trim(),
        trustBadge1Ar: formTrustBadge1Ar.trim(),
        trustBadge2Ar: formTrustBadge2Ar.trim(),
        ctaTextAr: formCtaTextAr.trim() || 'اطلب الآن',
        imageUrl: formImageUrl.trim(),
        categoryId: formCategoryId,
        targetType: formCategoryId ? 'category' : 'cart',
        hasCountdown: formHasCountdown,
        countdownType: formCountdownType,
        countdownHours: Number(formCountdownHours) || 4,
        countdownEndDateTime: formCountdownEndDateTime,
        countdownLabelAr: formCountdownLabelAr.trim() || 'ينتهي العرض خلال:',
        isActive: formIsActive,
        sortOrder: editingOffer ? editingOffer.sortOrder : offers.length + 1,
      };

      await heroOfferService.saveHeroOffer(offerData);

      setIsModalOpen(false);
      setEditingOffer(null);
      setToastMessage({
        type: 'success',
        text: editingOffer
          ? `✅ تم تحديث عرض (${formTitleAr}) بنجاح وانعكاسه على الموقع!`
          : `🎉 تم نشر العرض الجديد (${formTitleAr}) بنجاح!`,
      });
    } catch (err: any) {
      console.error('Save offer error:', err);
      setToastMessage({ type: 'error', text: `فشل الحفظ: ${err?.message || 'يرجى المحاولة مجدداً'}` });
    } finally {
      setIsSaving(false);
    }
  };

  // Instant Delete Offer
  const handleConfirmDelete = async (offer: HeroOffer) => {
    setIsDeleting(true);
    // Optimistic UI
    setOffers((prev) => prev.filter((o) => o.id !== offer.id));
    setOfferToDelete(null);
    if (editingOffer && editingOffer.id === offer.id) {
      setIsModalOpen(false);
      setEditingOffer(null);
    }

    setToastMessage({
      type: 'success',
      text: `🗑️ تم حذف عرض (${offer.titleAr}) فوراً وتحديث الموقع لحظياً!`,
    });

    try {
      await heroOfferService.deleteHeroOffer(offer.id);
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: `فشل الحذف من السحابة: ${err?.message || 'يرجى المحاولة مجدداً'}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Fast Toggle Active Status
  const handleToggleActive = async (offer: HeroOffer) => {
    const nextState = !offer.isActive;
    // Optimistic UI
    setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, isActive: nextState } : o)));

    try {
      await heroOfferService.toggleOfferActive(offer.id, nextState);
      setToastMessage({
        type: 'success',
        text: nextState
          ? `⚡ تم تفعيل عرض (${offer.titleAr}) على الموقع`
          : `⏸️ تم إيقاف ظهور عرض (${offer.titleAr}) على الموقع`,
      });
    } catch (e: any) {
      setToastMessage({ type: 'error', text: 'فشل تغيير حالة العرض' });
    }
  };

  // Move Offer Up / Down
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === offers.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...offers];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    setOffers(reordered);

    try {
      await heroOfferService.reorderOffers(reordered);
      setToastMessage({ type: 'success', text: '🔄 تم تحديث ترتيب ظهور العروض بنجاح' });
    } catch (e) {
      setToastMessage({ type: 'error', text: 'فشل تحديث الترتيب' });
    }
  };

  // Toggle Master Hero Offers Section
  const handleToggleMasterSection = async () => {
    const nextState = !config.isEnabled;
    setConfig((prev) => ({ ...prev, isEnabled: nextState }));

    try {
      await heroOfferService.updateOffersConfig({ isEnabled: nextState });
      setToastMessage({
        type: 'success',
        text: nextState
          ? '🎉 تم تفعيل خانة العروض الترويجية في الصفحة الرئيسية'
          : '🔒 تم إخفاء خانة العروض كلياً من الصفحة الرئيسية',
      });
    } catch (e) {
      setToastMessage({ type: 'error', text: 'فشل تعديل حالة خانة العروض' });
    }
  };

  // Change Auto Slide Interval
  const handleChangeInterval = async (seconds: number) => {
    setConfig((prev) => ({ ...prev, autoSlideIntervalSeconds: seconds }));
    try {
      await heroOfferService.updateOffersConfig({ autoSlideIntervalSeconds: seconds });
      setToastMessage({ type: 'success', text: `⏱️ تم ضبط سرعة التبديل التلقائي إلى (${seconds}) ثوانٍ` });
    } catch (e) {
      setToastMessage({ type: 'error', text: 'فشل حفظ سرعة التبديل' });
    }
  };

  // Reset to Defaults
  const handleResetToDefaults = async () => {
    setIsResetting(true);
    try {
      await heroOfferService.resetToDefaultOffers();
      setIsResetModalOpen(false);
      setToastMessage({ type: 'success', text: '✨ تم استعادة العروض الافتراضية الأصلية بنجاح!' });
    } catch (e) {
      setToastMessage({ type: 'error', text: 'فشل استعادة العروض الافتراضية' });
    } finally {
      setIsResetting(false);
    }
  };

  const activeCount = offers.filter((o) => o.isActive !== false).length;

  return (
    <div className="space-y-6 dir-rtl">
      {/* Toast Notification Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-2xl flex items-center gap-3 border shadow-2xl text-xs font-bold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="flex-1">{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner & Control Deck */}
      <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">إدارة خانة العروض والبانرات 🏷️</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
                  {offers.length} عروض ({activeCount} مفعل)
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                تحكم كامل في نصوص العروض، الصور، عدادات التنازل، الروابط، وتفعيل أو إيقاف خانة العروض بالكامل على الموقع.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="استعادة العروض الأصلية الافتراضية"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
              <span>استعادة الأصل</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/25 border border-amber-400 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-neutral-950 stroke-[3]" />
              <span>إضافة عرض جديد</span>
            </button>
          </div>
        </div>

        {/* Quick Settings Bar */}
        <div className="pt-4 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Master Toggle */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  config.isEnabled
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                }`}
              >
                <Power className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">حالة ظهور خانة العروض بالموقع</p>
                <span className="text-[11px] text-neutral-400">
                  {config.isEnabled ? 'الخانة ظاهرة ونشطة للعملاء' : 'الخانة مخفية ومغلقة كلياً'}
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleMasterSection}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                config.isEnabled
                  ? 'bg-emerald-500 text-neutral-950 font-black hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700'
              }`}
            >
              {config.isEnabled ? 'مفعلة بالموقع' : 'إيقاف الخانة'}
            </button>
          </div>

          {/* Auto slide duration selector */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">سرعة التبديل التلقائي بين العروض</p>
                <span className="text-[11px] text-neutral-400">مدة عرض كل شريحة بالثواني</span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
              {[4, 6, 8, 10].map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleChangeInterval(sec)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                    config.autoSlideIntervalSeconds === sec
                      ? 'bg-amber-500 text-neutral-950 font-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {sec}ث
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Offers List & Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <span>قائمة العروض الحالية</span>
            <span className="text-xs text-neutral-400 font-normal">({offers.length} عروض مضافة)</span>
          </h3>
          <span className="text-xs text-neutral-400">يمكنك إعادة الترتيب أو التعديل الفوري</span>
        </div>

        {offers.length === 0 ? (
          <div className="p-12 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-400 mx-auto">
              <Sparkles className="w-8 h-8 opacity-60" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">لا توجد عروض ترويجية مضافة</h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                قم بإضافة عرض ترويجي جديد لجذب العملاء بخصومات وبانرات جذابة، أو استعد العروض الافتراضية.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={handleResetToDefaults}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold"
              >
                استعادة العروض الافتراضية
              </button>
              <button
                onClick={handleOpenCreate}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black"
              >
                إضافة عرض جديد
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((offer, idx) => {
              const isActive = offer.isActive !== false;
              return (
                <div
                  key={offer.id}
                  className={`rounded-3xl border overflow-hidden transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-neutral-900 border-neutral-800 hover:border-amber-500/50 shadow-lg'
                      : 'bg-neutral-900/60 border-neutral-800/60 opacity-65'
                  }`}
                >
                  {/* Top Image Preview & Badges */}
                  <div className="relative h-44 w-full overflow-hidden bg-neutral-950">
                    <img
                      src={offer.imageUrl}
                      alt={offer.titleAr}
                      className="w-full h-full object-cover opacity-60 transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

                    {/* Top Overlay Badges */}
                    <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-bold text-amber-400 flex items-center gap-1 shadow-md">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span className="line-clamp-1">{offer.badgeAr || 'عرض'}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-950/80 text-[10px] font-mono text-neutral-300 border border-neutral-700">
                          #{idx + 1}
                        </span>
                        <button
                          onClick={() => handleToggleActive(offer)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-emerald-500 text-neutral-950 font-black'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {isActive ? 'مفعل' : 'معطل'}
                        </button>
                      </div>
                    </div>

                    {/* Bottom overlay discount & countdown tag */}
                    <div className="absolute bottom-2.5 right-3 left-3 flex items-center justify-between gap-2 text-[10px]">
                      {offer.discountBadgeAr && (
                        <span className="px-2.5 py-0.5 rounded-md bg-red-600/90 text-white font-bold shadow">
                          🔥 {offer.discountBadgeAr}
                        </span>
                      )}

                      {offer.hasCountdown !== false && (
                        <span className="px-2 py-0.5 rounded-md bg-black/80 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>
                            {offer.countdownType === 'fixed_datetime' ? 'موعد محدد' : `${offer.countdownHours || 4} ساعات`}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-black text-white line-clamp-1 leading-snug">
                        {offer.titleAr}
                      </h4>
                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {offer.subtitleAr || 'لا يوجد وصف تفصيلي'}
                      </p>
                    </div>

                    {/* Meta info tags */}
                    <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold text-neutral-300">{offer.ctaTextAr || 'اطلب الآن'}</span>
                      </div>

                      {offer.categoryId && (
                        <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-amber-400/90 text-[10px] font-mono border border-neutral-700">
                          {categories.find((c) => c.id === offer.categoryId)?.nameAr || offer.categoryId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-2">
                    {/* Move Up / Down Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveOrder(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 disabled:opacity-30 transition-colors cursor-pointer"
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(idx, 'down')}
                        disabled={idx === offers.length - 1}
                        className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 disabled:opacity-30 transition-colors cursor-pointer"
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Edit & Delete Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(offer)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                      <button
                        onClick={() => setOfferToDelete(offer)}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                        title="حذف هذا العرض"
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

      {/* Add / Edit Comprehensive Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm dir-rtl overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    {editingOffer ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {editingOffer ? `تعديل العرض: ${editingOffer.titleAr}` : 'إضافة عرض ترويجي جديد'}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      سيتم تطبيق التعديلات فوراً وبدقة على خانة العروض في الصفحة الرئيسية
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveOffer} className="space-y-6">
                {/* Live Preview Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-bold flex items-center gap-1.5 text-amber-400">
                      <Eye className="w-3.5 h-3.5" />
                      معاينة حية لشكل البانر كما سيظهر للعميل:
                    </span>
                    <span className="text-[11px]">مظهر متطابق 100%</span>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-gradient-to-r from-[#1E140C] via-[#120C08] to-[#1E140C] p-5 flex flex-col justify-between min-h-[220px]">
                    <div className="absolute inset-0 z-0">
                      <img
                        src={formImageUrl || Images.heroBanner1}
                        alt="Preview"
                        className="w-full h-full object-cover opacity-40 scale-105 filter blur-[0.5px]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0F0B08] via-[#0F0B08]/90 to-transparent" />
                    </div>

                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {formBadgeAr && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#2A1E15] border border-[#D4AF37]/50 text-[10px] font-bold text-[#F4E08B] flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                            <span>{formBadgeAr}</span>
                          </span>
                        )}
                        {formDiscountBadgeAr && (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">
                            🔥 {formDiscountBadgeAr}
                          </span>
                        )}
                      </div>

                      {formHasCountdown && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/80 border border-amber-500/40 text-[10px] text-amber-400 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{formCountdownLabelAr} 03:59:41</span>
                        </div>
                      )}
                    </div>

                    <div className="relative z-10 max-w-lg space-y-1 my-2">
                      <h4 className="text-base sm:text-xl font-black text-[#FFF1C5]">
                        {formTitleAr || 'عنوان العرض الترويجي'}
                      </h4>
                      <p className="text-xs text-[#C8BFB0] line-clamp-2">
                        {formSubtitleAr || 'تفاصيل العرض والمميزات اللذيذة بالسمن البلدي الصافي.'}
                      </p>
                    </div>

                    <div className="relative z-10 flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <div className="px-4 py-1.5 rounded-xl bg-amber-500 text-neutral-950 font-black text-xs flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{formCtaTextAr || 'اطلب الآن'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-[#D4AF37]">
                        {formTrustBadge1Ar && <span>🛡️ {formTrustBadge1Ar}</span>}
                        {formTrustBadge2Ar && <span>⚡ {formTrustBadge2Ar}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Main Texts */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                  <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>النصوص والعناوين الرئيسية للعرض</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-neutral-300">
                        العنوان الرئيسي للعرض <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formTitleAr}
                        onChange={(e) => setFormTitleAr(e.target.value)}
                        placeholder="مثال: كريبات وشاورما بامبورينا المكس"
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-neutral-300">الوصف التفصيلي للعرض</label>
                      <textarea
                        rows={2}
                        value={formSubtitleAr}
                        onChange={(e) => setFormSubtitleAr(e.target.value)}
                        placeholder="مثال: وجبات حادقة سخنة ومقرمشة محضرة طازجة من فرع شارع العشرين بفيصل."
                        className="w-full px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none leading-relaxed resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-300">نص شارة العرض العلوية</label>
                      <input
                        type="text"
                        value={formBadgeAr}
                        onChange={(e) => setFormBadgeAr(e.target.value)}
                        placeholder="مثال: ⚡ توصيل صاروخي 20 دقيقة"
                        className="w-full px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-300">نص شارة الخصم أو التوفير</label>
                      <input
                        type="text"
                        value={formDiscountBadgeAr}
                        onChange={(e) => setFormDiscountBadgeAr(e.target.value)}
                        placeholder="مثال: 🔥 توصيل مجاني للوجبات أو خصم 20%"
                        className="w-full px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-300">شارة الثقة الأولى</label>
                      <input
                        type="text"
                        value={formTrustBadge1Ar}
                        onChange={(e) => setFormTrustBadge1Ar(e.target.value)}
                        placeholder="مثال: ضمان السمن البلدي 100%"
                        className="w-full px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-300">شارة الثقة الثانية</label>
                      <input
                        type="text"
                        value={formTrustBadge2Ar}
                        onChange={(e) => setFormTrustBadge2Ar(e.target.value)}
                        placeholder="مثال: طلبها +1,850 عميل اليوم"
                        className="w-full px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Image Selection & Upload */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span>صورة خلفية العرض</span>
                    </h4>
                    <span className="text-[11px] text-neutral-400">يمكنك رفع صورة من جهازك أو إدخال رابط</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* File Upload Button */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="p-4 rounded-xl border-2 border-dashed border-neutral-700 hover:border-amber-400 bg-neutral-900/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      {isUploadingImage ? (
                        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6 text-amber-400" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-white">اضغط لرفع صورة من جهازك</p>
                        <span className="text-[10px] text-neutral-400">PNG, JPG, WebP</span>
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-neutral-300 block">أو اختر من قوالب بامبورينا الجاهزة:</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { name: 'كحك وحلويات', url: Images.heroBanner1 },
                          { name: 'كشري ولوتس', url: Images.heroBanner2 },
                          { name: 'شاورما وكريب', url: Images.heroBanner3 },
                        ].map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setFormImageUrl(preset.url)}
                            className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                              formImageUrl === preset.url
                                ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                                : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                            }`}
                          >
                            <img src={preset.url} alt={preset.name} className="w-full h-12 object-cover rounded-lg mb-1" />
                            <span className="text-[10px] font-bold block truncate">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-300">رابط الصورة المباشر (URL)</label>
                    <input
                      type="url"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Section 3: Countdown Timer Settings ("ينتهي العرض خلال:") */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-black text-amber-400">إعدادات العداد التنازلي ("ينتهي العرض خلال:")</h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormHasCountdown(!formHasCountdown)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        formHasCountdown
                          ? 'bg-amber-500 text-neutral-950 font-black'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {formHasCountdown ? 'العداد مفعل' : 'العداد معطل'}
                    </button>
                  </div>

                  {formHasCountdown && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-neutral-300">نص تسمية العداد التنازلي</label>
                          <input
                            type="text"
                            value={formCountdownLabelAr}
                            onChange={(e) => setFormCountdownLabelAr(e.target.value)}
                            placeholder="ينتهي العرض خلال:"
                            className="w-full px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-neutral-300">نوع توقيت العداد التنازلي</label>
                          <select
                            value={formCountdownType}
                            onChange={(e) => setFormCountdownType(e.target.value as any)}
                            className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                          >
                            <option value="daily_recurring">عداد متكرر يومي (Daily Flash Loop)</option>
                            <option value="fixed_datetime">موعد وتاريخ انتهاء محدد بدقة (Fixed Expiry)</option>
                          </select>
                        </div>
                      </div>

                      {formCountdownType === 'daily_recurring' ? (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-neutral-300">مدة دورة العرض بالساعات</label>
                          <div className="flex items-center gap-2">
                            {[1, 2, 4, 8, 12, 24].map((h) => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => setFormCountdownHours(h)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer ${
                                  formCountdownHours === h
                                    ? 'bg-amber-500 text-neutral-950 font-black'
                                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                                }`}
                              >
                                {h} ساعة
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-neutral-300">تاريخ ووقت انتهاء العرض بالضبط</label>
                          <input
                            type="datetime-local"
                            value={formCountdownEndDateTime}
                            onChange={(e) => setFormCountdownEndDateTime(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none font-mono"
                          />
                          <p className="text-[10px] text-neutral-400">
                            سيحسب الموقع الساعات والدقائق والثواني المتبقية بدقة فائقة حتى حلول هذا الموعد.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 4: Target Action & Category */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                  <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>زر الإجراء والوجهة عند ضغط العميل</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-300">نص زر الطلب (CTA)</label>
                      <input
                        type="text"
                        value={formCtaTextAr}
                        onChange={(e) => setFormCtaTextAr(e.target.value)}
                        placeholder="مثال: اطلب وجبتك الحادقة"
                        className="w-full px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-300">القسم المرتبط عند الضغط</label>
                      <select
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                      >
                        <option value="">فتح سلة الطلبات مباشرة</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            الانتقال لقسم: {c.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
                  {editingOffer ? (
                    <button
                      type="button"
                      onClick={() => setOfferToDelete(editingOffer)}
                      className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف هذا العرض</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/25 border border-amber-400 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                          <span>جاري الحفظ والتطبيق...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-neutral-950" />
                          <span>{editingOffer ? 'حفظ التعديلات' : 'نشر العرض الآن'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {offerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm dir-rtl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-neutral-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">تأكيد حذف العرض الترويجي</h3>
                  <p className="text-xs text-neutral-400">سيتم الحذف فوراً والتحديث المباشر للموقع</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                <img
                  src={offerToDelete.imageUrl}
                  alt={offerToDelete.titleAr}
                  className="w-16 h-12 rounded-lg object-cover border border-neutral-800 shrink-0"
                />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-white line-clamp-1">{offerToDelete.titleAr}</p>
                  <p className="text-neutral-400 text-[11px] line-clamp-1">{offerToDelete.subtitleAr}</p>
                </div>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                هل أنت متأكد من حذف هذا العرض نهائياً من خانة العروض بالصفحة الرئيسية؟
              </p>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOfferToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleConfirmDelete(offerToDelete)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 text-white" />
                      <span>حذف فوري الآن</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm dir-rtl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-400">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">استعادة العروض الافتراضية</h3>
                  <p className="text-xs text-neutral-400">إعادة تعيين بنرات بامبورينا الأصلية الثلاثة</p>
                </div>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                سيتم استعادة عروض بامبورينا الثلاثة الأصلية (كحك العيد، كشري المانجو واللوتس، الكريب والشاورما المكس) وتفعيل خانة العروض.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleResetToDefaults}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                      <span>جاري الاستعادة...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-neutral-950 stroke-[3]" />
                      <span>تأكيد الاستعادة</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
