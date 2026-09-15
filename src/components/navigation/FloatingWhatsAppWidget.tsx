import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Phone,
  Copy,
  Check,
  Headphones,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  LifeBuoy,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { ContactChannelCategory, ContactNumberItem } from '../../types';
import { phoneUtils } from '../../utils/phoneUtils';
import { BrandGoldWhatsAppIcon } from '../common/BrandGoldWhatsAppIcon';

export const FloatingWhatsAppWidget: React.FC = () => {
  const {
    contactChannels,
    floatingWhatsAppConfig,
    complaintsWhatsApp,
    customerServiceWhatsApp,
    whatsapp,
  } = useSiteSettings();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | ContactChannelCategory>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close when pressing Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Fallback channels with precise names and pre-filled messages
  const allChannels: ContactNumberItem[] = useMemo(() => {
    const list =
      Array.isArray(contactChannels) && contactChannels.length > 0
        ? contactChannels.filter((c) => c.enabled !== false)
        : [];

    if (list.length > 0) {
      return list;
    }

    const fallbackList: ContactNumberItem[] = [
      {
        id: 'fallback_gen_1',
        category: 'general',
        titleAr: 'خدمة العملاء بامبورينا',
        phoneNumber: customerServiceWhatsApp || whatsapp || '01121778205',
        defaultMessageAr:
          '🧁 *خدمة العملاء بامبورينا*\n━━━━━━━━━━━━━━━━━━━━━━\nالسلام عليكم ورحمة الله وبركاته،\nأود الاستفسار والطلب من قائمة حلواني بامبورينا 🥐🍰',
        agentNameOrRole: 'فريق خدمة العملاء والطلبات المباشرة',
        enabled: true,
      },
      {
        id: 'fallback_sup_1',
        category: 'support',
        titleAr: 'الدعم الفني والتقني بامبورينا',
        phoneNumber: '01121778205',
        defaultMessageAr:
          '🛠️ *الدعم الفني والتقني بامبورينا*\n━━━━━━━━━━━━━━━━━━━━━━\nالسلام عليكم ورحمة الله وبركاته،\nأحتاج لمساعدة تقنية بخصوص الطلب أو استخدام موقع بامبورينا 💻',
        agentNameOrRole: 'فريق الدعم الفني والتقني المباشر',
        enabled: true,
      },
      {
        id: 'fallback_comp_1',
        category: 'complaints',
        titleAr: 'قسم الشكاوى والمقترحات بامبورينا',
        phoneNumber: complaintsWhatsApp || customerServiceWhatsApp || whatsapp || '01121778205',
        defaultMessageAr:
          '⚖️ *قسم الشكاوى والمقترحات بامبورينا*\n━━━━━━━━━━━━━━━━━━━━━━\nالسلام عليكم ورحمة الله وبركاته،\nأود تقديم مقترح / شكوى مباشرة لإدارة حلواني بامبورينا 📋',
        agentNameOrRole: 'إدارة الجودة ورضا العملاء (مباشر للإدارة)',
        enabled: true,
      },
    ];

    return fallbackList;
  }, [contactChannels, complaintsWhatsApp, customerServiceWhatsApp, whatsapp]);

  const filteredChannels = useMemo(() => {
    if (activeTab === 'all') return allChannels;
    return allChannels.filter((c) => c.category === activeTab);
  }, [allChannels, activeTab]);

  const config = floatingWhatsAppConfig || {
    enabled: true,
    position: 'bottom-right',
    buttonTitleAr: 'تواصل و دعم فني',
    badgeTextAr: 'متصل الآن 🟢',
    pulseEffect: true,
  };

  if (config.enabled === false) {
    return null;
  }

  const handleCopy = (id: string, phoneNum: string) => {
    try {
      navigator.clipboard?.writeText(phoneNum);
    } catch {
      // Fallback
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Build formatted pre-filled WhatsApp message with exact department heading
  const formatChannelWhatsAppMessage = (channel: ContactNumberItem) => {
    let header = '';
    if (channel.category === 'general') {
      header = '🧁 *خدمة العملاء بامبورينا*\n━━━━━━━━━━━━━━━━━━━━━━';
    } else if (channel.category === 'support') {
      header = '🛠️ *الدعم الفني والتقني بامبورينا*\n━━━━━━━━━━━━━━━━━━━━━━';
    } else if (channel.category === 'complaints') {
      header = '⚖️ *قسم الشكاوى والمقترحات بامبورينا*\n━━━━━━━━━━━━━━━━━━━━━━';
    } else {
      header = `✨ *${channel.titleAr || 'حلواني بامبورينا'}*\n━━━━━━━━━━━━━━━━━━━━━━`;
    }

    const rawMsg = channel.defaultMessageAr?.trim();
    if (!rawMsg) {
      return `${header}\nالسلام عليكم ورحمة الله وبركاته،\nأود التواصل والاستفسار بخصوص حلواني بامبورينا.`;
    }

    // If message already contains a decorative header, keep it intact
    if (rawMsg.includes('━━━━') || rawMsg.startsWith('*') || rawMsg.startsWith('🧁') || rawMsg.startsWith('🛠️') || rawMsg.startsWith('⚖️')) {
      return rawMsg;
    }

    return `${header}\n${rawMsg}`;
  };

  const getCategoryMeta = (cat: ContactChannelCategory) => {
    switch (cat) {
      case 'support':
        return {
          label: 'دعم فني',
          icon: Headphones,
          badgeBg: 'bg-blue-950/80 border-blue-500/40 text-blue-300',
          accentBorder: 'hover:border-blue-400/50',
          color: '#60A5FA',
        };
      case 'complaints':
        return {
          label: 'شكاوى ومقترحات',
          icon: ShieldAlert,
          badgeBg: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
          accentBorder: 'hover:border-amber-400/50',
          color: '#F59E0B',
        };
      case 'general':
      default:
        return {
          label: 'خدمة العملاء',
          icon: ShoppingBag,
          badgeBg: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
          accentBorder: 'hover:border-[#D4AF37]/50',
          color: '#10B981',
        };
    }
  };

  const countForCategory = (cat: 'all' | ContactChannelCategory) => {
    if (cat === 'all') return allChannels.length;
    return allChannels.filter((c) => c.category === cat).length;
  };

  return (
    <>
      {/* Backdrop for Focus & Dismissal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 cursor-pointer"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* 
        Responsive Dialog / Sheet:
        - Desktop / Laptop: Widescreen landscape modal layout (`md:w-[680px] lg:w-[720px] md:grid-cols-2`)
        - Mobile: Fixed bottom drawer that slides up smoothly with single column layout
      */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed z-50 pointer-events-none inset-x-0 bottom-0 md:bottom-20 md:right-8 md:left-auto flex justify-center md:block dir-rtl p-2 sm:p-4 md:p-0"
          >
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="pointer-events-auto w-full md:w-[680px] lg:w-[720px] max-w-full md:max-w-[calc(100vw-3rem)] max-h-[85dvh] md:max-h-[78vh] bg-[#140D08] border-t-2 md:border-2 border-[#D4AF37]/60 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95), 0 0 35px rgba(212, 175, 55, 0.35)',
              }}
            >
              {/* Gold Top Accent Line */}
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#FFF2B8] to-[#D4AF37] z-20" />

              {/* Mobile Drag/Pull Indicator Bar */}
              <div className="w-12 h-1 rounded-full bg-neutral-700/60 mx-auto mt-2 md:hidden shrink-0" />

              {/* Header: Title, Status, and Close Button */}
              <div className="flex items-center justify-between gap-3 p-4 md:p-4.5 pb-3 border-b border-[#2D1F14] relative z-10 shrink-0 bg-[#160E09]">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <BrandGoldWhatsAppIcon className="w-9 h-9 md:w-10 md:h-10 drop-shadow-md" variant="luxury-glow" />
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#160E09] animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-black text-white tracking-tight">
                        قنوات التواصل المباشر
                      </h3>
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    </div>
                    <p className="text-[11px] text-[#C6B6A3] mt-0.5 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>حلواني بامبورينا في خدمتكم لحظياً</span>
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl bg-[#22170F] hover:bg-[#2D1F14] text-[#A89C8C] hover:text-white border border-[#3D2B1E] transition-colors cursor-pointer active:scale-95"
                  title="إغلاق القائمة"
                  aria-label="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 px-3 md:px-4 py-2 overflow-x-auto no-scrollbar shrink-0 bg-[#120B07] border-b border-[#24170E]">
                {[
                  { id: 'all', label: 'الكل', icon: Sparkles },
                  { id: 'general', label: 'خدمة العملاء', icon: ShoppingBag },
                  { id: 'support', label: 'الدعم الفني', icon: Headphones },
                  { id: 'complaints', label: 'الشكاوى', icon: ShieldAlert },
                ].map((tab) => {
                  const isSelected = activeTab === tab.id;
                  const count = countForCategory(tab.id as any);
                  if (count === 0 && tab.id !== 'all') return null;

                  const TabIcon = tab.icon;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 border select-none ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#D4AF37] to-[#AA8010] text-neutral-950 border-[#FFF2B8] shadow-md font-black'
                          : 'bg-[#1C140E] border-[#2E2016] text-[#A89C8C] hover:text-white hover:border-[#3D2C1E]'
                      }`}
                    >
                      <TabIcon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          isSelected ? 'bg-neutral-950/40 text-neutral-950' : 'bg-neutral-800 text-[#C8BFB0]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Channels List: 2-Column Grid on Desktop / Widescreen */}
              <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-3.5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                {filteredChannels.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 p-8 text-center rounded-2xl bg-[#140E0A] border border-[#2D2017] text-xs text-[#8E8373] space-y-2">
                    <LifeBuoy className="w-8 h-8 mx-auto text-[#D4AF37]/50" />
                    <p>لا توجد أرقام مضافة في هذا القسم حالياً.</p>
                  </div>
                ) : (
                  filteredChannels.map((channel) => {
                    const meta = getCategoryMeta(channel.category);
                    const CategoryIcon = meta.icon;
                    const whatsAppMsg = formatChannelWhatsAppMessage(channel);
                    const whatsAppUrl = phoneUtils.buildWhatsAppUrl(
                      channel.phoneNumber,
                      whatsAppMsg
                    );
                    const isCopied = copiedId === channel.id;

                    return (
                      <div
                        key={channel.id}
                        className={`p-3.5 rounded-2xl bg-gradient-to-br from-[#1C130C] to-[#120B07] border border-[#3A281B] ${meta.accentBorder} transition-all shadow-md flex flex-col justify-between gap-2.5 group`}
                      >
                        {/* Card Top: Badges, Title, Phone */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${meta.badgeBg}`}
                              >
                                <CategoryIcon className="w-3 h-3" />
                                <span>{meta.label}</span>
                              </span>
                              {channel.agentNameOrRole && (
                                <span className="text-[10px] text-[#C6B6A3] bg-[#0F0906] px-2 py-0.5 rounded-lg border border-[#2B1C12] font-medium flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-[#D4AF37]" />
                                  <span>{channel.agentNameOrRole}</span>
                                </span>
                              )}
                            </div>

                            {/* Phone Badge */}
                            <div className="text-left dir-ltr shrink-0">
                              <span className="text-xs font-mono font-black text-[#F4E08B] bg-[#0E0906] px-2.5 py-1 rounded-lg border border-[#2E2016] inline-block">
                                {channel.phoneNumber}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-xs sm:text-sm font-black text-white leading-snug">
                            {channel.titleAr}
                          </h4>
                        </div>

                        {/* Pre-filled Message Indicator */}
                        <div className="bg-[#0D0805] px-2.5 py-1.5 rounded-xl border border-[#24170E] flex items-start gap-1.5 text-[10.5px] text-[#A89C8C] leading-tight">
                          <MessageSquare className="w-3 h-3 text-[#D4AF37] shrink-0 mt-0.5" />
                          <span className="line-clamp-1">
                            {channel.defaultMessageAr ? channel.defaultMessageAr.split('\n')[0] : 'رسالة جاهزة مجهزة للبدء مباشرة'}
                          </span>
                        </div>

                        {/* Action Buttons: Full WhatsApp Primary + Phone Call + Quick Copy */}
                        <div className="flex items-center gap-2 pt-1 border-t border-[#261A10]">
                          {/* 1-Click WhatsApp Chat Button */}
                          <a
                            href={whatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#DFB73D] to-[#B38715] hover:from-[#E5BF45] hover:to-[#C2961E] text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all select-none border border-[#FFF2B8]/70 cursor-pointer whitespace-nowrap"
                          >
                            <BrandGoldWhatsAppIcon className="w-4 h-4 shrink-0" />
                            <span>محادثة واتساب 💬</span>
                          </a>

                          {/* Direct Phone Call Button */}
                          <a
                            href={`tel:${channel.phoneNumber}`}
                            className="w-9 h-9 shrink-0 rounded-xl bg-[#251A10] hover:bg-[#322316] text-[#F4E08B] hover:text-white border border-[#3E2B1E] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                            title="اتصال هاتفي مباشر"
                            aria-label="اتصال هاتفي"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>

                          {/* Copy Number Button */}
                          <button
                            type="button"
                            onClick={() => handleCopy(channel.id, channel.phoneNumber)}
                            className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                                : 'bg-[#251A10] hover:bg-[#322316] text-[#C8BFB0] hover:text-white border-[#3E2B1E]'
                            }`}
                            title={isCopied ? 'تم نسخ الرقم بنجاح' : 'نسخ رقم الهاتف'}
                            aria-label="نسخ الرقم"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Note */}
              <div className="px-4 py-2.5 bg-[#120B07] border-t border-[#24170E] flex items-center justify-between text-[11px] text-[#A89C8C] shrink-0">
                <span className="flex items-center gap-1.5 font-medium">
                  <LifeBuoy className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>متاحون لخدمتكم يومياً</span>
                </span>
                <span className="text-[#D4AF37] font-black">حلواني بامبورينا 🌟</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 
        Floating Action Button (FAB):
        - Positioned on the RIGHT side (`right-3.5 sm:right-6 md:right-8`)
        - Stacked cleanly ABOVE the ScrollToTop button:
          * On Mobile: `bottom-34 sm:bottom-42` (ScrollToTop button is at `bottom-20 sm:bottom-24`)
          * On Laptop / Desktop: `md:bottom-24` (ScrollToTop button is at `md:bottom-8`)
      */}
      <div
        id="floating-whatsapp-container"
        className="fixed bottom-34 sm:bottom-42 md:bottom-24 right-3.5 sm:right-6 md:right-8 z-45 select-none dir-rtl flex items-center"
      >
        <div className="relative group">
          {/* Outer Golden Halo Pulse Effect */}
          {config.pulseEffect !== false && (
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#FFF2B8] to-[#AA8010] opacity-75 blur-md group-hover:opacity-100 animate-pulse pointer-events-none transition-opacity duration-300" />
          )}

          <button
            id="floating-whatsapp-toggle-btn"
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-15 md:h-15 rounded-full bg-gradient-to-tr from-[#120B07] via-[#24170E] to-[#120B07] border-2 border-[#D4AF37] hover:border-[#FFF2B8] text-white flex items-center justify-center shadow-2xl shadow-black/80 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer overflow-hidden"
            style={{
              boxShadow: '0 10px 30px rgba(0,0,0,0.7), 0 0 20px rgba(212, 175, 55, 0.45)',
            }}
            aria-label="قنوات التواصل والدعم الفني عبر واتساب"
          >
            {/* Subtle Metallic Gradient Glaze */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/20 via-transparent to-amber-600/20 pointer-events-none" />

            {isOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFF2B8] transition-transform duration-300 rotate-90" />
            ) : (
              <div className="relative flex items-center justify-center">
                {/* Brand Gold WhatsApp Icon */}
                <BrandGoldWhatsAppIcon className="w-7 h-7 sm:w-9 sm:h-9" variant="solid-gold" />

                {/* Active Notification Indicator */}
                <span className="absolute -top-1 -right-1 w-3 sm:w-3.5 h-3 sm:h-3.5 rounded-full bg-emerald-400 border-2 border-neutral-950 animate-pulse" />
              </div>
            )}
          </button>

          {/* Desktop Hover / Idle Badge Tooltip (Positioned to the left of the button since button is on the right) */}
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              onClick={() => setIsOpen(true)}
              className="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-950/95 border border-[#D4AF37]/70 text-[#FFF2B8] text-xs font-black shadow-2xl shadow-black/80 whitespace-nowrap cursor-pointer hover:border-[#FFF2B8] transition-all backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>{config.buttonTitleAr || 'تواصل و دعم فني'}</span>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
};
