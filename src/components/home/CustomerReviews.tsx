import React, { useState } from 'react';
import { Star, ShieldCheck, Quote, Image as ImageIcon, X, ExternalLink } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { CustomerTestimonialItem } from '../../types';

export const CustomerReviews: React.FC = () => {
  const {
    testimonials,
    testimonialsRating,
    testimonialsTitle,
    testimonialsSubtitle,
  } = useSiteSettings();

  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [activeLightboxTitle, setActiveLightboxTitle] = useState<string>('');

  const visibleReviews = (testimonials || []).filter((r) => r.isVisible !== false);

  if (visibleReviews.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 dir-rtl my-8">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-[#2C1F16] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#3D2C1E] border border-[#D4AF37] text-[#F4E08B]">
            <Quote className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#FFF1C5] font-heading">
                {testimonialsTitle || 'آراء وتقييمات عملاء بامبورينا'} 🌟
              </h2>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                تقييم {testimonialsRating || '4.9'}/5 ⭐
              </span>
            </div>
            <p className="text-xs text-[#8E8373]">
              {testimonialsSubtitle || 'أكثر من 15,000 عميل يثقون في جودة حلويات ومأكولات بامبورينا'}
            </p>
          </div>
        </div>
      </div>

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visibleReviews.map((review: CustomerTestimonialItem) => (
          <div
            key={review.id}
            className="p-4 sm:p-5 rounded-3xl bg-[#18110B] border border-[#2D2017] hover:border-[#D4AF37]/50 shadow-xl space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Stars & Location */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(review.rating || 5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] text-[#8E8373]">{review.timeAr}</span>
              </div>

              {/* Comment */}
              <p className="text-xs text-[#C8BFB0] leading-relaxed italic">
                "{review.commentAr}"
              </p>

              {/* Review Screenshot Thumbnail (if present) */}
              {review.screenshotUrl && (
                <div className="relative group rounded-xl overflow-hidden border border-[#3D2C1E] bg-[#110C08]">
                  <img
                    src={review.screenshotUrl}
                    alt={`رأي العملاء من ${review.nameAr}`}
                    className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                    onClick={() => {
                      setActiveLightboxImage(review.screenshotUrl || null);
                      setActiveLightboxTitle(`رأي العميل: ${review.nameAr} - ${review.orderedItemAr}`);
                    }}
                    loading="lazy"
                  />
                  <div
                    onClick={() => {
                      setActiveLightboxImage(review.screenshotUrl || null);
                      setActiveLightboxTitle(`رأي العميل: ${review.nameAr} - ${review.orderedItemAr}`);
                    }}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-[11px] font-bold cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                    <span>عرض صورة الرأي 🔍</span>
                  </div>
                </div>
              )}
            </div>

            {/* Author & Item info */}
            <div className="pt-3 border-t border-[#2C1F16] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#FFF1C5] flex items-center gap-1">
                  <span>{review.nameAr}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </h4>
                <span className="text-[10px] text-[#8E8373] block">{review.locationAr}</span>
              </div>

              <span className="text-[10px] text-[#D4AF37] bg-[#221710] px-2 py-1 rounded-lg border border-[#3D2C1E] font-medium">
                {review.orderedItemAr}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Screenshot Lightbox Modal */}
      {activeLightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-[#18110B] border border-[#3D2C1E] rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2C1F16] pb-3">
              <h3 className="text-sm font-bold text-[#FFF1C5] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                <span>{activeLightboxTitle}</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveLightboxImage(null)}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center bg-black/60 rounded-2xl p-2 border border-[#2C1F16] max-h-[70vh] overflow-auto">
              <img
                src={activeLightboxImage}
                alt="معاينة كاملة لرأي العميل"
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLightboxImage(null)}
                className="px-4 py-2 bg-[#3D2C1E] hover:bg-[#4D3827] text-[#FFF1C5] text-xs font-bold rounded-xl border border-[#D4AF37]/30 transition-colors cursor-pointer"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
