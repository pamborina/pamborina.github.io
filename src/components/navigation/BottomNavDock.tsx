import React from 'react';
import { motion } from 'motion/react';
import { Home, UtensilsCrossed, ShoppingBag, MapPin, LucideIcon } from 'lucide-react';

export type NavTabId = 'home' | 'menu' | 'cart' | 'branches';

export interface BottomNavDockProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  cartBadgeCount?: number;
}

interface NavItem {
  id: NavTabId;
  labelAr: string;
  icon: LucideIcon;
  badge?: number;
}

export const BottomNavDock: React.FC<BottomNavDockProps> = ({
  activeTab,
  onTabChange,
  cartBadgeCount = 0,
}) => {
  const navItems: NavItem[] = [
    { id: 'home', labelAr: 'الرئيسية', icon: Home },
    { id: 'menu', labelAr: 'الأقسام', icon: UtensilsCrossed },
    { id: 'cart', labelAr: 'السلة', icon: ShoppingBag, badge: cartBadgeCount },
    { id: 'branches', labelAr: 'الفروع', icon: MapPin },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 dir-rtl select-none pb-safe md:hidden">
      {/* Dock Container */}
      <div className="bg-[#120C08]/95 border-t border-[#D4AF37]/30 backdrop-blur-2xl px-2 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
                isActive ? 'text-[#F4E08B]' : 'text-[#8E8373] hover:text-[#C8BFB0]'
              }`}
            >
              {/* Active Spring Glow Pill Indicator */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active-pill"
                  className="absolute -top-2 w-8 h-1 bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] rounded-full shadow-[0_0_12px_rgba(212,175,55,0.8)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              {/* Icon Container with Badge */}
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.5] text-[#F4E08B]' : 'stroke-2 text-[#8E8373]'
                  }`}
                />

                {/* Cart Badge Counter */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-amber-500 to-amber-400 text-black text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-black shadow-md">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] mt-1 transition-all ${
                  isActive ? 'font-extrabold text-[#FFF1C5]' : 'font-medium text-[#8E8373]'
                }`}
              >
                {item.labelAr}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
