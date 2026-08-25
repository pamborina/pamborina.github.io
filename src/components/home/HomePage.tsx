import React, { useState, useEffect } from 'react';
import { Product, Category, Branch } from '../../types';
import { FreeDeliveryBar } from './FreeDeliveryBar';
import { HeroBanner } from './HeroBanner';
import { CategoryGrid } from './CategoryGrid';
import { CustomerReviews } from './CustomerReviews';
import { StoreInfo } from './StoreInfo';
import { PaperMenuModal } from './PaperMenuModal';
import { BookOpen, Sparkles, Award } from 'lucide-react';
import { preloadImages } from '../common/ProductImage';
import { paperMenuService, DEFAULT_PAPER_MENU_PAGES } from '../../services/paperMenuService';
import { useSiteSettings } from '../../context/SiteSettingsContext';

interface HomePageProps {
  categories: Category[];
  products: Product[];
  branches: Branch[];
  cartSubtotal: number;
  onAddToCart: (product: Product, quantity?: number) => void;
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (categoryId: string) => void;
  favorites: string[];
  onToggleFavorite: (productId: string) => void;
  onOpenCart: () => void;
  onMenuUpdated?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  categories,
  products,
  branches,
  cartSubtotal,
  onAddToCart,
  onSelectProduct,
  onSelectCategory,
  favorites,
  onToggleFavorite,
  onOpenCart,
  onMenuUpdated,
}) => {
  const { features } = useSiteSettings();

  // Paper Menu Modal state
  const [isPaperMenuOpen, setIsPaperMenuOpen] = useState(false);
  const [paperPagesCount, setPaperPagesCount] = useState(DEFAULT_PAPER_MENU_PAGES.length);

  // Subscribe to real-time paper menu pages
  useEffect(() => {
    const unsub = paperMenuService.subscribeToMenuPages((pages) => {
      if (Array.isArray(pages)) {
        setPaperPagesCount(pages.length);
      }
    });
    return () => unsub();
  }, []);

  // Preload top category images and popular product images for lightning speed
  useEffect(() => {
    const categoryUrls = categories.map((c) => c.imageUrl).filter(Boolean) as string[];
    const productUrls = products.slice(0, 12).map((p) => p.image || p.imageUrl).filter(Boolean) as string[];
    preloadImages([...categoryUrls, ...productUrls]);
  }, [categories, products]);

  return (
    <div className="space-y-8 dir-rtl">
      {/* 1. Free Delivery Threshold Motivation Bar */}
      <FreeDeliveryBar
        currentSubtotal={cartSubtotal}
        freeDeliveryThreshold={200}
        onOpenMenu={() => onSelectCategory(categories[0]?.id || 'koshary')}
      />

      {/* 2. Hero Banner with Urgency Timer */}
      <HeroBanner
        onSelectCategory={onSelectCategory}
        onOpenOrderModal={onOpenCart}
      />

      {/* Official Paper Menu Card Trigger Banner */}
      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#1E140C] via-[#2A1D13] to-[#1E140C] border border-[#D4AF37]/50 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-[#F4E08B]" />
          </div>
          <div className="text-right space-y-1">
            <h3 className="text-sm sm:text-base font-black text-[#FFF1C5] font-heading flex items-center gap-2">
              <span>صور المنيو الورقي المطبوع الأصلي 📜</span>
              <span className="text-[10px] bg-[#D4AF37]/20 text-[#F4E08B] px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40 font-bold">
                {paperPagesCount} صفحات
              </span>
            </h3>
            <p className="text-xs text-[#C8BFB0]">
              تصفح القائمة المطبوعة بالفروع (قائمة الحادق والساندوتشات + قائمة الحلو والكشري)
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsPaperMenuOpen(true)}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black font-extrabold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <span>عرض صور المنيو المطبوع</span>
          <BookOpen className="w-4 h-4" />
        </button>
      </div>

      {/* 3. CATEGORIES GRID - Main Core Feature (الأركان الأقسام) */}
      <CategoryGrid
        categories={categories}
        selectedCategoryId={null}
        onSelectCategory={(catId) => {
          if (catId) onSelectCategory(catId);
        }}
      />

      {/* Store Features Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {features.map((feat) => (
          <div
            key={feat.id}
            className="p-3.5 rounded-2xl bg-[#160E09] border border-[#2C1F16] text-center space-y-1"
          >
            <span className="text-xl block">{feat.emoji}</span>
            <h4 className="text-xs font-bold text-[#FFF1C5]">{feat.titleAr}</h4>
            <p className="text-[10px] text-[#8E8373]">{feat.descAr}</p>
          </div>
        ))}
      </div>

      {/* 4. Customer Reviews & Social Proof */}
      <CustomerReviews />

      {/* 5. Store Info, Working Hours & Locations */}
      <StoreInfo branches={branches} />

      {/* 6. Official Paper Menu Viewer Modal */}
      <PaperMenuModal
        isOpen={isPaperMenuOpen}
        onClose={() => setIsPaperMenuOpen(false)}
        onMenuUpdated={onMenuUpdated}
      />
    </div>
  );
};
