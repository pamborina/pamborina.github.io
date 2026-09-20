import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category } from '../../../types';
import { firebaseProductService } from '../../../services/firebaseProductService';
import {
  X,
  ArrowRightLeft,
  Search,
  Check,
  Loader2,
  AlertCircle,
  Layers,
  Sparkles,
  Package,
} from 'lucide-react';
import { Button } from '../../ui/Button';

interface MoveProductCategoryModalProps {
  isOpen: boolean;
  productsToMove: Product[]; // can be 1 or multiple
  categories: Category[];
  allProducts: Product[];
  onClose: () => void;
  onSuccess: (movedProducts: Product[], targetCategory: Category) => void;
}

export const MoveProductCategoryModal: React.FC<MoveProductCategoryModalProps> = ({
  isOpen,
  productsToMove,
  categories,
  allProducts,
  onClose,
  onSuccess,
}) => {
  const [selectedTargetCategoryId, setSelectedTargetCategoryId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSingle = productsToMove.length === 1;
  const singleProduct = isSingle ? productsToMove[0] : null;
  const currentCategoryId = singleProduct ? (singleProduct.categoryId || singleProduct.category || '') : '';

  // Initialize selected target category when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTargetCategoryId('');
      setSearchTerm('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, productsToMove]);

  // Product counts per category for helpful context
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allProducts.forEach((p) => {
      const catId = p.categoryId || p.category || 'other';
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [allProducts]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase().trim();
    return categories.filter(
      (c) =>
        c.nameAr?.toLowerCase().includes(term) ||
        c.nameEn?.toLowerCase().includes(term) ||
        c.id?.toLowerCase().includes(term) ||
        c.slug?.toLowerCase().includes(term)
    );
  }, [categories, searchTerm]);

  // Target Category Object
  const targetCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedTargetCategoryId) || null;
  }, [categories, selectedTargetCategoryId]);

  if (!isOpen || productsToMove.length === 0) return null;

  const handleConfirmMove = async () => {
    if (!selectedTargetCategoryId || !targetCategory) {
      setError('يرجى اختيار القسم المراد النقل إليه');
      return;
    }

    if (isSingle && selectedTargetCategoryId === currentCategoryId) {
      setError('الصنف موجود بالفعل داخل هذا القسم! يرجى اختيار قسم مختلف.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isSingle && singleProduct) {
        // Single item move
        await firebaseProductService.moveProductCategory(singleProduct.id, selectedTargetCategoryId, {
          productNameAr: singleProduct.nameAr || singleProduct.name,
          targetCategoryNameAr: targetCategory.nameAr,
        });

        const updatedProduct: Product = {
          ...singleProduct,
          category: selectedTargetCategoryId,
          categoryId: selectedTargetCategoryId,
        };

        onSuccess([updatedProduct], targetCategory);
      } else {
        // Bulk items move
        const productIds = productsToMove.map((p) => p.id);
        await firebaseProductService.bulkMoveProductsCategory(
          productIds,
          selectedTargetCategoryId,
          targetCategory.nameAr
        );

        const updatedProducts: Product[] = productsToMove.map((p) => ({
          ...p,
          category: selectedTargetCategoryId,
          categoryId: selectedTargetCategoryId,
        }));

        onSuccess(updatedProducts, targetCategory);
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to move products category:', err);
      setError(err?.message || 'حدث خطأ أثناء نقل الصنف، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {isSingle ? 'نقل الصنف إلى قسم آخر' : `نقل (${productsToMove.length}) أصناف إلى قسم آخر`}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                اختر القسم الجديد وسيتم تحويل الصنف فوراً ومزامنته سحابياً
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Item Preview Box */}
          {isSingle && singleProduct ? (
            <div className="p-3.5 rounded-2xl bg-neutral-800/60 border border-neutral-700/80 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-neutral-900 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center">
                {(singleProduct.imageUrl && singleProduct.imageUrl.trim() !== '') || (singleProduct.image && singleProduct.image.trim() !== '') ? (
                  <img
                    src={(singleProduct.imageUrl && singleProduct.imageUrl.trim() !== '' ? singleProduct.imageUrl : singleProduct.image) || undefined}
                    alt={singleProduct.nameAr}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-food.webp';
                    }}
                  />
                ) : (
                  <Package className="w-6 h-6 text-neutral-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-white text-sm truncate">
                    {singleProduct.nameAr || singleProduct.name}
                  </h4>
                  <span className="text-xs font-bold text-amber-400 shrink-0">
                    {singleProduct.price} جنيه
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                  <span>القسم الحالي:</span>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-700 text-neutral-300 font-medium">
                    {categories.find((c) => c.id === currentCategoryId)?.nameAr || currentCategoryId || 'غير محدد'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-neutral-800/60 border border-neutral-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">الأصناف المحددة للنقل ({productsToMove.length}):</span>
                <span className="text-neutral-400 font-mono">Bulk Transfer</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {productsToMove.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-[11px] text-neutral-300"
                  >
                    {p.nameAr || p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث عن القسم بالاسم العربي أو الإنجليزي..."
              className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Categories Grid Selection */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-2">
              اختر القسم الجديد المراد التحويل إليه:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
              {filteredCategories.map((cat) => {
                const isCurrent = isSingle && cat.id === currentCategoryId;
                const isSelected = cat.id === selectedTargetCategoryId;
                const count = categoryCounts[cat.id] || 0;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      if (!isCurrent) {
                        setSelectedTargetCategoryId(cat.id);
                        setError(null);
                      }
                    }}
                    disabled={isCurrent || isSubmitting}
                    className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                      isCurrent
                        ? 'bg-neutral-800/30 border-neutral-800 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                        : 'bg-neutral-800/80 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800 text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-base shrink-0 overflow-hidden">
                        {cat.imageUrl && cat.imageUrl.trim() !== '' ? (
                          <img src={cat.imageUrl || undefined} alt={cat.nameAr} className="w-full h-full object-cover" />
                        ) : (
                          <span>{cat.emoji || '🍽️'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs block truncate">{cat.nameAr}</span>
                        <span className="text-[10px] text-neutral-400 block">{count} صنف حالياً</span>
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-400">
                          القسم الحالي
                        </span>
                      ) : isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900 flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs px-4 py-2.5 rounded-xl"
          >
            إلغاء
          </Button>

          <Button
            type="button"
            onClick={handleConfirmMove}
            disabled={!selectedTargetCategoryId || isSubmitting || (isSingle && selectedTargetCategoryId === currentCategoryId)}
            className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري النقل...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4" />
                <span>
                  {targetCategory ? `تأكيد النقل إلى «${targetCategory.nameAr}»` : 'تأكيد النقل الآن'}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
