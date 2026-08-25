import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Clock, Zap, ArrowLeft, ShieldCheck, Flame, ShoppingBag } from 'lucide-react';
import { HeroOffer, HeroOffersConfig } from '../../types';
import {
  heroOfferService,
  DEFAULT_HERO_OFFERS,
  DEFAULT_HERO_OFFERS_CONFIG,
} from '../../services/heroOfferService';
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

  // Auto carousel rotation
  useEffect(() => {
    if (activeOffers.length <= 1) return;
    const intervalSec = config.autoSlideIntervalSeconds > 0 ? config.autoSlideIntervalSeconds : 6;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeOffers.length);
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [activeOffers.length, config.autoSlideIntervalSeconds]);

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
        // Daily recurring / loop countdown based on current time of day or custom duration
        const now = new Date();
        const durationHours = currentOffer.countdownHours || 4;
        const totalDurationSec = durationHours * 3600;
        
        // Cyclic modulus based on seconds since midnight
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
  }, [currentOffer?.id, currentOffer?.countdownType, currentOffer?.countdownEndDateTime, currentOffer?.countdownHours, currentOffer?.hasCountdown]);

  // Master switch check: If admin turned off hero offers or no active offers exist, don't render section
  if (config.isEnabled === false || activeOffers.length === 0 || !currentOffer) {
    return null;
  }

  const format2Digits = (num: number) => String(Math.max(0, num)).padStart(2, '0');

  return (
    <section className="relative w-full overflow-hidden rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-r from-[#1E140C] via-[#120C08] to-[#1E140C] shadow-2xl dir-rtl">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentOffer.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.45 }}
          className="relative min-h-[380px] sm:min-h-[420px] p-6 sm:p-10 flex flex-col justify-between overflow-hidden"
        >
          {/* Background Image Overlay with Vignette */}
          <div className="absolute inset-0 z-0">
            <img
              src={currentOffer.imageUrl}
              alt={currentOffer.titleAr}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-35 scale-105 filter blur-[1px] transition-transform duration-1000 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0F0B08] via-[#0F0B08]/90 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0B08] via-transparent to-transparent" />
          </div>

          {/* Top Urgency & Badge Row */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {currentOffer.badgeAr && (
                <span className="px-3 py-1 rounded-full bg-[#2A1E15] border border-[#D4AF37]/50 text-xs font-bold text-[#F4E08B] flex items-center gap-1.5 shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{currentOffer.badgeAr}</span>
                </span>
              )}

              {currentOffer.discountBadgeAr && (
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs font-black shadow-lg animate-pulse">
                  🔥 {currentOffer.discountBadgeAr}
                </span>
              )}
            </div>

            {/* Live Countdown Timer */}
            {currentOffer.hasCountdown !== false && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-[#120C08]/90 border border-[#D4AF37]/40 text-xs text-[#FFF1C5] shadow-lg">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
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
          <div className="relative z-10 max-w-xl space-y-3 my-auto pt-4">
            <h1 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF1C5] via-[#F4E08B] to-[#D4AF37] font-heading leading-tight drop-shadow-md">
              {currentOffer.titleAr}
            </h1>
            {currentOffer.subtitleAr && (
              <p className="text-xs sm:text-sm text-[#C8BFB0] leading-relaxed font-medium">
                {currentOffer.subtitleAr}
              </p>
            )}

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-[#D4AF37] font-bold">
              {currentOffer.trustBadge1Ar && (
                <span className="flex items-center gap-1 bg-[#1A120C]/90 px-2.5 py-1 rounded-lg border border-[#3D2C1E]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{currentOffer.trustBadge1Ar}</span>
                </span>
              )}
              {currentOffer.trustBadge2Ar && (
                <span className="flex items-center gap-1 bg-[#1A120C]/90 px-2.5 py-1 rounded-lg border border-[#3D2C1E]">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{currentOffer.trustBadge2Ar}</span>
                </span>
              )}
            </div>
          </div>

          {/* Bottom Action CTA & Pagination Dots */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#D4AF37]/20">
            <button
              onClick={() => {
                if (currentOffer.categoryId && onSelectCategory) {
                  onSelectCategory(currentOffer.categoryId);
                } else if (onOpenOrderModal) {
                  onOpenOrderModal();
                }
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-extrabold text-sm shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
            >
              <ShoppingBag className="w-4 h-4 text-black stroke-[2.5]" />
              <span>{currentOffer.ctaTextAr || 'اطلب الآن'}</span>
              <ArrowLeft className="w-4 h-4 text-black stroke-[3] group-hover:-translate-x-1 transition-transform" />
            </button>

            {/* Carousel Dots */}
            {activeOffers.length > 1 && (
              <div className="flex items-center gap-2">
                {activeOffers.map((_, idx) => (
                  <button
                    key={`hero-dot-${idx}`}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`انتقال للعرض ${idx + 1}`}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                      currentIndex === idx
                        ? 'w-8 bg-[#F4E08B] shadow-[0_0_10px_rgba(244,224,139,0.8)]'
                        : 'w-2.5 bg-[#3D2C1E] hover:bg-[#8E8373]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
