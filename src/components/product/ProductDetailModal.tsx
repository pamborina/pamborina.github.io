import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Star,
  Clock,
  Flame,
  Plus,
  Minus,
  Check,
  Heart,
  Share2,
  Sparkles,
  ShoppingBag,
  ChefHat,
  ShieldCheck,
  Utensils,
  Maximize2,
  ThumbsUp,
  MessageSquare,
  Zap,
  Info,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Tag,
  Store,
} from 'lucide-react';
import { Product, ProductVariant, ProductAddon } from '../../types';
import { formatPrice } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { Images } from '../../data/images';
import { ProductImage } from '../common/ProductImage';
import { ImageMagnifier } from '../common/ImageMagnifier';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, options?: any) => void;
  allProducts: Product[];
  onSelectProduct: (product: Product) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
}

// Get gallery images for product (defaults to single image)
const getGalleryForProduct = (product: Product): string[] => {
  const mainImg = product.imageUrl || product.image || Images.defaultFood;
  if (product.galleryImages && product.galleryImages.length > 0) {
    return [mainImg, ...product.galleryImages];
  }
  return [mainImg];
};

// Get ingredients strictly from product
const getAuthenticIngredients = (product: Product): string[] => {
  if (product.ingredientsAr && product.ingredientsAr.length > 0) {
    return product.ingredientsAr;
  }
  return [];
};

// Size variants if product explicitly has them
const getAuthenticVariants = (product: Product): ProductVariant[] => {
  if (product.variants && product.variants.length > 0) {
    return product.variants;
  }
  return [];
};

