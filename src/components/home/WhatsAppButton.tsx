import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { phoneUtils } from '../../utils/phoneUtils';

interface WhatsAppButtonProps {
  whatsappNumber?: string;
  defaultMessageAr?: string;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  whatsappNumber: propWhatsappNumber,
  defaultMessageAr = 'مرحباً إدارة حلواني بامبورينا، أود تقديم شكوى / مقترح لتحسين الخدمة.',
}) => {
  const { complaintsWhatsApp, customerServiceWhatsApp, whatsapp, storeNameAr } = useSiteSettings();

  const activeNumber = propWhatsappNumber || complaintsWhatsApp || customerServiceWhatsApp || whatsapp;

  if (!activeNumber) return null;

  const finalUrl = phoneUtils.buildWhatsAppUrl(activeNumber, defaultMessageAr);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 20 }}
      className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-40 flex items-center gap-2 select-none"
    >
      <a
        href={finalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative min-h-[44px] flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs sm:text-sm shadow-2xl shadow-amber-950/70 hover:shadow-amber-500/30 border border-amber-300/60 hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap"
        title={`قسم الشكاوى والمقترحات المعتمد - ${storeNameAr}`}
      >
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
        </span>

        <ShieldAlert className="w-4 h-4 text-neutral-950 shrink-0 group-hover:rotate-12 transition-transform" />
        <span className="font-black tracking-tight inline-block whitespace-nowrap">واتساب الشكاوى</span>
        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-950/15 text-neutral-950 font-black shrink-0">
          مباشر
        </span>
      </a>
    </motion.div>
  );
};
