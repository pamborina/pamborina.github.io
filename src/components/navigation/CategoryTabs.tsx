import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Flame,
  UtensilsCrossed,
  Cake,
  HeartHandshake,
  Crown,
  IceCream,
  Sandwich,
  Milk,
  Coffee,
  Utensils,
  Cookie,
  LucideIcon,
  Grid,
} from 'lucide-react';
import { Category } from '../../types';
import { getCategoryArabicName } from '../../constants/categoryTranslations';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  totalProductsCount?: number;
}

const categoryIconMap: Record<string, LucideIcon> = {
  'burgers': Flame,
  'crepes': UtensilsCrossed,
  'sandwiches': Sandwich,
  'sweets': Cake,
  'torta': Crown,
  'kunafa': Sparkles,
  'ice-cream': IceCream,
  'milkshakes': Milk,
  'drinks': Coffee,
  'koshary': Utensils,
  'halawani': Cookie,
  // legacy fallbacks
  'kahk-el-eid': Cookie,
  'eid-kahk': Cookie,
  'koshary-kashtouta': Utensils,
  'savory-menu': Sandwich,
  'sweets-roqan': Cake,
  'milk-puddings': HeartHandshake,
  'moulid-malban': Crown,
};

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  totalProductsCount = 140,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Auto scroll active tab into view smoothly
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const tab = activeTabRef.current;
      const containerWidth = container.offsetWidth;
      const tabLeft = tab.offsetLeft;
      const tabWidth = tab.offsetWidth;

      container.scrollTo({
        left: tabLeft - containerWidth / 2 + tabWidth / 2,
        behavior: 'smooth',
      });
    }
  }, [selectedCategoryId]);

  return (
    <div className="w-full bg-[#140E0A]/95 backdrop-blur-md border-b border-[#2C1F16] py-2.5 sticky top-[106px] sm:top-[112px] z-20 dir-rtl shadow-md">
      <div
        ref={scrollContainerRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {/* 'All Products' Tab Pill */}
        <button
          ref={selectedCategoryId === null ? activeTabRef : null}
          onClick={() => onSelectCategory(null)}
          className={`relative shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer select-none ${
            selectedCategoryId === null
              ? 'text-black font-extrabold shadow-lg scale-[1.02]'
              : 'text-[#C8BFB0] bg-[#1F1610] hover:bg-[#2A1E15] border border-[#3D2C1E]'
          }`}
        >
          {selectedCategoryId === null && (
            <motion.div
              layoutId="active-category-pill"
              className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] rounded-2xl shadow-[0_0_15px_rgba(212,175,55,0.4)]"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          <span className="relative z-10 flex items-center gap-1.5">
            <Grid className={`w-3.5 h-3.5 ${selectedCategoryId === null ? 'text-black' : 'text-[#D4AF37]'}`} />
            <span>جميع الأقسام</span>
          </span>

          <span
            className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
              selectedCategoryId === null
                ? 'bg-black/20 text-black'
                : 'bg-[#2A1E15] text-[#D4AF37]'
            }`}
          >
            {totalProductsCount}
          </span>
        </button>

        {/* Dynamic Category Tabs */}
        {categories.map((category, idx) => {
          const isSelected = selectedCategoryId === category.id;
          const Icon = categoryIconMap[category.id] || Sparkles;

          return (
            <button
              key={`${category.id}-${idx}`}
              ref={isSelected ? activeTabRef : null}
              onClick={() => onSelectCategory(category.id)}
              className={`relative shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer select-none whitespace-nowrap ${
                isSelected
                  ? 'text-black font-extrabold shadow-lg scale-[1.02]'
                  : 'text-[#C8BFB0] bg-[#1F1610] hover:bg-[#2A1E15] border border-[#3D2C1E]'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="active-category-pill"
                  className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] rounded-2xl shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-black stroke-[2.5]' : 'text-[#D4AF37]'}`} />
                <span>{getCategoryArabicName(category)}</span>
              </span>

              {category.itemCount > 0 && (
                <span
                  className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    isSelected
                      ? 'bg-black/20 text-black'
                      : 'bg-[#2A1E15] text-[#D4AF37]'
                  }`}
                >
                  {category.itemCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
