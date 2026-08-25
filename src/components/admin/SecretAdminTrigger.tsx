import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

interface SecretAdminTriggerProps {
  onOpenAdmin: () => void;
}

export const SecretAdminTrigger: React.FC<SecretAdminTriggerProps> = ({ onOpenAdmin }) => {
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll listener to detect when user reaches the bottom of the page
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );

      // User is considered at the bottom if within 250px of the footer/bottom, or if page fits within screen
      const reachedBottom = documentHeight <= windowHeight + 50 || (windowHeight + scrollY >= documentHeight - 250);
      setIsAtBottom(reachedBottom);

      if (!reachedBottom) {
        setIsVisible(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (!isAtBottom) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 800);
  };

  // Touch Long-Press Handling for Mobile
  const handleTouchStart = () => {
    if (!isAtBottom) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setIsVisible(true);
      onOpenAdmin();
    }, 1200);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  // Mobile Multi-Tap Fallback (3 quick taps on bottom-left corner when at bottom)
  const handleCornerTouch = () => {
    if (!isAtBottom) return;
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      setIsVisible(true);
      onOpenAdmin();
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 1000);
    }
  };

  if (!isAtBottom) return null;

  return (
    <div
      id="secret-admin-trigger-zone"
      className="fixed bottom-20 md:bottom-4 left-2 md:left-4 z-50 group select-none pointer-events-auto min-w-[40px] min-h-[40px] flex items-center justify-start"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleCornerTouch}
      aria-label="منطقة الدخول السري للإدارة"
    >
      {/* Invisible Trigger Zone Indicator */}
      <div className="w-10 h-10 -m-1 bg-transparent rounded-xl cursor-default flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity" />

      {/* Hidden button that slides out smoothly on hover/long-press */}
      <button
        id="secret-admin-btn"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenAdmin();
        }}
        title="بوابة إدارة بامبورينا المركزية المشفرة"
        className={`
          flex items-center gap-2 px-3.5 py-2.5 rounded-xl
          bg-neutral-950/95 border border-amber-500/60
          text-amber-400 text-xs font-bold
          shadow-[0_10px_30px_rgba(0,0,0,0.9)] backdrop-blur-md
          hover:bg-neutral-900 hover:border-amber-400 hover:text-amber-300
          transition-all duration-300 ease-out transform cursor-pointer
          ${
            isVisible
              ? 'opacity-100 scale-100 translate-x-0 pointer-events-auto'
              : 'opacity-0 scale-90 -translate-x-3 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 group-hover:pointer-events-auto'
          }
        `}
      >
        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="whitespace-nowrap font-bold">لوحة الإدارة</span>
        <Lock className="w-3 h-3 text-amber-500/70 shrink-0" />
      </button>
    </div>
  );
};


