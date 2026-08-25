import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp } from 'lucide-react';

interface ScrollToTopButtonProps {
  threshold?: number;
  onScrollToTop?: () => void;
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
  threshold = 500,
  onScrollToTop,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    if (onScrollToTop) {
      onScrollToTop();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          key="scroll-to-top-btn"
          initial={{ opacity: 0, scale: 0.5, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 25 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          whileHover={{
            scale: 1.1,
            boxShadow: '0 0 25px rgba(212, 175, 55, 0.8)',
          }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="fixed bottom-24 sm:bottom-28 right-5 sm:right-8 z-40 flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-[#1A1008] border border-[#FFF1C5]/70 shadow-2xl shadow-[#D4AF37]/50 cursor-pointer focus:outline-none select-none group"
          aria-label="الرجوع للأعلى"
          title="الرجوع لأعلى الصفحة"
        >
          <ChevronUp className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.8] text-[#1A1008] group-hover:-translate-y-0.5 transition-transform duration-200" />
          
          {/* Subtle Outer Glow Ring */}
          <span className="absolute -inset-1 rounded-full bg-[#D4AF37] opacity-20 blur-sm group-hover:opacity-60 transition-opacity pointer-events-none" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
