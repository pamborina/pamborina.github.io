import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Clock,
  Zap,
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { HeroOffer, HeroOffersConfig } from '../../types';
import {
  heroOfferService,
  DEFAULT_HERO_OFFERS,
  DEFAULT_HERO_OFFERS_CONFIG,
} from '../../services/heroOfferService';
import { Images } from '../../data/images';
import { preloadImages } from '../common/ProductImage';

interface HeroBannerProps {
  onSelectCategory?: (categoryId: string) => void;
  onOpenOrderModal?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onSelectCategory,
  onOpenOrderModal,
}) => {
  const [offers, setOffers] = useState<HeroOffer[]>(DEFAULT_HERO_OFFERS);
  const [config, setConfig] = useState<HeroOffersConfig>(DEFAULT_HERO_OFFERS_CONFIG);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number>(1);
  const [isPaused, setIsPaused] = useState(false);

  // Touch Swipe tracking
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Subscribe to real-time hero offers
  useEffect(() => {
    const unsubOffers = heroOfferService.subscribeToHeroOffers((liveOffers) => {
      if (Array.isArray(liveOffers)) {
        setOffers(liveOffers);
      }
    });

    const unsubConfig = heroOfferService.subscribeToOffersConfig((liveConfig) => {
      if (liveConfig) {
        setConfig(liveConfig);
      }
    });

    return () => {
      unsubOffers();
      unsubConfig();
    };
  }, []);

  // Filter only active offers
  const activeOffers = useMemo(() => {
    const active = offers.filter((o) => o.isActive !== false);
    return active.length > 0 ? active : [];
  }, [offers]);

  // Adjust current index if bounds change
  useEffect(() => {
    if (activeOffers.length > 0 && currentIndex >= activeOffers.length) {
      setCurrentIndex(0);
    }
  }, [activeOffers.length, currentIndex]);

  // Preload all active offer images
  useEffect(() => {
    if (activeOffers.length > 0) {
      const urls = activeOffers.map((o) => o.imageUrl).filter(Boolean);
      preloadImages(urls);
    }
  }, [activeOffers]);

  // Handlers for switching slides
  const handleNext = useCallback(() => {
    if (activeOffers.length <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % activeOffers.length);
  }, [activeOffers.length]);

  const handlePrev = useCallback(() => {
    if (activeOffers.length <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + activeOffers.length) % activeOffers.length);
  }, [activeOffers.length]);

  const handleSelect = useCallback(
    (index: number) => {
      if (index === currentIndex) return;
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  // Auto carousel rotation with pause on hover/interaction
  const intervalSec = config.autoSlideIntervalSeconds > 0 ? config.autoSlideIntervalSeconds : 6;

  useEffect(() => {
    if (activeOffers.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [activeOffers.length, intervalSec, isPaused, handleNext]);

  // Touch Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    setIsPaused(false);
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    // In RTL layout:
    // Swiping left (diff > 0) moves to next
    // Swiping right (diff < 0) moves to prev
    if (diff > minSwipeDistance) {
      handleNext();
    } else if (diff < -minSwipeDistance) {
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Active current slide
  const currentOffer = activeOffers[currentIndex] || activeOffers[0];

  // Dynamic Countdown Timer State
  const [timeLeft, setTimeLeft] = useState({ hours: 3, minutes: 59, seconds: 41, isExpired: false });

  useEffect(() => {
    if (!currentOffer || !currentOffer.hasCountdown) return;

    const calculateRemaining = () => {
      if (currentOffer.countdownType === 'fixed_datetime' && currentOffer.countdownEndDateTime) {
        const target = new Date(currentOffer.countdownEndDateTime).getTime();
        const now = Date.now();
        const diff = target - now;

        if (diff <= 0) {
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
          return;
        }

        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        setTimeLeft({ hours, minutes, seconds, isExpired: false });
      } else {
        const now = new Date();
        const durationHours = currentOffer.countdownHours || 4;
        const totalDurationSec = durationHours * 3600;
        const currentSecondsOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const remainderSec = totalDurationSec - (currentSecondsOfDay % totalDurationSec);

        const hours = Math.floor(remainderSec / 3600);
        const minutes = Math.floor((remainderSec % 3600) / 60);
        const seconds = remainderSec % 60;

        setTimeLeft({ hours, minutes, seconds, isExpired: false });
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [
    currentOffer?.id,
    currentOffer?.countdownType,
    currentOffer?.countdownEndDateTime,
    currentOffer?.countdownHours,
    currentOffer?.hasCountdown,
  ]);

  if (config.isEnabled === false || activeOffers.length === 0 || !currentOffer) {
    return null;
  }

  const format2Digits = (num: number) => String(Math.max(0, num)).padStart(2, '0');

  // Animation variants for smooth directional transitions
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 350, damping: 32 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
      scale: 0.98,
      transition: {
        duration: 0.25,
        ease: 'easeIn',
      },
    }),
  };

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="group relative w-full overflow-hidden rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-r from-[#1E140C] via-[#120C08] to-[#1E140C] shadow-2xl dir-rtl select-none"
    >
      {/* Floating Side Arrows on Desktop/Tablet */}
      {activeOffers.length > 1 && (
        <>
          {/* Previous Slide (Right arrow in RTL) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="الانتقال للعرض السابق"
            className="carousel-dot !min-h-0 hidden md:flex items-center justify-center absolute right-3.5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[#120C08]/85 border border-[#D4AF37]/50 text-[#F4E08B] hover:bg-[#D4AF37] hover:text-black shadow-xl backdrop-blur-md transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Next Slide (Left arrow in RTL) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="الانتقال للعرض التالي"
            className="carousel-dot !min-h-0 hidden md:flex items-center justify-center absolute left-3.5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[#120C08]/85 border border-[#D4AF37]/50 text-[#F4E08B] hover:bg-[#D4AF37] hover:text-black shadow-xl backdrop-blur-md transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
        </>
      )}

      {/* Slide Content with AnimatePresence */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentOffer.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="relative min-h-[390px] sm:min-h-[420px] p-5 sm:p-9 flex flex-col justify-between overflow-hidden"
        >
          {/* Background Image Overlay with Vignette */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src={currentOffer.imageUrl || Images.heroBanner1 || undefined}
              alt={currentOffer.titleAr}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-35 scale-105 filter blur-[1px] transition-transform duration-1000 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0F0B08] via-[#0F0B08]/92 to-[#0F0B08]/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0B08] via-transparent to-transparent" />
          </div>

          {/* Top Urgency & Badge Row */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {currentOffer.badgeAr && (
                <span className="px-3 py-1 rounded-full bg-[#2A1E15]/90 backdrop-blur-sm border border-[#D4AF37]/50 text-xs font-bold text-[#F4E08B] flex items-center gap-1.5 shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{currentOffer.badgeAr.replace(/في الجيزة|فرع الجيزة|الجيزة/g, 'في الطالبية هرم')}</span>
                </span>
              )}

              {currentOffer.discountBadgeAr && (
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs font-black shadow-lg animate-pulse flex items-center gap-1">
                  <span>🔥</span>
                  <span>{currentOffer.discountBadgeAr}</span>
                </span>
              )}
            </div>

            {/* Live Countdown Timer */}
            {currentOffer.hasCountdown !== false && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#120C08]/90 backdrop-blur-sm border border-[#D4AF37]/40 text-xs text-[#FFF1C5] shadow-lg">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin-slow shrink-0" />
                <span className="text-[11px] text-[#8E8373] font-medium">
                  {currentOffer.countdownLabelAr || 'ينتهي العرض خلال:'}
                </span>
                <span className="font-mono font-black text-amber-400 dir-ltr text-xs tracking-wider">
                  {format2Digits(timeLeft.hours)}:{format2Digits(timeLeft.minutes)}:{format2Digits(timeLeft.seconds)}
                </span>
              </div>
            )}
          </div>

          {/* Middle Main Copy */}
          <div className="relative z-10 max-w-xl space-y-2.5 my-auto pt-4 pb-2">
            <h1 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF1C5] via-[#F4E08B] to-[#D4AF37] font-heading leading-tight drop-shadow-md">
              {currentOffer.titleAr}
            </h1>
            {currentOffer.subtitleAr && (
              <p className="text-xs sm:text-sm text-[#C8BFB0] leading-relaxed font-medium">
                {currentOffer.subtitleAr}
              </p>
            )}

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#D4AF37] font-bold">
              {currentOffer.trustBadge1Ar && (
                <span className="flex items-center gap-1.5 bg-[#1A120C]/90 px-2.5 py-1 rounded-lg border border-[#3D2C1E] shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{currentOffer.trustBadge1Ar}</span>
                </span>
              )}
              {currentOffer.trustBadge2Ar && (
                <span className="flex items-center gap-1.5 bg-[#1A120C]/90 px-2.5 py-1 rounded-lg border border-[#3D2C1E] shadow-sm">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{currentOffer.trustBadge2Ar}</span>
                </span>
              )}
            </div>
          </div>

          {/* Bottom Action CTA & Refined Responsive Navigation Dock */}
          <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3.5 border-t border-[#D4AF37]/20">
            {/* CTA Button */}
            <button
              type="button"
              onClick={() => {
                if (currentOffer.categoryId && onSelectCategory) {
                  onSelectCategory(currentOffer.categoryId);
                } else if (onOpenOrderModal) {
                  onOpenOrderModal();
                }
              }}
              className="w-full sm:w-auto min-h-[46px] px-6 py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-extrabold text-xs sm:text-sm shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer group shrink-0"
            >
              <ShoppingBag className="w-4 h-4 text-black stroke-[2.5]" />
              <span>{currentOffer.ctaTextAr || 'اطلب الآن'}</span>
              <ArrowLeft className="w-4 h-4 text-black stroke-[3] group-hover:-translate-x-1 transition-transform" />
            </button>

            {/* High-End Responsive Navigation Dock (خانة التحرك بين العروض) */}
            {activeOffers.length > 1 && (
              <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#120C08]/90 backdrop-blur-md border border-[#D4AF37]/40 shadow-lg">
                  {/* Prev Button (In RTL, Prev is to the right) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrev();
                    }}
                    aria-label="العرض السابق"
                    className="carousel-dot !min-h-0 w-7 h-7 rounded-full bg-white/5 hover:bg-[#D4AF37]/20 active:scale-90 border border-white/10 hover:border-[#D4AF37]/50 text-[#F4E08B] flex items-center justify-center transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {/* Interactive Dots with Active Pill */}
                  <div className="flex items-center gap-1.5 px-1.5">
                    {activeOffers.map((_, idx) => {
                      const isActive = currentIndex === idx;
                      return (
                        <button
                          key={`hero-dot-${idx}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(idx);
                          }}
                          aria-label={`انتقال للعرض ${idx + 1}`}
                          className="carousel-dot !min-h-0 p-1 flex items-center justify-center cursor-pointer transition-transform active:scale-90"
                        >
                          <span
                            className={`block rounded-full transition-all duration-300 ease-out ${
                              isActive
                                ? 'w-6 sm:w-7 h-2 sm:h-2.5 bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] shadow-[0_0_10px_rgba(244,224,139,0.85)]'
                                : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/25 hover:bg-[#D4AF37]/60'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button (In RTL, Next is to the left) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    aria-label="العرض التالي"
                    className="carousel-dot !min-h-0 w-7 h-7 rounded-full bg-white/5 hover:bg-[#D4AF37]/20 active:scale-90 border border-white/10 hover:border-[#D4AF37]/50 text-[#F4E08B] flex items-center justify-center transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {/* Visual Counter Indicator */}
                  <div className="border-r border-[#D4AF37]/30 pr-2 mr-0.5">
                    <span className="font-mono text-[11px] font-bold text-[#F4E08B]/90 tracking-wide dir-ltr block">
                      {currentIndex + 1}/{activeOffers.length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
