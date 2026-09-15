import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Category, Product } from '../../../types';
import { firebaseCategoryService, DEFAULT_CATEGORIES } from '../../../services/firebaseCategoryService';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Star,
  Package,
  RefreshCw,
  GripVertical,
  LayoutList,
  LayoutGrid,
  Undo2,
  Move,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { AdminCategoryModal } from '../modals/AdminCategoryModal';
import { DeleteCategoryModal, DeleteCategoryOptions } from '../modals/DeleteCategoryModal';

interface AdminCategoriesTabProps {
  categories: Category[];
  products: Product[];
  onSelectCategory: (categoryId: string) => void;
}

export const AdminCategoriesTab: React.FC<AdminCategoriesTabProps> = ({
  categories: initialCategories,
  products,
  onSelectCategory,
}) => {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'playlist' | 'grid'>('playlist');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Drag & Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [lastReorderedState, setLastReorderedState] = useState<Category[] | null>(null);

  // Touch Drag State for Mobile & Tablets
  const touchStartY = useRef<number>(0);
  const touchStartIndex = useRef<number | null>(null);
  const touchCurrentIndex = useRef<number | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Deletion Modal State
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Synchronize when initialCategories prop updates
  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
    }
  }, [initialCategories]);

  // Subscribe to real-time categories from Firestore
  useEffect(() => {
    const unsubscribe = firebaseCategoryService.subscribeToCategories((liveCats) => {
      setCategories(liveCats);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRestoreAllCategories = async () => {
    setIsRestoring(true);
    setActionError(null);
    try {
      const restored = await firebaseCategoryService.restoreDefaultCategories();
      setCategories(restored);
      setActionSuccess(`تمت استعادة ومزامنة كافة الأقسام (${restored.length} قسم) وترتيبها الأصلي بنجاح`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch {
      setActionError('حدث خطأ أثناء مزامنة الأقسام');
    } finally {
      setIsRestoring(false);
    }
  };

  // Count items per category dynamically from current products list
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const catId = p.categoryId || p.category || 'other';
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtered categories by search query
  const isSearching = Boolean(searchTerm.trim());
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase().trim();
    return categories.filter(
      (c) =>
        c.nameAr?.toLowerCase().includes(term) ||
        c.nameEn?.toLowerCase().includes(term) ||
        c.slug?.toLowerCase().includes(term) ||
        c.id?.toLowerCase().includes(term)
    );
  }, [categories, searchTerm]);

  const featuredCount = useMemo(() => categories.filter((c) => c.featured).length, [categories]);
  const totalProductsCount = useMemo(() => products.length, [products]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleToggleFeatured = async (category: Category) => {
    const newStatus = !category.featured;
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, featured: newStatus } : c))
    );
    try {
      await firebaseCategoryService.toggleCategoryFeatured(category.id, newStatus);
      setActionSuccess(`تم ${newStatus ? 'إبراز' : 'إلغاء إبراز'} قسم "${category.nameAr}" بنجاح`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {
      setActionError('فشل تعديل حالة الإبراز للقسم');
    }
  };

  // Save new order to memory and Firestore with batching
  const persistReorderedCategories = async (newOrder: Category[], moveLabel?: string) => {
    setLastReorderedState([...categories]);
    setCategories(newOrder);
    setIsSavingOrder(true);
    setActionError(null);

    try {
      await firebaseCategoryService.reorderCategories(newOrder);
      setIsSavingOrder(false);
      if (moveLabel) {
        setActionSuccess(`تم حفظ ترتيب (${moveLabel}) بدقة في قاعدة البيانات`);
      } else {
        setActionSuccess('تم حفظ الترتيب الجديد للأقسام لحظياً بنجاح');
      }
      setTimeout(() => setActionSuccess(null), 2500);
    } catch {
      setIsSavingOrder(false);
      setActionError('فشل حفظ الترتيب الجديد في السحابة');
    }
  };

  // Quick Directional Moves
  const handleMoveCategoryStep = (currentIndex: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (isSearching) return;
    let targetIndex = currentIndex;

    if (direction === 'up') targetIndex = Math.max(0, currentIndex - 1);
    else if (direction === 'down') targetIndex = Math.min(categories.length - 1, currentIndex + 1);
    else if (direction === 'top') targetIndex = 0;
    else if (direction === 'bottom') targetIndex = categories.length - 1;

    if (targetIndex === currentIndex) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    persistReorderedCategories(reordered, moved.nameAr);
  };

  // Undo Last Reordering
  const handleUndoReorder = async () => {
    if (!lastReorderedState) return;
    const prev = [...lastReorderedState];
    setLastReorderedState(null);
    await persistReorderedCategories(prev, 'التراجع عن الترتيب');
  };

  /* =========================================================================
     HTML5 Drag & Drop Handlers (High Precision YouTube Playlist Style)
     ========================================================================= */
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isSearching) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());

    // Add a slight transparency style to native drag ghost
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.6';
    }
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || isSearching) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midPoint = rect.top + rect.height / 2;
    const isBefore = e.clientY < midPoint;

    setDragOverIndex(targetIndex);
    setDragPosition(isBefore ? 'before' : 'after');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the current item
    const relatedTarget = e.relatedTarget as Node | null;
    if (e.currentTarget.contains(relatedTarget)) return;
    setDragOverIndex(null);
    setDragPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === undefined || isSearching) {
      resetDragState();
      return;
    }

    let insertIndex = targetIndex;
    if (dragPosition === 'after' && draggedIndex > targetIndex) {
      insertIndex = targetIndex + 1;
    } else if (dragPosition === 'before' && draggedIndex < targetIndex) {
      insertIndex = targetIndex;
    }

    if (draggedIndex === insertIndex) {
      resetDragState();
      return;
    }

    const reordered = [...categories];
    const [movedItem] = reordered.splice(draggedIndex, 1);
    
    // Correct target index after removal of moved item
    const finalIndex = draggedIndex < insertIndex ? insertIndex - 1 : insertIndex;
    reordered.splice(finalIndex, 0, movedItem);

    resetDragState();
    persistReorderedCategories(reordered, movedItem.nameAr);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragPosition(null);
  };

  /* =========================================================================
     Mobile & Tablet Touch Reordering Engine
     ========================================================================= */
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (isSearching) return;
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartIndex.current = index;
    touchCurrentIndex.current = index;
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartIndex.current === null || isSearching) return;
    const touch = e.touches[0];
    const currentY = touch.clientY;

    // Find element under touch point
    const elementUnderTouch = document.elementFromPoint(touch.clientX, currentY);
    const categoryRow = elementUnderTouch?.closest('[data-category-index]');

    if (categoryRow) {
      const targetIdx = Number(categoryRow.getAttribute('data-category-index'));
      if (!isNaN(targetIdx) && targetIdx !== touchCurrentIndex.current) {
        touchCurrentIndex.current = targetIdx;
        setDragOverIndex(targetIdx);
        setDragPosition(currentY > touchStartY.current ? 'after' : 'before');
      }
    }
  };

  const handleTouchEnd = () => {
    if (
      touchStartIndex.current !== null &&
      touchCurrentIndex.current !== null &&
      touchStartIndex.current !== touchCurrentIndex.current &&
      !isSearching
    ) {
      const fromIdx = touchStartIndex.current;
      const toIdx = touchCurrentIndex.current;
      const reordered = [...categories];
      const [movedItem] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, movedItem);
      persistReorderedCategories(reordered, movedItem.nameAr);
    }

    touchStartIndex.current = null;
    touchCurrentIndex.current = null;
    resetDragState();
  };

  const handleOpenDelete = (category: Category) => {
    setDeletingCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (categoryId: string, options: DeleteCategoryOptions) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;

    const count = categoryCounts[categoryId] || 0;
    setDeletingId(categoryId);
    setActionError(null);
    setActionSuccess(null);

    const isDeleteProducts = options.deleteMode === 'delete_products';

    try {
      const result = await firebaseCategoryService.deleteCategory(categoryId, products, {
        force: count > 0,
        reassignCategoryId: options.targetReassignCatId,
        deleteProducts: isDeleteProducts,
      });

      if (result.success) {
        setCategories((prev) => prev.filter((c) => c.id !== categoryId));
        
        if (isDeleteProducts && count > 0) {
          setActionSuccess(`تم حذف قسم "${cat.nameAr}" وجميع أصنافه الـ (${count}) نهائياً`);
        } else {
          setActionSuccess(`تم حذف قسم "${cat.nameAr}" بنجاح ${count > 0 ? `(تم نقل ${count} صنف للقسم البديل)` : ''}`);
        }
        setTimeout(() => setActionSuccess(null), 4500);
      } else {
        setActionError(result.error || 'فشل حذف القسم');
      }
    } catch (err: any) {
      setActionError(err?.message || 'حدث خطأ أثناء حذف القسم');
      throw err;
    } finally {
      setDeletingId(null);
    }
  };

  const handleCategorySaved = (savedCategory: Category) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === savedCategory.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedCategory;
        return next;
      }
      return [...prev, savedCategory];
    });
    setActionSuccess(`تم حفظ بيانات قسم "${savedCategory.nameAr}" بنجاح`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header & Metric Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 p-5 rounded-3xl shadow-xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Layers className="w-6 h-6" />
            </div>
            <span>إدارة وترتيب الأقسام (YouTube Playlist Drag & Drop)</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            اسحب أي قسم لأعلى أو لأسفل لترتيبه فوراً مثل قوائم تشغيل يوتيوب بدقة فائقة ومزامنة سحابية لحظية.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {lastReorderedState && (
            <Button
              type="button"
              onClick={handleUndoReorder}
              className="bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 font-bold px-3.5 py-2.5 rounded-2xl flex items-center gap-1.5 text-xs cursor-pointer active:scale-95 transition-all"
              title="تراجع عن الترتيب الأخير"
            >
              <Undo2 className="w-4 h-4" />
              <span>تراجع عن الترتيب</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={handleRestoreAllCategories}
            disabled={isRestoring}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-bold px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-95 transition-all"
            title="مزامنة واستعادة كافة أقسام المنيو الـ 27 مع الحفاظ على التعديلات"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>{isRestoring ? 'جاري المزامنة...' : 'مزامنة كافة الأقسام (27)'}</span>
          </Button>

          <Button
            onClick={handleOpenAdd}
            className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black px-5 py-2.5 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة قسم جديد</span>
          </Button>
        </div>
      </div>

      {/* Warning / Recovery Banner if categories count is below catalog count */}
      {categories.length < DEFAULT_CATEGORIES.length && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-200 text-xs shadow-md">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              يظهر حالياً <strong>{categories.length}</strong> قسم فقط من إجمالي <strong>{DEFAULT_CATEGORIES.length}</strong> قسماً للمنيو.
            </span>
          </div>
          <button
            type="button"
            onClick={handleRestoreAllCategories}
            disabled={isRestoring}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>استعادة ومزامنة الـ {DEFAULT_CATEGORIES.length} قسماً الآن</span>
          </button>
        </div>
      )}

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block">إجمالي الأقسام</span>
            <span className="text-lg font-black text-white">{categories.length} قسم</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block">الأقسام المميزة بالرئيسية</span>
            <span className="text-lg font-black text-white">{featuredCount} قسم</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block">إجمالي المنتجات المرتبطة</span>
            <span className="text-lg font-black text-white">{totalProductsCount} صنف</span>
          </div>
        </div>
      </div>

      {/* Search and View Mode Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800 p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث سريع عن قسم بالاسم أو المعرف..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
            >
              مسح
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('playlist')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'playlist'
                ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="نمط قائمة التشغيل (مثل YouTube) - مخصص للسحب والترتيب السريع"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>قائمة السحب (YouTube)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="نمط شبكة البطاقات"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>شبكة البطاقات</span>
          </button>
        </div>
      </div>

      {/* Info Tip / Status Alerts */}
      {isSearching && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>تم تعطيل خاصية السحب والإفلات مؤقتاً أثناء البحث. لممارسة السحب والترتيب، قم بمسح كلمة البحث.</span>
        </div>
      )}

      {isSavingOrder && (
        <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-2 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>جاري حفظ وتطبيق الترتيب الجديد في قاعدة البيانات سحابياً...</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE A: YOUTUBE PLAYLIST STYLE DRAG & DROP LIST
          ========================================================================= */}
      {viewMode === 'playlist' ? (
        <div
          ref={listContainerRef}
          className="space-y-2.5 select-none"
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {filteredCategories.map((category, index) => {
            const count = categoryCounts[category.id] || 0;
            const isDeleting = deletingId === category.id;
            const isBeingDragged = draggedIndex === index;
            const isTarget = dragOverIndex === index;

            return (
              <div
                key={category.id}
                data-category-index={index}
                draggable={!isSearching}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group bg-neutral-900/95 hover:bg-neutral-850 border rounded-2xl p-3 sm:p-4 transition-all duration-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md ${
                  isBeingDragged
                    ? 'opacity-40 border-dashed border-amber-500 bg-amber-500/5 scale-[0.98]'
                    : isTarget
                    ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-500/10'
                    : category.featured
                    ? 'border-amber-500/40 hover:border-amber-500/60'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Visual Drop Line Indicator (Top) */}
                {isTarget && dragPosition === 'before' && (
                  <div className="absolute -top-1.5 left-0 right-0 h-1 bg-amber-400 rounded-full shadow-[0_0_8px_#f59e0b] z-20 pointer-events-none" />
                )}

                {/* Visual Drop Line Indicator (Bottom) */}
                {isTarget && dragPosition === 'after' && (
                  <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-amber-400 rounded-full shadow-[0_0_8px_#f59e0b] z-20 pointer-events-none" />
                )}

                {/* Right Side: Drag Handle, Number Badge, Thumbnail, and Names */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  {/* YouTube Style Drag Grip Handle */}
                  <div
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    className={`p-2 rounded-xl text-neutral-500 hover:text-amber-400 hover:bg-neutral-800/80 transition-colors shrink-0 flex items-center justify-center ${
                      isSearching ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing'
                    }`}
                    title="اسحب لإعادة الترتيب (Drag to Reorder)"
                  >
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Playlist Sequence Number Badge */}
                  <div className="w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-inner group-hover:border-amber-500/40 group-hover:text-amber-400">
                    #{index + 1}
                  </div>

                  {/* Thumbnail / Emoji */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(category)}
                    className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/60 overflow-hidden shrink-0 flex items-center justify-center shadow-inner relative group/thumb cursor-pointer"
                    title="تعديل أو تغيير صورة القسم"
                  >
                    {category.imageUrl && category.imageUrl.trim() !== '' ? (
                      <img
                        src={category.imageUrl || undefined}
                        alt={category.nameAr}
                        className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xl">{category.emoji || '🍽️'}</span>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-amber-400 font-bold">
                      تعديل
                    </div>
                  </button>

                  {/* Category Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-white text-sm sm:text-base truncate">
                        {category.nameAr}
                      </h3>
                      {category.featured && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />
                          <span>مميز</span>
                        </span>
                      )}
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-300 font-bold">
                        {count} صنف
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-0.5 truncate">
                      <span className="truncate">{category.descriptionAr || category.nameEn || 'قسم منيو بامبورينا'}</span>
                      <span className="font-mono text-neutral-500 text-[10px] shrink-0" dir="ltr">
                        slug: {category.slug || category.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Left Side: Directional Buttons & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800 shrink-0">
                  {/* YouTube Playlist Jump Controls (Top / Up / Down / Bottom) */}
                  <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                    <button
                      type="button"
                      disabled={index === 0 || isSearching}
                      onClick={() => handleMoveCategoryStep(index, 'top')}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-850 disabled:opacity-20 disabled:hover:text-neutral-400 transition-colors"
                      title="نقل إلى أول القائمة تماماً (Move to Top)"
                    >
                      <ChevronsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === 0 || isSearching}
                      onClick={() => handleMoveCategoryStep(index, 'up')}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-850 disabled:opacity-20 disabled:hover:text-neutral-400 transition-colors"
                      title="تحريك لأعلى (Move Up)"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === categories.length - 1 || isSearching}
                      onClick={() => handleMoveCategoryStep(index, 'down')}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-850 disabled:opacity-20 disabled:hover:text-neutral-400 transition-colors"
                      title="تحريك لأسفل (Move Down)"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === categories.length - 1 || isSearching}
                      onClick={() => handleMoveCategoryStep(index, 'bottom')}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-850 disabled:opacity-20 disabled:hover:text-neutral-400 transition-colors"
                      title="نقل إلى آخر القائمة تماماً (Move to Bottom)"
                    >
                      <ChevronsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Actions & Utilities */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(category)}
                      className={`p-2 rounded-xl border transition-colors ${
                        category.featured
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                      }`}
                      title={category.featured ? 'إلغاء الإبراز بالرئيسية' : 'إبراز بالرئيسية'}
                    >
                      <Star className={`w-3.5 h-3.5 ${category.featured ? 'fill-amber-400' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectCategory(category.id)}
                      className="px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-amber-400 text-xs font-bold flex items-center gap-1 transition-colors"
                      title="عرض وإدارة أصناف هذا القسم"
                    >
                      <span>الأصناف ({count})</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(category)}
                      className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
                      title="تعديل بيانات وصورة القسم"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDelete(category)}
                      disabled={isDeleting}
                      className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-500/50 transition-colors disabled:opacity-50"
                      title="حذف القسم"
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* =========================================================================
            VIEW MODE B: GRID VIEW (WITH DRAG AND DROP & QUICK BUTTONS)
            ========================================================================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCategories.map((category, index) => {
            const count = categoryCounts[category.id] || 0;
            const isDeleting = deletingId === category.id;
            const isBeingDragged = draggedIndex === index;
            const isTarget = dragOverIndex === index;

            return (
              <div
                key={category.id}
                draggable={!isSearching}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-neutral-900/90 hover:bg-neutral-900 border ${
                  isBeingDragged
                    ? 'opacity-40 border-dashed border-amber-500 bg-amber-500/5 scale-[0.98]'
                    : isTarget
                    ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-500/10'
                    : category.featured
                    ? 'border-amber-500/40 shadow-amber-500/5'
                    : 'border-neutral-800'
                } rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all space-y-4 relative group`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="p-1 rounded-lg text-neutral-500 hover:text-amber-400 cursor-grab active:cursor-grabbing"
                        title="اسحب للترتيب"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-amber-400">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleFeatured(category)}
                        className={`p-1.5 rounded-xl border transition-colors ${
                          category.featured
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                        }`}
                        title={category.featured ? 'قسم مميز بالرئيسية' : 'إبراز القسم بالرئيسية'}
                      >
                        <Star className={`w-3.5 h-3.5 ${category.featured ? 'fill-amber-400' : ''}`} />
                      </button>

                      <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-300 font-bold">
                        {count} صنف
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(category)}
                      className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/60 hover:scale-105 overflow-hidden shrink-0 flex items-center justify-center shadow-inner transition-all cursor-pointer group/thumb relative"
                      title="تعديل أو تغيير صورة القسم المصغرة"
                    >
                      {category.imageUrl && category.imageUrl.trim() !== '' ? (
                        <img
                          src={category.imageUrl || undefined}
                          alt={category.nameAr}
                          className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-2xl">{category.emoji || '🍽️'}</span>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-amber-400 font-bold">
                        تغيير
                      </div>
                    </button>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-white text-base truncate">
                        {category.nameAr}
                      </h3>
                      <p className="text-[11px] font-mono text-neutral-500 truncate" dir="ltr">
                        {category.slug || category.id}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {category.descriptionAr || 'تشكيلة مميزة من حلواني ومطعم بامبورينا'}
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectCategory(category.id)}
                    className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline font-bold"
                  >
                    <span>عرض الأصناف ({count})</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={index === 0 || isSearching}
                      onClick={() => handleMoveCategoryStep(index, 'up')}
                      className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-amber-400 disabled:opacity-20"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      disabled={index === categories.length - 1 || isSearching}
                      onClick={() => handleMoveCategoryStep(index, 'down')}
                      className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-amber-400 disabled:opacity-20"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(category)}
                      className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
                      title="تعديل القسم"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleOpenDelete(category)}
                      disabled={isDeleting}
                      className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-500/50 transition-colors disabled:opacity-50"
                      title="حذف القسم"
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredCategories.length === 0 && (
        <div className="p-12 text-center text-neutral-500 bg-neutral-900/50 border border-neutral-800 rounded-3xl">
          <Layers className="w-10 h-10 mx-auto mb-2 text-neutral-600" />
          <p className="text-sm font-bold text-neutral-300">لا توجد أقسام مطابقة للبحث</p>
          <p className="text-xs text-neutral-500 mt-1">جرّب كلمة بحث أخرى أو قم بإضافة قسم جديد</p>
        </div>
      )}

      {/* Category Modal */}
      <AdminCategoryModal
        isOpen={isModalOpen}
        category={editingCategory}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleCategorySaved}
      />

      {/* Delete Category Modal */}
      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        category={deletingCategory}
        allCategories={categories}
        productCount={deletingCategory ? categoryCounts[deletingCategory.id] || 0 : 0}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};
