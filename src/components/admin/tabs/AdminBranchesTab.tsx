import React, { useState, useEffect } from 'react';
import { Branch } from '../../../types';
import { firebaseBranchService } from '../../../services/firebaseBranchService';
import {
  Store,
  MapPin,
  Phone,
  Clock,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Power,
  Loader2,
  Truck,
  DollarSign,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { AdminBranchModal } from '../modals/AdminBranchModal';

interface AdminBranchesTabProps {
  branches: Branch[];
}

export const AdminBranchesTab: React.FC<AdminBranchesTabProps> = ({ branches: initialBranches }) => {
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Subscribe to real-time branches from Firestore
  useEffect(() => {
    const unsubscribe = firebaseBranchService.subscribeToBranches((liveBranches) => {
      setBranches(liveBranches);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (branch: Branch) => {
    const newStatus = !branch.isOpen;
    setTogglingId(branch.id);
    try {
      await firebaseBranchService.toggleBranchStatus(branch.id, newStatus);
      setBranches((prev) =>
        prev.map((b) => (b.id === branch.id ? { ...b, isOpen: newStatus } : b))
      );
    } catch (err: any) {
      alert(`فشل تغيير حالة الفرع: ${err?.message || err}`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleBranchSaved = (savedBranch: Branch) => {
    setBranches((prev) => {
      const idx = prev.findIndex((b) => b.id === savedBranch.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedBranch;
        return next;
      }
      return [...prev, savedBranch];
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Store className="w-6 h-6 text-amber-400" />
            <span>فروع حلواني ومطعم بامبورينا الرسمية</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
              {branches.length} فروع
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            التحكم المباشر في فروع الاستلام والتوصيل وتعديل أرقام التواصل ومواعيد العمل.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة فرع جديد</span>
        </Button>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {branches.map((branch) => {
          const isOpen = branch.isOpen !== undefined ? branch.isOpen : true;
          const isToggling = togglingId === branch.id;

          return (
            <div
              key={branch.id}
              className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl p-6 flex flex-col justify-between shadow-xl space-y-5"
            >
              <div>
                {/* Branch Top Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{branch.nameAr || branch.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            isOpen ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isOpen ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span>{isOpen ? 'يستقبل الطلبات' : 'مغلق مؤقتاً'}</span>
                        </span>
                        <span className="text-neutral-500 text-xs">•</span>
                        <span className="text-xs text-neutral-400">{branch.areaAr || 'الجيزة'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fast Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(branch)}
                    disabled={isToggling}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isOpen
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                    }`}
                  >
                    {isToggling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}
                    <span>{isOpen ? 'مفتوح' : 'مغلق'}</span>
                  </button>
                </div>

                {/* Details */}
                <div className="space-y-2.5 text-xs text-neutral-300 bg-neutral-900/60 p-4 rounded-xl border border-neutral-700/50">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{branch.addressAr || branch.address}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-neutral-400">الهاتف:</span>
                    <span dir="ltr" className="font-mono text-white font-bold">{branch.phone}</span>
                    {branch.secondaryPhone && (
                      <span dir="ltr" className="font-mono text-neutral-400 text-[11px]">/ {branch.secondaryPhone}</span>
                    )}
                  </div>

                  {branch.whatsapp && (
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-neutral-400">واتساب:</span>
                      <span dir="ltr" className="font-mono text-emerald-400 font-bold">{branch.whatsapp}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-neutral-400">ساعات العمل:</span>
                    <span className="text-neutral-200">{branch.openingHoursAr || branch.openingHours || 'يومياً 24 ساعة'}</span>
                  </div>

                  <div className="flex items-center gap-4 pt-1 text-[11px] text-neutral-400 border-t border-neutral-800">
                    <span>رسوم التوصيل: <strong className="text-amber-400">{branch.deliveryFee ?? 0} ج.م</strong></span>
                    <span>الحد الأدنى: <strong className="text-white">{branch.minOrderAmount ?? 50} ج.م</strong></span>
                  </div>
                </div>
              </div>

              {/* Actions Bottom Bar */}
              <div className="pt-3 border-t border-neutral-700/60 flex items-center justify-between text-xs">
                {branch.mapUrl || branch.googleMapsUrl ? (
                  <a
                    href={branch.mapUrl || branch.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-amber-400 hover:underline"
                  >
                    <span>عرض الموقع على الخريطة</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-neutral-500 text-[11px] font-mono">ID: {branch.id}</span>
                )}

                <Button
                  onClick={() => handleOpenEdit(branch)}
                  variant="outline"
                  className="bg-neutral-900 border-neutral-700 text-neutral-200 hover:text-amber-400 text-xs px-3 py-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 ml-1.5" />
                  <span>تعديل بيانات الفرع</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Branch Add / Edit Modal */}
      <AdminBranchModal
        isOpen={isModalOpen}
        branch={editingBranch}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleBranchSaved}
      />
    </div>
  );
};
