import React from 'react';
import { ShoppingBag, MapPin, Search, PhoneCall, Sparkles, Palette, UtensilsCrossed, Home } from 'lucide-react';
import { Logo } from './Logo';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export type TabType = 'home' | 'menu' | 'brand' | 'branches' | 'offers';

interface HeaderProps {
  cartItemCount?: number;
  selectedBranchNameAr?: string;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  onOpenCart?: () => void;
  onOpenBranchModal?: () => void;
  onOpenSearchModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartItemCount = 0,
  selectedBranchNameAr = 'فرع التجمع الخامس (الرئيسي)',
  activeTab = 'home',
  onTabChange,
  onOpenCart,
  onOpenBranchModal,
  onOpenSearchModal,
}) => {
  const { customerServicePhone, phone: sitePhone, announcementTextAr, announcementEnabled } = useSiteSettings();
  const displayPhone = customerServicePhone || sitePhone || '';

  return (
    <header className="sticky top-0 z-50 bg-[#0B0806]/90 backdrop-blur-xl border-b border-[#2C1F16] transition-all duration-300">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-[#20150D] via-[#382613] to-[#20150D] border-b border-[#D4AF37]/20 py-1.5 px-4 text-xs font-bold text-center text-[#F4E08B] flex items-center justify-center gap-2 select-none">
        <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
        <span>{announcementEnabled && announcementTextAr ? announcementTextAr : 'توصيل آمن وسريع بسيارات مبردة لجميع أنحاء القاهرة والجيزة'}</span>
        {displayPhone && (
          <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#FFF1C5] font-mono dir-ltr">
            {displayPhone}
          </span>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Right: Branch Selector & Phone */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenBranchModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18110B] border border-[#2D2017] hover:border-[#D4AF37]/60 hover:bg-[#201710] text-[#F7F3E8] transition-all duration-200 cursor-pointer group"
            title="تغيير الفرع"
          >
            <MapPin className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-[#C8BFB0] font-medium">الفرع المختار</span>
              <span className="text-xs font-bold text-[#F7F3E8] truncate max-w-[130px] sm:max-w-[180px]">
                {selectedBranchNameAr}
              </span>
            </div>
          </button>

          {displayPhone && (
            <a
              href={`tel:${displayPhone.replace(/[^0-9+]/g, '')}`}
              className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#18110B] border border-[#2D2017] text-[#D4AF37] text-xs font-bold hover:bg-[#201710] transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{displayPhone}</span>
            </a>
          )}
        </div>

        {/* Center: Brand Logo */}
        <div className="flex items-center justify-center cursor-pointer" onClick={() => onTabChange?.('home')}>
          <Logo size="md" showSubtitle={false} showArabicText={true} />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-[#140E0A] p-1.5 rounded-2xl border border-[#2D2017]">
          <button
            onClick={() => onTabChange?.('home')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'home'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'text-[#C8BFB0] hover:text-[#F4E08B] hover:bg-[#1C140E]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>الرئيسية</span>
          </button>

          <button
            onClick={() => onTabChange?.('menu')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'menu'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'text-[#C8BFB0] hover:text-[#F4E08B] hover:bg-[#1C140E]'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>الأقسام</span>
          </button>
        </nav>

        {/* Left: Actions (Search, Cart) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenSearchModal}
            className="p-2.5 rounded-xl bg-[#18110B] border border-[#2D2017] text-[#C8BFB0] hover:text-[#F4E08B] hover:border-[#D4AF37]/50 hover:bg-[#201710] transition-all cursor-pointer"
            aria-label="البحث عن صنف"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gold-gradient text-black font-bold shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer select-none"
            aria-label="سلة الطلبات"
          >
            <ShoppingBag className="w-5 h-5 text-black" />
            <span className="hidden sm:inline font-bold text-sm">السلة</span>
            {cartItemCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black text-[#F4E08B] text-xs font-black shadow-inner">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
