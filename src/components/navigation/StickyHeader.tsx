import React from 'react';
import { MapPin, Search, Bell, ChevronDown, Sparkles, ShoppingBag, Home, UtensilsCrossed, Store, Truck } from 'lucide-react';
import { Branch } from '../../types';
import { Logo } from '../common/Logo';
import { NavTabId } from './BottomNavDock';
import { formatPrice } from '../../lib/utils';

interface StickyHeaderProps {
  currentBranch: Branch;
  onOpenBranchSelector: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenOrderTracking?: () => void;
  unreadNotificationsCount?: number;
  activeNavTab?: NavTabId;
  onTabChange?: (tab: NavTabId) => void;
  onOpenCart?: () => void;
  cartBadgeCount?: number;
  cartTotal?: number;
  onLogoClick?: () => void;
}

export const StickyHeader: React.FC<StickyHeaderProps> = ({
  currentBranch,
  onOpenBranchSelector,
  onOpenSearch,
  onOpenNotifications,
  onOpenOrderTracking,
  unreadNotificationsCount = 2,
  activeNavTab = 'home',
  onTabChange,
  onOpenCart,
  cartBadgeCount = 0,
  cartTotal = 0,
  onLogoClick,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#140E0A]/95 backdrop-blur-xl border-b border-[#D4AF37]/25 shadow-xl dir-rtl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 space-y-2">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 min-h-[44px]">
          {/* Right: Brand Logo + Branch Selector (Desktop & Tablet) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Logo size="sm" showSubtitle={false} showArabicText={true} onClick={onLogoClick} />

            {/* Branch Selector Button (Shown on Tablet & Desktop >= 640px) */}
            <button
              onClick={onOpenBranchSelector}
              className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#221710] border border-[#D4AF37]/40 hover:border-[#D4AF37] transition-all text-right active:scale-95 group cursor-pointer max-w-[160px] sm:max-w-xs shadow-sm"
            >
              <div className="p-1 rounded-lg bg-[#2D2017] text-[#F4E08B] group-hover:scale-110 transition-transform shrink-0">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
              </div>

              <div className="flex flex-col text-right overflow-hidden min-w-0">
                <div className="flex items-center gap-0.5 text-[10px] text-[#C8BFB0] font-medium leading-none mb-0.5">
                  <span className="truncate">الفرع</span>
                  <ChevronDown className="w-3 h-3 text-[#D4AF37] shrink-0" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-[#FFF1C5] truncate leading-tight">
                  {currentBranch.areaAr || currentBranch.nameAr}
                </span>
              </div>
            </button>
          </div>

          {/* Center (Desktop ONLY >= 1024px): Desktop Navigation Items */}
          {onTabChange && (
            <nav
              className="hidden lg:flex items-center gap-1 bg-[#1A120B] rounded-2xl border border-[#3D2C1E] shadow-sm shrink-0"
            >
              <button
                onClick={() => onTabChange('home')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNavTab === 'home'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black shadow-md font-extrabold'
                    : 'text-[#C8BFB0] hover:text-[#FFF1C5] hover:bg-[#281C13]'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>الرئيسية</span>
              </button>

              <button
                onClick={() => onTabChange('menu')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNavTab === 'menu'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black shadow-md font-extrabold'
                    : 'text-[#C8BFB0] hover:text-[#FFF1C5] hover:bg-[#281C13]'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>قائمة الطعام</span>
              </button>

              <button
                onClick={() => onTabChange('branches')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNavTab === 'branches'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black shadow-md font-extrabold'
                    : 'text-[#C8BFB0] hover:text-[#FFF1C5] hover:bg-[#281C13]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>الفروع والتوصيل</span>
              </button>
            </nav>
          )}

          {/* Left Side: Actions Group (Search, Order Tracking, Notifications, Cart) */}
          <div
            className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#1A120B] border border-[#3D2C1E] shadow-sm shrink-0"
          >
            {/* Quick Search Button */}
            <button
              onClick={onOpenSearch}
              className="p-2 sm:p-2.5 rounded-xl bg-[#221710] border border-[#D4AF37]/30 text-[#FFF1C5] hover:text-[#F4E08B] hover:border-[#D4AF37] transition-all active:scale-95 cursor-pointer relative"
              title="بحث سريع"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notifications Button */}
            <button
              onClick={onOpenNotifications}
              className="p-2 sm:p-2.5 rounded-xl bg-[#221710] border border-[#D4AF37]/30 text-[#FFF1C5] hover:text-[#F4E08B] hover:border-[#D4AF37] transition-all active:scale-95 cursor-pointer relative"
              title="الإشعارات والتحديثات"
            >
              <Bell className="w-4 h-4 text-[#FFF1C5]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-600 to-amber-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-black shadow-md animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Direct Cart Button */}
            {onOpenCart && (
              <button
                onClick={onOpenCart}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-extrabold text-xs shadow-md hover:brightness-110 transition-all active:scale-95 cursor-pointer"
                title="سلة المشتريات"
              >
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                  {cartBadgeCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-black text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#D4AF37]">
                      {cartBadgeCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline font-black">
                  {cartTotal > 0 ? formatPrice(cartTotal) : 'السلة'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Branch Selector Sub-Row (< 640px) */}
        <div className="flex sm:hidden items-center justify-between gap-2 pt-0.5">
          <button
            onClick={onOpenBranchSelector}
            className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#221710] border border-[#D4AF37]/40 hover:border-[#D4AF37] transition-all text-right active:scale-95 cursor-pointer w-full shadow-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded-lg bg-[#2D2017] text-[#F4E08B] shrink-0">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
              </div>
              <div className="flex items-center gap-1.5 text-xs truncate">
                <span className="text-[#C8BFB0] font-medium text-[11px]">الفرع الحالي:</span>
                <span className="font-bold text-[#FFF1C5] truncate">
                  {currentBranch.areaAr || currentBranch.nameAr}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-[#F4E08B] font-bold bg-[#140E0A] px-2 py-0.5 rounded-lg border border-[#3D2C1E] shrink-0">
              <span>تغيير</span>
              <ChevronDown className="w-3 h-3 text-[#D4AF37]" />
            </div>
          </button>
        </div>

        {/* Tablet Navigation Sub-Row (768px to 1023px: md:flex lg:hidden) */}
        {onTabChange && (
          <div className="hidden md:flex lg:hidden items-center justify-center pt-1">
            <nav className="flex items-center gap-2 bg-[#1A120B] p-1.5 rounded-2xl border border-[#3D2C1E] shadow-md w-full max-w-lg justify-center">
              <button
                onClick={() => onTabChange('home')}
                className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNavTab === 'home'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black shadow-md font-extrabold'
                    : 'text-[#C8BFB0] hover:text-[#FFF1C5] hover:bg-[#281C13]'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>الرئيسية</span>
              </button>

              <button
                onClick={() => onTabChange('menu')}
                className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNavTab === 'menu'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black shadow-md font-extrabold'
                    : 'text-[#C8BFB0] hover:text-[#FFF1C5] hover:bg-[#281C13]'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>قائمة الطعام</span>
              </button>

              <button
                onClick={() => onTabChange('branches')}
                className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNavTab === 'branches'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black shadow-md font-extrabold'
                    : 'text-[#C8BFB0] hover:text-[#FFF1C5] hover:bg-[#281C13]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>الفروع والتوصيل</span>
              </button>
            </nav>
          </div>
        )}

        {/* Search Input Bar */}
        <div>
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-[#1D140D] border border-[#D4AF37]/30 hover:border-[#D4AF37]/70 transition-all text-right shadow-inner active:scale-[0.99] cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-[#C8BFB0] min-w-0">
              <Search className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs sm:text-sm text-[#8E8373] group-hover:text-[#C8BFB0] transition-colors truncate">
                ابحث عن صنف...
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#2D2017] border border-[#D4AF37]/20 text-[10px] text-[#F4E08B] font-bold shrink-0">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              <span>بحث ذكي</span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
