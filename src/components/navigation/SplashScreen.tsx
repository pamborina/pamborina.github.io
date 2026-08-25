import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Images } from '../../data/images';

interface SplashScreenProps {
  onComplete: () => void;
  taglineAr?: string;
}

const LOADING_MESSAGES = [
  'جارٍ تحضير تجربة مميزة...',
  'نجهز طلبك بكل حب...',
  'لحظات ونبدأ...',
  'أهلاً بك في بامبورينا...',
  'اختر ألذ ما تشتهي...',
];

// Floating ambient gold particle spots for luxury dark atmosphere
const PARTICLES = [
  { id: 1, top: '15%', left: '20%', size: 3, delay: 0, duration: 4 },
  { id: 2, top: '25%', left: '80%', size: 4, delay: 0.8, duration: 5 },
  { id: 3, top: '70%', left: '15%', size: 2, delay: 1.2, duration: 4.5 },
  { id: 4, top: '75%', left: '85%', size: 3, delay: 0.4, duration: 6 },
  { id: 5, top: '40%', left: '10%', size: 2, delay: 1.5, duration: 3.5 },
  { id: 6, top: '60%', left: '90%', size: 3, delay: 0.2, duration: 5.2 },
  { id: 7, top: '85%', left: '45%', size: 4, delay: 1.0, duration: 4.8 },
  { id: 8, top: '12%', left: '60%', size: 2, delay: 0.6, duration: 4.2 },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  taglineAr = 'طعم الفخامة في كل لقمة',
}) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Smooth Progress Fill (0% to 100% over ~2.4 seconds)
  useEffect(() => {
    const startTime = Date.now();
    const duration = 2400; // 2.4s total fill duration

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(interval);
        // Begin exit sequence
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => {
            onComplete();
          }, 600); // 600ms exit transition
        }, 300);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [onComplete]);

  // Rotate Loading Messages Every 2.0 Seconds
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(messageInterval);
  }, []);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1, scale: isExiting ? 0.96 : 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0E0E0E] text-white dir-rtl overflow-hidden select-none"
    >
      {/* Ambient Background Radial Blurs (#0E0E0E theme with subtle warm gold/cacao glow) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#D4AF37]/10 via-[#2E1A0D]/15 to-transparent rounded-full blur-[120px] pointer-events-none transform-gpu" />
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#2E1A0D]/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Subtle Floating Ambient Gold Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0.1, y: 0 }}
            animate={{
              opacity: [0.1, 0.35, 0.1],
              y: [0, -20, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              top: p.top,
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              backgroundColor: '#D4AF37',
              boxShadow: '0 0 8px rgba(212, 175, 55, 0.6)',
            }}
          />
        ))}
      </div>

      {/* Top Header - Minimal Skip Button */}
      <div className="w-full max-w-md px-6 pt-10 flex justify-end items-center z-10">
        <button
          onClick={handleSkip}
          className="text-[11px] text-[#A89F91] hover:text-[#FFF1C5] bg-[#161616]/80 border border-[#2A241D] px-4 py-1.5 rounded-full backdrop-blur-md transition-all active:scale-95 cursor-pointer font-medium tracking-wide"
        >
          تخطي
        </button>
      </div>

      {/* Center Section: Official Pamborina Logo & Tagline */}
      <div className="flex flex-col items-center justify-center text-center px-6 my-auto z-10 space-y-6 max-w-md">
        {/* Animated Official Logo Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{
            opacity: 1,
            scale: 1.0,
            y: [0, -3, 0],
          }}
          transition={{
            opacity: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
            scale: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
            y: { repeat: Infinity, duration: 4, ease: 'easeInOut' },
          }}
          className="relative flex items-center justify-center"
        >
          {/* Subtle Outer Soft Glow Ring */}
          <div className="absolute inset-0 rounded-full bg-[#D4AF37] opacity-15 blur-2xl transform scale-110 pointer-events-none" />

          {/* Official Logo Image (Exact sizes: Mobile 150px, Tablet 180px, Desktop 220px) */}
          <div className="relative z-10 rounded-full p-1 bg-gradient-to-b from-[#D4AF37]/60 via-[#2E1A0D]/80 to-[#120E0A] shadow-[0_0_40px_rgba(212,175,55,0.22)] border border-[#D4AF37]/30 overflow-hidden w-[150px] h-[150px] sm:w-[180px] sm:h-[180px] lg:w-[220px] lg:h-[220px]">
            <img
              src={Images.loadingLogo}
              alt="شعار حلواني بامبورينا الرسمي"
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover bg-white"
            />
          </div>
        </motion.div>

        {/* Elegant Arabic Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-1.5"
        >
          <h2 className="text-xl sm:text-2xl font-bold font-heading bg-gradient-to-r from-[#FFF1C5] via-[#F4E08B] to-[#D4AF37] bg-clip-text text-transparent tracking-wide leading-tight drop-shadow-sm">
            {taglineAr}
          </h2>
          <p className="text-[11px] sm:text-xs text-[#8E8578] font-medium tracking-widest">
            حلواني بامبورينا
          </p>
        </motion.div>
      </div>

      {/* Bottom Loading Bar & Rotating Message */}
      <div className="w-full max-w-xs sm:max-w-sm px-6 pb-12 z-10 flex flex-col items-center space-y-4">
        {/* Rotating Loading Text */}
        <div className="h-6 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-xs sm:text-sm text-[#D8CFB8] font-medium text-center tracking-wide"
            >
              {LOADING_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Option 1: Luxury Golden Progress Line */}
        <div className="w-full relative flex items-center">
          <div className="w-full h-[2.5px] bg-[#221B14] rounded-full overflow-hidden border border-[#33271C]/40">
            <motion.div
              className="h-full bg-gradient-to-r from-[#9E7B21] via-[#D4AF37] to-[#FFF1C5] rounded-full shadow-[0_0_12px_rgba(212,175,55,0.75)]"
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut', duration: 0.05 }}
            />
          </div>
        </div>

        {/* Minimal Percentage Indicator */}
        <span className="text-[10px] text-[#6E6456] font-semibold tracking-wider dir-ltr">
          {progress}%
        </span>
      </div>
    </motion.div>
  );
};
