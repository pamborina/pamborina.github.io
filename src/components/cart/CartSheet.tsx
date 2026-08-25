import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  Check,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  Info,
  Gift,
  Truck,
  Zap,
  Store,
  AlertTriangle,
} from 'lucide-react';
import { CartItem, Product, Coupon } from '../../types';
import { DEFAULT_PRESET_COUPONS } from '../../services/siteSettingsService';
import { formatPrice } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { Images } from '../../data/images';
import { ProductImage } from '../common/ProductImage';
import { useSiteSettings } from '../../context/SiteSettingsContext';

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onClearCart: () => void;
  allProducts: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onProceedToCheckout?: () => void;
}

const PRESET_COUPONS: Coupon[] = DEFAULT_PRESET_COUPONS;

const FREE_DELIVERY_THRESHOLD = 200; // EGP

export const CartSheet: React.FC<CartSheetProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onClearCart,
  allProducts,
  onAddToCart,
  onProceedToCheckout,
}) => {
  const { showToast } = useToast();
  const { isStoreOpen, temporaryClosureReasonAr, minOrderAmount, defaultDeliveryFee, couponsEnabled, coupons } = useSiteSettings();

  const activeCoupons = useMemo(() => {
    return (coupons && coupons.length > 0 ? coupons : PRESET_COUPONS).filter((c) => c.enabled !== false);
  }, [coupons]);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercent?: number;
    freeShipping?: boolean;
  } | null>(null);

  // Clear applied coupon if master toggle disabled
  useEffect(() => {
    if (couponsEnabled === false && appliedCoupon) {
      setAppliedCoupon(null);
    }
  }, [couponsEnabled, appliedCoupon]);

  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);

  // Subtotal Calculation
  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // Free delivery calculation
  const isFreeDeliveryQualified =
    subtotal >= FREE_DELIVERY_THRESHOLD || (appliedCoupon && appliedCoupon.freeShipping);
  const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const freeDeliveryProgress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  // Delivery Fee
  const standardDeliveryFee = 0;
  const deliveryFee = 0;

  // Coupon Discount Calculation
  const couponDiscountAmount =
    appliedCoupon && appliedCoupon.discountPercent
      ? Math.round((subtotal * appliedCoupon.discountPercent) / 100)
      : 0;

  // Tax (14% VAT)
  const taxAmount = 0;

  // Grand Total
  const grandTotal = Math.max(0, subtotal - couponDiscountAmount);
  const isBelowMinOrder = minOrderAmount > 0 && subtotal < minOrderAmount;
  const minOrderProgress = minOrderAmount > 0 ? Math.min(100, Math.round((subtotal / minOrderAmount) * 100)) : 100;

  // Total Savings
  const totalSavings = couponDiscountAmount + (isFreeDeliveryQualified ? standardDeliveryFee : 0);

  // Apply Coupon Handler
  const handleApplyCoupon = (codeToApply?: string) => {
    if (couponsEnabled === false) {
      showToast('خدمة الكوبونات متوقفة حالياً', 'نعتذر، تم إيقاف استقبال الكوبونات مؤقتاً', 'error');
      return;
    }

    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) return;

    const found = activeCoupons.find((c) => c.code.toUpperCase() === code);
    if (found) {
      setAppliedCoupon(found);
      setCouponCode('');
      showToast('تم تطبيق الكوبون! 🎉', `تم تفعيل ${found.description}`, 'success');
    } else {
      showToast('كوبون غير صالح', 'الكوبون غير موجود أو منتهي الصلاحية', 'error');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    showToast('تم إزالة الكوبون', '', 'info');
  };

  // Recommendations outside menu removed as per strict requirements
  const recommendations: Product[] = [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-end bg-black/80 backdrop-blur-md dir-rtl overflow-hidden">
          {/* Overlay Click to Close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />

          {/* Cart Drawer Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full sm:max-w-md md:max-w-lg h-[90vh] sm:h-full bg-[#160E09] border-t sm:border-t-0 sm:border-r border-[#2D2017] rounded-t-3xl sm:rounded-none shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col justify-between overflow-hidden z-10 text-[#FFF1C5]"
          >
            {/* 1. Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-[#2C1F16] bg-[#120B07] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-[#221710] border border-[#3D2C1E] flex items-center justify-center text-[#C8BFB0] hover:text-[#FFF1C5] hover:border-[#D4AF37] transition-all cursor-pointer"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 3, repeatDelay: 4 }}
                    >
                      <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                    </motion.div>
                    <h2 className="text-base sm:text-lg font-black text-[#FFF1C5] font-heading">
                      سلة الطلبات
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black font-black text-xs">
                      {cartItems.reduce((sum, item) => sum + item.quantity, 0)} منتجات
                    </span>
                  </div>
                  <p className="text-xs text-[#A89C8C] mt-0.5">فرع بامبورينا - فيصل شارع العشرين</p>
                </div>
              </div>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 bg-rose-950/40 border border-rose-500/30 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تفرغ السلة</span>
                </button>
              )}
            </div>

            {/* 2. Free Delivery Threshold Banner */}
            {cartItems.length > 0 && (
              <div className="shrink-0 bg-[#1F150D] border-b border-[#2C1F16] p-3 sm:p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-[#FFF1C5]">
                    <Truck className="w-4 h-4 text-[#D4AF37]" />
                    {isFreeDeliveryQualified ? (
                      <span className="text-emerald-400 font-extrabold">
                        تهانينا! حصلت على توصيل مجاني 🎉
                      </span>
                    ) : (
                      <span>
                        أضف <strong className="text-[#F4E08B] font-black">{formatPrice(remainingForFreeDelivery)}</strong> للحصول على توصيل مجاني!
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-[#A89C8C]">{Math.round(freeDeliveryProgress)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#120B07] overflow-hidden border border-[#2D2017]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${freeDeliveryProgress}%` }}
                    className="h-full bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-emerald-400 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            )}

            {/* 3. Main Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-[#3D2C1E]">
              {cartItems.length === 0 ? (
                /* Empty Cart State */
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto">
                  <div className="w-24 h-24 rounded-full bg-[#221710] border border-[#3D2C1E] flex items-center justify-center text-[#D4AF37] shadow-2xl">
                    <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-[#FFF1C5] font-heading">
                      سلتك فارغة حالياً!
                    </h3>
                    <p className="text-xs text-[#A89C8C] max-w-xs mx-auto">
                      استكشف أشهر أصناف بامبورينا من الفطائر، الكريب، المشويات والحلويات الملكية.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-xs sm:text-sm shadow-xl hover:brightness-110 transition-all cursor-pointer"
                  >
                    متابعة التسوق
                  </button>
                </div>
              ) : (
                <>
                  {/* Cart Items List with Swipe-to-Delete */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-[#A89C8C] uppercase tracking-wider">
                      المنتجات المختارة ({cartItems.length})
                    </h3>

                    {cartItems.map((item, idx) => {
                      const latestProduct = allProducts.find((p) => p.id === item.product.id);
                      const isItemAvailable = latestProduct
                        ? (latestProduct.isAvailable !== undefined ? latestProduct.isAvailable : (latestProduct.available !== undefined ? latestProduct.available : true))
                        : (item.product.isAvailable !== undefined ? item.product.isAvailable : (item.product.available !== undefined ? item.product.available : true));

                      return (
                      <motion.div
                        key={`${item.id}-${idx}`}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className={`relative rounded-2xl bg-[#1D140D] border p-3.5 space-y-2.5 transition-all shadow-md group overflow-hidden ${
                          !isItemAvailable ? 'border-rose-500/50 bg-rose-950/20' : 'border-[#2D2017] hover:border-[#3D2C1E]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Image & Main Info */}
                          <div className="flex items-center gap-3">
                            <ProductImage
                              src={item.product.image || item.product.imageUrl}
                              alt={item.product.nameAr}
                              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-[#2D2017] shrink-0 ${
                                !isItemAvailable ? 'grayscale opacity-60' : ''
                              }`}
                            />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-black text-[#FFF1C5] line-clamp-1">
                                  {item.product.nameAr}
                                </h4>
                                {!isItemAvailable && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 font-bold border border-rose-500/40">
                                    غير متوفر حالياً
                                  </span>
                                )}
                              </div>

                              {/* Selected Variant */}
                              {item.selectedVariant && (
                                <span className="inline-block text-[11px] text-[#D4AF37] font-bold mt-0.5">
                                  {item.selectedVariant.nameAr}
                                </span>
                              )}

                              {/* Selected Addons list */}
                              {item.selectedAddons && item.selectedAddons.length > 0 && (
                                <div className="text-[10px] text-[#A89C8C] mt-0.5 line-clamp-1">
                                  + {item.selectedAddons.map((a) => a.addonNameAr).join(', ')}
                                </div>
                              )}

                              {/* Unit Price */}
                              <div className="text-xs font-extrabold text-[#F4E08B] mt-1">
                                {formatPrice(item.totalPrice)}
                              </div>
                            </div>
                          </div>

                          {/* Delete Item Button */}
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, 0)}
                            className="p-1.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-400 hover:text-rose-200 transition-all cursor-pointer active:scale-90"
                            title="إزالة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Quantity Control Stepper */}
                        <div className="pt-2 border-t border-[#2C1F16] flex items-center justify-between">
                          <span className="text-[11px] text-[#8E8373]">الكمية:</span>
                          <div className="flex items-center gap-2 bg-[#120B07] border border-[#3D2C1E] px-2 py-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-[#221710] flex items-center justify-center text-white hover:text-[#D4AF37] transition-all cursor-pointer active:scale-90"
                              title="تقليل"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-black text-[#FFF1C5]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              disabled={!isItemAvailable}
                              className="w-7 h-7 rounded-lg bg-[#221710] flex items-center justify-center text-white hover:text-[#D4AF37] transition-all cursor-pointer active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="زيادة"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                    })}
                  </div>

                  {/* 4. Cross Selling & Recommended Upsell Additions */}
                  {recommendations.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-[#2C1F16]">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-[#FFF1C5] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>أكمل وجبتك بطعم أحلى 🥤🍟</span>
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                        {recommendations.map((rec, idx) => (
                          <div
                            key={`${rec.id}-${idx}`}
                            className="shrink-0 w-36 p-2.5 rounded-2xl bg-[#1D140D] border border-[#2D2017] flex flex-col justify-between gap-2"
                          >
                            <ProductImage
                              src={rec.image || rec.imageUrl}
                              alt={rec.nameAr}
                              className="w-full h-20 rounded-xl"
                            />
                            <div>
                              <h5 className="text-[11px] font-bold text-[#FFF1C5] line-clamp-1">
                                {rec.nameAr}
                              </h5>
                              <span className="text-xs font-black text-[#F4E08B] mt-0.5 block">
                                {formatPrice(rec.price)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onAddToCart(rec, 1);
                                showToast('تمت الإضافة السريعة!', `تم إضافة ${rec.nameAr} للسلة`, 'success');
                              }}
                              className="w-full py-1.5 rounded-xl bg-[#281C13] border border-[#D4AF37] text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all cursor-pointer"
                            >
                              + أضف بـ {formatPrice(rec.price)}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Coupons & Discount Promo Codes Section */}
                  {couponsEnabled !== false && (
                    <div className="p-4 rounded-2xl bg-[#1D140D] border border-[#2D2017] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#FFF1C5] flex items-center gap-1.5">
                          <Tag className="w-4 h-4 text-[#D4AF37]" />
                          <span>كوبونات الخصم والعروض:</span>
                        </span>
                        {appliedCoupon && (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            مفعل ✓
                          </span>
                        )}
                      </div>

                      {appliedCoupon ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs">
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-emerald-400" />
                            <div>
                              <span className="font-extrabold text-emerald-300 block">
                                كوبون {appliedCoupon.code}
                              </span>
                              <span className="text-[10px] text-emerald-400/80">
                                وفرت {formatPrice(couponDiscountAmount)} على الطلب
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                              placeholder={`أدخل رمز الكوبون${activeCoupons.length > 0 ? ` (مثال: ${activeCoupons[0].code})` : ''}`}
                              className="flex-1 px-3 py-2 rounded-xl bg-[#120B07] border border-[#3D2C1E] text-xs text-[#FFF1C5] placeholder-[#6E6353] focus:border-[#D4AF37] focus:outline-none uppercase"
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyCoupon()}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black font-extrabold text-xs cursor-pointer hover:brightness-110"
                            >
                              تطبيق
                            </button>
                          </div>

                          {/* Active Coupon Quick Chips */}
                          {activeCoupons.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {activeCoupons.map((c) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => handleApplyCoupon(c.code)}
                                  className="px-2.5 py-1 rounded-lg bg-[#221710] hover:bg-[#2C1F16] border border-[#3D2C1E] text-[10px] font-bold text-[#D4AF37] transition-all cursor-pointer"
                                  title={c.description}
                                >
                                  ⚡ {c.code}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. Comprehensive Order Breakdown */}
                  <div className="p-4 rounded-2xl bg-[#1D140D] border border-[#2D2017] space-y-2.5 text-xs">
                    <h4 className="font-black text-[#FFF1C5] pb-1 border-b border-[#2C1F16]">
                      ملخص الحساب والتكاليف
                    </h4>

                    <div className="flex items-center justify-between text-[#C8BFB0]">
                      <span>مجموع المنتجات:</span>
                      <span className="font-bold">{formatPrice(subtotal)}</span>
                    </div>

                    {couponDiscountAmount > 0 && (
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span>خصم الكوبون ({appliedCoupon?.code}):</span>
                        <span>-{formatPrice(couponDiscountAmount)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[#C8BFB0]">
                      <span>رسوم التوصيل:</span>
                      <span className="font-bold text-[#F4E08B] text-xs">
                        تحدد بناءً على المسافة عبر الواتساب
                      </span>
                    </div>

                    {totalSavings > 0 && (
                      <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-950/60 to-amber-950/60 border border-emerald-500/30 text-emerald-300 font-extrabold text-[11px] flex items-center justify-between">
                        <span>إجمالي ما وفرته في هذا الطلب:</span>
                        <span>{formatPrice(totalSavings)} 🎉</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[#2C1F16] flex items-center justify-between text-base font-black text-[#FFF1C5]">
                      <span>الإجمالي التقديري:</span>
                      <span className="text-xl font-black text-[#F4E08B] font-heading">
                        {formatPrice(grandTotal)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#2C1F16] flex items-center justify-between text-base font-black text-[#FFF1C5]">
                      <span>الإجمالي التقديري:</span>
                      <span className="text-xl font-black text-[#F4E08B] font-heading">
                        {formatPrice(grandTotal)}
                      </span>
                    </div>
                  </div>

                </>
              )}
            </div>

            {/* 8. Sticky Checkout CTA Bottom Bar */}
            {cartItems.length > 0 && (
              <div className="shrink-0 p-4 sm:p-5 border-t border-[#2C1F16] bg-[#120B07] space-y-3 z-20">
                {!isStoreOpen && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                    <Store className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      <span className="font-bold block mb-0.5">المتجر مغلق مؤقتاً:</span>
                      {temporaryClosureReasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..'}
                    </span>
                  </div>
                )}

                {isBelowMinOrder && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/70 to-neutral-900 border border-amber-500/40 text-xs space-y-2">
                    <div className="flex items-center justify-between text-amber-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>الحد الأدنى للطلب: {formatPrice(minOrderAmount)}</span>
                      </span>
                      <span className="text-amber-200 font-black">
                        يتبقى {formatPrice(minOrderAmount - subtotal)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                        style={{ width: `${minOrderProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-400 block text-right">
                      يرجى إضافة أصناف إضافية بقيمة {formatPrice(minOrderAmount - subtotal)} للتمكن من إتمام الطلب.
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8E8373]">إجمالي المشتريات:</span>
                  <span className="text-lg font-black text-[#F4E08B] font-heading">
                    {formatPrice(grandTotal)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#140E0A] border border-[#2D2017] text-[#A89C8C] text-[11px] leading-relaxed">
                  <span className="text-[#D4AF37] font-bold">ملاحظة:</span> رسوم التوصيل يتم احتسابها من بعد ارسال الطلب ع الواتساب، ويتم تحديدها من خلال الفرع بناءً على عدد الكيلومترات ومكان العميل.
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  disabled={!isStoreOpen || isBelowMinOrder}
                  onClick={() => {
                    if (!isStoreOpen) {
                      showToast('المتجر مغلق مؤقتاً', temporaryClosureReasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..', 'error');
                      return;
                    }

                    if (isBelowMinOrder) {
                      showToast('الحد الأدنى للطلب', `الحد الأدنى للطلب هو ${formatPrice(minOrderAmount)}`, 'error');
                      return;
                    }

                    const hasUnavailable = cartItems.some((item) => {
                      const latestProduct = allProducts.find((p) => p.id === item.product.id);
                      if (latestProduct) {
                        return latestProduct.isAvailable === false || latestProduct.available === false;
                      }
                      return item.product.isAvailable === false || item.product.available === false;
                    });

                    if (hasUnavailable) {
                      showToast(
                        'أصناف غير متوفرة في السلة',
                        'يرجى حذف الأصناف الموقوفة/غير المتوفرة من السلة لإكمال الطلب',
                        'error'
                      );
                      return;
                    }

                    if (onProceedToCheckout) {
                      onProceedToCheckout();
                    } else {
                      showToast(
                        'تم إتمام الطلب! 🚀',
                        `تم تأكيد الطلب بقيمة ${formatPrice(grandTotal)} وجاري تحضيره`,
                        'success'
                      );
                      onClose();
                    }
                  }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-sm sm:text-base shadow-[0_4px_35px_rgba(212,175,55,0.4)] hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5 text-black stroke-[2.5]" />
                  <span>
                    {!isStoreOpen ? 'المتجر مغلق مؤقتاً' : isBelowMinOrder ? 'أقل من الحد الأدنى للطلب' : 'إتمام الطلب'}
                  </span>
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
