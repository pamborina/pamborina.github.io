import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Sparkles, X, Store, AlertTriangle } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export const TopAnnouncementBar: React.FC = () => {
  const { isStoreOpen, temporaryClosureReasonAr, announcementEnabled, announcementTextAr } = useSiteSettings();
  const [isDismissed, setIsDismissed] = useState(false);

  // If the store is closed, show priority store closure alert
  if (!isStoreOpen) {
    return (
      <div
        className="w-full bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-b border-rose-500/40 text-white px-4 py-3 shadow-lg relative z-40 dir-rtl"
        role="alert"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-rose-500/30 border border-rose-400/50 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
              <Store className="w-3.5 h-3.5 text-rose-200" />
            </div>
            <div className="text-right">
              <span className="font-bold text-rose-200 ml-1.5 block sm:inline">⚠️ تنبيه إغلاق مؤقت:</span>
              <span className="text-white/90 font-medium leading-relaxed">
                {temporaryClosureReasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..'}
              </span>
            </div>
          </div>

          <div className="shrink-0 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-[11px] font-bold text-rose-200 w-full sm:w-auto text-center">
            مغلق مؤقتاً
          </div>
        </div>
      </div>
    );
  }

  // If announcement is enabled and not dismissed
  if (announcementEnabled && announcementTextAr && !isDismissed) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="w-full bg-gradient-to-r from-[#24170D] via-[#3D2815] to-[#24170D] border-b border-[#D4AF37]/40 text-[#FFF1C5] px-4 py-2 shadow-md relative z-40 dir-rtl"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-center sm:justify-start">
              <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center shrink-0">
                <Megaphone className="w-3.5 h-3.5 text-[#F4E08B]" />
              </div>
              <span className="font-semibold text-white/95 text-xs sm:text-sm truncate">
                {announcementTextAr}
              </span>
            </div>

            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-lg text-[#C8BFB0] hover:text-white hover:bg-[#2D2017] transition-colors shrink-0"
              title="إغلاق التنبيه"
              aria-label="إغلاق الإعلان"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
};
