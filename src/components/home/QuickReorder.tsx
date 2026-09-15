import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Sparkles, Check, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Product } from '../../types';
import { formatPrice } from '../../lib/utils';
import { Images } from '../../data/images';
import { ProductImage } from '../common/ProductImage';

interface QuickReorderProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onReorderAll?: () => void;
}

export const QuickReorder: React.FC<QuickReorderProps> = ({
  products,
  onAddToCart,
  onReorderAll,
}) => {
  // Select top 3 repeat favorites
  const repeatProducts = products.slice(0, 3);

  return (
    <section className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-[#211710] via-[#160E08] to-[#211710] border border-[#D4AF37]/30 shadow-2xl dir-rtl space-y-4">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#3D2C1E] border border-[#D4AF37] text-[#F4E08B] shadow-lg">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#FFF1C5] font-heading">
                إعادة طلب وجباتك المفضلة بنقرة واحدة ⚡
              </h2>
              <span className="text-[10px] bg-gold-gradient text-black px-2 py-0.5 rounded-full font-extrabold">
                توفير وقتك
              </span>
            </div>
            <p className="text-xs text-[#C8BFB0]">
              أصناف تحبها واعتدت طلبها دائماً من فرع فيصل والطالبية
            </p>
          </div>
        </div>

        {onReorderAll && (
          <button
            onClick={onReorderAll}
            className="px-4 py-2 rounded-xl bg-gold-gradient text-black font-extrabold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-black" />
            <span>إعادة طلب الجميع بالسلة</span>
          </button>
        )}
      </div>

      {/* Quick Reorder Items Track */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {repeatProducts.map((product, idx) => (
          <div
            key={`${product.id}-${idx}`}
            className="p-3 rounded-2xl bg-[#140E0A] border border-[#2D2017] hover:border-[#D4AF37]/50 transition-all flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <ProductImage
                src={product.image || product.imageUrl}
                alt={product.nameAr}
                className="w-14 h-14 rounded-xl shrink-0 border border-[#3D2C1E]"
              />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-[#FFF1C5] truncate group-hover:text-[#F4E08B] transition-colors">
                  {product.nameAr}
                </h4>
                <span className="text-xs font-extrabold text-[#F4E08B] block mt-0.5">
                  {formatPrice(product.price)}
                </span>
                <span className="text-[10px] text-[#8E8373] block">طلبتها 3 مرات هذا الشهر</span>
              </div>
            </div>

            <button
              onClick={() => onAddToCart(product)}
              className="p-2.5 rounded-xl bg-[#221710] border border-[#3D2C1E] text-[#F4E08B] hover:bg-gold-gradient hover:text-black hover:border-[#D4AF37] transition-all cursor-pointer shrink-0"
              title="إعادة إضافة"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