// Extra additions if product explicitly has them
const getAuthenticAddons = (product: Product): { id: string; nameAr: string; price: number }[] => {
  const p = product as any;
  if (p.addons && Array.isArray(p.addons) && p.addons.length > 0) {
    return p.addons;
  }
  return [];
};

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  allProducts,
  onSelectProduct,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const { showToast } = useToast();
  const { isStoreOpen, temporaryClosureReasonAr } = useSiteSettings();

  const gallery = product ? getGalleryForProduct(product) : [];
  const ingredients = product ? getAuthenticIngredients(product) : [];
  const variants = product ? getAuthenticVariants(product) : [];
  const availableAddons = product ? getAuthenticAddons(product) : [];

  // States
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(variants[0] || null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [removedIngredientNames, setRemovedIngredientNames] = useState<string[]>([]);
  const [customerNotes, setCustomerNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Reset local state when product changes
  useEffect(() => {
    if (!product) return;
    const currentVariants = getAuthenticVariants(product);
    setActiveImageIndex(0);
    setSelectedVariant(currentVariants[0] || null);
    setSelectedAddonIds([]);
    setRemovedIngredientNames([]);
    setCustomerNotes('');
    setQuantity(1);
  }, [product?.id]);

  if (!product) return null;

  const isAvailable =
    product.isAvailable !== undefined
      ? product.isAvailable
      : product.available !== undefined
      ? product.available
      : true;

  const isEffectiveAvailable = isAvailable && isStoreOpen;

  const currentVariant = selectedVariant || {
    id: 'default',
    nameAr: 'الأساسي',
    nameEn: 'الأساسي',
    price: product.price,
  };

  // Price Calculation
  const addonsPriceSum = selectedAddonIds.reduce((sum, id) => {
    const item = availableAddons.find((a) => a.id === id);
    return sum + (item ? item.price : 0);
  }, 0);

  const unitPrice = (selectedVariant ? selectedVariant.price : product.price) + addonsPriceSum;
  const totalPrice = unitPrice * quantity;

  // Toggle Addon
  const toggleAddon = (id: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Add To Cart Handler
  const handleAddToCartSubmit = () => {
    if (!isStoreOpen) {
      showToast(
        'الفرع مغلق حالياً 🔴',
        temporaryClosureReasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..',
        'error'
      );
      return;
    }

    if (!isAvailable) {
      showToast('المنتج غير متوفر', 'هذا الصنف غير متاح للطلب في الوقت الحالي', 'error');
      return;
    }

    onAddToCart(product, quantity, {
      variant: selectedVariant,
      addons: availableAddons.filter((a) => selectedAddonIds.includes(a.id)),
      removedIngredients: removedIngredientNames,
      notes: customerNotes,
      unitPrice,
      totalPrice,
    });

    showToast(
      'تمت الإضافة للسلة! 🛒',
      `تم إضافة ${product.nameAr} بسعر ${formatPrice(totalPrice)}`,
      'success'
    );
    onClose();
  };

  // Related products from same category
  const relatedProducts = allProducts
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md dir-rtl overflow-hidden">
          {/* Overlay Backdrop Click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />

          {/* Main Modal Container */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] rounded-3xl bg-[#160E09] border border-[#2D2017] shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden z-10 text-[#FFF1C5]"
          >
            {/* Modal Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-[#2C1F16] bg-[#120B07]/90 backdrop-blur-md flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-[#221710] border border-[#3D2C1E] flex items-center justify-center text-[#C8BFB0] hover:text-[#FFF1C5] hover:border-[#D4AF37] transition-all cursor-pointer active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-xl font-black text-[#FFF1C5] font-heading line-clamp-1">
                      {product.nameAr}
                    </h2>
                    {!isAvailable && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold shrink-0">
                        غير متوفر حالياً
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#A89C8C] mt-0.5">
                    <span className="text-[#D4AF37] font-bold">بامبورينا الملكية</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#D4AF37]" />
                      {product.preparationTimeMinutes || 15} دقيقة
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-2">
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(product.id)}
                    className="w-9 h-9 rounded-full bg-[#221710] border border-[#3D2C1E] flex items-center justify-center text-[#C8BFB0] hover:text-rose-500 transition-all cursor-pointer active:scale-95"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isFavorite ? 'text-rose-500 fill-rose-500' : 'text-white'
                      }`}
                    />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: product.nameAr,
                        text: product.descriptionAr,
                        url: window.location.href,
                      });
                    } else {
                      showToast('تم نسخ الرابط!', 'يمكنك مشاركته مع أصدقائك الآن', 'info');
                    }
                  }}
                  className="w-9 h-9 rounded-full bg-[#221710] border border-[#3D2C1E] flex items-center justify-center text-[#C8BFB0] hover:text-[#D4AF37] transition-all cursor-pointer active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#3D2C1E]">
              {/* 1. Large Image Gallery & Thumbnails */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-12 space-y-3">
                  <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-3xl overflow-hidden border border-[#2D2017] bg-black shadow-2xl group">
                    <ProductImage
                      src={gallery[activeImageIndex]}
                      alt={product.nameAr}
                      priority={true}
                      className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#160E09] via-transparent to-black/20" />

                    {/* Zoom Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsZoomOpen(true)}
                      className="absolute top-3 left-3 p-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-white hover:text-[#D4AF37] transition-all cursor-pointer shadow-lg"
                      title="تكبير الصورة"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>

                    {/* Gallery Navigation Arrows */}
                    {gallery.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImageIndex((prev) =>
                              prev === 0 ? gallery.length - 1 : prev - 1
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:text-[#D4AF37] transition-all cursor-pointer"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImageIndex((prev) =>
                              prev === gallery.length - 1 ? 0 : prev + 1
                            )
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:text-[#D4AF37] transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    {/* Floating Badges */}
                    {product.categoryId && (
                      <div className="absolute bottom-4 right-4 flex flex-wrap items-center gap-2">
                        <span className="bg-black/75 backdrop-blur-md border border-[#3D2C1E] text-[#FFF1C5] text-xs font-bold px-3 py-1 rounded-full">
                          {product.nameAr}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Row */}
                  {gallery.length > 1 && (
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 dir-rtl scrollbar-none">
                      {gallery.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                            activeImageIndex === idx
                              ? 'border-[#D4AF37] scale-105 shadow-[0_0_12px_rgba(212,175,55,0.5)]'
                              : 'border-[#2D2017] opacity-60 hover:opacity-100'
                          }`}
                        >
                          <ProductImage src={img} alt="" className="w-full h-full" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Info Section */}
              <div className="space-y-6">
                {/* Formatted Description - rendered ONLY if present */}
                {(product.descriptionAr || product.shortDescriptionAr) && (
                  <div className="p-4 rounded-2xl bg-[#1D140D] border border-[#2D2017] space-y-2">
                    <h3 className="text-sm font-bold text-[#D4AF37] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span>تفاصيل الصنف</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-[#C8BFB0] leading-relaxed">
                      {product.descriptionAr || product.shortDescriptionAr}
                    </p>
                  </div>
                )}

                {/* Size Variants Selection - ONLY if explicitly defined for this product */}
                {variants.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-xs sm:text-sm font-black text-[#FFF1C5] flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-[#D4AF37]" />
                      <span>اختر الحجم أو العبوة المناسبة:</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {variants.map((v, vIdx) => {
                        const isSelected = selectedVariant?.id === v.id;
                        return (
                          <div
                            key={`${v.id}-${vIdx}`}
                            onClick={() => setSelectedVariant(v)}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-[#2A1E14] border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                                : 'bg-[#18100A] border-[#2D2017] hover:border-[#3D2C1E]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#FFF1C5]">
                                {v.nameAr}
                              </span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#D4AF37] stroke-[3]" />
                              )}
                            </div>
                            <span className="text-sm font-black text-[#F4E08B] mt-2">
                              {formatPrice(v.price)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ingredients Chips - ONLY if explicitly written in menu */}
                {ingredients.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs sm:text-sm font-black text-[#FFF1C5] flex items-center gap-1.5">
                      <Utensils className="w-4 h-4 text-[#D4AF37]" />
                      <span>المكونات:</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {ingredients.map((ing, i) => (
                        <span
                          key={`ing-${ing}-${i}`}
                          className="px-3 py-1.5 rounded-xl bg-[#221710] border border-[#3D2C1E] text-xs font-bold text-[#C8BFB0] flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{ing}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Addons Selection - ONLY if explicitly available */}
                {availableAddons.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs sm:text-sm font-black text-[#FFF1C5] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-[#D4AF37]" />
                        <span>إضافات اختيارية:</span>
                      </span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {availableAddons.map((addon, aIdx) => {
                        const isChecked = selectedAddonIds.includes(addon.id);
                        return (
                          <div
                            key={`${addon.id}-${aIdx}`}
                            onClick={() => toggleAddon(addon.id)}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                              isChecked
                                ? 'bg-[#2A1E14] border-[#D4AF37]'
                                : 'bg-[#18100A] border-[#2D2017] hover:border-[#3D2C1E]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                  isChecked
                                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                                    : 'border-[#3D2C1E] bg-[#120B07]'
                                }`}
                              >
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <span className="text-xs font-bold text-[#FFF1C5]">
                                {addon.nameAr}
                              </span>
                            </div>
                            <span className="text-xs font-black text-[#F4E08B]">
                              +{formatPrice(addon.price)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Customer Notes */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-black text-[#FFF1C5] flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                    <span>ملاحظات خاصة بالطلب:</span>
                  </label>
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="اكتب أي ملاحظات للطلب..."
                    rows={2}
                    className="w-full p-3 rounded-2xl bg-[#140E0A] border border-[#2D2017] text-xs text-[#FFF1C5] placeholder-[#6E6353] focus:border-[#D4AF37] focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>

              {/* 4. RELATED PRODUCTS CAROUSEL */}
              {relatedProducts.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-[#2C1F16]">
                  <h4 className="text-xs sm:text-sm font-black text-[#FFF1C5] flex items-center justify-between">
                    <span>قد ينال إعجابك أيضاً:</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {relatedProducts.map((rel, rIdx) => (
                      <div
                        key={`${rel.id}-${rIdx}`}
                        onClick={() => onSelectProduct(rel)}
                        className="p-2.5 rounded-2xl bg-[#140E0A] border border-[#2D2017] hover:border-[#D4AF37] transition-all cursor-pointer group"
                      >
                        <div className="relative h-24 rounded-xl overflow-hidden mb-2">
                          <ProductImage
                            src={rel.image || rel.imageUrl}
                            alt={rel.nameAr}
                            className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <h5 className="text-xs font-bold text-[#FFF1C5] group-hover:text-[#F4E08B] line-clamp-1">
                          {rel.nameAr}
                        </h5>
                        <span className="text-xs font-black text-[#F4E08B] mt-1 block">
                          {formatPrice(rel.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Closure Notice Banner when store is closed */}
            {!isStoreOpen && (
              <div className="mx-4 mb-2 p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs font-bold flex items-center gap-3 shadow-xl">
                <Store className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                <div>
                  <span className="block font-black text-rose-300 text-xs">⚠️ الفرع مغلق حالياً (استقبال الطلبات موقوف)</span>
                  <span className="text-[11px] text-rose-200/90 font-medium leading-relaxed">
                    {temporaryClosureReasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..'}
                  </span>
                </div>
              </div>
            )}

            {/* Sticky Bottom Purchase Bar */}
            <div className="shrink-0 p-4 sm:p-5 border-t border-[#2C1F16] bg-[#120B07] flex items-center justify-between gap-4 z-20">
              {/* Quantity Stepper */}
              <div className={`flex items-center gap-2 bg-[#1A1009] border border-[#3D2C1E] p-1.5 rounded-2xl ${!isEffectiveAvailable ? 'opacity-40 pointer-events-none' : ''}`}>
                <button
                  type="button"
                  disabled={!isEffectiveAvailable}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-xl bg-[#221710] flex items-center justify-center text-white hover:text-[#D4AF37] transition-all active:scale-90 disabled:cursor-not-allowed"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-sm font-black text-[#FFF1C5]">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={!isEffectiveAvailable}
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-xl bg-[#221710] flex items-center justify-center text-white hover:text-[#D4AF37] transition-all active:scale-90 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Price & Primary Add to Cart Conversion Button */}
              <div className="flex-1 flex items-center justify-end gap-3">
                <div className="text-left dir-ltr">
                  <span className="text-[10px] text-[#8E8373] block">الإجمالي الكلي</span>
                  <span className="text-lg sm:text-2xl font-black text-[#F4E08B] font-heading">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                {!isStoreOpen ? (
                  <button
                    type="button"
                    onClick={() =>
                      showToast(
                        'الفرع مغلق حالياً 🔴',
                        temporaryClosureReasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..',
                        'error'
                      )
                    }
                    className="px-6 py-3.5 rounded-2xl bg-rose-950/90 text-rose-300 border border-rose-500/60 font-black text-sm sm:text-base flex items-center gap-2 cursor-pointer shadow-lg hover:bg-rose-900 transition-all"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>الفرع مغلق حالياً 🔴</span>
                  </button>
                ) : !isAvailable ? (
                  <button
                    type="button"
                    disabled
                    className="px-6 py-3.5 rounded-2xl bg-neutral-800 text-neutral-400 border border-neutral-700 font-bold text-sm sm:text-base flex items-center gap-2 cursor-not-allowed"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>غير متوفر حالياً</span>
                  </button>
                ) : (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddToCartSubmit}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-sm sm:text-base shadow-[0_4px_25px_rgba(212,175,55,0.4)] hover:brightness-110 flex items-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-5 h-5 text-black stroke-[2.5]" />
                    <span>أضف إلى السلة</span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Fullscreen Image Zoom Overlay with Interactive Magnifier Lens */}
          <AnimatePresence>
            {isZoomOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4"
              >
                <div className="relative w-full max-w-4xl h-full flex flex-col items-center justify-center pt-10">
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(false)}
                    className="absolute top-2 right-2 z-20 p-3 rounded-full bg-[#22160E] border border-[#3D2C1E] text-white hover:text-[#D4AF37] transition-all cursor-pointer shadow-2xl"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  <ImageMagnifier
                    src={gallery[activeImageIndex]}
                    alt={product.nameAr}
                    defaultZoomLevel={2.5}
                    lensSize={230}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
};
