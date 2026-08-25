import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  Phone,
  Send,
  Loader2,
  Package,
  CookingPot,
  Sparkles,
  MapPin,
  RefreshCw,
  Copy,
  Check,
  MessageSquare,
  User,
  Wallet,
  Building,
  Navigation,
  FileText,
  Smartphone,
  Info,
  ExternalLink,
  Camera,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { whatsAppService, GuestOrderPayload } from '../../services/whatsAppService';
import { getOrderStatusLabel, getOrderStatusStyle } from '../../lib/orderStatus';
import { formatPrice } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { phoneUtils } from '../../utils/phoneUtils';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderNumber?: string;
  initialOrderId?: string;
}

const LIFECYCLE_STEPS: Array<{
  status: OrderStatus;
  titleAr: string;
  descAr: string;
  icon: any;
}> = [
  {
    status: 'pending',
    titleAr: 'قيد الانتظار',
    descAr: 'تم استلام طلبك وجاري مراجعته من الفرع',
    icon: Clock,
  },
  {
    status: 'confirmed',
    titleAr: 'تم التأكيد',
    descAr: 'تم قبول وتأكيد طلبك في الفرع',
    icon: CheckCircle2,
  },
  {
    status: 'preparing',
    titleAr: 'جاري التحضير',
    descAr: 'شيف الحلويات والمخبوزات يجهز طلبك بأعلى جودة',
    icon: CookingPot,
  },
  {
    status: 'ready',
    titleAr: 'جاهز للاستلام / التوصيل',
    descAr: 'الطلب جاهز وفي انتظار مندوب التوصيل أو وصولك للفرع',
    icon: Package,
  },
  {
    status: 'completed',
    titleAr: 'تم التسليم بنجاح',
    descAr: 'بالهناء والشفاء! شكراً لاختيارك بامبورينا',
    icon: Sparkles,
  },
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialOrderNumber = '',
  initialOrderId = '',
}) => {
  const { showToast } = useToast();
  const { customerServicePhone, customerServiceWhatsApp, phone: sitePhone, whatsapp: siteWhatsApp } = useSiteSettings();
  const [searchOrderNumber, setSearchOrderNumber] = useState(initialOrderNumber);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCopiedOrderNum, setIsCopiedOrderNum] = useState(false);
  const [isCopiedVodafone, setIsCopiedVodafone] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Sync initial search order number
  useEffect(() => {
    if (initialOrderNumber) {
      setSearchOrderNumber(initialOrderNumber);
      handleSearch(initialOrderNumber);
    } else if (initialOrderId) {
      handleSearchById(initialOrderId);
    }
  }, [initialOrderNumber, initialOrderId, isOpen]);

  // Subscribe to realtime updates for active order
  useEffect(() => {
    if (!activeOrder?.id) return;

    const unsubscribe = firebaseOrderService.subscribeToOrder(
      activeOrder.id,
      (updatedOrder) => {
        if (updatedOrder) {
          setActiveOrder(updatedOrder);
        }
      },
      (error) => {
        console.warn('⚠️ [OrderTracking] Realtime update error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeOrder?.id]);

  const handleRefresh = async () => {
    if (!activeOrder) return;
    setIsRefreshing(true);
    try {
      const refreshed = await firebaseOrderService.trackOrder(activeOrder.orderNumber || activeOrder.id);
      if (refreshed) {
        setActiveOrder(refreshed);
        showToast('تم تحديث حالة الطلب لحظياً', activeOrder.orderNumber || '', 'success');
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearchById = async (orderId: string) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const order = await firebaseOrderService.trackOrder(orderId);
      if (order) {
        setActiveOrder(order);
        setSearchOrderNumber(order.orderNumber || order.id || '');
      } else {
        setSearchError('لم يتم العثور على طلب بهذا المعرف');
      }
    } catch {
      setSearchError('تعذر جلب تفاصيل الطلب حالياً');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (orderNumToSearch?: string) => {
    const rawTerm = (orderNumToSearch !== undefined ? orderNumToSearch : searchOrderNumber).trim();
    if (!rawTerm) {
      setSearchError('يرجى إدخال رقم الطلب للبحث والتتبع');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const found = await firebaseOrderService.trackOrder(rawTerm);

      if (found) {
        setActiveOrder(found);
        setSearchOrderNumber(found.orderNumber || found.id || rawTerm);
      } else {
        setActiveOrder(null);
        setSearchError(`لم يتم العثور على طلب برقم "${rawTerm}". تأكد من كتابة الرقم بشكل صحيح (مثال: ORDER-01-ONLINE).`);
      }
    } catch (err: any) {
      console.warn('⚠️ [OrderTrackingModal] Search error:', err);
      setSearchError('حدث خطأ أثناء البحث عن الطلب. يرجى التأكد من الاتصال والمحاولة مرة أخرى.');
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  const currentStatus = activeOrder?.status || 'pending';
  const isCancelled = currentStatus === 'cancelled';

  // Compute active step index in lifecycle
  const getStepIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'pending':
        return 0;
      case 'confirmed':
        return 1;
      case 'preparing':
        return 2;
      case 'ready':
      case 'out_for_delivery':
      case 'ready_for_pickup':
        return 3;
      case 'completed':
      case 'delivered':
        return 4;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(currentStatus);

  // Extracted order details
  const customerName = activeOrder?.customer?.name || activeOrder?.customerName || 'عميل بامبورينا';
  const customerPhone = activeOrder?.customer?.phone || activeOrder?.customerPhone || '';
  const orderType = activeOrder?.orderType || 'delivery';
  const isDelivery = orderType === 'delivery';
  const branchName = activeOrder?.branch?.nameAr || activeOrder?.branchNameAr || 'فرع بامبورينا';
  const branchPhone = activeOrder?.branch?.phone || customerServicePhone || sitePhone || '';
  const branchWhatsApp = activeOrder?.branch?.whatsapp || customerServiceWhatsApp || siteWhatsApp || branchPhone;
  const cashNumber = customerServicePhone || sitePhone || branchPhone || '';
  
  const rawAddress = activeOrder?.customer?.address || activeOrder?.address || activeOrder?.deliveryAddress?.streetAr || '';
  const landmark = activeOrder?.customer?.landmark || activeOrder?.deliveryAddress?.landmark || '';
  const locationUrl = activeOrder?.customer?.locationUrl || '';
  const paymentMethodAr = activeOrder?.paymentMethodAr || (typeof activeOrder?.paymentMethod === 'string' ? activeOrder.paymentMethod : 'كاش عند الاستلام');
  const notes = activeOrder?.notes || '';

  // Determine if payment method is Vodafone Cash / InstaPay
  const isVodafoneOrInstapay =
    activeOrder?.paymentMethod === 'vodafone_instapay' ||
    paymentMethodAr.includes('فودافون') ||
    paymentMethodAr.includes('انستا') ||
    paymentMethodAr.includes('instapay') ||
    paymentMethodAr.includes('كاش') && !paymentMethodAr.includes('عند الاستلام');

  // Calculate items total
  const calculatedItemsTotal = (activeOrder?.items || []).reduce((sum: number, it: any) => {
    const qty = Number(it.quantity) || 1;
    const price = Number(it.totalPrice) || (Number(it.unitPrice) * qty) || 0;
    return sum + price;
  }, 0);

  const itemsGrandTotal = activeOrder?.subtotal || activeOrder?.pricing?.subtotal || calculatedItemsTotal;

  // Build Resend WhatsApp payload
  const handleResendFullOrder = () => {
    if (!activeOrder) return;
    try {
      const payload: GuestOrderPayload = {
        orderNumber: activeOrder.orderNumber || activeOrder.id,
        customerName: customerName,
        customerPhone: customerPhone,
        orderType: (activeOrder.orderType as 'delivery' | 'pickup') || 'delivery',
        address: rawAddress,
        landmark: landmark,
        locationUrl: locationUrl,
        branchNameAr: branchName,
        branchPhone: branchPhone,
        branchWhatsApp: branchWhatsApp,
        items: (activeOrder.items || []).map((it: any) => ({
          nameAr: it.nameAr || it.name || it.product?.nameAr || 'صنف',
          variantNameAr: it.selectedVariant?.nameAr,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: Number(it.totalPrice) || (Number(it.unitPrice) * Number(it.quantity)) || 0,
        })),
        notes: notes,
        paymentMethodAr: paymentMethodAr,
        subtotal: itemsGrandTotal,
        deliveryFee: 0,
        grandTotal: itemsGrandTotal,
        createdAt: activeOrder.createdAt || new Date().toISOString(),
      };
      whatsAppService.sendOrderViaWhatsApp(payload);
      showToast('تم فتح محادثة الواتساب', 'تم تجهيز تفاصيل الطلب بالكامل للإرسال للفرع 🚀', 'success');
    } catch {
      showToast('خطأ في الرابط', 'يرجى استخدام زر التواصل المباشر', 'error');
    }
  };

  const copyVodafoneNumber = () => {
    navigator.clipboard.writeText(cashNumber);
    setIsCopiedVodafone(true);
    showToast('تم نسخ الرقم بنجاح 📋', `رقم تحويل فودافون كاش: ${cashNumber}`, 'success');
    setTimeout(() => setIsCopiedVodafone(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md dir-rtl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80"
        />

        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full max-w-2xl max-h-[94vh] bg-[#160E09] border border-[#2D2017] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden z-10 text-[#FFF1C5]"
        >
          {/* Header */}
          <div className="shrink-0 p-4 sm:p-5 border-b border-[#2C1F16] bg-[#120B07] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-[#221710] border border-[#3D2C1E] flex items-center justify-center text-[#C8BFB0] hover:text-[#FFF1C5] hover:border-[#D4AF37] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#FFF1C5] font-heading flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#D4AF37]" />
                  <span>تتبع حالة وتفاصيل الطلب المباشر</span>
                </h2>
                <p className="text-xs text-[#A89C8C] mt-0.5">متابعة حية ولحظية لبيانات وحالة تجهيز طلبك</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>تحديث مباشر</span>
            </span>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#3D2C1E]">
            {/* Search Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#C8BFB0] block">
                أدخل رقم الطلب للبحث والتتبع:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#8E8373] absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchOrderNumber}
                    onChange={(e) => setSearchOrderNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                    placeholder="مثال: ORDER-01-ONLINE"
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#120B07] border border-[#3D2C1E] text-xs text-[#FFF1C5] focus:border-[#D4AF37] focus:outline-none dir-ltr text-right font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={isSearching}
                  className="px-4 py-2.5 rounded-xl bg-gold-gradient text-black font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>تتبع</span>
                </button>
              </div>

              {searchError && (
                <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30 font-medium">
                  {searchError}
                </p>
              )}
            </div>

            {/* Active Order Details */}
            {activeOrder && (
              <div className="space-y-5 pt-2 border-t border-[#2C1F16]">
                
                {/* 1. Order Number & Status Card */}
                <div className="p-4 rounded-2xl bg-[#1F150D] border border-[#2D2017] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] text-[#A89C8C] block">رقم الطلب المعتمد</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm sm:text-base font-black text-[#F4E08B] font-mono dir-ltr inline-block bg-[#120B07] px-2.5 py-1 rounded-xl border border-[#3D2C1E]">
                          {activeOrder.orderNumber || activeOrder.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const num = activeOrder.orderNumber || activeOrder.id;
                            if (num) {
                              navigator.clipboard.writeText(num);
                              setIsCopiedOrderNum(true);
                              showToast('تم نسخ رقم الطلب 📋', num, 'success');
                              setTimeout(() => setIsCopiedOrderNum(false), 2500);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-[#2A1E14] hover:bg-[#3D2C1E] border border-[#4D3A29] text-[#D4AF37] hover:text-[#FFF1C5] transition-all cursor-pointer"
                          title="نسخ رقم الطلب"
                        >
                          {isCopiedOrderNum ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        title="تحديث الحالة الآن"
                        className="w-8 h-8 rounded-xl bg-[#2D2017] hover:bg-[#3D2C1E] border border-[#4D3A29] flex items-center justify-center text-[#D4AF37] hover:text-[#FFF1C5] transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </button>

                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-black border shadow-sm ${
                          getOrderStatusStyle(activeOrder.status).bg
                        } ${getOrderStatusStyle(activeOrder.status).text} ${
                          getOrderStatusStyle(activeOrder.status).border
                        }`}
                      >
                        {getOrderStatusLabel(activeOrder.status)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-3 border-t border-[#2C1F16] text-[#C8BFB0]">
                    <div>
                      <span className="text-[10px] text-[#8E8373] block">الفرع المسؤول:</span>
                      <span className="font-bold text-[#FFF1C5] flex items-center gap-1 mt-0.5">
                        <Store className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>{branchName}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8E8373] block">نوع الاستلام:</span>
                      <span className="font-bold text-[#FFF1C5] flex items-center gap-1 mt-0.5">
                        {isDelivery ? (
                          <>
                            <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>توصيل للمنزل</span>
                          </>
                        ) : (
                          <>
                            <Store className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>استلام من الفرع</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-[#8E8373] block">تاريخ ووقت الطلب:</span>
                      <span className="font-bold text-[#FFF1C5] mt-0.5 block">
                        {activeOrder.createdAt
                          ? new Date(activeOrder.createdAt).toLocaleDateString('ar-EG', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'الآن'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. CUSTOMER & DELIVERY FULL DETAILS CARD */}
                <div className="p-4 rounded-2xl bg-[#1A110A] border border-[#2D2017] space-y-3">
                  <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-[#2C1F16]">
                    <User className="w-4 h-4 text-[#D4AF37]" />
                    <span>بيانات العميل ومكان الاستلام:</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Customer Name */}
                    <div className="p-2.5 rounded-xl bg-[#120B07] border border-[#2D2017] space-y-0.5">
                      <span className="text-[10px] text-[#8E8373] block">الاسم الكريم:</span>
                      <span className="font-black text-[#FFF1C5] text-sm">{customerName}</span>
                    </div>

                    {/* Customer Phone */}
                    <div className="p-2.5 rounded-xl bg-[#120B07] border border-[#2D2017] space-y-0.5">
                      <span className="text-[10px] text-[#8E8373] block">رقم الهاتف:</span>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#F4E08B] font-mono dir-ltr">{customerPhone || 'غير مسجل'}</span>
                        {customerPhone && (
                          <a
                            href={`tel:${customerPhone}`}
                            className="p-1 rounded bg-[#2A1E14] text-[#D4AF37] hover:text-[#FFF1C5] transition-colors"
                            title="اتصال"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Delivery Address or Pickup Notice */}
                    {isDelivery ? (
                      <div className="sm:col-span-2 p-2.5 rounded-xl bg-[#120B07] border border-[#2D2017] space-y-1">
                        <span className="text-[10px] text-[#8E8373] block flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#D4AF37]" />
                          <span>عنوان التوصيل بالتفصيل:</span>
                        </span>
                        <p className="font-bold text-[#FFF1C5] leading-relaxed">
                          {rawAddress || 'لم يتم إدخال تفاصيل العنوان'}
                        </p>

                        {landmark && (
                          <p className="text-[11px] text-[#C8BFB0] flex items-center gap-1 pt-1 border-t border-[#25170F]">
                            <Navigation className="w-3 h-3 text-[#D4AF37]" />
                            <span>أقرب علامة مميزة: <strong className="text-[#F4E08B]">{landmark}</strong></span>
                          </p>
                        )}

                        {locationUrl && (
                          <a
                            href={locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] text-[#D4AF37] hover:underline font-bold pt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>عرض الموقع الجغرافي على خرائط Google</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="sm:col-span-2 p-2.5 rounded-xl bg-[#120B07] border border-[#2D2017] space-y-1">
                        <span className="text-[10px] text-[#8E8373] block flex items-center gap-1">
                          <Store className="w-3 h-3 text-[#D4AF37]" />
                          <span>عنوان الفرع للاستلام:</span>
                        </span>
                        <p className="font-bold text-[#FFF1C5]">
                          {activeOrder.branch?.addressAr || 'استلام مباشر من الفرع المحدد'}
                        </p>
                      </div>
                    )}

                    {/* Payment Method */}
                    <div className="p-2.5 rounded-xl bg-[#120B07] border border-[#2D2017] space-y-0.5">
                      <span className="text-[10px] text-[#8E8373] block flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-[#D4AF37]" />
                        <span>طريقة الدفع المختارة:</span>
                      </span>
                      <span className="font-extrabold text-[#F4E08B]">{paymentMethodAr}</span>
                    </div>

                    {/* Notes */}
                    {notes && (
                      <div className="p-2.5 rounded-xl bg-[#120B07] border border-[#2D2017] space-y-0.5">
                        <span className="text-[10px] text-[#8E8373] block flex items-center gap-1">
                          <FileText className="w-3 h-3 text-[#D4AF37]" />
                          <span>ملاحظات العميل:</span>
                        </span>
                        <span className="font-bold text-[#FFF1C5]">{notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Lifecycle Progress Bar */}
                {isCancelled ? (
                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                    <h4 className="font-black text-sm">تم إلغاء هذا الطلب</h4>
                    <p className="text-xs text-rose-200/80">
                      يمكنك التواصل مع خدمة العملاء أو الفرع عبر الواتساب للاستفسار أو إعادة الطلب.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 rounded-2xl bg-[#180F09] border border-[#2D2017]">
                    <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#D4AF37]" />
                      <span>مراحل تجهيز وتوصيل الطلب:</span>
                    </h3>

                    <div className="relative pr-4 space-y-4 before:absolute before:right-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#2C1F16]">
                      {LIFECYCLE_STEPS.map((step, idx) => {
                        const isDone = idx < currentStepIdx;
                        const isCurrent = idx === currentStepIdx;
                        const StepIcon = step.icon;

                        return (
                          <div key={step.status} className="relative flex items-start gap-3">
                            {/* Step Node */}
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all z-10 ${
                                isDone
                                  ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                                  : isCurrent
                                  ? 'bg-[#D4AF37] text-black ring-4 ring-[#D4AF37]/20 font-black animate-pulse'
                                  : 'bg-[#221710] border border-[#3D2C1E] text-[#8E8373]'
                              }`}
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <StepIcon className="w-3 h-3" />
                              )}
                            </div>

                            {/* Step Content */}
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center justify-between">
                                <h4
                                  className={`text-xs font-bold ${
                                    isCurrent
                                      ? 'text-[#F4E08B] font-black'
                                      : isDone
                                      ? 'text-emerald-400'
                                      : 'text-[#8E8373]'
                                  }`}
                                >
                                  {step.titleAr}
                                </h4>
                                {isCurrent && (
                                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#D4AF37]/20 text-[#F4E08B] font-bold">
                                    جاري الآن ⚡
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#A89C8C] leading-snug">{step.descAr}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. ITEMS & GRAND TOTAL SUMMARY CARD */}
                <div className="space-y-3 p-4 rounded-2xl bg-[#1C120B] border border-[#2D2017]">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2C1F16]">
                    <h4 className="text-xs font-black text-[#FFF1C5] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span>الأصناف المطلوبة ({activeOrder.items?.length || 0}):</span>
                    </h4>
                    <span className="text-xs font-bold text-[#A89C8C]">الكمية والسعر</span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                    {activeOrder.items?.map((item: any, idx: number) => {
                      const itemName = item.nameAr || item.name || item.product?.nameAr || 'صنف';
                      const variantName = item.selectedVariant?.nameAr ? ` (${item.selectedVariant.nameAr})` : '';
                      const qty = Number(item.quantity) || 1;
                      const price = Number(item.totalPrice) || (Number(item.unitPrice) * qty) || 0;

                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-[#120B07] border border-[#2D2017] text-xs"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-[#FFF1C5]">
                              • {itemName} {variantName}
                            </span>
                            <span className="text-[10px] text-[#8E8373] mt-0.5">
                              الكمية: {qty} × {formatPrice(price / qty)}
                            </span>
                          </div>
                          <span className="font-black text-[#F4E08B] font-mono text-sm">{formatPrice(price)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Financial Breakdown & Total */}
                  <div className="pt-3 border-t border-[#2C1F16] space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[#C8BFB0]">
                      <span>إجمالي قيمة الأصناف:</span>
                      <span className="font-bold text-[#FFF1C5] font-mono text-sm">{formatPrice(itemsGrandTotal)}</span>
                    </div>

                    <div className="flex justify-between items-center text-[#C8BFB0]">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>رسوم التوصيل:</span>
                      </span>
                      <span className="font-bold text-[#F4E08B]">
                        {isDelivery ? 'يحددها الفرع عبر الواتساب' : 'مجاناً (استلام من الفرع)'}
                      </span>
                    </div>

                    {/* Highlighted Total Box */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#2B1B10] to-[#1F140C] border border-[#D4AF37] flex items-center justify-between shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                      <div>
                        <span className="text-xs font-black text-[#FFF1C5] block">
                          الإجمالي المطلوب للأصناف:
                        </span>
                        <span className="text-[10px] text-[#A89C8C]">
                          {isDelivery ? '(بدون رسوم التوصيل)' : '(شامل الاستلام من الفرع)'}
                        </span>
                      </div>
                      <span className="text-lg sm:text-xl font-black text-[#F4E08B] font-mono">
                        {formatPrice(itemsGrandTotal)}
                      </span>
                    </div>

                    {/* Delivery Fee Clarification Note */}
                    {isDelivery && (
                      <div className="p-3 rounded-xl bg-[#22160E] border border-amber-500/40 text-amber-200 text-xs space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-[#F4E08B]">
                          <Info className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>تنويه هام بشأن سعر التوصيل:</span>
                        </p>
                        <p className="text-[11px] leading-relaxed text-[#FFF1C5]/90">
                          هذا الإجمالي المعروض هو <strong>قيمة الأصناف المطلوبة فقط</strong> بدون سعر التوصيل؛ حيث يتم تحديد تكلفة التوصيل بدقة من خلال الفرع بعد إرسال تفاصيل الطلب في رسالة عبر الواتساب وفقاً لمنطقتك وعدد الكيلومترات.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. VODAFONE CASH / INSTAPAY WORKFLOW GUIDE */}
                {isVodafoneOrInstapay && (
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-[#24170E] to-[#170E08] border border-[#D4AF37] shadow-[0_4px_25px_rgba(212,175,55,0.2)] space-y-3.5 text-xs text-[#FFF1C5]">
                    <div className="flex items-center justify-between pb-2 border-b border-[#3D2C1E]">
                      <span className="font-black text-[#F4E08B] flex items-center gap-2 text-sm">
                        <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                        <span>خطوات تحويل فودافون كاش / InstaPay وتأكيد الطلب:</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-bold text-[10px]">
                        إرشادات السداد
                      </span>
                    </div>

                    {/* Wallet Number & Quick Copy */}
                    <div className="p-3 rounded-xl bg-[#120B07] border border-[#3D2C1E] flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-[#A89C8C] block">رقم محفظة التحويل (فودافون كاش)</span>
                        <span className="text-base sm:text-lg font-black text-[#F4E08B] font-mono tracking-wider dir-ltr inline-block">
                          {cashNumber}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={copyVodafoneNumber}
                        className="px-3 py-2 rounded-xl bg-[#2A1E14] hover:bg-[#38271A] border border-[#D4AF37]/60 text-[#F4E08B] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        {isCopiedVodafone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />}
                        <span>{isCopiedVodafone ? 'تم النسخ' : 'نسخ الرقم'}</span>
                      </button>
                    </div>

                    {/* 4 Steps Checklist */}
                    <div className="space-y-2.5 text-[11px] text-[#C8BFB0] leading-relaxed">
                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#120B07]/60 border border-[#2D2017]">
                        <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                          1
                        </span>
                        <div>
                          <strong className="text-[#FFF1C5] block">إرسال الطلب للفرع عبر الواتساب:</strong>
                          <span>يتم تحويلك إلى محادثة الواتساب مع الفرع برسالة تحتوي على بيانات طلبك كاملة.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#120B07]/60 border border-[#2D2017]">
                        <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                          2
                        </span>
                        <div>
                          <strong className="text-[#FFF1C5] block">تحديد الإجمالي من قِبل الفرع:</strong>
                          <span>يقوم مسؤول الفرع بتحديد وإبلاغك بالمبلغ الإجمالي المطلوب تحويله (الأصناف + سعر التوصيل).</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#120B07]/60 border border-[#2D2017]">
                        <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                          3
                        </span>
                        <div>
                          <strong className="text-[#FFF1C5] block">تحويل المبلغ المتفق عليه:</strong>
                          <span>تقوم بتحويل المبلغ إلى رقم المحفظة: <strong className="text-[#F4E08B] font-mono dir-ltr inline-block">{cashNumber}</strong> أو عبر InstaPay.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#120B07]/60 border border-[#2D2017]">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                          <Camera className="w-3 h-3" />
                        </span>
                        <div>
                          <strong className="text-emerald-400 block">إرسال صورة التحويل لتأكيد الطلب:</strong>
                          <span>قم بأخذ لقطة شاشة (Screenshot) لإشعار التحويل وإرسالها في رسالة واتساب للفرع لتأكيد وبدء تحضير طلبك فوراً!</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Contact & WhatsApp Buttons */}
                {(() => {
                  const cleanPhone = whatsAppService.cleanPhoneForWhatsApp(branchPhone);
                  const inquiryMessage = `مرحباً بامبورينا (${branchName})،
أود المتابعة بخصوص طلبي رقم: ${activeOrder.orderNumber || activeOrder.id}
الاسم: ${customerName}
الهاتف: ${customerPhone}
الحالة: ${getOrderStatusLabel(activeOrder.status)}
إجمالي الأصناف: ${formatPrice(itemsGrandTotal)}

شكراً لكم وأرجو إفادتي بحالة التجهيز.`;
                  const inquiryUrl = whatsAppService.generateWhatsAppUrl(cleanPhone, inquiryMessage);

                  return (
                    <div className="space-y-2.5 pt-2 border-t border-[#2C1F16]">
                      {/* Primary WhatsApp Action */}
                      <button
                        type="button"
                        onClick={handleResendFullOrder}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer hover:brightness-110 active:scale-[0.98]"
                      >
                        <Send className="w-4 h-4" />
                        <span>إرسال تفاصيل الطلب بالكامل للفرع عبر الواتساب 🚀</span>
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Direct inquiry */}
                        <a
                          href={inquiryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 rounded-xl bg-[#241810] hover:bg-[#342217] border border-[#D4AF37]/50 text-[#F4E08B] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>استفسار ومتابعة عبر الواتساب 💬</span>
                        </a>

                        {/* Call branch */}
                        <a
                          href={`tel:${branchPhone.replace(/[^0-9+]/g, '')}`}
                          className="w-full py-2.5 rounded-xl bg-[#1C120B] hover:bg-[#2A1C12] border border-[#3D2C1E] text-[#FFF1C5] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>اتصال هاتفي بالفرع ({branchPhone})</span>
                        </a>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
