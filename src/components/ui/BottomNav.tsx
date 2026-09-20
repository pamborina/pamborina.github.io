import React from 'react';
import { Home, UtensilsCrossed, ShoppingBag, MapPin, Palette, LucideIcon } from 'lucide-react';

export interface BottomNavProps {
  activeTab: 'home' | 'menu' | 'cart' | 'branches' | 'brand';
  onTabChange: (tab: 'home' | 'menu' | 'cart' | 'branches' | 'brand') => void;
  cartBadgeCount?: number;
}

interface NavItem {
  id: 'home' | 'menu' | 'cart' | 'branches' | 'brand';
  labelAr: string;
  icon: LucideIcon;
  badge?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  cartBadgeCount = 0,
}) => {
  const navItems: NavItem[] = [
    { id: 'home', labelAr: 'الرئيسية', icon: Home },
    { id: 'menu', labelAr: 'القائمة', icon: UtensilsCrossed },
    { id: 'cart', labelAr: 'السلة', icon: ShoppingBag, badge: cartBadgeCount },
    { id: 'branches', labelAr: 'الفروع', icon: MapPin },
    { id: 'brand', labelAr: 'هوية الماركة', icon: Palette },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden dir-rtl">
      {/* Background Gradient Blur Dock */}
      <div className="bg-[#140E0A]/90 border-t border-[#D4AF37]/30 backdrop-blur-xl px-4 py-2 shadow-2xl flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive ? 'text-[#F4E08B] scale-105' : 'text-[#8E8373] hover:text-[#C8BFB0]'
              }`}
            >
              {/* Active Indicator Glow Bar */}
              {isActive && (
                <div className="absolute -top-2 w-8 h-1 bg-gold-gradient rounded-full gold-glow-sm" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-amber-500 text-black text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-black">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-bold text-[#F4E08B]' : ''}`}>
                {item.labelAr}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
