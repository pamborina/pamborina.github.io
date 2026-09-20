import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Product } from '../../types';
import { ProductCard } from '../common/ProductCard';

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badgeText?: string;
  products: Product[];
  onAddToCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  favorites?: string[];
  onToggleFavorite?: (productId: string) => void;
  viewAllCategoryId?: string;
  onViewAll?: (categoryId: string) => void;
}

export const ProductSection: React.FC<ProductSectionProps> = ({
  title,
  subtitle,
  icon,
  badgeText,
  products,
  onAddToCart,
  onSelectProduct,
  favorites = [],
  onToggleFavorite,
  viewAllCategoryId,
  onViewAll,
}) => {
  return (
    <section className="space-y-4 dir-rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2C1F16] pb-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2.5 rounded-2xl bg-[#2D2017] border border-[#D4AF37]/50 text-[#F4E08B]">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#FFF1C5] font-heading">
                {title}
              </h2>
              {badgeText && (
                <span className="text-[10px] bg-gold-gradient text-black px-2 py-0.5 rounded-full font-black">
                  {badgeText}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-[#8E8373]">{subtitle}</p>}
          </div>
        </div>

        {viewAllCategoryId && onViewAll && (
          <button
            onClick={() => onViewAll(viewAllCategoryId)}
            className="flex items-center gap-1 text-xs text-[#F4E08B] hover:underline font-bold cursor-pointer"
          >
            <span>عرض الكل</span>
            <ArrowLeft className="w-3.5 h-3.5 text-[#D4AF37]" />
          </button>
        )}
      </div>

      {/* Grid of Products using conversion-optimized ProductCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
        {products.map((product, idx) => (
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
