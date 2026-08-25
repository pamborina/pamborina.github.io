import React from 'react';
import { Logo } from './Logo';
import { Phone, MapPin, Clock, ShieldCheck, Heart, MessageSquare, ExternalLink, CreditCard, Sparkles } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';

interface FooterProps {
  onLogoClick?: () => void;
  onAdminClick?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onLogoClick, onAdminClick }) => {
  const {
    storeNameAr,
    storeDescriptionAr,
    storeBadgeAr,
    customerServicePhone,
    phone,
    addressAr,
    facebookUrl,
    instagramUrl,
    tiktokUrl,
    formattedWorkingHoursAr,
  } = useSiteSettings();

  return (
    <footer className="bg-[#0A0705] border-t border-[#2A1E15] text-[#C8BFB0] pt-14 pb-28 sm:pb-16 px-4 sm:px-6 lg:px-8 mt-20 dir-rtl">
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
        </div>

        {/* Col 3: Branch Location */}
        <div className="flex flex-col gap-3">
          <h4 className="text-base font-bold text-[#F7F3E8] border-b border-[#2A1E15] pb-2 flex items-center gap-2">
            <span>فرع الطالبية هرم</span>
            <MapPin className="w-4 h-4 text-[#D4AF37]" />
          </h4>
          <div className="flex flex-col gap-3 bg-[#120C08] p-3.5 rounded-2xl border border-[#2D2017] text-xs text-[#C8BFB0]">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#FFF1C5] block font-bold mb-0.5">فرع الطالبية - هرم</strong>
                <span className="text-[11px] text-[#8E8373] leading-relaxed block">{addressAr || '97 شارع عثمان محرم، الطالبية، هرم، الجيزة'}</span>
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

      <div className="max-w-7xl mx-auto border-t border-[#1C140E] mt-10 pt-6 pb-6 flex flex-col md:flex-row items-center justify-between text-xs text-[#C8BFB0] gap-4">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs sm:text-sm font-medium text-[#C8BFB0] text-center md:text-right">
          <span>جميع الحقوق محفوظة © حلواني بامبورينا</span>
          <span className="text-[#5C4533] hidden sm:inline">•</span>
          <span className="flex flex-wrap items-center justify-center gap-1.5">
            <span>تمت برمجة و تطوير الموقع من خلال</span>
            <a
              href="https://wa.me/201121778205"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1C140E] hover:bg-[#2A1E14] border border-[#D4AF37]/50 hover:border-[#D4AF37] text-[#F4E08B] hover:text-[#FFF1C5] font-bold text-xs shadow-md transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
              title="تواصل مع المطور عبر الواتساب: 01121778205"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="font-mono tracking-wider font-bold">Eslam_Arafa</span>
            </a>
          </span>
        </div>
        <div className="text-[11px] text-[#A69B8A]">
          المذاق الأصلي والجودة العالية
        </div>
      </div>
    </footer>
  );
};

