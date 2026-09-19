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
  Printer,
  Bike,
  MessageCircle,
  ShieldAlert,
  Trash2,
  History,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { whatsAppService, GuestOrderPayload } from '../../services/whatsAppService';
import { storageService } from '../../services/storageService';
import { exportAndPrintSingleInvoice } from '../../services/pdfReportGenerator';
import { getOrderStatusLabel, getOrderStatusStyle } from '../../lib/orderStatus';
import { formatPrice } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { useModalBackHandler } from '../../hooks/useModalBackHandler';
import { phoneUtils } from '../../utils/phoneUtils';
import { customerOrderStorage, CustomerSavedOrder } from '../../services/customerOrderStorage';
import { formatCairoDateTime } from '../../utils/dateFormatter';
import { copyToClipboard } from '../../utils/clipboard';

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
    descAr: 'تم استلام طلبك وجاري مراجعته وتأكيده من الفرع',
    icon: Clock,
  },
  {
    status: 'confirmed',
    titleAr: 'مؤكد',
    descAr: 'تم تأكيد وقبول طلبك في الفرع بنجاح',
    icon: CheckCircle2,
  },
  {
    status: 'preparing',
    titleAr: 'جاري التحضير',
    descAr: 'شيف بامبورينا يجهز طلبك الآن بأعلى معايير الجودة',
    icon: CookingPot,
  },
  {
    status: 'ready',
    titleAr: 'جاهز',
    descAr: 'الطلب جاهز تماماً للاستلام أو مع مندوب التوصيل',
    icon: Package,
  },
  {
    status: 'completed',
    titleAr: 'مكتمل',
    descAr: 'تم تسليم الطلب بنجاح، بالهناء والشفاء!',
    icon: Sparkles,
  },
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialOrderNumber = '',
  initialOrderId = '',
}) => {
  // Intercept phone / browser back button to close Order tracking modal without exiting the site
  useModalBackHandler(isOpen, onClose, 'order_tracking');

  const { showToast } = useToast();
  const { complaintsWhatsApp, complaintsPhone, customerServicePhone, customerServiceWhatsApp, phone: sitePhone, whatsapp: siteWhatsApp } = useSiteSettings();
  const [searchOrderNumber, setSearchOrderNumber] = useState(initialOrderNumber);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCopiedOrderNum, setIsCopiedOrderNum] = useState(false);
  const [isCopiedVodafone, setIsCopiedVodafone] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savedBrowserOrders, setSavedBrowserOrders] = useState<CustomerSavedOrder[]>(() =>
    customerOrderStorage.getSavedOrders()
  );

  // Sync saved browser orders when storage changes
  useEffect(() => {
    const unsub = customerOrderStorage.subscribe(() => {
      setSavedBrowserOrders(customerOrderStorage.getSavedOrders());
    });
    return unsub;
  }, []);

  // Sync initial search order number or pick latest from browser storage
  useEffect(() => {
    if (!isOpen) return;

    // Refresh list of saved orders
    setSavedBrowserOrders(customerOrderStorage.getSavedOrders());

    if (initialOrderNumber) {
      setSearchOrderNumber(initialOrderNumber);
      handleSearch(initialOrderNumber);
    } else if (initialOrderId) {
      handleSearchById(initialOrderId);
    } else {
      const latestBrowserOrder = customerOrderStorage.getLatestOrderNumber();
      if (latestBrowserOrder && !activeOrder) {
        setSearchOrderNumber(latestBrowserOrder);
        handleSearch(latestBrowserOrder);
      }
    }
  }, [initialOrderNumber, initialOrderId, isOpen]);

  // Subscribe to realtime updates for active order
  useEffect(() => {
    if (!activeOrder?.id) return;

    const unsubscribe = firebaseOrderService.subscribeToOrder(
      activeOrder.id,
      (updatedOrder) => {
        if (updatedOrder) {
          setActiveOrder((prev) => {
            if (!prev) return updatedOrder;
            // Notify customer if admin just set the delivery fee
            if (!prev.deliveryFeeManuallySet && updatedOrder.deliveryFeeManuallySet) {
              const feeVal = Number(updatedOrder.pricing?.deliveryFee ?? updatedOrder.deliveryFee ?? 0);
              showToast(
                'تم اعتماد وتحديث رسوم التوصيل ⚡',
                `تم تحديد سعر التوصيل بواسطة الإدارة (${feeVal === 0 ? 'توصيل مجاني' : `${feeVal} ج.م`}) بناءً على المسافة بالكيلومترات`,
                'success'
              );
            }
            return updatedOrder;
          });

          // Sync into browser storage
          const ordNum = updatedOrder.orderNumber || updatedOrder.id;
          if (ordNum) {
            customerOrderStorage.saveOrder({
              orderNumber: ordNum,
              orderId: updatedOrder.id,
              customerName: updatedOrder.customer?.name || updatedOrder.customerName,
              customerPhone: updatedOrder.customer?.phone || updatedOrder.customerPhone,
              total: updatedOrder.pricing?.total ?? updatedOrder.grandTotal ?? updatedOrder.subtotal,
              status: updatedOrder.status,
              createdAt: updatedOrder.createdAt,
            });
          }
        }
      },
      (error) => {
        console.warn('⚠️ [OrderTracking] Realtime update error:', error);
      }
    );

    // Active polling fallback to guarantee immediate reflection even if WebSocket blinks
    const pollInterval = setInterval(async () => {
      try {
        const fresh = await firebaseOrderService.trackOrder(activeOrder.orderNumber || activeOrder.id);
        if (fresh) {
          setActiveOrder((prev) => {
            if (!prev) return fresh;
            if (!prev.deliveryFeeManuallySet && fresh.deliveryFeeManuallySet) {
              const feeVal = Number(fresh.pricing?.deliveryFee ?? fresh.deliveryFee ?? 0);
              showToast(
                'تم اعتماد وتحديث رسوم التوصيل ⚡',
                `تم تحديد سعر التوصيل بواسطة الإدارة (${feeVal === 0 ? 'توصيل مجاني' : `${feeVal} ج.م`}) بناءً على المسافة بالكيلومترات`,
                'success'
              );
            }
            if (
              fresh.deliveryFeeManuallySet !== prev.deliveryFeeManuallySet ||
              (fresh.pricing?.deliveryFee ?? fresh.deliveryFee) !== (prev.pricing?.deliveryFee ?? prev.deliveryFee) ||
              fresh.status !== prev.status ||
              fresh.updatedAt !== prev.updatedAt
            ) {
              return fresh;
            }
            return prev;
          });

          // Sync into local browser storage
          const ordNum = fresh.orderNumber || fresh.id;
          if (ordNum) {
            customerOrderStorage.saveOrder({
              orderNumber: ordNum,
              orderId: fresh.id,
              customerName: fresh.customer?.name || fresh.customerName,
              customerPhone: fresh.customer?.phone || fresh.customerPhone,
              total: fresh.pricing?.total ?? fresh.grandTotal ?? fresh.subtotal,
              status: fresh.status,
              createdAt: fresh.createdAt,
            });
          }
        }
      } catch {
        // silent
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [activeOrder?.id, showToast]);

  const handleRefresh = async () => {
    if (!activeOrder) return;
    setIsRefreshing(true);
    try {
      const refreshed = await firebaseOrderService.trackOrder(activeOrder.orderNumber || activeOrder.id);
      if (refreshed) {
        setActiveOrder(refreshed);
        const ordNum = refreshed.orderNumber || refreshed.id;
        if (ordNum) {
          customerOrderStorage.saveOrder({
            orderNumber: ordNum,
            orderId: refreshed.id,
            status: refreshed.status,
            total: refreshed.pricing?.total ?? refreshed.grandTotal,
          });
        }
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
        const ordNum = order.orderNumber || order.id;
        if (ordNum) {
          customerOrderStorage.saveOrder({
            orderNumber: ordNum,
            orderId: order.id,
            customerName: order.customer?.name || order.customerName,
            customerPhone: order.customer?.phone || order.customerPhone,
            total: order.pricing?.total ?? order.grandTotal,
            status: order.status,
            createdAt: order.createdAt,
          });
        }
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

    if (orderNumToSearch && activeOrder && (activeOrder.orderNumber !== rawTerm && activeOrder.id !== rawTerm)) {
      setActiveOrder(null);
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      let found = await firebaseOrderService.trackOrder(rawTerm);

      // Fast fallback to local guest orders if indexing/network is still propagating
      if (!found) {
        const guestOrders = storageService.getGuestOrders<Order[]>([]);
        found = guestOrders.find(
          (o) =>
            (o.orderNumber && o.orderNumber.toUpperCase() === rawTerm.toUpperCase()) ||
            o.id === rawTerm
        ) || null;
      }

      if (found) {
        setActiveOrder(found);
        setSearchOrderNumber(found.orderNumber || found.id || rawTerm);
        const ordNum = found.orderNumber || found.id || rawTerm;
        customerOrderStorage.saveOrder({
          orderNumber: ordNum,
          orderId: found.id,
          customerName: found.customer?.name || found.customerName,
          customerPhone: found.customer?.phone || found.customerPhone,
          total: found.pricing?.total ?? found.grandTotal ?? found.subtotal,
          status: found.status,
          createdAt: found.createdAt,
        });
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

  const handleSelectSavedOrder = (orderNum: string) => {
    setSearchOrderNumber(orderNum);
    handleSearch(orderNum);
  };

  const handleRemoveSavedOrder = (e: React.MouseEvent, orderNum: string) => {
    e.stopPropagation();
    customerOrderStorage.removeOrder(orderNum);
    setSavedBrowserOrders(customerOrderStorage.getSavedOrders());
    showToast('تم إزالة الطلب من قائمة المتصفح', orderNum, 'info');
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
  const rawBranchPhone = activeOrder?.branch?.phone || activeOrder?.branchPhone || customerServicePhone || sitePhone || '';
  const branchPhone = (!rawBranchPhone || rawBranchPhone === '01121778205' || rawBranchPhone.includes('01121778205'))
    ? '01112624108'
    : rawBranchPhone;
  const branchWhatsApp = activeOrder?.branch?.whatsapp || customerServiceWhatsApp || siteWhatsApp || branchPhone;
  const cashNumber = (customerServicePhone && customerServicePhone !== '01121778205') ? customerServicePhone : (sitePhone && sitePhone !== '01121778205') ? sitePhone : branchPhone;
  
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

  // Delivery Fee Calculation & Metadata:
  // Delivery fee is ONLY considered officially set and approved if deliveryFeeManuallySet is explicitly true
  const rawDeliveryFee = activeOrder?.pricing?.deliveryFee ?? activeOrder?.deliveryFee ?? null;
  const isDeliveryFeeSet = isDelivery && activeOrder?.deliveryFeeManuallySet === true;
  const deliveryFeeNum = isDeliveryFeeSet ? Math.max(0, Number(rawDeliveryFee) || 0) : 0;
  const discountAmount = Number(activeOrder?.pricing?.discountAmount || activeOrder?.discountAmount || 0);

  // Total invoice for customer:
  // If delivery fee is NOT yet set by administration, total is purely items subtotal minus discount,
  // clearly displaying that delivery fee will be added once calculated based on distance.
  const finalPayableTotal = Number(
    (
      isDeliveryFeeSet
        ? (activeOrder?.pricing?.total ?? activeOrder?.grandTotal ?? Math.max(0, itemsGrandTotal + deliveryFeeNum - discountAmount))
        : Math.max(0, itemsGrandTotal - discountAmount)
    ).toFixed(2)
  );

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
        deliveryFee: isDeliveryFeeSet ? deliveryFeeNum : 0,
        grandTotal: finalPayableTotal,
        createdAt: activeOrder.createdAt || new Date().toISOString(),
      };
      whatsAppService.sendOrderViaWhatsApp(payload);
      showToast('تم فتح محادثة الواتساب', 'تم تجهيز تفاصيل الطلب بالكامل للإرسال للفرع 🚀', 'success');
    } catch {
      showToast('خطأ في الرابط', 'يرجى استخدام زر التواصل المباشر', 'error');
    }
  };

  const copyVodafoneNumber = async () => {
    const success = await copyToClipboard(cashNumber);
    setIsCopiedVodafone(true);
    if (success) {
      showToast('تم نسخ الرقم بنجاح 📋', `رقم تحويل فودافون كاش: ${cashNumber}`, 'success');
    } else {
      showToast('رقم تحويل فودافون كاش:', cashNumber, 'info');
    }
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
          <div className="shrink-0 p-3.5 sm:p-5 border-b border-[#2C1F16] bg-[#120B07] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#221710] border border-[#3D2C1E] flex items-center justify-center text-[#C8BFB0] hover:text-[#FFF1C5] hover:border-[#D4AF37] transition-all cursor-pointer shrink-0 active:scale-95"
                aria-label="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-black text-[#FFF1C5] font-heading flex items-center gap-1.5 sm:gap-2 truncate">
                  <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37] shrink-0" />
                  <span className="truncate">تتبع حالة وتفاصيل الطلب</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-[#A89C8C] mt-0.5 truncate">متابعة حية ولحظية لحالة تجهيز طلبك</p>
              </div>
            </div>

            <span className="px-2.5 sm:px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>تحديث مباشر</span>
            </span>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#3D2C1E]">
            {/* Search Box & Browser Saved Orders */}
            <div className="space-y-3">
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
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#120B07] border border-[#3D2C1E] text-xs text-[#FFF1C5] focus:border-[#D4AF37] focus:outline-none dir-ltr text-right font-mono font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={isSearching}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-neutral-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0 whitespace-nowrap shadow-md hover:brightness-105"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Search className="w-4 h-4 shrink-0" />}
                  <span>تتبع الطلب</span>
                </button>
              </div>

              {/* Saved Browser Orders History Bar */}
              {savedBrowserOrders.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#1B120B] border border-[#3D2C1E]/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#D4AF37] flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      <span>طلباتك المحفوظة على هذا المتصفح ({savedBrowserOrders.length}):</span>
                    </span>
                    <span className="text-[10px] text-[#A89C8C]">حفظ تلقائي</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-0.5">
                    {savedBrowserOrders.map((saved) => {
                      const isCurrentActive =
                        activeOrder &&
                        (activeOrder.orderNumber === saved.orderNumber || activeOrder.id === saved.orderNumber);

                      const stStyle = getOrderStatusStyle(saved.status as any || 'pending');

                      return (
                        <div
                          key={saved.orderNumber}
                          onClick={() => handleSelectSavedOrder(saved.orderNumber)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                            isCurrentActive
                              ? 'bg-[#2E1F14] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                              : 'bg-[#140C07] border-[#2C1F16] hover:border-[#D4AF37]/50 hover:bg-[#22160E]'
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Package className={`w-3.5 h-3.5 shrink-0 ${isCurrentActive ? 'text-[#D4AF37]' : 'text-[#8E8373]'}`} />
                              <span className="font-mono font-black text-xs text-[#FFF1C5] truncate dir-ltr">
                                {saved.orderNumber}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[#A89C8C]">
                              <span>{formatCairoDateTime(saved.createdAt)}</span>
                              {saved.total !== undefined && (
                                <span className="text-[#F4E08B] font-bold">{formatPrice(saved.total)}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stStyle.bg} ${stStyle.text} ${stStyle.border}`}>
                              {getOrderStatusLabel(saved.status as any || 'pending')}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveSavedOrder(e, saved.orderNumber)}
                              className="p-1 rounded-md text-[#8E8373] hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                              title="حذف من هذا المتصفح"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {searchError && (
                <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30 font-medium">
                  {searchError}
                </p>
              )}

              {/* Loading State when querying order */}
              {isSearching && !activeOrder && (
                <div className="py-12 text-center space-y-3 bg-[#170E08] rounded-2xl border border-[#2D2017]">
                  <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
                  <p className="text-xs sm:text-sm text-[#F4E08B] font-bold">جاري تحميل وتتبع تفاصيل طلبك...</p>
                  <p className="text-[11px] text-[#A89C8C]">لحظات وسيتم عرض الحالة الحية ومراحل التجهيز</p>
                </div>
              )}
            </div>

            {/* Active Order Details */}
            {activeOrder && (
              <div className="space-y-5 pt-2 border-t border-[#2C1F16]">
                
                {/* 1. Order Number & Status Card */}
                <div className="p-4 rounded-2xl bg-[#1F150D] border border-[#2D2017] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] text-[#A89C8C] block">رقم الطلب المعتمد للتتبع:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm sm:text-base font-black text-[#F4E08B] font-mono dir-ltr inline-block bg-[#120B07] px-3 py-1 rounded-xl border border-[#3D2C1E] tracking-wider">
                          {activeOrder.orderNumber || activeOrder.id}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            const num = activeOrder.orderNumber || activeOrder.id;
                            if (num) {
                              const success = await copyToClipboard(num);
                              setIsCopiedOrderNum(true);
                              if (success) {
                                showToast('تم نسخ رقم الطلب بنجاح 📋', num, 'success');
                              } else {
                                showToast('رقم الطلب:', num, 'info');
                              }
                              setTimeout(() => setIsCopiedOrderNum(false), 2500);
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                            isCopiedOrderNum
                              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                              : 'bg-[#2A1E14] hover:bg-[#3D2C1E] border-[#4D3A29] text-[#D4AF37] hover:text-[#FFF1C5]'
                          }`}
                          title="نسخ رقم الطلب"
                        >
                          {isCopiedOrderNum ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>تم النسخ ✓</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الرقم</span>
                            </>
                          )}
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

                  {/* Clarification banner for customer */}
                  <div className="p-2.5 rounded-xl bg-[#120B07] border border-[#2D2017] text-[11px] text-[#C8BFB0] flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                    <span>
                      💡 <strong className="text-[#FFF1C5]">تنبيه هام:</strong> رقم هذا الطلب هو الرمز المعتمد لمتابعة حالته والاطلاع على الفاتورة وتحديثات المندوب. تم حفظه تلقائياً في هذا المتصفح لراحتك.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-[#2C1F16] text-[#C8BFB0]">
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
                      <span className="font-bold text-[#FFF1C5] mt-0.5 block font-mono text-[11px]">
                        {formatCairoDateTime(activeOrder.createdAt)}
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

                    {/* Delivery Captain / Driver Details */}
                    {isDelivery && (
                      <div className="sm:col-span-2 p-3 rounded-xl bg-gradient-to-r from-[#1E140C] to-[#140C07] border border-[#3D2C1E] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#D4AF37] flex items-center gap-1.5">
                            <Bike className="w-4 h-4 text-[#D4AF37]" />
                            <span>كابتن التوصيل:</span>
                          </span>
                          {activeOrder.driverName ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                              تم التعيين ✓
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                              جاري التعيين والتجهيز ⏳
                            </span>
                          )}
                        </div>

                        {activeOrder.driverName ? (
                          <div className="flex items-center justify-between pt-1 text-xs">
                            <div>
                              <span className="font-extrabold text-[#FFF1C5] text-sm block">
                                {activeOrder.driverName}
                              </span>
                              {activeOrder.driverPhone && (
                                <span className="text-[11px] text-[#A89C8C] font-mono dir-ltr mt-0.5 block">
                                  {activeOrder.driverPhone}
                                </span>
                              )}
                            </div>

                            {activeOrder.driverPhone && (
                              <div className="flex items-center gap-2">
                                <a
                                  href={`tel:${activeOrder.driverPhone}`}
                                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#2D2017] hover:bg-[#3D2C1E] border border-[#4D3A29] text-[#FFF1C5] hover:text-white flex items-center gap-1.5 font-bold text-xs transition-all shadow-sm active:scale-95 whitespace-nowrap select-none"
                                >
                                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>اتصال بالكابتن</span>
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#A89C8C] leading-relaxed">
                            جاري تجهيز طلبك في الفرع بأعلى معايير الجودة، وسيتم إسناد الطلب لكابتن التوصيل فور خروجه.
                          </p>
                        )}
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
                      يمكنك التواصل مع قسم الشكاوى المعتمد أو الاتصال بالفرع مباشرة للاستفسار أو إعادة الطلب.
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
                  <div className="pt-3 border-t border-[#2C1F16] space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-[#C8BFB0]">
                      <span>إجمالي قيمة الأصناف:</span>
                      <span className="font-bold text-[#FFF1C5] font-mono text-sm">{formatPrice(itemsGrandTotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-emerald-400">
                        <span>الخصم المطبق:</span>
                        <span className="font-bold font-mono text-sm">-{formatPrice(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[#C8BFB0] flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 shrink-0">
                        <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>رسوم التوصيل:</span>
                        {isDelivery && isDeliveryFeeSet && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                            معتمد من الإدارة ✓
                          </span>
                        )}
                        {isDelivery && !isDeliveryFeeSet && (
                          <span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/40 text-amber-300 text-[10px] font-bold animate-pulse">
                            ⏳ قيد التحديد حسب المسافة
                          </span>
                        )}
                      </span>
                      {isDelivery ? (
                        isDeliveryFeeSet ? (
                          <span className="font-black text-[#F4E08B] font-mono text-sm">
                            {deliveryFeeNum === 0 ? '0 ج.م (إعفاء معتمد من الإدارة 🎁)' : formatPrice(deliveryFeeNum)}
                          </span>
                        ) : (
                          <span className="text-amber-300 text-xs font-bold bg-amber-950/70 px-2.5 py-1 rounded-lg border border-amber-500/40 text-right leading-relaxed">
                            يتم تحديد سعر رسوم التوصيل بناءً على المسافة وعدد الكيلومترات وسيتم تحديدها فوراً
                          </span>
                        )
                      ) : (
                        <span className="font-bold text-emerald-400">
                          مجاناً (استلام من الفرع)
                        </span>
                      )}
                    </div>

                    {/* Delivery Fee Notes if set by admin */}
                    {isDelivery && activeOrder.deliveryFeeNotes && (
                      <div className="p-2.5 rounded-xl bg-[#1A110A] border border-[#D4AF37]/30 text-[11px] text-[#FFF1C5] flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                        <span>ملاحظة التوصيل المعتمدة: {activeOrder.deliveryFeeNotes}</span>
                      </div>
                    )}

                    {/* Highlighted Total Box */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#2B1B10] to-[#1F140C] border border-[#D4AF37] flex items-center justify-between shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                      <div>
                        <span className="text-xs font-black text-[#FFF1C5] block">
                          إجمالي الفاتورة المطلوب سداده:
                        </span>
                        <span className="text-[10px] text-[#A89C8C]">
                          {isDelivery
                            ? isDeliveryFeeSet
                              ? '(شامل قيمة الأصناف + سعر التوصيل المعتمد)'
                              : '(قيمة الأصناف حالياً - يُضاف إليها سعر التوصيل فور اعتماده)'
                            : '(شامل الاستلام من الفرع)'}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-lg sm:text-2xl font-black text-[#F4E08B] font-mono block">
                          {formatPrice(finalPayableTotal)}
                        </span>
                        {isDelivery && !isDeliveryFeeSet && (
                          <span className="text-[10px] text-amber-400 font-bold block">
                            + رسوم التوصيل (تحدد فورياً)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delivery Fee Clarification / Live update status */}
                    {isDelivery && !isDeliveryFeeSet && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#26170D] to-[#170E08] border border-amber-500/40 text-amber-200 text-xs space-y-2 shadow-lg">
                        <div className="flex items-center gap-2 text-[#F4E08B] font-bold">
                          <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                            <Truck className="w-4 h-4 text-amber-400" />
                          </div>
                          <span className="text-sm">تحديد رسوم التوصيل بناءً على المسافة وعدد الكيلومترات:</span>
                        </div>
                        <p className="text-[12px] text-[#E8DAC8] leading-relaxed pr-9 font-medium">
                          يتم تحديد سعر رسوم التوصيل بناءً على المسافة وعدد الكيلومترات وسيتم تحديدها فوراً من خلال الإدارة وتنعكس هنا تلقائياً.
                        </p>
                        <div className="flex items-center gap-2 pr-9 text-[11px] text-emerald-400 font-bold">
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span>الربط اللحظي نشط: ستنعكس رسوم التوصيل المعتمدة هنا وتُضاف للإجمالي تلقائياً في ثوانٍ معدودة دون الحاجة لتحديث الصفحة ⚡</span>
                        </div>
                      </div>
                    )}

                    {/* Customer Invoice Print Button - Shows only if pickup OR after setting delivery fee AND assigning a driver for delivery */}
                    {(!isDelivery || (isDeliveryFeeSet && (activeOrder?.driverId || activeOrder?.driverName))) && (
                      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] text-[#A89C8C]">
                          {isDeliveryFeeSet ? 'الفاتورة معتمدة ومحدثة بتكلفة التوصيل' : 'الفاتورة الرقمية المؤكدة'}
                        </span>
                        <button
                          type="button"
                          onClick={() => exportAndPrintSingleInvoice(activeOrder, 'print')}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#261A11] hover:bg-[#342418] border border-[#D4AF37]/50 text-[#F4E08B] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 shrink-0 whitespace-nowrap select-none"
                          title="عرض الفاتورة"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                          <span>عرض الفاتورة</span>
                        </button>
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

                    {/* Wallet Number & Quick Copy - Vodafone */}
                    <div className="p-3 rounded-xl bg-[#120B07] border border-[#3D2C1E] flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-[#A89C8C] block">رقم محفظة التحويل (فودافون كاش)</span>
                        <span className="text-base sm:text-lg font-black text-[#F4E08B] font-mono tracking-wider dir-ltr inline-block">
                          01026114609
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await copyToClipboard('01026114609');
                          setIsCopiedVodafone(true);
                          setTimeout(() => setIsCopiedVodafone(false), 2000);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#2A1E14] hover:bg-[#38271A] border border-[#D4AF37]/60 text-[#F4E08B] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        {isCopiedVodafone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />}
                        <span>{isCopiedVodafone ? 'تم النسخ' : 'نسخ الرقم'}</span>
                      </button>
                    </div>

                    {/* Wallet Number & Quick Copy - Etisalat / Instapay */}
                    <div className="p-3 rounded-xl bg-[#120B07] border border-[#3D2C1E] flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-[#A89C8C] block">رقم اتصالات كاش / InstaPay</span>
                        <span className="text-base sm:text-lg font-black text-[#F4E08B] font-mono tracking-wider dir-ltr inline-block">
                          01117683207
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await copyToClipboard('01117683207');
                          setIsCopiedVodafone(true);
                          setTimeout(() => setIsCopiedVodafone(false), 2000);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#2A1E14] hover:bg-[#38271A] border border-[#D4AF37]/60 text-[#F4E08B] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        {isCopiedVodafone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />}
                        <span>{isCopiedVodafone ? 'تم النسخ' : 'نسخ الرقم'}</span>
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

                {/* 6. Live App Status & Dedicated Complaints WhatsApp */}
                {(() => {
                  const complaintsNumber = complaintsWhatsApp || customerServiceWhatsApp || siteWhatsApp || '01112624108';
                  const complaintsMessage = `⚖️ *قسم الشكاوى والمقترحات بامبورينا*
━━━━━━━━━━━━━━━━━━━━━━
السلام عليكم ورحمة الله وبركاته،
لدي شكوى / استفسار بخصوص طلبي رقم: ${activeOrder.orderNumber || activeOrder.id}
الاسم: ${customerName}
رقم الهاتف: ${customerPhone}
حالة الطلب الحالية: ${getOrderStatusLabel(activeOrder.status)}
يرجى المتابعة والرد، شكراً جزيلاً.`;
                  const complaintsUrl = whatsAppService.generateWhatsAppUrl(complaintsNumber, complaintsMessage);

                  return (
                    <div className="space-y-3 pt-3 border-t border-[#2C1F16]">
                      {/* Live In-App Notification Banner */}
                      <div className="p-3 rounded-2xl bg-gradient-to-r from-[#1A120B] to-[#120B07] border border-amber-500/30 flex items-center gap-2.5 text-xs text-[#E8DAC8]">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                        <div className="leading-relaxed">
                          <strong className="text-[#FFF1C5] font-bold block">متابعة فورية ومباشرة عبر التطبيق:</strong>
                          <span>حالة طلبك وتفاصيل الفاتورة يتم تحديثها تلقائياً وبشكل حي من لوحة تحكم الفرع.</span>
                        </div>
                      </div>

                      {/* Branch Order WhatsApp Dispatch Button */}
                      <button
                        type="button"
                        onClick={handleResendFullOrder}
                        className="w-full min-h-[50px] p-3 sm:px-4 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(16,185,129,0.25)] transition-all cursor-pointer hover:brightness-105 active:scale-[0.98] select-none"
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div className="text-right min-w-0">
                            <span className="block font-black text-xs sm:text-sm text-white leading-tight truncate">
                              فتح محادثة تفاصيل الطلب على الواتساب 💬
                            </span>
                            <span className="block text-[10px] sm:text-[11px] text-emerald-100/90 font-bold leading-tight mt-0.5 truncate">
                              فتح محادثة واتساب الفرع في نافذة جديدة بتفاصيل الطلب كاملة
                            </span>
                          </div>
                        </div>
                        <span className="px-2.5 sm:px-3 py-1 rounded-xl bg-white/20 text-white text-[10px] sm:text-xs font-black shrink-0 flex items-center gap-1 shadow-sm">
                          <span>واتساب الفرع</span>
                          <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </span>
                      </button>

                      {/* The ONLY Authorized WhatsApp Button: Complaints & Suggestions */}
                      <a
                        href={complaintsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full min-h-[52px] p-3 sm:px-4 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs sm:text-sm flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(217,119,6,0.25)] transition-all cursor-pointer hover:brightness-105 active:scale-[0.98] select-none"
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-950/15 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-950" />
                          </div>
                          <div className="text-right min-w-0">
                            <span className="block font-black text-xs sm:text-sm text-neutral-950 leading-tight truncate">
                              قسم الشكاوى والمقترحات بامبورينا
                            </span>
                            <span className="block text-[10px] sm:text-[11px] text-neutral-900/80 font-bold leading-tight mt-0.5 truncate">
                              تواصل فوري ومباشر وموثق لحل أي مشكلة
                            </span>
                          </div>
                        </div>
                        <span className="px-2.5 sm:px-3 py-1 rounded-xl bg-neutral-950 text-amber-400 text-[10px] sm:text-xs font-black shrink-0 flex items-center gap-1 shadow-sm">
                          <span>مراسلة</span>
                          <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </span>
                      </a>

                      {/* Direct Phone Call to Branch */}
                      {branchPhone && (
                        <a
                          href={`tel:${branchPhone.replace(/[^0-9+]/g, '')}`}
                          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1C120B] hover:bg-[#2A1C12] border border-[#3D2C1E] hover:border-[#D4AF37]/50 text-[#FFF1C5] hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] select-none"
                        >
                          <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                          <span className="whitespace-nowrap">اتصال هاتفي مباشر بالفرع ({branchPhone})</span>
                        </a>
                      )}
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
