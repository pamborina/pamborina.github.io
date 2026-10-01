import React from 'react';
import { Logo } from './Logo';
import { Phone, MapPin, Clock, ShieldCheck, Heart, MessageSquare, ExternalLink, CreditCard, Sparkles, Package, ShieldAlert } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { phoneUtils } from '../../utils/phoneUtils';
import { BrandGoldWhatsAppIcon } from './BrandGoldWhatsAppIcon';

interface FooterProps {
  onLogoClick?: () => void;
  onAdminClick?: () => void;
  onOpenOrderTracking?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onLogoClick, onAdminClick, onOpenOrderTracking }) => {
  const {
    storeNameAr,
    storeDescriptionAr,
    storeBadgeAr,
    customerServicePhone,
    phone,
    complaintsWhatsApp,
    customerServiceWhatsApp,
    whatsapp,
    addressAr,
    facebookUrl,
    instagramUrl,
    tiktokUrl,
    formattedWorkingHoursAr,
  } = useSiteSettings();

  return (
    <footer className="bg-[#0A0705] border-t border-[#2A1E15] text-[#C8BFB0] pt-14 pb-36 sm:pb-32 md:pb-24 px-4 sm:px-6 lg:px-8 mt-20 dir-rtl relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Col 1: Brand Info */}
        <div className="flex flex-col items-start gap-4">
          <Logo size="lg" showSubtitle={true} showArabicText={true} onClick={onLogoClick} />
          <p className="text-xs text-[#C8BFB0] leading-relaxed mt-2">
            {storeNameAr} {storeDescriptionAr ? `- ${storeDescriptionAr}` : '- عنوان الرقي والأصالة في صناعة الحلويات الشرقية والغربية والمعجنات والوجبات السريعة. نستخدم السمن البلدي الأصلي 100% يومياً من فرعنا بالطالبية هرم.'}
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-[#F4E08B] bg-[#140E0A] px-3 py-2 rounded-xl border border-[#2D2017]">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <span>{storeBadgeAr || 'منتجات طازجة 100% بسمن بلدي صافي'}</span>
          </div>
        </div>

        {/* Col 2: Quick Contact & Working Hours */}
        <div className="flex flex-col gap-3">
          <h4 className="text-base font-bold text-[#F7F3E8] border-b border-[#2A1E15] pb-2 flex items-center gap-2">
            <span>مواعيد العمل والتواصل</span>
            <Clock className="w-4 h-4 text-[#D4AF37]" />
          </h4>

          <div className="space-y-2 text-xs text-[#C8BFB0]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>{formattedWorkingHoursAr ? `يومياً ${formattedWorkingHoursAr}` : 'يومياً من 10:00 صباحاً حتى 2:00 بعد منتصف الليل'}</span>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <span>الهاتف والخط الساخن: </span>
                <a href={`tel:${customerServicePhone || phone}`} className="text-[#F4E08B] font-bold dir-ltr inline-block hover:underline">
                  {customerServicePhone || phone}
                </a>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-[11px] text-[#8E8373] block mb-1">طرق الدفع المتاحة:</span>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#F4E08B]">
              <span className="px-2.5 py-1 rounded-lg bg-[#1C140E] border border-[#3D2C1E] font-bold">💵 كاش عند الاستلام</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#1C140E] border border-[#3D2C1E] font-bold">📱 فودافون كاش / انستا باي</span>
            </div>
          </div>

          {onOpenOrderTracking && (
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={onOpenOrderTracking}
                className="w-full min-h-[42px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#1E140C] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#F4E08B] hover:text-white font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap select-none"
              >
                <Package className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>تتبع طلبك برقم الطلب</span>
              </button>

              <a
                href={phoneUtils.buildWhatsAppUrl(
                  complaintsWhatsApp || customerServiceWhatsApp || whatsapp || '01112624108',
                  '⚖️ *قسم الشكاوى والمقترحات بامبورينا*\n━━━━━━━━━━━━━━━━━━━━━━\nالسلام عليكم ورحمة الله وبركاته،\nأود تقديم مقترح / شكوى مباشرة لإدارة حلواني بامبورينا 📋'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[42px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#1A120B] border border-[#D4AF37]/50 hover:border-[#F4E08B] text-[#F4E08B] hover:text-white font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap select-none"
              >
                <BrandGoldWhatsAppIcon className="w-4 h-4 shrink-0" />
                <span>قسم الشكاوى والمقترحات بامبورينا</span>
              </a>
            </div>
          )}
        </div>

        {/* Col 3: Branch Location */}
        <div className="flex flex-col gap-3">
          <h4 className="text-base font-bold text-[#F7F3E8] border-b border-[#2A1E15] pb-2 flex items-center gap-2">
            <span>فرع بامبورينا - الطالبية هرم</span>
            <MapPin className="w-4 h-4 text-[#D4AF37]" />
          </h4>
          <div className="flex flex-col gap-3 bg-[#120C08] p-3.5 rounded-2xl border border-[#2D2017] text-xs text-[#C8BFB0]">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#FFF1C5] block font-bold mb-0.5">فرع بامبورينا - الطالبية هرم</strong>
                <span className="text-[11px] text-[#8E8373] leading-relaxed block">{addressAr || '97 عثمان محرم، الطالبية / هرم'}</span>
              </div>
            </div>

            <a
              href="https://maps.app.goo.gl/CUz4tnN9Gi6c1awU9"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1E140C] border border-[#D4AF37]/50 text-[#F4E08B] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all shadow-md mt-1"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>موقع الفرع على خرائط جوجل 🗺️</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>

        {/* Col 4: Social Links & Follow */}
        <div className="flex flex-col gap-3">
          <h4 className="text-base font-bold text-[#F7F3E8] border-b border-[#2A1E15] pb-2 flex items-center gap-2">
            <span>تابعنا على السوشيال ميديا</span>
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          </h4>
          <p className="text-xs text-[#C8BFB0] leading-relaxed">
            تواصل معنا وتابع أحدث عروض الحلويات والشرقي والغربي والتخفيضات اليومية.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-[#1C140E] border border-[#3D2C1E] text-[#FFF1C5] hover:border-[#D4AF37] transition-all text-xs font-bold"
              >
                فيسبوك
              </a>
            )}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-[#1C140E] border border-[#3D2C1E] text-[#FFF1C5] hover:border-[#D4AF37] transition-all text-xs font-bold"
              >
                إنستغرام
              </a>
            )}
            {tiktokUrl && (
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-[#1C140E] border border-[#3D2C1E] text-[#FFF1C5] hover:border-[#D4AF37] transition-all text-xs font-bold"
              >
                تيك توك
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-[#2A1E14] mt-12 pt-8 pb-6 flex flex-col items-center justify-center gap-3 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-sm font-medium text-[#E8DEC8]">
          <span className="font-bold text-[#FFF1C5] text-sm sm:text-base">
            جميع الحقوق محفوظة © حلواني بامبورينا
          </span>
          <span className="text-[#D4AF37] font-bold text-base leading-none">•</span>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-[#C8BFB0] text-xs sm:text-sm">تمت برمجة و تطوير الموقع من خلال</span>
            <a
              href="https://wa.me/201121778205"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C140E] hover:bg-[#2A1E14] border border-[#D4AF37] hover:border-[#FFF2B8] text-[#F4E08B] hover:text-[#FFF1C5] font-bold text-xs sm:text-sm shadow-lg shadow-black/60 transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
              title="تواصل مع المطور عبر الواتساب: 01121778205"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="font-mono tracking-wider font-bold">Eslam_Arafa</span>
            </a>
          </div>
        </div>
        <div className="text-[11px] text-[#A69B8A] tracking-wider mt-1">
          المذاق الأصلي والجودة العالية
        </div>
      </div>
    </footer>
  );
};

