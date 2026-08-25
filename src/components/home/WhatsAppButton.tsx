import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { phoneUtils } from '../../utils/phoneUtils';

interface WhatsAppButtonProps {
  whatsappNumber?: string;
  defaultMessageAr?: string;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  whatsappNumber: propWhatsappNumber,
  defaultMessageAr = 'مرحباً حلواني بامبورينا، أود الاستفسار عن المنتجات والعروض المتاحة.',
}) => {
  const { customerServiceWhatsApp, whatsapp, storeNameAr } = useSiteSettings();

  const activeNumber = propWhatsappNumber || customerServiceWhatsApp || whatsapp;

  if (!activeNumber) return null;

  const finalUrl = phoneUtils.buildWhatsAppUrl(activeNumber, defaultMessageAr);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 20 }}
      className="fixed bottom-6 left-6 z-40 flex items-center gap-3 select-none"
    >
      <a
        href={finalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-600 text-white font-bold text-xs shadow-2xl shadow-emerald-950/60 hover:shadow-emerald-500/40 border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all duration-300"
        title={`تواصل معنا عبر الواتساب - ${storeNameAr}`}
      >
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
        </span>

        <MessageSquare className="w-5 h-5 fill-current group-hover:rotate-12 transition-transform" />
        <span className="font-bold tracking-wide hidden sm:inline-block">خدمة العملاء</span>
        <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
      </a>
    </motion.div>
  );
};
