import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  Plus,
  Check,
  Heart,
  Eye,
  Clock,
  Sparkles,
  Flame,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { Product } from '../../types';
import { formatPrice } from '../../lib/utils';
import { Images } from '../../data/images';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { useToast } from '../ui/Toast';

import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity?: number) => void;
  onSelectProduct: (product: Product) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  layout?: 'grid' | 'compact' | 'horizontal';
  priority?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onSelectProduct,
  isFavorite = false,
  onToggleFavorite,
  layout = 'grid',
  priority = false,
}) => {
  const { isStoreOpen, temporaryClosureReasonAr } = useSiteSettings();
  const { showToast } = useToast();
  const [isAdded, setIsAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isAvailable =
    product.isAvailable !== undefined
      ? product.isAvailable
      : product.available !== undefined
      ? product.available
      : true;

  const isEffectiveAvailable = isAvailable && isStoreOpen;

  // Use originalPrice strictly if present in product data
  const oldPrice =
    product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : undefined;

  const discountPercent = oldPrice
    ? Math.round(((oldPrice - product.price) / oldPrice) * 100)
    : 0;

  const discountAmount = oldPrice ? oldPrice - product.price : 0;

  const isBestseller =
    product.tags?.includes('Bestseller') ||
    product.tags?.includes('Signature') ||
    product.featured;

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isStoreOpen) {
      showToast(
        'الفرع مغلق حالياً 🔴',
        temporaryClosureReasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..',
        'error'
      );
      return;
    }
    if (!isAvailable) {
      showToast('الصنف غير متاح', 'هذا الصنف غير متوفر حالياً', 'error');
      return;
    }
    onAddToCart(product, 1);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1600);
  };

  return (
    <motion.div
      whileHover={isEffectiveAvailable ? { y: -6, scale: 1.01 } : { y: -2 }}
      whileTap={isEffectiveAvailable ? { scale: 0.98 } : undefined}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onSelectProduct(product)}
      className={`group relative rounded-3xl bg-[#160E09] border shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer select-none dir-rtl ${
        !isEffectiveAvailable
          ? 'border-neutral-800/80 opacity-90'
          : 'border-[#2D2017] hover:border-[#D4AF37]/80 hover:shadow-[0_20px_40px_rgba(212,175,55,0.22)]'
      }`}
    >
      {/* Top Media Section */}
      <div>
        <div className="relative w-full h-48 sm:h-56 overflow-hidden rounded-t-3xl bg-[#0F0804]">
          {/* Main Product Image */}
          <ProductImage
            src={product.image || product.imageUrl}
            alt={product.nameAr}
            priority={priority}
            className={`w-full h-full transition-transform duration-700 ease-out ${
              !isEffectiveAvailable ? 'grayscale-[0.5] opacity-75' : 'group-hover:scale-110'
            }`}
          />

          {/* Dark Vignette Overlay for Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#160E09] via-transparent to-black/30 opacity-80 group-hover:opacity-60 transition-opacity duration-300" />

          {/* Top Right Badges: Store Closure, Availability, and Discount */}
          <div className="absolute top-3 right-3 flex flex-col items-start gap-1.5 z-10">
            {!isStoreOpen ? (
              <span className="inline-flex items-center gap-1 bg-rose-950/95 text-rose-200 border border-rose-500/60 font-black text-[11px] px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>الفرع مغلق 🔴</span>
              </span>
            ) : !isAvailable ? (
              <span className="inline-flex items-center gap-1 bg-rose-950/90 text-rose-300 border border-rose-500/50 font-black text-[11px] px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>غير متوفر حالياً</span>
              </span>
            ) : discountPercent > 0 ? (
              <motion.span
                initial={{ scale: 0.9 }}
                animate={{ scale: [0.95, 1.05, 0.95] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="inline-flex items-center gap-1 bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white font-black text-[11px] px-2.5 py-1 rounded-full shadow-lg border border-red-400/40"
              >
                <Zap className="w-3 h-3 fill-white text-white" />
                <span>خصم {discountPercent}%</span>
              </motion.span>
            ) : null}
          </div>

          {/* Top Left: Favorite Heart Button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(product.id);
              }}
              className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:text-rose-500 hover:bg-black/80 transition-all active:scale-90 shadow-lg cursor-pointer"
              title="إضافة للمفضلة"
            >
              <motion.div whileTap={{ scale: 1.4 }}>
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isFavorite
                      ? 'text-rose-500 fill-rose-500 shadow-sm'
                      : 'text-white group-hover:text-rose-400'
                  }`}
                />
              </motion.div>
            </button>
          )}

          {/* Quick Preview Hover Trigger (Desktop) */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="hidden sm:flex absolute inset-0 bg-black/40 backdrop-blur-[2px] items-center justify-center z-20"
              >
                <span className="px-4 py-2 rounded-2xl bg-black/80 border border-[#D4AF37] text-[#FFF1C5] text-xs font-black flex items-center gap-2 shadow-2xl hover:bg-[#D4AF37] hover:text-black transition-colors">
                  <Eye className="w-4 h-4" />
                  <span>معاينة سريعة</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-2">
          {/* Title */}
          <h3 className="text-base sm:text-lg font-black text-[#FFF1C5] group-hover:text-[#F4E08B] transition-colors line-clamp-1 font-heading leading-tight">
            {product.nameAr}
          </h3>

          {/* Description - only if written in menu */}
          {(product.shortDescriptionAr || product.descriptionAr) ? (
            <p className="text-xs text-[#A89C8C] line-clamp-2 leading-relaxed">
              {product.shortDescriptionAr || product.descriptionAr}
            </p>
          ) : null}
        </div>
      </div>

      {/* Footer CTA & Pricing Row */}
      <div className="p-4 pt-2 border-t border-[#2C1F16] bg-[#120B07] rounded-b-3xl flex items-center justify-between gap-3">
        {/* Price Column */}
        <div className="flex flex-col">
          {oldPrice && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[#8E8373] line-through font-bold">
                {formatPrice(oldPrice)}
              </span>
              <span className="text-emerald-400 font-extrabold text-[10px]">
                وفر {formatPrice(discountAmount)}
              </span>
            </div>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF1C5] via-[#F4E08B] to-[#D4AF37] font-heading">
              {formatPrice(product.price)}
            </span>
          </div>
        </div>

        {/* Add to Cart Conversion CTA Button */}
        {!isStoreOpen ? (
          <button
            type="button"
            onClick={handleAddClick}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl font-black text-xs bg-rose-950/90 text-rose-300 border border-rose-500/50 hover:bg-rose-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>الفرع مغلق 🔴</span>
          </button>
        ) : !isAvailable ? (
          <button
            type="button"
            disabled
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl font-bold text-xs bg-neutral-800/90 text-neutral-400 border border-neutral-700/80 cursor-not-allowed flex items-center justify-center gap-1.5 opacity-90"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>غير متوفر</span>
          </button>
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={handleAddClick}
            className={`relative px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
              isAdded
                ? 'bg-emerald-500 text-black shadow-emerald-500/40 ring-2 ring-emerald-400'
                : 'bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-95'
            }`}
          >
            <AnimatePresence mode="wait">
              {isAdded ? (
                <motion.div
                  key="added"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>تمت الإضافة!</span>
                </motion.div>
              ) : (
                <motion.div
                  key="add"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4 text-black stroke-[2.5]" />
                  <span>إضافة إلى السلة</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
