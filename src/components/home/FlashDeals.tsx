import React from 'react';
import { Flame, Clock } from 'lucide-react';
import { Product } from '../../types';
import { ProductCard } from '../common/ProductCard';

interface FlashDealsProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
  favorites?: string[];
  onToggleFavorite?: (productId: string) => void;
}

export const FlashDeals: React.FC<FlashDealsProps> = ({
  products,
  onAddToCart,
  onSelectProduct = () => {},
  favorites = [],
  onToggleFavorite,
}) => {
  // Take featured items strictly from menu
  const dealProducts = products.slice(0, 4);

  return (
    <section className="space-y-4 dir-rtl">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-red-950/70 via-[#1F140D] to-amber-950/70 p-4 rounded-2xl border border-red-500/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 text-white shadow-lg animate-bounce">
            <Flame className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#FFF1C5] font-heading">
                عروض اليوم والتخفيضات السريعة ⚡
              </h2>
              <span className="text-[10px] bg-red-600 text-white font-extrabold px-2 py-0.5 rounded-md animate-pulse">
                خصومات حصرية
              </span>
            </div>
            <p className="text-xs text-[#C8BFB0]">
              كميات محدودة تنتهي اليوم - خصومات تصل حتى 30% على طلبات الأونلاين
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-xs text-[#F4E08B] font-bold">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>تتجدد العروض يومياً الساعة 12 منتصف الليل</span>
        </div>
      </div>

      {/* Flash Deals Product Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dealProducts.map((product, idx) => (
          <ProductCard
            key={`${product.id}-${idx}`}
            product={product}
            priority={idx < 4}
            onAddToCart={onAddToCart}
            onSelectProduct={onSelectProduct}
            isFavorite={favorites.includes(product.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  );
};
