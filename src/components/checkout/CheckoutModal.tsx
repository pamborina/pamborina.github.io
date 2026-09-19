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
  Package,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { CartItem, Branch } from '../../types';
import { formatPrice } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { copyToClipboard } from '../../utils/clipboard';
import { branchService } from '../../services/branchService';
import { orderService } from '../../services/orderService';
import { deliveryFeeService } from '../../services/deliveryFeeService';
import { analyticsService } from '../../services/analyticsService';
import { storageService } from '../../services/storageService';
import { customerOrderStorage } from '../../services/customerOrderStorage';
import { getAccurateNow } from '../../utils/dateFormatter';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { useModalBackHandler } from '../../hooks/useModalBackHandler';
import { phoneUtils } from '../../utils/phoneUtils';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  selectedBranch?: Branch | null;
  branches?: Branch[];
  onOrderSuccess: (orderData: any) => void;
  onOpenOrderTracking?: (orderNumber: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  selectedBranch,
  branches,
  onOrderSuccess,
  onOpenOrderTracking,
}) => {
  // Intercept phone / browser back button to close Checkout modal without exiting the site
  useModalBackHandler(isOpen, onClose, 'checkout');

  const { showToast } = useToast();
  const {
    isStoreOpen,
    temporaryClosureReasonAr,
    minOrderAmount,
    defaultDeliveryFee,
    isDeliveryAvailable,
    deliveryDisabledReasonAr,
    complaintsWhatsApp,
    complaintsPhone,
    customerServicePhone,
    customerServiceWhatsApp,
    phone: sitePhone,
    whatsapp: siteWhatsapp,
  } = useSiteSettings();

  const branchesList = branches || branchService.getBranchesSync();
  const defaultBranch = selectedBranch || branchService.getSelectedBranch() || branchesList[0];

  // Guest Customer Form Fields
  const [chosenBranch, setChosenBranch] = useState<Branch | null>(defaultBranch);

  // Delivery Availability Computation (Global + Selected Branch)
  const isBranchDeliveryOpen = chosenBranch ? chosenBranch.isDeliveryAvailable !== false : true;
  const isEffectiveDeliveryAvailable = isDeliveryAvailable && isBranchDeliveryOpen;
  const effectiveDeliveryDisabledReasonAr =
    (!isBranchDeliveryOpen && chosenBranch?.deliveryDisabledReasonAr)
      ? chosenBranch.deliveryDisabledReasonAr
      : (deliveryDisabledReasonAr || 'عذراً، خدمة التوصيل المنزلي معطلة مؤقتاً بقرار الإدارة. متاح الاستلام من الفرع فقط.');

  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>(() => {
    return isEffectiveDeliveryAvailable ? 'delivery' : 'pickup';
  });

  // Automatically switch to pickup whenever delivery is disabled
  React.useEffect(() => {
    if (!isEffectiveDeliveryAvailable && orderType === 'delivery') {
      setOrderType('pickup');
    }
  }, [isEffectiveDeliveryAvailable, orderType]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
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
  const [isCopiedOrderNum, setIsCopiedOrderNum] = useState(false);
  const [vodafoneCopied, setVodafoneCopied] = useState(false);

  const handleCopyOrderNumber = async (num: string) => {
    if (!num) return;
    const success = await copyToClipboard(num);
    setIsCopiedOrderNum(true);
    if (success) {
      showToast('تم نسخ رقم الطلب بنجاح ✓', num, 'success');
    } else {
      showToast('رقم الطلب:', num, 'info');
    }
    setTimeout(() => setIsCopiedOrderNum(false), 3000);
  };

  // Delivery Fee Subscription
  const [deliveryConfig, setDeliveryConfig] = useState(() => deliveryFeeService.getDeliveryFeeConfigSync());
  React.useEffect(() => {
    return deliveryFeeService.subscribeToDeliveryFeeConfig((cfg) => {
      setDeliveryConfig(cfg);
    });
  }, []);

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const freeDeliveryThreshold = deliveryConfig.freeDeliveryThreshold || 200;
  const isFreeDeliveryQualified = freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold;

  // Delivery fee is NEVER shown as free for home delivery until administration sets it based on distance & kilometers
  const deliveryFee = 0;
  const grandTotal = subtotal;
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
  const handleCopyVodafoneNumber = async () => {
    const cashNumber = customerServicePhone || sitePhone || '';
    const success = await copyToClipboard(cashNumber);
    if (success) {
      showToast('تم نسخ الرقم بنجاح 📋', `رقم تحويل فودافون كاش: ${cashNumber}`, 'success');
    } else {
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

    if (orderType === 'delivery' && !isEffectiveDeliveryAvailable) {
      showToast('خدمة التوصيل غير متاحة', effectiveDeliveryDisabledReasonAr, 'error');
      setOrderType('pickup');
      return;
    }

    const selectedPaymentLabel =
      paymentMethod === 'cod'
        ? (orderType === 'pickup' ? '💵 كاش عند الاستلام بالفرع' : '💵 كاش عند الاستلام')
        : '📱 تحويل فودافون كاش / انستا باي (إرفاق إشعار التحويل)';

    const guestDetails = {
      customerName,
      customerPhone,
      orderType,
      address: orderType === 'pickup' ? `استلام من الفرع (${chosenBranch.nameAr})` : address,
      landmark,
      locationUrl,
      selectedBranch: chosenBranch,
      paymentMethodAr: selectedPaymentLabel,
      notes,
    };

    // 1. Fast synchronous client validation before initiating any tab or network operation
    const validation = orderService.validateGuestCheckout(guestDetails, cartItems);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0] || 'يرجى مراجعة الحقول المطلوبة';
      showToast('خطأ في البيانات', firstError, 'error');
      return;
    }

    // 2. Open new blank tab synchronously during the user's click gesture (bypasses browser popup blockers)
    let whatsappWindow: Window | null = null;
    try {
      whatsappWindow = window.open('', '_blank');
    } catch {
      whatsappWindow = null;
    }

    setIsSubmitting(true);

    try {
      const result = await orderService.submitGuestOrder(
        guestDetails,
        cartItems,
        subtotal,
        deliveryFee
      );

      if (!result.success) {
        setIsSubmitting(false);
        if (whatsappWindow && !whatsappWindow.closed) {
          try { whatsappWindow.close(); } catch {}
        }
        showToast('خطأ في البيانات', result.errorMsgAr || 'يرجى مراجعة الحقول المطلوبة', 'error');
        return;
      }

      setIsSubmitting(false);
      
      const finalWhatsappUrl = result.whatsappUrl || '';

      // 3. Direct the new tab to the generated WhatsApp conversation URL
      if (finalWhatsappUrl) {
        if (whatsappWindow && !whatsappWindow.closed) {
          try {
            whatsappWindow.location.href = finalWhatsappUrl;
          } catch {
            try {
              window.open(finalWhatsappUrl, '_blank', 'noopener,noreferrer');
            } catch {
              // ignore
            }
          }
        } else {
          // Fallback if popup blocker suppressed the pre-opened window
          try {
            const anchor = document.createElement('a');
            anchor.href = finalWhatsappUrl;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            document.body.appendChild(anchor);
            anchor.click();
            setTimeout(() => {
              try { anchor.remove(); } catch {}
            }, 300);
          } catch {
            window.open(finalWhatsappUrl, '_blank', 'noopener,noreferrer');
          }
        }
      }

      // CRITICAL: NEVER navigate window.location.href! The current site tab must remain open, alive, and functional!

      const assignedNum = result.order?.orderNumber || result.order?.id || '';
      if (assignedNum) {
        try {
          customerOrderStorage.saveOrder({
            orderNumber: assignedNum,
            orderId: result.order?.id,
            customerName: customerName,
            customerPhone: customerPhone,
            total: subtotal + (deliveryFee || 0),
            deliveryFee: deliveryFee || 0,
            itemsCount: cartItems.reduce((acc, it) => acc + (it.quantity || 1), 0),
            itemsSummary: cartItems.map((it) => it.nameAr || it.name).slice(0, 3).join('، '),
            orderType: orderType,
            branchNameAr: chosenBranch.nameAr,
            status: 'pending',
            createdAt: getAccurateNow().toISOString(),
          });
          localStorage.setItem('bamborina_last_order_number', assignedNum);
        } catch (storageErr) {
          // ignore
        }
      }
      
      onOrderSuccess(result.order);
      showToast('تم إرسال الطلب بنجاح 🎉', `تم فتح محادثة الواتساب في نافذة جديدة، ومتابعة الطلب رقم: ${assignedNum}`, 'success');
      
      // 4. Keep this site tab open & functional: close checkout modal and immediately open live order tracking
      handleResetAndClose();
      if (onOpenOrderTracking && assignedNum) {
        onOpenOrderTracking(assignedNum);
      }
    } catch (err) {
      if (whatsappWindow && !whatsappWindow.closed) {
        try { whatsappWindow.close(); } catch {}
      }
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
          {/* Overlay - Prevent accidental dismissal on backdrop click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
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
                  <p className="text-xs text-[#A89C8C] mt-0.5">طلب سريع وتتبع مباشر ومؤكد عبر الموقع</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold hidden sm:inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>طلب مباشر وسريع بالموقع ⚡</span>
              </span>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#3D2C1E]">
              {isSuccess ? (
                /* SUCCESS VIEW - Direct Order Received, Order Number Copying & Live Tracking Guidance */
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-6 px-3 sm:px-4 text-center space-y-5 my-auto max-w-lg mx-auto"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-1 mx-auto shadow-[0_0_45px_rgba(16,185,129,0.5)] flex items-center justify-center"
                  >
                    <div className="w-full h-full rounded-full bg-[#160E09] flex items-center justify-center">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 stroke-[2]" />
                    </div>
                  </motion.div>

                  <div className="space-y-2">
                    <span className="inline-block px-4 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-black text-xs sm:text-sm shadow-sm">
                      تم استلام طلبك بنجاح وجاري المتابعة 🎉
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-[#FFF1C5] font-heading">
                      شكراً لك، {customerName || 'عميلنا العزيز'}!
                    </h3>
                    <p className="text-xs sm:text-sm text-[#D8CFB8] max-w-md mx-auto leading-relaxed">
                      تم إرسال بيانات طلبك إلى نظام الفرع بنجاح. يرجى حفظ رقم الطلب بالأسفل لمتابعة حالته وسعر التوصيل بدقة.
                    </p>
                  </div>

                  {/* PROMINENT ORDER NUMBER & COPY BOX */}
                  {(() => {
                    const orderNum = submittedOrder?.orderNumber || submittedOrder?.id || '';
                    return (
                      <div className="p-4 rounded-2xl bg-gradient-to-b from-[#22160E] to-[#170E08] border-2 border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.2)] text-right space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#C8BFB0] font-bold flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-[#D4AF37]" />
                            <span>رقم الطلب الخاص بك (كود المتابعة):</span>
                          </span>
                          <span className="text-[10px] text-[#D4AF37] bg-[#2E1E12] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                            مهم جداً ⚠️
                          </span>
                        </div>

                        {orderNum && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0D0704] border-2 border-[#D4AF37]/60 shadow-inner">
                              <span className="text-xl sm:text-2xl font-black text-[#F4E08B] font-mono tracking-wider dir-ltr select-all">
                                {orderNum}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyOrderNumber(orderNum)}
                                className={`px-3.5 sm:px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95 ${
                                  isCopiedOrderNum
                                    ? 'bg-emerald-600 text-white shadow-emerald-900/50 scale-105'
                                    : 'bg-gradient-to-r from-amber-400 via-[#D4AF37] to-amber-500 hover:brightness-110 text-neutral-950 animate-pulse'
                                }`}
                              >
                                {isCopiedOrderNum ? (
                                  <>
                                    <Check className="w-4 h-4 text-white" />
                                    <span>تم النسخ بنجاح ✓</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4 text-neutral-950" />
                                    <span>اضغط لنسخ رقم الطلب 📋</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Browser automatic persistence reassurance */}
                            <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-950/40 py-1.5 px-3 rounded-lg border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>تم حفظ طلبك تلقائياً في متصفحك الحالي لسهولة التتبع 📱</span>
                            </div>
                          </div>
                        )}

                        {/* HIGH-PRIORITY ADVISORY BANNER: Emphasizing keeping the order number */}
                        <div className="p-3.5 rounded-xl bg-amber-950/80 border-2 border-amber-500/50 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5 text-right shadow-md">
                          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <strong className="block text-amber-300 font-black text-xs sm:text-sm">
                              تنبيه أساسي: احتفظ برقم الطلب لتتبع حالته!
                            </strong>
                            <p className="text-[11px] sm:text-xs text-amber-100/90 leading-normal">
                              ستحتاج رقم الطلب عند الضغط على <span className="text-white font-black underline bg-amber-900/60 px-1 py-0.5 rounded">«تتبع طلبك»</span> لمعرفة تفاصيل التجهيز ورسوم التوصيل مباشرة.
                            </p>
                          </div>
                        </div>

                        {/* Delivery fee note */}
                        {orderType === 'delivery' && (
                          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#26170D] to-[#170E08] border border-amber-500/40 text-xs text-[#E8DAC8] space-y-1.5">
                            <div className="flex items-center gap-2 text-[#F4E08B] font-bold">
                              <Truck className="w-4 h-4 text-amber-400" />
                              <span>تحديد رسوم التوصيل بناءً على المسافة وعدد الكيلومترات:</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-[#FFF1C5]/90 pr-6">
                              يتم تحديد سعر رسوم التوصيل بناءً على المسافة وعدد الكيلومترات وسيتم تحديدها فوراً من قِبل الإدارة وتنعكس مباشرةً على شاشة تتبع الطلب وتُضاف للفاتورة دون الحاجة لتحديث الصفحة ⚡
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ACTION BUTTONS */}
                  <div className="space-y-3 pt-1">
                    {/* Primary Action: Track Order in Site */}
                    <button
                      type="button"
                      onClick={() => {
                        const num = submittedOrder?.orderNumber || submittedOrder?.id || '';
                        handleResetAndClose();
                        onOpenOrderTracking?.(num);
                      }}
                      className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-[#D4AF37] to-amber-600 hover:brightness-110 text-neutral-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,175,55,0.35)] active:scale-[0.98] transition-all cursor-pointer select-none"
                    >
                      <Package className="w-4 h-4 text-neutral-950 stroke-[2.5] shrink-0" />
                      <span className="whitespace-nowrap">تتبع حالة وتفاصيل الطلب الآن بالموقع</span>
                    </button>

                    {/* Complaints WhatsApp Option */}
                    {(complaintsWhatsApp || siteWhatsapp) && (
                      <a
                        href={phoneUtils.buildWhatsAppUrl(
                          complaintsWhatsApp || siteWhatsapp || '',
                          `⚖️ *قسم الشكاوى والمقترحات بامبورينا*\n━━━━━━━━━━━━━━━━━━━━━━\nالسلام عليكم ورحمة الله وبركاته،\nأود تقديم شكوى أو استفسار بخصوص الطلب رقم: ${submittedOrder?.orderNumber || submittedOrder?.id || ''}`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full min-h-[52px] p-3 sm:px-4 sm:py-3 rounded-2xl bg-[#1D140D] hover:bg-[#2A1B10] border border-amber-500/30 hover:border-amber-400/50 text-[#F4E08B] font-bold text-xs sm:text-sm flex items-center justify-between gap-3 transition-all cursor-pointer shadow-md active:scale-[0.98] select-none"
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                          </div>
                          <div className="text-right min-w-0">
                            <span className="block font-black text-xs sm:text-sm text-[#FFF1C5] leading-tight truncate">
                              قسم الشكاوى والمقترحات بامبورينا
                            </span>
                            <span className="block text-[10px] sm:text-[11px] text-[#A89C8C] font-medium leading-tight mt-0.5 truncate">
                              تواصل معتمد ومباشر مع الإدارة
                            </span>
                          </div>
                        </div>
                        <span className="px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 text-[10px] sm:text-xs font-black shrink-0 flex items-center gap-1 border border-amber-500/30">
                          <span>مراسلة</span>
                          <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </span>
                      </a>
                    )}

                    {/* Return to menu */}
                    <button
                      type="button"
                      onClick={handleResetAndClose}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#261A11] border border-[#3D2C1E] text-[#FFF1C5] text-xs sm:text-sm font-bold hover:bg-[#342417] hover:text-white transition-all cursor-pointer active:scale-[0.98] select-none whitespace-nowrap"
                    >
                      العودة للمنيو وتصفح المزيد من الأصناف
                    </button>
                  </div>
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
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-[#D4AF37]" />
                            <span>1. خيار استلام الطلب *</span>
                          </h3>
                          {!isEffectiveDeliveryAvailable && (
                            <span className="text-[11px] font-bold text-rose-400 bg-rose-950/60 border border-rose-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <span>🚫 التوصيل معطل حالياً</span>
                            </span>
                          )}
                        </div>

                        {/* Disabled Delivery Alert Banner */}
                        {!isEffectiveDeliveryAvailable && (
                          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-[#26160B] to-rose-950/40 border border-amber-500/40 text-xs flex items-start gap-3 shadow-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <div className="font-bold text-[#FFF1C5] flex items-center gap-2">
                                <span>خدمة التوصيل المنزلي معطلة مؤقتاً</span>
                                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                                  بقرار الإدارة
                                </span>
                              </div>
                              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                                {effectiveDeliveryDisabledReasonAr}
                              </p>
                              <div className="text-[10px] text-emerald-400 font-bold pt-0.5 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                <span>تم تحديد الاستلام من الفرع تلقائياً — الطلبات متاحة للاستلام مباشرة بدون رسوم توصيل.</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Option 1: Delivery */}
                          <div
                            onClick={() => {
                              if (!isEffectiveDeliveryAvailable) {
                                showToast(
                                  'خدمة التوصيل غير متاحة مؤقتاً',
                                  effectiveDeliveryDisabledReasonAr,
                                  'warning'
                                );
                                return;
                              }
                              setOrderType('delivery');
                            }}
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 relative ${
                              !isEffectiveDeliveryAvailable
                                ? 'opacity-55 cursor-not-allowed bg-[#140D08]/90 border-[#3D2C1E]/50 select-none grayscale-[25%]'
                                : orderType === 'delivery'
                                ? 'bg-[#2A1E14] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] ring-1 ring-[#D4AF37] cursor-pointer'
                                : 'bg-[#120B07] border-[#3D2C1E] hover:border-[#8E8373] cursor-pointer'
                            }`}
                            title={!isEffectiveDeliveryAvailable ? 'خدمة التوصيل معطلة مؤقتاً من قبل الإدارة' : undefined}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-[#FFF1C5] flex items-center gap-2">
                                <Truck
                                  className={`w-4 h-4 ${
                                    !isEffectiveDeliveryAvailable
                                      ? 'text-rose-400/80'
                                      : orderType === 'delivery'
                                      ? 'text-[#D4AF37]'
                                      : 'text-[#8E8373]'
                                  }`}
                                />
                                <span>توصيل للمنزل (دليفري)</span>
                              </span>
                              {!isEffectiveDeliveryAvailable ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                                  معطل 🚫
                                </span>
                              ) : orderType === 'delivery' ? (
                                <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shrink-0">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-full border border-[#3D2C1E] shrink-0" />
                              )}
                            </div>
                            <p
                              className={`text-[11px] leading-snug font-medium ${
                                !isEffectiveDeliveryAvailable ? 'text-rose-300/80' : 'text-amber-300'
                              }`}
                            >
                              {!isEffectiveDeliveryAvailable
                                ? 'موقوف مؤقتاً من الإدارة — لا يمكن اختياره حالياً'
                                : 'رسوم التوصيل: تحدد بناءً على المسافة والكيلومترات من الإدارة'}
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
                                <div className="flex items-center gap-1.5">
                                  {!isEffectiveDeliveryAvailable && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                      المتاح حالياً ✓
                                    </span>
                                  )}
                                  <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shrink-0">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </span>
                                </div>
                              ) : (
                                <span className="w-5 h-5 rounded-full border border-[#3D2C1E] shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-[#A89C8C] leading-snug">
                              تستلم طلبك مباشرةً من الفرع (بدون رسوم توصيل 0 ج.م).
                            </p>
                          </div>
                        </div>

                        {/* Distance & Delivery Fee Notice for Delivery */}
                        {orderType === 'delivery' && isEffectiveDeliveryAvailable && (
                          <div className="p-3 rounded-2xl bg-[#1C120A] border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
                            <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="leading-relaxed font-medium">
                              يتم تحديد سعر رسوم التوصيل بناءً على المسافة وعدد الكيلومترات وسيتم تحديدها فوراً من قِبل الإدارة وإضافتها للفاتورة.
                            </span>
                          </div>
                        )}

                        {/* Pickup Info Banner when Pickup is selected */}
                        {orderType === 'pickup' && (
                          <div className="p-3 rounded-2xl bg-[#1C140C] border border-[#D4AF37]/30 text-[#FFF1C5] text-xs flex items-center gap-2.5">
                            <Store className="w-4 h-4 text-[#D4AF37] shrink-0" />
                            <span className="leading-relaxed">
                              📍 <strong>الاستلام من الفرع:</strong> يتم تجهيز طلبك في <span className="text-[#D4AF37] font-bold">({chosenBranch?.nameAr || 'الفرع'})</span> بدون أي رسوم توصيل (0 ج.م)، وسيكون جاهزاً للاستلام ساخناً وطازجاً.
                            </span>
                          </div>
                        )}
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

                          {/* Number & Copy Button - Vodafone */}
                          <div className="p-3 rounded-xl bg-[#120B07] border border-[#3D2C1E] flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] text-[#A89C8C] block">رقم محفظة التحويل (فودافون كاش)</span>
                              <span className="text-base font-black text-[#F4E08B] font-mono tracking-wider dir-ltr inline-block">
                                01026114609
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                await copyToClipboard('01026114609');
                                setVodafoneCopied(true);
                                setTimeout(() => setVodafoneCopied(false), 2000);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#2A1E14] hover:bg-[#38271A] border border-[#D4AF37]/60 text-[#F4E08B] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                            >
                              <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>{vodafoneCopied ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                            </button>
                          </div>

                          {/* Number & Copy Button - Etisalat / Instapay */}
                          <div className="p-3 rounded-xl bg-[#120B07] border border-[#3D2C1E] flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] text-[#A89C8C] block">رقم اتصالات كاش / InstaPay</span>
                              <span className="text-base font-black text-[#F4E08B] font-mono tracking-wider dir-ltr inline-block">
                                01117683207
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                await copyToClipboard('01117683207');
                                setVodafoneCopied(true);
                                setTimeout(() => setVodafoneCopied(false), 2000);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#2A1E14] hover:bg-[#38271A] border border-[#D4AF37]/60 text-[#F4E08B] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                            >
                              <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>{vodafoneCopied ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                            </button>
                          </div>

                          {/* 4 Steps Checklist */}
                          <div className="space-y-2.5 text-[11px] text-[#C8BFB0] leading-relaxed">
                            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#120B07]/60 border border-[#2D2017]">
                              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                                1
                              </span>
                              <div>
                                <strong className="text-[#FFF1C5] block">تسجيل الطلب تلقائياً بالموقع:</strong>
                                <span>تم تسجيل وتثبيت طلبك بنجاح في لوحة تحكم الفرع ويظهر لمسؤولي التحضير فوراً بدون الحاجة لوسيط.</span>
                              </div>
                            </div>

                            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#120B07]/60 border border-[#2D2017]">
                              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                                2
                              </span>
                              <div>
                                <strong className="text-[#FFF1C5] block">اعتماد رسوم التوصيل والإجمالي:</strong>
                                <span>تقوم إدارة الفرع بمراجعة المسافة وتحديد سعر التوصيل المناسب، ويتم تحديث المبلغ الإجمالي تلقائياً في هذه الشاشة.</span>
                              </div>
                            </div>

                            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#120B07]/60 border border-[#2D2017]">
                              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                                3
                              </span>
                              <div>
                                <strong className="text-[#FFF1C5] block">سداد المبلغ المطلوب:</strong>
                                <span>يمكنك التحويل إلى أحد أرقام المحافظ المذكورة أعلاه أو عبر تطبيق InstaPay أو سداد الفاتورة نقداً عند الاستلام.</span>
                              </div>
                            </div>

                            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#120B07]/60 border border-[#2D2017]">
                              <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                                ✓
                              </span>
                              <div>
                                <strong className="text-emerald-400 block">متابعة حية ومباشرة بالموقع:</strong>
                                <span>تابع مراحل تجهيز وخروج طلبك مع الكابتن لحظة بلحظة حتى وصوله لباب منزلك!</span>
                              </div>
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

                        <div className="flex justify-between items-start gap-2">
                          <span className="shrink-0">رسوم التوصيل:</span>
                          <span className="font-bold text-[11px] text-right">
                            {orderType === 'pickup' ? (
                              <span className="text-emerald-400">مجاناً (استلام من الفرع)</span>
                            ) : (
                              <span className="text-amber-300 leading-relaxed inline-block bg-amber-950/70 px-2 py-0.5 rounded-lg border border-amber-500/30">
                                يتم تحديد سعر رسوم التوصيل بناءً على المسافة وعدد الكيلومترات وسيتم تحديدها فوراً
                              </span>
                            )}
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
                          <div className="text-left">
                            <span className="text-xl font-black text-[#F4E08B] font-heading block">{formatPrice(grandTotal)}</span>
                            {orderType === 'delivery' && (
                              <span className="text-[10px] text-amber-400 font-bold block">
                                + رسوم التوصيل (تحدد فورياً)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer Submit Button */}
            {!isSuccess && (
              <div className="shrink-0 p-3.5 sm:p-5 border-t border-[#2C1F16] bg-[#120B07] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 z-20">
                <div className="flex items-center justify-between sm:flex-col sm:items-start">
                  <span className="text-[11px] sm:text-xs text-[#8E8373] block">
                    {orderType === 'delivery' ? 'إجمالي الأصناف (يُضاف له التوصيل فورياً)' : 'المبلغ الإجمالي النهائي'}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#F4E08B] font-heading">
                    {formatPrice(grandTotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  form="guest-checkout-form"
                  disabled={isSubmitting || hasUnavailableItems || !isStoreOpen || isBelowMinOrder}
                  className="w-full sm:w-auto min-h-[48px] px-6 sm:px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base shadow-[0_4px_30px_rgba(16,185,129,0.35)] hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 whitespace-nowrap select-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 text-white animate-spin shrink-0" />
                      <span>جاري تسجيل الطلب فورياً...</span>
                    </>
                  ) : !isStoreOpen ? (
                    <span>المتجر مغلق مؤقتاً 🔴</span>
                  ) : isBelowMinOrder ? (
                    <span>الطلب أقل من الحد الأدنى</span>
                  ) : hasUnavailableItems ? (
                    <span>يوجد أصناف غير متوفرة بالسلة</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-white stroke-[2.5] shrink-0" />
                      <span>تأكيد وإرسال الطلب الآن ⚡</span>
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

