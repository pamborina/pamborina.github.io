import React from 'react';
import { Star, ShieldCheck, Quote } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export const CustomerReviews: React.FC = () => {
  const {
    testimonials,
    testimonialsRating,
    testimonialsTitle,
    testimonialsSubtitle,
  } = useSiteSettings();

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
                {testimonialsTitle} 🌟
              </h2>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                تقييم {testimonialsRating}/5 ⭐
              </span>
            </div>
            <p className="text-xs text-[#8E8373]">
              {testimonialsSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {testimonials.map((review) => (
          <div
            key={review.id}
            className="p-4 sm:p-5 rounded-3xl bg-[#18110B] border border-[#2D2017] hover:border-[#D4AF37]/50 shadow-xl space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
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
    </section>
  );
};
