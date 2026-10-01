import React from 'react';
import { Clock, Plus } from 'lucide-react';
import { Product } from '../../types';
import { formatPrice } from '../../lib/utils';
import { Images } from '../../data/images';
import { ProductImage } from '../common/ProductImage';

interface RecentlyViewedProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
  products,
  onAddToCart,
  onSelectProduct,
}) => {
  if (!products || products.length === 0) return null;

  return (
    <section className="space-y-3 dir-rtl my-6">
      <div className="flex items-center gap-2 text-xs font-bold text-[#C8BFB0]">
        <Clock className="w-4 h-4 text-[#D4AF37]" />
        <span>المنتجات التي شاهدتها مؤخراً</span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
        {products.map((product, idx) => (
          <div
            key={`${product.id}-${idx}`}
            className="w-44 shrink-0 p-3 rounded-2xl bg-[#140E0A] border border-[#2D2017] hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between space-y-2 group"
          >
            <div
              className="relative h-28 rounded-xl overflow-hidden cursor-pointer"
              onClick={() => onSelectProduct(product)}
            >
              <ProductImage
                src={product.image || product.imageUrl}
                alt={product.nameAr}
                className="w-full h-full group-hover:scale-105 transition-transform"
              />
            </div>

            <div>
              <h4
                onClick={() => onSelectProduct(product)}
                className="text-xs font-bold text-[#FFF1C5] truncate group-hover:text-[#F4E08B] cursor-pointer"
              >
                {product.nameAr}
              </h4>
              <span className="text-xs font-extrabold text-[#F4E08B] block mt-0.5">
                {formatPrice(product.price)}
              </span>
            </div>

            <button
              onClick={() => onAddToCart(product)}
              className="w-full py-1.5 rounded-lg bg-[#221710] border border-[#3D2C1E] text-[#F4E08B] hover:bg-gold-gradient hover:text-black font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>أضف</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
