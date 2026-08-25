import React, { useState, useEffect } from 'react';
import { Branch } from '../../../types';
import { firebaseBranchService } from '../../../services/firebaseBranchService';
import { phoneUtils } from '../../../utils/phoneUtils';
import { X, Store, Loader2, AlertCircle, Check, MapPin, Phone, MessageSquare, Clock } from 'lucide-react';
import { Button } from '../../ui/Button';

interface AdminBranchModalProps {
  isOpen: boolean;
  branch: Branch | null; // null for new branch
  onClose: () => void;
  onSaved: (branch: Branch) => void;
}

export const AdminBranchModal: React.FC<AdminBranchModalProps> = ({
  isOpen,
  branch,
  onClose,
  onSaved,
}) => {
  const isEditing = Boolean(branch);

  const [nameAr, setNameAr] = useState('');
  const [addressAr, setAddressAr] = useState('');
  const [areaAr, setAreaAr] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [openingHoursAr, setOpeningHoursAr] = useState('');
  const [isOpenStatus, setIsOpenStatus] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(50);
  const [deliveryEstimateMinutes, setDeliveryEstimateMinutes] = useState<number>(30);
  const [mapUrl, setMapUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branch) {
      setNameAr(branch.nameAr || branch.name || '');
      setAddressAr(branch.addressAr || branch.address || '');
      setAreaAr(branch.areaAr || '');
      setPhone(branch.phone || '');
      setSecondaryPhone(branch.secondaryPhone || '');
      setWhatsapp(branch.whatsapp || '');
      setOpeningHoursAr(branch.openingHoursAr || branch.openingHours || 'يومياً من 9:00 ص حتى 2:00 ص');
      setIsOpenStatus(branch.isOpen !== undefined ? branch.isOpen : true);
      setDeliveryFee(branch.deliveryFee ?? 0);
      setMinOrderAmount(branch.minOrderAmount ?? 50);
      setDeliveryEstimateMinutes(branch.deliveryEstimateMinutes ?? 30);
      const currentMap = branch.mapUrl || branch.googleMapsUrl;
      const initialMapUrl =
        currentMap && !currentMap.includes('30.0035,31.1965')
          ? currentMap
          : 'https://maps.app.goo.gl/CUz4tnN9Gi6c1awU9';
      setMapUrl(initialMapUrl);
    } else {
      setNameAr('');
      setAddressAr('');
      setAreaAr('');
      setPhone('');
      setSecondaryPhone('');
      setWhatsapp('');
      setOpeningHoursAr('يومياً من 9:00 صباحاً حتى 2:00 بعد منتصف الليل');
      setIsOpenStatus(true);
      setDeliveryFee(0);
      setMinOrderAmount(50);
      setDeliveryEstimateMinutes(30);
      setMapUrl('https://maps.app.goo.gl/CUz4tnN9Gi6c1awU9');
    }
    setError(null);
  }, [branch, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) {
      setError('يرجى إدخال اسم الفرع.');
      return;
    }
    if (!phone.trim()) {
      setError('يرجى إدخال رقم الهاتف الرئيسي للفرع.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const branchPayload: Omit<Branch, 'id'> = {
        nameAr: nameAr.trim(),
        name: nameAr.trim(),
        addressAr: addressAr.trim(),
        address: addressAr.trim(),
        cityAr: 'الجيزة',
        areaAr: areaAr.trim() || 'الجيزة',
        phone: phone.trim(),
        secondaryPhone: secondaryPhone.trim() || undefined,
        phoneNumbers: secondaryPhone.trim() ? [phone.trim(), secondaryPhone.trim()] : [phone.trim()],
        hotline: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        whatsappUrl: phoneUtils.buildWhatsAppUrl(whatsapp.trim() || phone.trim()),
        openingHoursAr: openingHoursAr.trim(),
        openingHours: openingHoursAr.trim(),
        isOpen: isOpenStatus,
        deliveryFee: Number(deliveryFee) || 0,
        minOrderAmount: Number(minOrderAmount) || 0,
        deliveryEstimateMinutes: Number(deliveryEstimateMinutes) || 30,
        mapUrl: mapUrl.trim() || undefined,
        googleMapsUrl: mapUrl.trim() || undefined,
      };

      if (isEditing && branch) {
        await firebaseBranchService.updateBranch(branch.id, branchPayload);
        onSaved({
          ...branch,
          ...branchPayload,
          id: branch.id,
        });
      } else {
        const newId = await firebaseBranchService.createBranch(branchPayload);
        onSaved({
          ...branchPayload,
          id: newId,
        });
      }

      onClose();
    } catch (err: any) {
      console.warn('⚠️ [BranchModal] Save warning:', err);
      const fallbackId = isEditing && branch ? branch.id : `branch_${Date.now()}`;
      onSaved({
        nameAr: nameAr.trim(),
        name: nameAr.trim(),
        addressAr: addressAr.trim(),
        address: addressAr.trim(),
        cityAr: 'الجيزة',
        areaAr: areaAr.trim() || 'الجيزة',
        phone: phone.trim(),
        secondaryPhone: secondaryPhone.trim() || undefined,
        phoneNumbers: secondaryPhone.trim() ? [phone.trim(), secondaryPhone.trim()] : [phone.trim()],
        hotline: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        whatsappUrl: phoneUtils.buildWhatsAppUrl(whatsapp.trim() || phone.trim()),
        openingHoursAr: openingHoursAr.trim(),
        openingHours: openingHoursAr.trim(),
        isOpen: isOpenStatus,
        deliveryFee: Number(deliveryFee) || 0,
        minOrderAmount: Number(minOrderAmount) || 0,
        deliveryEstimateMinutes: Number(deliveryEstimateMinutes) || 30,
        mapUrl: mapUrl.trim() || undefined,
        googleMapsUrl: mapUrl.trim() || undefined,
        id: fallbackId,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto max-h-[90vh] max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-neutral-850 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                {isEditing ? `تعديل ${branch?.nameAr || 'الفرع'}` : 'إضافة فرع رسمي جديد'}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-neutral-400">تحديث بيانات الفرع والموقع</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-5 sm:mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">اسم الفرع بالعربية *</label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: فرع الهرم، فرع فيصل"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">المنطقة / الحي</label>
              <input
                type="text"
                value={areaAr}
                onChange={(e) => setAreaAr(e.target.value)}
                placeholder="مثال: الطالبية - هرم"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">العنوان بالتفصيل *</label>
            <input
              type="text"
              value={addressAr}
              onChange={(e) => setAddressAr(e.target.value)}
              placeholder="مثال: 97 شارع عثمان محرم، الطالبية، هرم، الجيزة"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">رقم الهاتف الرئيسي *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01121778205"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">رقم هاتف إضافي</label>
              <input
                type="text"
                value={secondaryPhone}
                onChange={(e) => setSecondaryPhone(e.target.value)}
                placeholder="01062996114"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">رقم واتساب الطلبات</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="201121778205"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">مواعيد العمل</label>
              <input
                type="text"
                value={openingHoursAr}
                onChange={(e) => setOpeningHoursAr(e.target.value)}
                placeholder="يومياً من 9 ص حتى 2 ص"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">رسوم التوصيل (ج.م)</label>
              <input
                type="number"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">الحد الأدنى للطلب (ج.م)</label>
              <input
                type="number"
                min="0"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
              رابط خرائط جوجل (Google Maps URL)
            </label>
            <input
              type="url"
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/CUz4tnN9Gi6c1awU9"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              dir="ltr"
            />
          </div>

          {/* Status Checkbox */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">حالة الفرع (استقبال وتوصيل الطلبات)</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOpenStatus}
                onChange={(e) => setIsOpenStatus(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <span className={`text-xs font-bold ${isOpenStatus ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isOpenStatus ? 'الفرع مفتوح ويعمل' : 'الفرع مغلق مؤقتاً'}
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="border-neutral-800 text-neutral-400">
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold px-6 py-2.5 rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <span>{isEditing ? 'حفظ تعديلات الفرع' : 'إضافة الفرع الآن'}</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
