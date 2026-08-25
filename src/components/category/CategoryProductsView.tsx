import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Search,
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  ChevronLeft,
  X,
  Check,
  Utensils,
  Flame,
  Award,
  BookOpen
} from 'lucide-react';
import { Category, Product } from '../../types';
import { ProductCard } from '../common/ProductCard';
import { preloadImages } from '../common/ProductImage';
import { Button } from '../ui/Button';
import { categoryTranslations, getCategoryArabicName } from '../../constants/categoryTranslations';

interface CategoryProductsViewProps {
  category: Category;
  products: Product[];
  onBack: () => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onSelectProduct: (product: Product) => void;
  favorites: string[];
  onToggleFavorite: (productId: string) => void;
  allCategories: Category[];
  onSelectOtherCategory: (categoryId: string) => void;
}

export const CategoryProductsView: React.FC<CategoryProductsViewProps> = ({
  category,
  products,
  onBack,
  onAddToCart,
  onSelectProduct,
  favorites,
  onToggleFavorite,
  allCategories,
  onSelectOtherCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc'>('default');

  // STRICT FILTERING: Only products matching category.id
  const categoryProducts = products.filter((p) => p.categoryId === category.id);

  // In-category search & sort
  let filteredProducts = categoryProducts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.nameAr.toLowerCase().includes(q) ||
      p.descriptionAr.toLowerCase().includes(q) ||
      p.price.toString().includes(q)
    );
  });

  if (sortBy === 'price_asc') {
    filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price_desc') {
    filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  }

  // Preload image URLs for high-speed display
  useEffect(() => {
    if (filteredProducts.length > 0) {
      const urls = filteredProducts
        .slice(0, 16)
        .map((p) => p.image || p.imageUrl)
        .filter(Boolean) as string[];
      preloadImages(urls);
    }
  }, [category.id, searchQuery, sortBy]);

  return (
    <div className="space-y-6 dir-rtl min-h-[70vh]">
      {/* Top Breadcrumb & Navigation Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[#2C1F16] pb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1E140C] hover:bg-[#2A1D13] border border-[#D4AF37]/40 text-xs sm:text-sm font-black text-[#F4E08B] transition-all cursor-pointer shadow-md active:scale-95 group"
        >
          <ArrowRight className="w-4 h-4 text-[#D4AF37] group-hover:-translate-x-1 transition-transform" />
          <span>رجوع</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#8E8373] font-bold">
          <span className="hidden sm:inline">أركان القائمة</span>
          <span className="hidden sm:inline">/</span>
          <span className="text-[#D4AF37] font-black">{getCategoryArabicName(category)}</span>
        </div>
      </div>

      {/* Hero Category Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#D4AF37]/40 bg-gradient-to-r from-[#2B1B10] via-[#1E120A] to-[#140A04] p-6 sm:p-8 shadow-2xl">
        {category.imageUrl && (
          <div className="absolute inset-0 z-0 opacity-25 pointer-events-none">
            <img
              src={category.imageUrl}
              alt={getCategoryArabicName(category)}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#140A04] via-[#140A04]/80 to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-bold text-[#F4E08B]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{category.emoji || '✨'} ركن خاص ومستقل</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-[#FFF1C5] font-heading tracking-tight flex items-center gap-3">
              <span>{getCategoryArabicName(category)}</span>
              <span className="text-xs sm:text-sm font-bold bg-[#D4AF37] text-black px-3 py-1 rounded-full">
                {categoryProducts.length} صنف
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-[#C8BFB0] leading-relaxed">
              {category.descriptionAr || `استمتع بأشهى أصناف ${getCategoryArabicName(category)} الطازجة المحضرة يومياً بالسمن البلدي في حلواني بامبورينا.`}
            </p>
          </div>

          {/* Category Switcher Shortcuts */}
          <div className="bg-[#18100A]/90 p-3.5 rounded-2xl border border-[#3D2C1E] backdrop-blur-md shrink-0 space-y-2 max-w-xs">
            <span className="text-[11px] font-bold text-[#8E8373] block">التنقل السريع بين الأركان:</span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
              {allCategories
                .filter((c) => c.id !== category.id)
                .slice(0, 6)
                .map((otherCat, idx) => (
                  <button
                    key={`${otherCat.id}-${idx}`}
                    onClick={() => onSelectOtherCategory(otherCat.id)}
                    className="text-[10px] font-bold bg-[#241810] hover:bg-[#322216] text-[#C8BFB0] hover:text-[#F4E08B] border border-[#3D2C1E] px-2.5 py-1 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    {otherCat.emoji || '🔸'} {getCategoryArabicName(otherCat)}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-[#18100A] p-3.5 sm:p-4 rounded-2xl border border-[#2C1F16] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        {/* Search input inside this category */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8E8373] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`بحث داخل ${getCategoryArabicName(category)}...`}
            className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#100A06] border border-[#3D2C1E] text-xs text-[#FFF1C5] placeholder-[#8E8373] focus:outline-none focus:border-[#D4AF37] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8373] hover:text-[#FFF1C5]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-[#8E8373] font-bold flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>ترتيب السعر:</span>
          </span>

          <div className="flex items-center gap-1 bg-[#100A06] p-1 rounded-xl border border-[#3D2C1E]">
            <button
              onClick={() => setSortBy('default')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                sortBy === 'default'
                  ? 'bg-[#D4AF37] text-black shadow-sm'
                  : 'text-[#C8BFB0] hover:text-[#FFF1C5]'
              }`}
            >
              الافتراضي
            </button>
            <button
              onClick={() => setSortBy('price_asc')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                sortBy === 'price_asc'
                  ? 'bg-[#D4AF37] text-black shadow-sm'
                  : 'text-[#C8BFB0] hover:text-[#FFF1C5]'
              }`}
            >
              الأقل سعراً
            </button>
            <button
              onClick={() => setSortBy('price_desc')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                sortBy === 'price_desc'
                  ? 'bg-[#D4AF37] text-black shadow-sm'
                  : 'text-[#C8BFB0] hover:text-[#FFF1C5]'
              }`}
            >
              الأعلى سعراً
            </button>
          </div>
        </div>
      </div>

      {/* Product List Grid for this Category ONLY */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredProducts.map((product, idx) => (
            <ProductCard
              key={`${product.id}-${idx}`}
              product={product}
              priority={idx < 8}
              onAddToCart={(p, qty) => onAddToCart(p, qty || 1)}
              onSelectProduct={onSelectProduct}
              isFavorite={favorites.includes(product.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-3xl bg-[#140E0A] border border-[#2C1F16] space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#221710] border border-[#3D2C1E] flex items-center justify-center mx-auto text-[#D4AF37]">
            <Search className="w-8 h-8 opacity-60" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#FFF1C5]">لا توجد أصناف.</h3>
          </div>
        </div>
      )}

      {/* Bottom Back Button */}
      <div className="pt-6 border-t border-[#2C1F16] flex justify-center">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-xs sm:text-sm shadow-lg hover:brightness-110 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>
      </div>
    </div>
  );
};
