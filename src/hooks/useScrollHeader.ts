import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to detect scroll direction and manage auto-hiding header
 * - Hides header smoothly on scroll down (unhindered product browsing)
 * - Reveals header instantly on scroll up (easy access to search, cart & navigation)
 * - Keeps header fully visible at the top of the page
 */
export function useScrollHeader(threshold = 15, minScrollDelta = 6) {
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = Math.max(0, window.scrollY);
          const scrollDelta = currentScrollY - lastScrollY.current;

          // Check if page is scrolled past the top boundary
          setIsScrolled(currentScrollY > threshold);

          // When near the top, always show header
          if (currentScrollY <= threshold) {
            setIsVisible(true);
          } else if (Math.abs(scrollDelta) >= minScrollDelta) {
            // Scrolling down -> hide header to maximize product visibility
            if (scrollDelta > 0) {
              setIsVisible(false);
            }
            // Scrolling up -> reveal header for quick navigation
            else if (scrollDelta < 0) {
              setIsVisible(true);
            }
          }

          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold, minScrollDelta]);

  return { isVisible, isScrolled };
}
