import React from 'react';
import { motion } from 'motion/react';
import { Gift, Sparkles, Plus, Check, Star } from 'lucide-react';
import { Product } from '../../types';
import { formatPrice } from '../../lib/utils';
import { Images } from '../../data/images';

interface ComboItem {
  id: string;
  titleAr: string;
  subtitleAr: string;
  itemsIncludedAr: string[];
  comboPrice: number;
  originalPrice: number;
  savingsAr: string;
  imageUrl: string;
  badgeAr: string;
}

const COMBOS_DATA: ComboItem[] = [
  {
    id: 'combo-1',
    titleAr: 'مكس العائلة الملكي (كحك + كشري مانجو)',
    subtitleAr: 'تكفي من 4 إلى 6 أفراد بأفخر المكونات والسمن البلدي',
    itemsIncludedAr: [
      'كيلو كحك لوكس بسكر دايب',
      'علبة كشري مانجو عائلية باللوتس',
      'طاجن قشطوطة قشطة وزغلول',
    ],
    comboPrice: 420,
    originalPrice: 530,
    savingsAr: 'توفير 110 ج.م',
    imageUrl: Images.combos.combo1,
    badgeAr: 'الأكثر توفيراً للمجموعات 👑',
  },
  {
    id: 'combo-2',
    titleAr: 'مكس الوجبة العاتية (حادق + حلو)',
    subtitleAr: 'وجبة متكاملة للغداء والعشاء مع تحلية فاخرة',
    itemsIncludedAr: [
      '2 كريب مكس أجبان وشاورما دجاج',
      'ساندوتش فرنسشاوي بامبورينا الكبير',
      'طاجن أم علي بالسمن البلدي والمكسرات',
    ],
    comboPrice: 310,
    originalPrice: 390,
    savingsAr: 'توفير 80 ج.م',
    imageUrl: Images.combos.combo2,
    badgeAr: 'توفير الغداء والعشاء 🍔',
  },
];

interface PopularCombosProps {
  onAddToCart: (product: Product) => void;
  allProducts: Product[];
}

export const PopularCombos: React.FC<PopularCombosProps> = ({
  onAddToCart,
  allProducts,
}) => {
  const handleAddCombo = (combo: ComboItem) => {
    // Find closest matching product or construct bundle proxy
    const proxyProduct: Product = {
      id: `combo-proxy-${combo.id}`,
      categoryId: 'eid-kahk',
      nameAr: combo.titleAr,
      nameEn: combo.titleAr,
      slug: combo.id,
      descriptionAr: combo.itemsIncludedAr.join(' - '),
      shortDescriptionAr: combo.subtitleAr,
      price: combo.comboPrice,
      image: combo.imageUrl,
      imageUrl: combo.imageUrl,
      preparationTimeMinutes: 20,
      calories: 950,
      rating: 5.0,
      reviewCount: 180,
      tags: ['Bestseller', 'Signature'],
      isAvailable: true,
      salesCount: 640,
      featured: true,
      createdAt: '2026-03-01',
    };

    onAddToCart(proxyProduct);
  };

  return (
    <section className="space-y-4 dir-rtl">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[#2C1F16] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#3D2C1E] border border-[#D4AF37] text-[#F4E08B]">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#FFF1C5] font-heading">
                مكسات وعروض العائلة واللمة (أكبر توفير) 🎁
              </h2>
              <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-black">
                عرض توفيري 👑
              </span>
            </div>
            <p className="text-xs text-[#C8BFB0]">
              توفير حقيقي عند طلب الباقات المجمعة مع هدايا وحلويات إضافية
            </p>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {COMBOS_DATA.map((combo, idx) => (
          <div
            key={`${combo.id}-${idx}`}
            className="p-4 sm:p-5 rounded-3xl bg-[#18110B] border border-[#D4AF37]/40 shadow-2xl flex flex-col sm:flex-row gap-4 items-center justify-between hover:border-[#D4AF37] transition-all group"
          >
            <img
              src={combo.imageUrl}
              alt={combo.titleAr}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full sm:w-36 h-36 rounded-2xl object-cover border border-[#3D2C1E] shrink-0"
            />

            <div className="flex-1 space-y-2 text-right">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-red-600 text-white font-black px-2.5 py-0.5 rounded-full">
                  {combo.savingsAr}
                </span>
                <span className="text-[10px] bg-[#221710] text-[#D4AF37] border border-[#3D2C1E] px-2 py-0.5 rounded-lg font-bold">
                  {combo.badgeAr}
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-extrabold text-[#FFF1C5] group-hover:text-[#F4E08B] transition-colors">
                {combo.titleAr}
              </h3>
              <p className="text-xs text-[#8E8373]">{combo.subtitleAr}</p>

              {/* Items List */}
              <ul className="space-y-1 pt-1 text-[11px] text-[#C8BFB0]">
                {combo.itemsIncludedAr.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-[#D4AF37]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Pricing & Button */}
              <div className="pt-3 border-t border-[#2C1F16] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#8E8373] line-through block">
                    {formatPrice(combo.originalPrice)}
                  </span>
                  <span className="text-base font-black text-[#F4E08B]">
                    {formatPrice(combo.comboPrice)}
                  </span>
                </div>

                <button
                  onClick={() => handleAddCombo(combo)}
                  className="px-4 py-2.5 rounded-2xl bg-gold-gradient text-black font-extrabold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-black stroke-[3]" />
                  <span>إضافة الباقة بالسلة</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
