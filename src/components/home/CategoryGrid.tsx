import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ArrowLeft,
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
  CheckCircle2,
  ChevronLeft,
  Tag,
} from 'lucide-react';
import { Category } from '../../types';
import { categoryTranslations, getCategoryArabicName } from '../../constants/categoryTranslations';

interface CategoryGridProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

const categoryIconMap: Record<string, LucideIcon> = {
  'kahk-el-eid': Cookie,
  'eid-kahk': Cookie,
  burgers: Flame,
  crepes: UtensilsCrossed,
  sandwiches: Sandwich,
  sweets: Cake,
  torta: Crown,
  kunafa: Sparkles,
  'ice-cream': IceCream,
  milkshakes: Milk,
  drinks: Coffee,
  koshary: Utensils,
  halawani: Cookie,
};

// Gradient color themes for each category card background
const categoryGradientMap: Record<string, string> = {
  'kahk-el-eid': 'from-[#3A2A0C] via-[#231A06] to-[#140A04]',
  'eid-kahk': 'from-[#3A2A0C] via-[#231A06] to-[#140A04]',
  burgers: 'from-[#3A180B] via-[#241007] to-[#140A04]',
  crepes: 'from-[#3B1F0E] via-[#251308] to-[#140A04]',
  sandwiches: 'from-[#36220E] via-[#221508] to-[#140A04]',
  sweets: 'from-[#3D1A1E] via-[#260E12] to-[#140A04]',
  torta: 'from-[#381B2B] via-[#220D1A] to-[#140A04]',
  kunafa: 'from-[#3A2A0C] via-[#231A06] to-[#140A04]',
  'ice-cream': 'from-[#192D38] via-[#0E1C23] to-[#140A04]',
  milkshakes: 'from-[#2A1D36] via-[#1A1122] to-[#140A04]',
  drinks: 'from-[#1B3227] via-[#0F2018] to-[#140A04]',
  koshary: 'from-[#3A1E0E] via-[#241208] to-[#140A04]',
  halawani: 'from-[#33220E] via-[#201508] to-[#140A04]',
};

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <section className="space-y-6 dir-rtl py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C1F16] pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A1E15] border border-[#3D2C1E] text-xs font-bold text-[#D4AF37] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>تجربة الأقسام الفاخرة</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#FFF1C5] font-heading tracking-tight flex items-center gap-2">
            <span>أقسام قائمة بامبورينا</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#A89C8C] mt-1">
            اختر القسم الذي تريده لاستعراض جميع الأصناف المتوفرة داخله.
          </p>
        </div>

        {selectedCategoryId !== null && (
          <button
            onClick={() => onSelectCategory(null)}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#221710] hover:bg-[#2C1F16] border border-[#3D2C1E] text-xs font-bold text-[#D4AF37] transition-all cursor-pointer shadow-md active:scale-95"
          >
            <span>عرض جميع الأقسام</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid of Premium Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
        {categories.map((category, idx) => {
          const isSelected = selectedCategoryId === category.id;
          const Icon = categoryIconMap[category.id] || Sparkles;
          const bgGradient = categoryGradientMap[category.id] || 'from-[#2B1D12] via-[#1C120A] to-[#140A04]';

          return (
            <motion.div
              key={`${category.id}-${idx}`}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectCategory(isSelected ? null : category.id)}
              className={`relative rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 cursor-pointer overflow-hidden border transition-all duration-300 flex flex-col justify-between min-h-[150px] sm:min-h-[175px] group select-none ${
                isSelected
                  ? 'border-[#D4AF37] bg-gradient-to-br ' + bgGradient + ' shadow-[0_0_25px_rgba(212,175,55,0.35)] ring-2 ring-[#D4AF37]/50'
                  : 'border-[#2C1F16] hover:border-[#D4AF37]/60 bg-[#160E09] hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)]'
              }`}
            >
              {/* Background Thumbnail Image with Gradient Mask */}
              {category.imageUrl && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                  <img
                    src={category.imageUrl}
                    alt={getCategoryArabicName(category)}
                    loading={idx < 8 ? "eager" : "lazy"}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center opacity-30 group-hover:opacity-45 group-hover:scale-110 transition-all duration-700 ease-out"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${bgGradient} opacity-90 group-hover:opacity-80 transition-opacity duration-300`} />
                </div>
              )}

              {/* Top Row: Icon Badge & Item Count */}
              <div className="relative z-10 flex items-center justify-between gap-1.5">
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-md ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black shadow-[0_0_12px_rgba(212,175,55,0.5)]'
                      : 'bg-[#221710]/95 border border-[#3D2C1E] text-[#D4AF37] group-hover:border-[#D4AF37] group-hover:scale-105'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isSelected ? (
                    <span className="flex items-center gap-1 bg-[#D4AF37] text-black text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                      <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>محدد</span>
                    </span>
                  ) : (
                    <span className="bg-[#1F1610]/90 border border-[#3D2C1E] text-[#C8BFB0] text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap">
                      {category.itemCount} صنف
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Row: Category Name, Description & Action Button */}
              <div className="relative z-10 mt-3 sm:mt-4 space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-sm sm:text-base font-black text-[#FFF1C5] group-hover:text-[#F4E08B] font-heading transition-colors line-clamp-1">
                    {getCategoryArabicName(category)}
                  </h3>
                </div>

                <p className="text-[10px] sm:text-[11px] text-[#A89C8C] line-clamp-1 leading-relaxed font-normal">
                  {category.descriptionAr}
                </p>

                <div className="pt-1">
                  <span className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black text-[10px] sm:text-[11px] font-black shadow-md group-hover:brightness-110 transition-all">
                    <span>عرض الأصناف</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Animated Gold Ring for Selected State */}
              {isSelected && (
                <motion.div
                  layoutId="active-category-card-ring"
                  className="absolute inset-0 rounded-2xl sm:rounded-3xl border-2 border-[#D4AF37] pointer-events-none"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
