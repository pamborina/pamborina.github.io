import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle2,
  Phone,
  User,
  MapPin,
  Building,
  Navigation,
  FileText,
  Send,
  ShieldCheck,
  Check,
  Store,
  Sparkles,
  Loader2,
  Wallet,
  Smartphone,
  Truck,
  Copy,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { CartItem, Branch } from '../../types';
import { formatPrice } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { branchService } from '../../services/branchService';
import { orderService } from '../../services/orderService';
import { analyticsService } from '../../services/analyticsService';
import { storageService } from '../../services/storageService';
import { useSiteSettings } from '../../context/SiteSettingsContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  selectedBranch?: Branch | null;
  branches?: Branch[];
  onOrderSuccess: (orderData: any) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  selectedBranch,
  branches,
  onOrderSuccess,
}) => {
  const { showToast } = useToast();
  const {
    isStoreOpen,
    temporaryClosureReasonAr,
    minOrderAmount,
    defaultDeliveryFee,
    customerServicePhone,
    customerServiceWhatsApp,
    phone: sitePhone,
    whatsapp: siteWhatsapp,
  } = useSiteSettings();

  const branchesList = branches || branchService.getBranchesSync();
  const defaultBranch = selectedBranch || branchService.getSelectedBranch() || branchesList[0];

  // Guest Customer Form Fields
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [chosenBranch, setChosenBranch] = useState<Branch | null>(defaultBranch);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vodafone_instapay'>('cod');

  // GPS State
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any>(null);
  const [whatsappLink, setWhatsappLink] = useState<string>('');

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = orderType === 'pickup' ? 0 : 0; // Fixed: Delivery fee is 0 in the system, handled via WhatsApp
  const grandTotal = subtotal + deliveryFee;
  const isBelowMinOrder = minOrderAmount > 0 && subtotal < minOrderAmount;

  // Track checkout opened
  React.useEffect(() => {
    if (isOpen && cartItems.length > 0) {
      analyticsService.trackCheckoutStarted(cartItems.length, subtotal);
      storageService.logActivity('أدخل صفحة الشراء', `عدد العناصر: ${cartItems.length}`);
    }
  }, [isOpen, cartItems.length, subtotal]);

  // Synchronize chosenBranch with updated branch details/selection
  React.useEffect(() => {
    if (isOpen) {
      const activeList = branches || branchService.getBranchesSync();
      const current = selectedBranch || branchService.getSelectedBranch() || activeList[0];
      if (current) {
        const matched = activeList.find((b) => b.id === current.id) || current;
        setChosenBranch(matched);
      }
    }
  }, [isOpen, selectedBranch, branches]);

  // Copy Vodafone Cash number handler
  const handleCopyVodafoneNumber = () => {
    const cashNumber = customerServicePhone || sitePhone || '';
    try {
      navigator.clipboard.writeText(cashNumber);
      showToast('تم نسخ الرقم بنجاح 📋', `رقم تحويل فودافون كاش: ${cashNumber}`, 'success');
    } catch {
      showToast('رقم فودافون كاش', cashNumber, 'info');
    }
  };

  // Handle GPS location click
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('تحديد الموقع غير مدعوم في متصفحك.');
      return;
    }

    setIsGettingGps(true);
    setGpsStatus(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingGps(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const url = `https://maps.google.com/?q=${lat},${lng}`;
        setLocationUrl(url);
        setGpsStatus('تم التقاط رابط الموقع الجغرافي بنجاح! 📍');

        // Automatically pick nearest branch if not picked
        const nearest = branchService.findNearestBranch(lat, lng);
        if (nearest && nearest.branch) {
          setChosenBranch(nearest.branch);
        }
      },
      (err) => {
        setIsGettingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('تم رفض الإذن. يمكنك كتابة العنوان يدوياً.');
        } else {
          setGpsStatus('تعذر تحديد الموقع بدقة، يرجى كتابة العنوان.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const hasUnavailableItems = cartItems.some(
    (ci) => ci.product.isAvailable === false || ci.product.available === false
  );

  // Submit Handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isStoreOpen) {
      showToast('المتجر مغلق مؤقتاً', temporaryClosureReasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..', 'error');
      return;
    }

    if (isBelowMinOrder) {
      showToast('الحد الأدنى للطلب', `الحد الأدنى للطلب هو ${formatPrice(minOrderAmount)}. إجمالي طلبك الحالي ${formatPrice(subtotal)}`, 'error');
      return;
    }

    if (hasUnavailableItems) {
      showToast(
        'أصناف غير متوفرة',
        'توجد أصناف غير متوفرة حالياً في سلتك. يرجى حذفها لإتمام الطلب بنجاح.',
        'error'
      );
      return;
    }

    if (!chosenBranch) {
      showToast('اختيار الفرع مطلوب', 'يرجى تحديد فرع الطلب لإكمال الطلب', 'error');
      return;
    }

    const selectedPaymentLabel =
      paymentMethod === 'cod'
        ? (orderType === 'pickup' ? '💵 كاش عند الاستلام بالفرع' : '💵 كاش عند الاستلام')
        : '📱 تحويل فودافون كاش / انستا باي (إرفاق إشعار التحويل)';

    setIsSubmitting(true);

    try {
      const result = await orderService.submitGuestOrder(
        {
          customerName,
          customerPhone,
          orderType,
          address: orderType === 'pickup' ? `استلام من الفرع (${chosenBranch.nameAr})` : address,
          landmark,
          locationUrl,
          selectedBranch: chosenBranch,
          paymentMethodAr: selectedPaymentLabel,
          notes,
        },
        cartItems,
        subtotal,
        deliveryFee
      );

      if (!result.success) {
        setIsSubmitting(false);
        showToast('خطأ في البيانات', result.errorMsgAr || 'يرجى مراجعة الحقول المطلوبة', 'error');
        return;
      }

      setIsSubmitting(false);
      setIsSuccess(true);
      setSubmittedOrder(result.order);
      setWhatsappLink(result.whatsappUrl || '');
      onOrderSuccess(result.order);
      showToast('تم إرسال الطلب بنجاح', 'تم حفظ الطلب وفتح الواتساب للتأكيد 🚀', 'success');
    } catch (err) {
      setIsSubmitting(false);
      showToast('خطأ في الاتصال', 'تعذر إتمام الطلب، يرجى المحاولة مرة أخرى', 'error');
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md dir-rtl overflow-y-auto">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isSuccess ? handleResetAndClose : onClose}
            className="fixed inset-0 bg-black/75"
          />

          {/* Checkout Card - Responsive Width */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-full max-w-lg md:max-w-4xl max-h-[92vh] bg-[#160E09] border border-[#2D2017] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden z-10 text-[#FFF1C5]"
          >
            {/* Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-[#2C1F16] bg-[#120B07] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={isSuccess ? handleResetAndClose : onClose}
                  className="w-9 h-9 rounded-full bg-[#221710] border border-[#3D2C1E] flex items-center justify-center text-[#C8BFB0] hover:text-[#FFF1C5] hover:border-[#D4AF37] transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-base sm:text-xl font-black text-[#FFF1C5] font-heading flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                    <span>إتمام طلب الشراء الفوري</span>
                  </h2>
                  <p className="text-xs text-[#A89C8C] mt-0.5">طلب سريع ومباشر عبر الواتساب</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold hidden sm:inline-flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>تأكيد فوري بالواتساب</span>
              </span>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#3D2C1E]">
              {isSuccess ? (
                /* SUCCESS VIEW - Direct Order Received & WhatsApp Redirection */
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-8 px-4 text-center space-y-6 my-auto max-w-lg mx-auto"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-1 mx-auto shadow-[0_0_45px_rgba(16,185,129,0.5)] flex items-center justify-center"
                  >
                    <div className="w-full h-full rounded-full bg-[#160E09] flex items-center justify-center">
                      <CheckCircle2 className="w-14 h-14 text-emerald-400 stroke-[2]" />
                    </div>
                  </motion.div>

                  <div className="space-y-3">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-black text-sm shadow-sm">
                      تم استلام طلبك وجاري التحضير 🎉
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-[#FFF1C5] font-heading">
                      شكراً لك، {customerName || 'عميلنا العزيز'}!
                    </h3>
                    <p className="text-sm text-[#D8CFB8] max-w-md mx-auto leading-relaxed">
                      تم استلام طلبك بنجاح وجاري تحضيره في الفرع الآن. يمكنك الانتقال مباشرة لمحادثة الواتساب للتأكيد الفوري والمتابعة.
                    </p>
                  </div>

                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:shadow-[0_15px_35px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Send className="w-5 h-5" />
                      <span>الانتقال إلى الواتساب لتأكيد الطلب 💬</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="w-full py-3.5 rounded-2xl bg-[#2A1D13] border border-[#3D2C1E] text-[#FFF1C5] text-xs font-bold hover:bg-[#38271A] hover:text-white transition-colors cursor-pointer"
                  >
                    تصفح المزيد من الأصناف
                  </button>
                </motion.div>
              ) : (
                /* GUEST CHECKOUT FORM VIEW */
                <form id="guest-checkout-form" onSubmit={handleSubmitOrder} className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column (Desktop 7 cols): Inputs */}
                  <div className="md:col-span-7 space-y-6">
                    
                    {/* Store Closure Alert */}
                    {!isStoreOpen && (
                      <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-3">
                        <Store className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <strong className="block font-bold text-sm text-rose-300 mb-0.5">المتجر مغلق مؤقتاً</strong>
                          <span>{temporaryClosureReasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..'}</span>
                        </div>
                      </div>
                    )}

                    {/* Minimum Order Alert */}
                    {isBelowMinOrder && (
                      <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          الحد الأدنى للطلب هو <strong className="text-white">{formatPrice(minOrderAmount)}</strong>. يتبقى لك <strong className="text-white">{formatPrice(minOrderAmount - subtotal)}</strong> لإكمال الطلب.
                        </span>
                      </div>
                    )}

                    {/* 1. ORDER TYPE SELECTION (Delivery vs Pickup) */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-[#D4AF37]" />
                        <span>1. خيار استلام الطلب *</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Option 1: Delivery */}
                        <div
                          onClick={() => setOrderType('delivery')}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 relative ${
                            orderType === 'delivery'
                              ? 'bg-[#2A1E14] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] ring-1 ring-[#D4AF37]'
                              : 'bg-[#120B07] border-[#3D2C1E] hover:border-[#8E8373]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-[#FFF1C5] flex items-center gap-2">
                              <Truck className={`w-4 h-4 ${orderType === 'delivery' ? 'text-[#D4AF37]' : 'text-[#8E8373]'}`} />
                              <span>توصيل للمنزل (دليفري)</span>
                            </span>
                            {orderType === 'delivery' ? (
                              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full border border-[#3D2C1E] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#A89C8C] leading-snug">
                            رسوم التوصيل: تحدد من خلال الفرع عبر الواتساب
                          </p>
                        </div>

                        {/* Option 2: Pickup from Branch */}
                        <div
                          onClick={() => setOrderType('pickup')}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 relative ${
                            orderType === 'pickup'
                              ? 'bg-[#2A1E14] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] ring-1 ring-[#D4AF37]'
                              : 'bg-[#120B07] border-[#3D2C1E] hover:border-[#8E8373]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-[#FFF1C5] flex items-center gap-2">
                              <Store className={`w-4 h-4 ${orderType === 'pickup' ? 'text-[#D4AF37]' : 'text-[#8E8373]'}`} />
                              <span>استلام من الفرع (تيك أواي)</span>
                            </span>
                            {orderType === 'pickup' ? (
                              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full border border-[#3D2C1E] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#A89C8C] leading-snug">
                            تستلم طلبك مباشرةً من الفرع (بدون رسوم توصيل).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 2. BRANCH SELECTION */}
                    <div className="space-y-3 pt-2 border-t border-[#2C1F16]">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                          <Store className="w-4 h-4" />
                          <span>2. اختيار الفرع *</span>
                        </h3>
                        {!chosenBranch && (
                          <span className="text-[10px] text-rose-400 font-bold animate-pulse">
                            (مطلوب تحديد الفرع)
                          </span>
                        )}
                      </div>

                      <div className={`grid gap-3 ${branchesList.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                        {branchesList.map((branch, idx) => {
                          const isSelected = chosenBranch?.id === branch.id;
                          return (
                            <div
                              key={`${branch.id}-${idx}`}
                              onClick={() => {
                                setChosenBranch(branch);
                                branchService.setSelectedBranch(branch.id);
                              }}
                              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 relative ${
                                isSelected
                                  ? 'bg-[#2A1E14] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] ring-1 ring-[#D4AF37]'
                                  : 'bg-[#120B07] border-[#3D2C1E] hover:border-[#8E8373]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-[#FFF1C5] font-heading flex items-center gap-1.5">
                                  <Store className={`w-4 h-4 ${isSelected ? 'text-[#D4AF37]' : 'text-[#8E8373]'}`} />
                                  {branch.nameAr}
                                </span>
                                {isSelected ? (
                                  <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </span>
                                ) : (
                                  <span className="w-5 h-5 rounded-full border border-[#3D2C1E]" />
                                )}
                              </div>

                              <p className="text-[11px] text-[#A89C8C] leading-snug line-clamp-2">
                                {branch.addressAr}
                              </p>

                              <div className="pt-2 border-t border-[#2C1F16]/60 flex items-center justify-between text-[11px]">
                                <span className="text-[#D4AF37] font-bold dir-ltr">
                                  📱 {branch.phone}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. CUSTOMER PERSONAL INFO */}
                    <div className="space-y-3 pt-2 border-t border-[#2C1F16]">
                      <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        <span>3. بيانات العميل والتواصل *</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#C8BFB0] block">الاسم الكريم *</label>
                          <div className="relative">
                            <User className="w-4 h-4 text-[#8E8373] absolute right-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              required
                              placeholder="مثال: محمد أحمد"
                              className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#120B07] border border-[#3D2C1E] text-xs text-[#FFF1C5] focus:border-[#D4AF37] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#C8BFB0] block">رقم الهاتف *</label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-[#8E8373] absolute right-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="tel"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              required
                              placeholder="010XXXXXXXX"
                              className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#120B07] border border-[#3D2C1E] text-xs text-[#FFF1C5] focus:border-[#D4AF37] focus:outline-none dir-ltr text-right"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. DELIVERY ADDRESS OR PICKUP INFO */}
                    <div className="space-y-3 pt-2 border-t border-[#2C1F16]">
                      {orderType === 'delivery' ? (
                        <>
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              <span>4. عنوان التوصيل والمعالم *</span>
                            </h3>

                            <button
                              type="button"
                              onClick={handleGetGpsLocation}
                              disabled={isGettingGps}
                              className="px-2.5 py-1 rounded-lg bg-[#25170E] border border-[#D4AF37]/60 text-[#F4E08B] text-[11px] font-bold flex items-center gap-1 hover:bg-[#332014] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isGettingGps ? (
                                <Loader2 className="w-3 h-3 animate-spin text-[#D4AF37]" />
                              ) : (
                                <Navigation className="w-3 h-3 text-[#D4AF37]" />
                              )}
                              <span>تحديد موقعي الـ GPS</span>
                            </button>
                          </div>

                          <div className="p-3 rounded-xl bg-[#22170F] border border-[#D4AF37]/40 text-[#F4E08B] text-xs flex items-center gap-2">
                            <Truck className="w-4 h-4 text-[#D4AF37] shrink-0" />
                            <span className="leading-relaxed">
                              💡 <strong>سعر التوصيل:</strong> يتم تحديده بواسطة الفرع عبر الواتساب بعد إرسال الطلب بناءً على مكان التوصيل وعدد الكيلومترات.
                            </span>
                          </div>

                          {gpsStatus && (
                            <p className="text-[11px] text-[#F4E08B] font-bold bg-[#1E130B] p-2 rounded-xl border border-[#3D2C1E]">
                              {gpsStatus}
                            </p>
                          )}

                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-[#C8BFB0] block">العنوان بالتفصيل *</label>
                              <div className="relative">
                                <Building className="w-4 h-4 text-[#8E8373] absolute right-3 top-3" />
                                <textarea
                                  value={address}
                                  onChange={(e) => setAddress(e.target.value)}
                                  required={orderType === 'delivery'}
                                  rows={2}
                                  placeholder="اسم الشارع، رقم المبنى، رقم الدور وشقة والتفاصيل"
                                  className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#120B07] border border-[#3D2C1E] text-xs text-[#FFF1C5] focus:border-[#D4AF37] focus:outline-none resize-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#C8BFB0] block">أقرب علامة مميزة</label>
                                <div className="relative">
                                  <Navigation className="w-4 h-4 text-[#8E8373] absolute right-3 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    value={landmark}
                                    onChange={(e) => setLandmark(e.target.value)}
                                    placeholder="مثال: بجوار مستشفى الإسلامية أو مسجد العلي"
                                    className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#120B07] border border-[#3D2C1E] text-xs text-[#FFF1C5] focus:border-[#D4AF37] focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#C8BFB0] block">ملاحظات الطلب (اختياري)</label>
                                <div className="relative">
                                  <FileText className="w-4 h-4 text-[#8E8373] absolute right-3 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="مثال: زيادة صوص المانجو، عدم الاتصال بالجرس"
                                    className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#120B07] border border-[#3D2C1E] text-xs text-[#FFF1C5] focus:border-[#D4AF37] focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* PICKUP INFORMATION CARD */
                        <div className="p-4 rounded-2xl bg-[#1F150D] border border-[#D4AF37]/50 space-y-2 text-xs">
                          <h4 className="font-extrabold text-[#D4AF37] flex items-center gap-2">
                            <Store className="w-4 h-4" />
                            <span>تعليمات ومكان الاستلام من الفرع:</span>
                          </h4>
                          <p className="text-[#FFF1C5] font-bold">
                            📍 الفرع المحدد: {chosenBranch?.nameAr}
                          </p>
                          <p className="text-[#C8BFB0] leading-relaxed">
                            {chosenBranch?.addressAr}
                          </p>
                          <div className="pt-2 border-t border-[#3D2C1E] flex items-center justify-between text-[11px] text-[#F4E08B]">
                            <span>⏱️ جاهز للاستلام خلال: 15 - 20 دقيقة</span>
                            <span>🎉 بدون أي رسوم توصيل</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 5. PAYMENT METHOD SELECTION & INSTRUCTIONS */}
                    <div className="space-y-3 pt-2 border-t border-[#2C1F16]">
                      <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet className="w-4 h-4" />
                        <span>5. طريقة الدفع المتاحة *</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Option 1: Cash on Delivery / Branch */}
                        <div
                          onClick={() => setPaymentMethod('cod')}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5 relative ${
                            paymentMethod === 'cod'
                              ? 'bg-[#2A1E14] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] ring-1 ring-[#D4AF37]'
                              : 'bg-[#120B07] border-[#3D2C1E] hover:border-[#8E8373]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-[#FFF1C5] flex items-center gap-1.5">
                              <span>💵</span>
                              <span>{orderType === 'pickup' ? 'كاش عند الاستلام بالفرع' : 'كاش عند الاستلام (دليفري)'}</span>
                            </span>
                            {paymentMethod === 'cod' ? (
                              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full border border-[#3D2C1E] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#A89C8C] leading-snug">
                            {orderType === 'pickup' ? 'الدفع نقداً بالفرع عند تسلم الطلب.' : 'الدفع نقداً للمندوب فور تسلم الطلب.'}
                          </p>
                        </div>

                        {/* Option 2: Vodafone Cash / InstaPay */}
                        <div
                          onClick={() => setPaymentMethod('vodafone_instapay')}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5 relative ${
                            paymentMethod === 'vodafone_instapay'
                              ? 'bg-[#2A1E14] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] ring-1 ring-[#D4AF37]'
                              : 'bg-[#120B07] border-[#3D2C1E] hover:border-[#8E8373]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-[#FFF1C5] flex items-center gap-1.5">
                              <span>📱</span>
                              <span>تحويل فودافون كاش / انستا باي</span>
                            </span>
                            {paymentMethod === 'vodafone_instapay' ? (
                              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full border border-[#3D2C1E] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#A89C8C] leading-snug">
                            تحويل إلكتروني مباشر عبر المحفظة أو InstaPay.
                          </p>
                        </div>
                      </div>

                      {/* VODAFONE CASH GUIDANCE & INSTRUCTIONS BOX */}
                      {paymentMethod === 'vodafone_instapay' && (
                        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#24170E] to-[#1A1009] border border-[#D4AF37] shadow-[0_4px_25px_rgba(212,175,55,0.15)] space-y-3 text-xs text-[#FFF1C5]">
                          <div className="flex items-center justify-between pb-2 border-b border-[#3D2C1E]">
                            <span className="font-extrabold text-[#F4E08B] flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                              <span>إرشادات تحويل فودافون كاش / InstaPay:</span>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-bold text-[10px]">
                              خطوات مرتبة
                            </span>
                          </div>

                          {/* Important Notice Before Transfer */}
                          <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/50 text-amber-200 text-[11px] flex items-start gap-2 leading-relaxed">
                            <span className="text-sm leading-none mt-0.5">⚠️</span>
                            <div>
                              <strong className="text-[#F4E08B] font-bold block mb-0.5">تنبيه هام جداً قبل التحويل:</strong>
                              <span>لا تقم بتحويل أي مبلغ الآن. سيتم تحديد إجمالي الطلب شاملاً مصاريف التوصيل من خلال الفرع بعد إرسال الطلب عبر الواتساب.</span>
                            </div>
                          </div>

                          {/* Number & Copy Button */}
                          <div className="p-3 rounded-xl bg-[#120B07] border border-[#3D2C1E] flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] text-[#A89C8C] block">رقم محفظة التحويل (فودافون كاش / InstaPay)</span>
                              <span className="text-base font-black text-[#F4E08B] font-mono tracking-wider dir-ltr inline-block">
                                {customerServicePhone || sitePhone || ''}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={handleCopyVodafoneNumber}
                              className="px-3 py-1.5 rounded-xl bg-[#2A1E14] hover:bg-[#38271A] border border-[#D4AF37]/60 text-[#F4E08B] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                            >
                              <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>نسخ الرقم</span>
                            </button>
                          </div>

                          {/* Step-by-step instructions in strict logical order */}
                          <div className="space-y-2.5 text-[11px] text-[#C8BFB0] leading-relaxed pr-1">
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                                1
                              </span>
                              <p>
                                اضغط أولاً على زر <strong className="text-[#F4E08B]">"تأكيد الطلب عبر الواتساب"</strong> بالأسفل لإرسال تفاصيل طلبك وعنوانك إلى الفرع.
                              </p>
                            </div>

                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                                2
                              </span>
                              <p>
                                انتظر رد الفرع على الواتساب لتأكيد توفر الطلب وحساب <strong className="text-[#F4E08B]">رسوم التوصيل بدقة</strong> وتحديد <strong className="text-[#F4E08B]">الإجمالي النهائي</strong>.
                              </p>
                            </div>

                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                                3
                              </span>
                              <p>
                                بعد معرفة الإجمالي النهائي من الفرع، قم بتحويل المبلغ المحدد إلى رقم المحفظة: <strong className="text-white font-mono dir-ltr inline-block">{customerServicePhone || sitePhone || ''}</strong> عبر فودافون كاش أو تطبيق InstaPay.
                              </p>
                            </div>

                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                                4
                              </span>
                              <p>
                                التقط <strong className="text-[#F4E08B]">لقطة شاشة (Screenshot)</strong> لإشعار التحويل الناجح وأرسلها في نفس محادثة الواتساب لتأكيد خروج الطلب فوراً.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (Desktop 5 cols): Summary & Pricing */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="p-4 rounded-2xl bg-[#1F150D] border border-[#2D2017] space-y-3 text-xs sticky top-0">
                      <h4 className="font-black text-[#FFF1C5] pb-2 border-b border-[#2C1F16] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                          <span>مراجعة الأصناف ({cartItems.length}):</span>
                        </span>
                        <span className="text-[#F4E08B] font-extrabold">{formatPrice(grandTotal)}</span>
                      </h4>

                      <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                        {cartItems.map((ci, ciIdx) => {
                          const isItemAvail =
                            ci.product.isAvailable !== undefined
                              ? ci.product.isAvailable
                              : ci.product.available !== undefined
                              ? ci.product.available
                              : true;

                          return (
                            <div
                              key={`${ci.id}-${ciIdx}`}
                              className={`flex items-center justify-between p-1.5 rounded-xl ${
                                !isItemAvail ? 'bg-rose-950/30 border border-rose-500/40 text-rose-300' : 'text-[#C8BFB0]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="line-clamp-1">
                                  • {ci.product.nameAr} {ci.selectedVariant ? `(${ci.selectedVariant.nameAr})` : ''} × {ci.quantity}
                                </span>
                                {!isItemAvail && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 font-bold shrink-0">
                                    غير متوفر
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-[#FFF1C5] shrink-0 mr-2">
                                {formatPrice(ci.totalPrice)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-[#2C1F16] space-y-1.5 text-[11px] text-[#A89C8C]">
                        <div className="flex justify-between items-center">
                          <span>طريقة الاستلام:</span>
                          <span className="font-bold text-[#F4E08B]">
                            {orderType === 'pickup' ? '🏪 استلام من الفرع' : '🛵 توصيل للمنزل'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span>المجموع الفرعي:</span>
                          <span className="font-bold text-[#FFF1C5]">{formatPrice(subtotal)}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span>رسوم التوصيل:</span>
                          <span className="font-bold text-[#F4E08B] text-[11px]">
                            تحدد بناءً على المسافة عبر الواتساب
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span>طريقة الدفع:</span>
                          <span className="font-bold text-[#F4E08B]">
                            {paymentMethod === 'cod'
                              ? (orderType === 'pickup' ? '💵 كاش بالفرع' : '💵 كاش عند الاستلام')
                              : '📱 فودافون كاش / انستا باي'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#2C1F16] space-y-1">
                        <div className="flex justify-between items-center text-sm font-black text-[#FFF1C5]">
                          <span>إجمالي الطلب:</span>
                          <span className="text-xl font-black text-[#F4E08B] font-heading">{formatPrice(grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer Submit Button */}
            {!isSuccess && (
              <div className="shrink-0 p-4 sm:p-5 border-t border-[#2C1F16] bg-[#120B07] flex items-center justify-between gap-4 z-20">
                <div>
                  <span className="text-[10px] text-[#8E8373] block">المبلغ الإجمالي النهائي</span>
                  <span className="text-xl sm:text-2xl font-black text-[#F4E08B] font-heading">
                    {formatPrice(grandTotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  form="guest-checkout-form"
                  disabled={isSubmitting || hasUnavailableItems || !isStoreOpen || isBelowMinOrder}
                  className="px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base shadow-[0_4px_30px_rgba(16,185,129,0.35)] hover:brightness-110 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  {isSubmitting ? (
                    <span>جاري تحضير الرسالة...</span>
                  ) : !isStoreOpen ? (
                    <span>المتجر مغلق مؤقتاً 🚫</span>
                  ) : isBelowMinOrder ? (
                    <span>الطلب أقل من الحد الأدنى</span>
                  ) : hasUnavailableItems ? (
                    <span>يوجد أصناف غير متوفرة بالسلة</span>
                  ) : (
                    <>
                      <Send className="w-5 h-5 text-white stroke-[2.5]" />
                      <span>تأكيد الطلب عبر الواتساب</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

