import React from 'react';
import { MapPin, Phone, Clock, ExternalLink, Store } from 'lucide-react';
import { Branch } from '../../types';
import { useSiteSettings } from '../../context/SiteSettingsContext';

interface StoreInfoProps {
  branches: Branch[];
}

export const StoreInfo: React.FC<StoreInfoProps> = ({ branches }) => {
  const { isStoreOpen, temporaryClosureReasonAr, phone, customerServicePhone, addressAr, storeNameAr, formattedWorkingHoursAr } = useSiteSettings();
  const displayServicePhone = customerServicePhone || phone;

  return (
    <section className="p-6 rounded-3xl bg-gradient-to-r from-[#1E140C] via-[#120C08] to-[#1E140C] border border-[#D4AF37]/40 shadow-2xl dir-rtl space-y-6 my-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2C1F16] pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-gold-gradient font-heading">
            معلومات المتجر ومواعيد العمل 📍
          </h2>
          <p className="text-xs text-[#C8BFB0] mt-1">
            يسعدنا استقبالكم في فرعنا أو توصيل طلبياتكم مباشرة لمنازلكم
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isStoreOpen ? (
            <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>المتجر مفتوح ومتاح للطلب والتوصيل الآن</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>المتجر مغلق مؤقتاً</span>
            </span>
          )}
        </div>
      </div>

      {!isStoreOpen && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-3">
          <Store className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{temporaryClosureReasonAr}</span>
        </div>
      )}

      {/* Branch Card(s) */}
      <div className="grid grid-cols-1 max-w-2xl mx-auto gap-4">
        {branches.map((branch, idx) => (
          <div
            key={`${branch.id}-${idx}`}
            className="p-4 sm:p-5 rounded-2xl bg-[#18110B] border border-[#2D2017] hover:border-[#D4AF37]/50 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#FFF1C5] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D4AF37]" />
                <span>{branch.nameAr || storeNameAr}</span>
              </h3>
              <span className="text-[10px] text-[#D4AF37] bg-[#221710] px-2 py-0.5 rounded-md border border-[#3D2C1E]">
                {branch.areaAr || 'الطالبية - هرم'}
              </span>
            </div>

            <p className="text-xs text-[#C8BFB0] leading-relaxed">
              {branch.addressAr || branch.address || addressAr}
            </p>

            <div className="space-y-1.5 text-xs text-[#C8BFB0] pt-2 border-t border-[#2C1F16]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#8E8373]">
                  <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>مواعيد العمل:</span>
                </span>
                <span className="font-bold text-[#FFF1C5]">{formattedWorkingHoursAr || branch.openingHoursAr || branch.openingHours}</span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[#8E8373] shrink-0">
                    <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>أرقام التواصل والتوصيل:</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2 dir-ltr justify-end font-mono">
                    <a
                      href={`tel:${(branch.phone || displayServicePhone).replace(/[^0-9+]/g, '')}`}
                      className="font-bold text-[#F4E08B] hover:underline"
                    >
                      {branch.phone || displayServicePhone}
                    </a>
                    {branch.secondaryPhone && (
                      <a
                        href={`tel:${branch.secondaryPhone}`}
                        className="text-xs text-[#C8BFB0] hover:text-[#F4E08B] hover:underline"
                      >
                        / {branch.secondaryPhone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Branch Map Button */}
            <div className="pt-2">
              <a
                href={branch.mapUrl || branch.googleMapsUrl || 'https://maps.app.goo.gl/CUz4tnN9Gi6c1awU9'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#221710] border border-[#D4AF37]/40 text-[#FFF1C5] text-xs font-bold hover:border-[#D4AF37] hover:bg-[#2A1D13] hover:text-[#F4E08B] transition-all shadow-md"
              >
                <MapPin className="w-4 h-4 text-[#D4AF37]" />
                <span>موقع الفرع على خرائط جوجل 🗺️</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#8E8373]" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

