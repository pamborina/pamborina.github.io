import React, { useState, useEffect, useMemo } from 'react';
import { Category, Product } from '../../../types';
import { firebaseCategoryService } from '../../../services/firebaseCategoryService';
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
  Star,
  Package,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Deletion Modal State
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Subscribe to real-time categories from Firestore
  useEffect(() => {
    const unsubscribe = firebaseCategoryService.subscribeToCategories((liveCats) => {
      setCategories(liveCats);
    });

    return () => {
      unsubscribe();
    };
  }, []);

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

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setCategories(reordered);

    try {
      await firebaseCategoryService.reorderCategories(reordered);
      setActionSuccess(`تم إعادة ترتيب قسم "${moved.nameAr}" بنجاح`);
      setTimeout(() => setActionSuccess(null), 2500);
    } catch {
      setActionError('فشل حفظ الترتيب الجديد');
    }
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
        // Immediate local state update
        setCategories((prev) => prev.filter((c) => c.id !== categoryId));
        
        if (isDeleteProducts && count > 0) {
          setActionSuccess(`تم حذف قسم "${cat.nameAr}" وجميع أصنافه الـ (${count}) نهائياً من المنيو`);
        } else {
          setActionSuccess(`تم حذف قسم "${cat.nameAr}" بنجاح ${count > 0 ? `(تم نقل ${count} صنف تلقائياً للقسم البديل)` : ''}`);
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
    setActionSuccess(`تم حفظ بيانات قسم "${savedCategory.nameAr}" بنجاح وتحديثها لحظياً`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header & Metric Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 p-5 rounded-3xl shadow-xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Layers className="w-6 h-6" />
            </div>
            <span>إدارة الأقسام والتصنيفات (Real-time Categories)</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            منظومة برمجة لحظية لإضافة، تعديل، حذف، وإعادة ترتيب الأقسام والتصنيفات بدقة فائقة.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold px-5 py-3 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة قسم جديد الآن</span>
        </Button>
      </div>

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

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث سريع عن قسم بالاسم العربي، الإنجليزي أو المعرف..."
          className="w-full pr-10 pl-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
        />
      </div>

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

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCategories.map((category, index) => {
          const count = categoryCounts[category.id] || 0;
          const isDeleting = deletingId === category.id;

          return (
            <div
              key={category.id}
              className={`bg-neutral-900/90 hover:bg-neutral-900 border ${
                category.featured ? 'border-amber-500/40 shadow-amber-500/5' : 'border-neutral-800'
              } rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all space-y-4 relative group`}
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.nameAr}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-2xl">{category.emoji || '🍽️'}</span>
                    )}
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

                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-white text-base">
                    {category.nameAr}
                  </h3>
                  <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      disabled={index === 0}
                      onClick={() => handleMoveCategory(index, 'up')}
                      className="p-1 rounded bg-neutral-950 text-neutral-400 hover:text-amber-400 disabled:opacity-30"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      disabled={index === categories.length - 1}
                      onClick={() => handleMoveCategory(index, 'down')}
                      className="p-1 rounded bg-neutral-950 text-neutral-400 hover:text-amber-400 disabled:opacity-30"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                  {category.descriptionAr || 'تشكيلة مميزة من حلواني ومطعم بامبورينا'}
                </p>

                <div className="text-[10px] font-mono text-neutral-500 mt-2.5 flex items-center justify-between" dir="ltr">
                  <span>Slug: {category.slug || category.id}</span>
                  <span>Order: #{category.sortOrder ?? index + 1}</span>
                </div>
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
                    title={count > 0 ? `حذف القسم مع إعادة تعيين ${count} صنف` : 'حذف القسم'}
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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

