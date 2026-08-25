import React, { useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { MapPin, Phone, Clock, Check, Zap, Navigation, Loader2 } from 'lucide-react';
import { Branch } from '../../types';
import { branchService } from '../../services/branchService';
import { useSiteSettings } from '../../context/SiteSettingsContext';

interface BranchSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  currentBranchId: string;
  onSelectBranch: (branch: Branch) => void;
}

export const BranchSelectorSheet: React.FC<BranchSelectorSheetProps> = ({
  isOpen,
  onClose,
  branches,
  currentBranchId,
  onSelectBranch,
}) => {
  const { formattedWorkingHoursAr } = useSiteSettings();
  const [isLocating, setIsLocating] = useState(false);
  const [geoStatusMsg, setGeoStatusMsg] = useState<string | null>(null);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatusMsg('خاصية تحديد الموقع غير مدعومة في متصفحك. يرجى الاختيار يدوياً.');
      return;
    }

    setIsLocating(true);
    setGeoStatusMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const result = branchService.findNearestBranch(latitude, longitude);

        if (result && result.branch) {
          onSelectBranch(result.branch);
          setGeoStatusMsg(`تم تحديد أقرب فرع بالموقع: ${result.branch.nameAr} (يبعد حوالي ${result.distanceKm} كم)`);
          setTimeout(() => {
            onClose();
          }, 1200);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatusMsg('تم رفض صلاحية تحديد الموقع. يرجى اختيار الفرع الأقرب يدوياً.');
        } else {
          setGeoStatusMsg('عذراً، تعذر تحديد موقعك بدقة. يرجى اختيار الفرع يدوياً.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="اختيار فرع التوصيل والاستلام"
      subtitle="اختر الفرع الأقرب لإرسال طلبك بأقصى سرعة"
    >
      <div className="space-y-4 text-right dir-rtl">
        {/* GPS Location Finder Button */}
        <div className="p-3.5 rounded-2xl bg-[#1D130B] border border-[#D4AF37]/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2A1C12] border border-[#D4AF37] text-[#F4E08B]">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#FFF1C5]">تحديد الفرع وموقعك للتوصيل</h5>
              <p className="text-[11px] text-[#8E8373]">حساب المسافة بدقة وتأكيد التوصيل السريع لعنوانك</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black text-xs font-black flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>جاري البحث...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5 fill-black" />
                <span>تحديد موقعي الآن</span>
              </>
            )}
          </button>
        </div>

        {geoStatusMsg && (
          <div className="p-2.5 rounded-xl bg-[#25170E] border border-[#3D2C1E] text-xs text-[#F4E08B] text-center font-bold">
            {geoStatusMsg}
          </div>
        )}

        <div className="space-y-3">
          {branches.map((branch, idx) => {
            const isSelected = branch.id === currentBranchId;

            return (
              <button
                key={`${branch.id}-${idx}`}
                onClick={() => {
                  onSelectBranch(branch);
                  onClose();
                }}
                className={`w-full text-right p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#2B1D12] to-[#1C120A] border-[#D4AF37] shadow-xl'
                    : 'bg-[#18110B] border-[#2C1F16] hover:border-[#3D2C1E]'
                }`}
              >
                {/* Selected Golden Badge */}
                {isSelected && (
                  <div className="absolute top-0 left-0 bg-gold-gradient text-black text-[10px] font-black px-3 py-1 rounded-br-xl shadow-md flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>الفرع المختار</span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-2xl border shrink-0 ${
                      isSelected
                        ? 'bg-[#3D2C1E] border-[#D4AF37] text-[#F4E08B]'
                        : 'bg-[#221710] border-[#2D2017] text-[#8E8373]'
                    }`}
                  >
                    <MapPin className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-[#FFF1C5] group-hover:text-[#F4E08B] transition-colors">
                        {branch.nameAr}
                      </h4>
                    </div>

                    <p className="text-xs text-[#C8BFB0] mt-1 leading-relaxed">
                      {branch.addressAr}
                    </p>

                    {/* Branch Details Pills */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-[#2D2017]">
                      <span className="flex items-center gap-1 text-[11px] text-[#C8BFB0] bg-[#221710] px-2.5 py-0.5 rounded-lg border border-[#3D2C1E]">
                        <Clock className="w-3 h-3 text-[#D4AF37]" />
                        <span>مفتوح: {formattedWorkingHoursAr || branch.openingHoursAr}</span>
                      </span>

                      <span className="flex items-center gap-1 text-[11px] text-[#C8BFB0] bg-[#221710] px-2.5 py-0.5 rounded-lg border border-[#3D2C1E] dir-ltr">
                        <Phone className="w-3 h-3 text-[#D4AF37]" />
                        <span>{branch.phone}{branch.secondaryPhone ? ` / ${branch.secondaryPhone}` : ''}</span>
                      </span>

                      {(branch.mapUrl || branch.googleMapsUrl) && (
                        <a
                          href={branch.mapUrl || branch.googleMapsUrl || 'https://maps.app.goo.gl/CUz4tnN9Gi6c1awU9'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] text-[#F4E08B] bg-[#2A1D13] hover:bg-[#D4AF37] hover:text-black px-2.5 py-1 rounded-lg border border-[#D4AF37]/50 font-bold transition-all"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>خرائط جوجل 🗺️</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
};
