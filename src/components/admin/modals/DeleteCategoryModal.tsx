import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, Loader2, ArrowRightLeft, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { Category } from '../../../types';

export interface DeleteCategoryOptions {
  deleteMode: 'reassign' | 'delete_products';
  targetReassignCatId?: string;
}

interface DeleteCategoryModalProps {
  isOpen: boolean;
  category: Category | null;
  allCategories: Category[];
  productCount: number;
  onClose: () => void;
  onConfirmDelete: (categoryId: string, options: DeleteCategoryOptions) => Promise<void>;
}

export const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  isOpen,
  category,
  allCategories,
  productCount,
  onClose,
  onConfirmDelete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remaining categories excluding the one being deleted
  const remainingCategories = allCategories.filter((c) => c.id !== category?.id);
  
  // Selection state
  const [deleteMode, setDeleteMode] = useState<'reassign' | 'delete_products'>('reassign');
  const [selectedTargetCatId, setSelectedTargetCatId] = useState<string>('');

  useEffect(() => {
    if (remainingCategories.length > 0) {
      setSelectedTargetCatId(remainingCategories[0].id);
      setDeleteMode('reassign');
    } else {
      setSelectedTargetCatId('other');
      setDeleteMode('delete_products');
    }
    setError(null);
  }, [category, isOpen]);

  if (!isOpen || !category) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirmDelete(category.id, {
        deleteMode,
        targetReassignCatId: selectedTargetCatId,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر حذف القسم. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative space-y-5 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">تأكيد حذف القسم والتصنيف</h3>
              <p className="text-xs text-neutral-400 font-mono">ID: {category.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Details Card */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
            {category.imageUrl ? (
              <img src={category.imageUrl} alt={category.nameAr} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">{category.emoji || '🍽️'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-sm truncate">{category.nameAr}</h4>
            <span className="text-xs text-neutral-400 block truncate">{category.nameEn || category.slug}</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-amber-400 text-xs font-black shrink-0">
            {productCount} صنف نشط
          </span>
        </div>

        {/* Options if productCount > 0 */}
        {productCount > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-neutral-300 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                هذا القسم يحتوي على <strong className="text-amber-300">{productCount} صنف نشط</strong>. اختر الإجراء المطلوب للتعامل مع الأصناف:
              </span>
            </p>

            <div className="space-y-2.5">
              {/* Option 1: Reassign to replacement category */}
              <div
                onClick={() => setDeleteMode('reassign')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  deleteMode === 'reassign'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-lg shadow-amber-500/5'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="deleteMode"
                    checked={deleteMode === 'reassign'}
                    onChange={() => setDeleteMode('reassign')}
                    className="mt-1 accent-amber-500 cursor-pointer"
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <span className="font-bold text-xs text-amber-300 block">
                        نقل الأصناف تلقائياً لحماية منيو المتجر (موصى به)
                      </span>
                      <span className="text-[11px] text-neutral-400 block mt-0.5">
                        سيتم حفظ جميع الـ {productCount} أصناف ونقلها مباشرة للقسم البديل المحدد.
                      </span>
                    </div>

                    {deleteMode === 'reassign' && (
                      <div className="pt-2 border-t border-amber-500/20 space-y-1.5 animate-fade-in">
                        <label className="block text-[11px] font-bold text-amber-200 flex items-center gap-1.5">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                          <span>القسم البديل لاستقبال الأصناف:</span>
                        </label>
                        {remainingCategories.length > 0 ? (
                          <select
                            value={selectedTargetCatId}
                            onChange={(e) => setSelectedTargetCatId(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-amber-500/40 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                          >
                            {remainingCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.emoji ? `${c.emoji} ` : ''}{c.nameAr} ({c.id})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-[11px] text-amber-300 font-medium">
                            سيتم نقل الأصناف إلى القسم العام التلقائي بالنظام.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2: Delete category along with all products */}
              <div
                onClick={() => setDeleteMode('delete_products')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  deleteMode === 'delete_products'
                    ? 'bg-rose-500/10 border-rose-500/50 text-white shadow-lg shadow-rose-500/5'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="deleteMode"
                    checked={deleteMode === 'delete_products'}
                    onChange={() => setDeleteMode('delete_products')}
                    className="mt-1 accent-rose-500 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1">
                    <span className="font-bold text-xs text-rose-400 block">
                      حذف القسم بالأصناف اللي فيه نهائياً ({productCount} صنف)
                    </span>
                    <span className="text-[11px] text-neutral-400 block">
                      حذف كامل وشامل للقسم وجميع أصنافه المنتسبة إليه دفعة واحدة من المنيو وقاعدة البيانات.
                    </span>

                    {deleteMode === 'delete_products' && (
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-[11px] font-bold flex items-center gap-2 animate-fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>تحذير: سيتم حذف {productCount} صنف نهائياً ولا يمكن التراجع عن هذا الإجراء!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-center gap-2 text-neutral-300 text-xs">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>هذا القسم فارغ حالياً (0 صنف)، ويمكن حذفه فوراً بأمان تام.</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl font-extrabold text-xs text-white shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer ${
              deleteMode === 'delete_products'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20 text-neutral-950 font-black'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحذف اللحظي...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>
                  {deleteMode === 'delete_products' && productCount > 0
                    ? `تأكيد حذف القسم والـ ${productCount} أصناف`
                    : 'تأكيد الحذف النهائي'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

