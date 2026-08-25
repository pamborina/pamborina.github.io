import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category } from '../../../types';
import { firebaseProductService } from '../../../services/firebaseProductService';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Power,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  ArrowUpDown,
  Layers,
  AlertTriangle,
  X,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../../ui/Button';

interface AdminProductsTabProps {
  products: Product[];
  categories: Category[];
  initialCategoryFilter?: string;
  initialAvailabilityFilter?: 'all' | 'available' | 'unavailable' | 'featured';
  onClearCategoryFilter?: () => void;
  onClearAvailabilityFilter?: () => void;
  onOpenEditProduct: (product: Product) => void;
  onOpenAddProduct: () => void;
  onProductUpdated: (product: Product) => void;
  onProductsBulkUpdated?: (products: Product[]) => void;
  onProductDeleted?: (productId: string) => void;
}

export const AdminProductsTab: React.FC<AdminProductsTabProps> = ({
  products,
  categories,
  initialCategoryFilter = 'all',
  initialAvailabilityFilter = 'all',
  onClearCategoryFilter,
  onClearAvailabilityFilter,
  onOpenEditProduct,
  onOpenAddProduct,
  onProductUpdated,
  onProductsBulkUpdated,
  onProductDeleted,
}) => {
  // Toast notification for non-blocking feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryFilter || 'all');
  const [selectedAvailability, setSelectedAvailability] = useState<'all' | 'available' | 'unavailable' | 'featured'>(initialAvailabilityFilter || 'all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name' | 'order'>('default');

  // Sync selectedCategory when initialCategoryFilter prop changes
  useEffect(() => {
    if (initialCategoryFilter && initialCategoryFilter !== 'all') {
      const targetCat = categories.find(
        (c) => c.id === initialCategoryFilter || c.slug === initialCategoryFilter
      );
      if (targetCat) {
        setSelectedCategory(targetCat.id);
      } else {
        setSelectedCategory(initialCategoryFilter);
      }
      setCurrentPage(1);
    } else if (initialCategoryFilter === 'all') {
      setSelectedCategory('all');
      setCurrentPage(1);
    }
  }, [initialCategoryFilter, categories]);

  // Sync selectedAvailability when initialAvailabilityFilter prop changes
  useEffect(() => {
    if (initialAvailabilityFilter) {
      setSelectedAvailability(initialAvailabilityFilter);
      setCurrentPage(1);
    }
  }, [initialAvailabilityFilter]);

  // Selected Category Object
  const selectedCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return categories.find((c) => c.id === selectedCategory || c.slug === selectedCategory) || null;
  }, [categories, selectedCategory]);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;

  // Toggle Loading States
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Deletion Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Category Lookup Map
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => {
      map.set(cat.id, cat.nameAr);
    });
    return map;
  }, [categories]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = products.length;
    const available = products.filter((p) => (p.isAvailable !== undefined ? p.isAvailable : p.available !== false)).length;
    const unavailable = total - available;
    const featured = products.filter((p) => p.featured).length;
    return { total, available, unavailable, featured };
  }, [products]);

  // Filtered & Sorted Products with precise category matching
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const nameMatch = (product.nameAr || '').toLowerCase().includes(query) ||
                          (product.name || '').toLowerCase().includes(query) ||
                          (product.nameEn || '').toLowerCase().includes(query);
        const idMatch = (product.id || '').toLowerCase().includes(query);
        const descMatch = (product.descriptionAr || '').toLowerCase().includes(query);
        if (!nameMatch && !idMatch && !descMatch) {
          return false;
        }
      }

      // 2. Category filter (High precision matching)
      if (selectedCategory !== 'all') {
        const targetCategoryObj = categories.find(
          (c) => c.id === selectedCategory || c.slug === selectedCategory
        );

        const prodCatId = product.categoryId || product.category;
        
        let matches = false;
        if (prodCatId) {
          const normProdCat = prodCatId.trim().toLowerCase();
          matches =
            normProdCat === selectedCategory.trim().toLowerCase() ||
            (targetCategoryObj &&
              (normProdCat === targetCategoryObj.id.trim().toLowerCase() ||
               (targetCategoryObj.slug && normProdCat === targetCategoryObj.slug.trim().toLowerCase()) ||
               (targetCategoryObj.nameAr && normProdCat === targetCategoryObj.nameAr.trim().toLowerCase()) ||
               (targetCategoryObj.nameEn && normProdCat === targetCategoryObj.nameEn.trim().toLowerCase())));
        }

        if (!matches) {
          return false;
        }
      }

      // 3. Availability filter
      const isAvailable = product.isAvailable !== undefined ? product.isAvailable : (product.available !== undefined ? product.available : true);
      if (selectedAvailability === 'available' && !isAvailable) return false;
      if (selectedAvailability === 'unavailable' && isAvailable) return false;
      if (selectedAvailability === 'featured' && !product.featured) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'name') return (a.nameAr || '').localeCompare(b.nameAr || '', 'ar');
      if (sortBy === 'order') return (a.sortOrder || a.displayOrder || 0) - (b.sortOrder || b.displayOrder || 0);
      return 0;
    });
  }, [products, categories, searchTerm, selectedCategory, selectedAvailability, sortBy]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Reset to page 1 on filter change
  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setCurrentPage(1);
  };

  // Fast Toggle Availability in Firestore
  const handleToggleAvailability = async (product: Product) => {
    const currentStatus = product.isAvailable !== undefined ? product.isAvailable : (product.available !== undefined ? product.available : true);
    const newStatus = !currentStatus;

    setTogglingId(product.id);
    try {
      await firebaseProductService.updateProductAvailability(product.id, newStatus, product.nameAr || product.name);
      onProductUpdated({
        ...product,
        isAvailable: newStatus,
        available: newStatus,
      });
      setToastMessage({
        type: 'success',
        text: `تم تغيير حالة (${product.nameAr || product.name}) إلى: ${newStatus ? 'متوفر للطلب' : 'موقوف مؤقتاً'}`,
      });
    } catch (err: any) {
      console.error('Toggle error:', err);
      setToastMessage({
        type: 'error',
        text: `فشل تغيير حالة توفر الصنف: ${err?.message || 'يرجى المحاولة ثانية'}`,
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Bulk activate all filtered unavailable products
  const [isBulkActivating, setIsBulkActivating] = useState(false);

  const handleActivateAllFilteredProducts = async () => {
    // 1. Gather all unavailable products
    let unavailableToActivate = filteredProducts.filter((p) => {
      const isAvail = p.isAvailable !== undefined ? p.isAvailable : (p.available !== undefined ? p.available : true);
      return !isAvail;
    });

    if (unavailableToActivate.length === 0) {
      unavailableToActivate = products.filter((p) => {
        const isAvail = p.isAvailable !== undefined ? p.isAvailable : (p.available !== undefined ? p.available : true);
        return !isAvail;
      });
    }

    if (unavailableToActivate.length === 0) {
      setToastMessage({
        type: 'info',
        text: 'لا توجد أصناف موقوفة حالياً، جميع الأصناف مفعلة ومتاحة للطلب!',
      });
      return;
    }

    const count = unavailableToActivate.length;
    setIsBulkActivating(true);

    try {
      // 2. Perform high-performance Firestore writeBatch
      await firebaseProductService.bulkUpdateProductAvailability(
        unavailableToActivate.map((p) => ({ id: p.id, nameAr: p.nameAr || p.name })),
        true
      );

      // 3. Construct updated product objects
      const updatedProducts = unavailableToActivate.map((prod) => ({
        ...prod,
        isAvailable: true,
        available: true,
      }));

      // 4. Update parent state
      if (onProductsBulkUpdated) {
        onProductsBulkUpdated(updatedProducts);
      } else {
        updatedProducts.forEach((prod) => {
          onProductUpdated(prod);
        });
      }

      // 5. Automatically reset availability filter to 'all' so that all products appear
      setSelectedAvailability('all');
      if (onClearAvailabilityFilter) {
        onClearAvailabilityFilter();
      }
      setCurrentPage(1);

      // 6. Set success toast
      setToastMessage({
        type: 'success',
        text: `✅ تم بنجاح تفعيل جميع الأصناف الموقوفة (${count} صنف)! جميع الأصناف أصبحت متاحة للطلب فوراً.`,
      });
    } catch (err: any) {
      console.error('Bulk activate error:', err);
      setToastMessage({
        type: 'error',
        text: `حدث خطأ أثناء تفعيل الأصناف: ${err?.message || 'يرجى المحاولة ثانية'}`,
      });
    } finally {
      setIsBulkActivating(false);
    }
  };

  // Safe Delete Product from Firestore and Storage
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await firebaseProductService.deleteProduct(productToDelete.id, productToDelete.imageUrl || productToDelete.image);
      if (onProductDeleted) {
        onProductDeleted(productToDelete.id);
      }
      setProductToDelete(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'فشل حذف المنتج من قاعدة البيانات');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-2xl transition-all duration-300 animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : toastMessage.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toastMessage.type === 'info' && <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />}
            <span className="text-xs sm:text-sm font-bold text-white">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>إدارة قائمة المنتجات والأسعار</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">
              {filteredProducts.length} صنف
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            التحكم المباشر في الأسعار، الصور، والتوفر لجميع الأصناف الـ {products.length}.
          </p>
        </div>

        <Button
          onClick={onOpenAddProduct}
          className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة صنف جديد</span>
        </Button>
      </div>

      {/* Quick Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-neutral-800/80 border border-neutral-700/70 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 block">إجمالي المنتجات</span>
            <span className="text-lg font-bold text-white">{stats.total}</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 font-mono">
            {categories.length} أقسام
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-neutral-800/80 border border-neutral-700/70 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 block">المتاحة للطلب</span>
            <span className="text-lg font-bold text-emerald-400">{stats.available}</span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400/60" />
        </div>

        <div className="p-3.5 rounded-2xl bg-neutral-800/80 border border-neutral-700/70 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 block">الموقوفة مؤقتاً</span>
            <span className="text-lg font-bold text-rose-400">{stats.unavailable}</span>
          </div>
          <XCircle className="w-5 h-5 text-rose-400/60" />
        </div>

        <div className="p-3.5 rounded-2xl bg-neutral-800/80 border border-neutral-700/70 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 block">الأصناف المميزة</span>
            <span className="text-lg font-bold text-amber-400">{stats.featured}</span>
          </div>
          <Sparkles className="w-5 h-5 text-amber-400/60" />
        </div>
      </div>

      {/* Active Category Filter Notification Banner */}
      {selectedCategory !== 'all' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xl shrink-0">
              {selectedCategoryObj?.emoji || '🍽️'}
            </div>
            <div>
              <span className="text-[11px] text-amber-400/80 font-bold block">تصفية حسب القسم المحدد:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">
                  قسم {selectedCategoryObj?.nameAr || selectedCategory}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold">
                  {filteredProducts.length} صنف متاح
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedCategory('all');
              if (onClearCategoryFilter) onClearCategoryFilter();
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/20 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>إلغاء التصفية / عرض جميع الأقسام</span>
          </button>
        </div>
      )}

      {/* Active Availability Filter Notification Banner (e.g. Discontinued / Unavailable Products) */}
      {selectedAvailability === 'unavailable' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-neutral-900/90 to-rose-950/80 border-2 border-rose-500/40 text-rose-300 text-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-2xl animate-fade-in backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-xl shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-rose-400/90 font-bold block">تصفية الأصناف الموقوفة / النفدت:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm sm:text-base font-black text-white">
                  عرض الأصناف غير المتاحة للطلب فقط ({filteredProducts.length} صنف موقوف)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            <button
              type="button"
              id="clear-availability-filter-btn"
              onClick={() => {
                setSelectedAvailability('all');
                if (onClearAvailabilityFilter) onClearAvailabilityFilter();
                setCurrentPage(1);
                setToastMessage({
                  type: 'info',
                  text: 'تم إلغاء التصفية وعرض كل الأصناف في القائمة.',
                });
              }}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-600 hover:border-neutral-500 font-bold text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4 text-neutral-300" />
              <span>إلغاء التصفية / عرض كل الأصناف</span>
            </button>

            {filteredProducts.length > 0 && (
              <button
                type="button"
                id="activate-all-unavailable-btn"
                onClick={handleActivateAllFilteredProducts}
                disabled={isBulkActivating}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-neutral-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50 active:scale-95 border border-emerald-400"
              >
                {isBulkActivating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                ) : (
                  <Power className="w-4 h-4 text-neutral-950" />
                )}
                <span>
                  {isBulkActivating
                    ? 'جاري تفعيل الأصناف...'
                    : `تفعيل جميع الأصناف الموقوفة بضغطة واحدة (${filteredProducts.length})`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search & Filters Card */}
      <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl p-4 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              placeholder="البحث بالاسم أو المعرف..."
              className="w-full pl-3 pr-10 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                handleFilterChange(setSelectedCategory, val);
                if (val === 'all' && onClearCategoryFilter) {
                  onClearCategoryFilter();
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 appearance-none font-medium"
            >
              <option value="all">جميع الأقسام ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji || '🍽️'} {cat.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div className="relative">
            <select
              value={selectedAvailability}
              onChange={(e) => handleFilterChange(setSelectedAvailability, e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 appearance-none"
            >
              <option value="all">كل حالات التوفر</option>
              <option value="available">متاح للطلب فقط</option>
              <option value="unavailable">غير متاح (موقوف)</option>
              <option value="featured">الأصناف المميزة (Featured)</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => handleFilterChange(setSortBy, e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 appearance-none"
            >
              <option value="default">الترتيب الافتراضي</option>
              <option value="price-asc">السعر: من الأقل للأعلى</option>
              <option value="price-desc">السعر: من الأعلى للأقل</option>
              <option value="name">أبجدياً (أ - ي)</option>
              <option value="order">حسب ترتيب العرض (sortOrder)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table (Desktop) & Cards (Mobile) */}
      <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl overflow-hidden shadow-xl">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <p className="text-sm">لم يتم العثور على أي أصناف مطابقة لمعايير البحث.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedAvailability('all');
                setCurrentPage(1);
              }}
              className="mt-3 text-xs text-amber-400 hover:underline"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs text-neutral-200">
                <thead className="bg-neutral-900/80 text-neutral-400 border-b border-neutral-700 text-[11px] uppercase">
                  <tr>
                    <th className="py-3.5 px-4">الصورة</th>
                    <th className="py-3.5 px-4">اسم الصنف</th>
                    <th className="py-3.5 px-4">التصنيف</th>
                    <th className="py-3.5 px-4">السعر</th>
                    <th className="py-3.5 px-4 text-center">التوفر الفوري</th>
                    <th className="py-3.5 px-4 text-center">الترتيب</th>
                    <th className="py-3.5 px-4 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-700/50">
                  {paginatedProducts.map((p) => {
                    const isAvail = p.isAvailable !== undefined ? p.isAvailable : (p.available !== undefined ? p.available : true);
                    const catName = categoryMap.get(p.categoryId || p.category || '') || p.categoryId || p.category || 'عام';
                    const isToggling = togglingId === p.id;

                    return (
                      <tr key={p.id} className="hover:bg-neutral-700/30 transition-colors">
                        {/* Thumbnail */}
                        <td className="py-3 px-4 w-16">
                          <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {p.imageUrl || p.image ? (
                              <img
                                src={p.imageUrl || p.image}
                                alt={p.nameAr}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/default-food.webp';
                                }}
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-neutral-600" />
                            )}
                          </div>
                        </td>

                        {/* Name & ID */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            <span>{p.nameAr || p.name}</span>
                            {p.featured && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-normal">
                                مميز
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono mt-0.5" dir="ltr">
                            {p.id}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 text-[11px]">
                            {catName}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4">
                          <div className="font-black text-amber-400 text-sm">
                            {p.price} جنيه
                          </div>
                          {p.originalPrice && p.originalPrice > p.price && (
                            <div className="text-[10px] text-neutral-500 line-through">
                              {p.originalPrice} جنيه
                            </div>
                          )}
                        </td>

                        {/* Availability Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleAvailability(p)}
                            disabled={isToggling}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              isAvail
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                                : 'bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isAvail ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            <span>{isAvail ? 'متاح' : 'موقوف'}</span>
                          </button>
                        </td>

                        {/* Order */}
                        <td className="py-3 px-4 text-center font-mono text-neutral-400">
                          {p.sortOrder ?? p.displayOrder ?? 0}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenEditProduct(p)}
                              className="p-2 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
                              title="تعديل بيانات الصنف"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setProductToDelete(p)}
                              className="p-2 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-rose-400 hover:border-rose-500/50 transition-colors"
                              title="حذف الصنف نهائياً"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-neutral-700/60">
              {paginatedProducts.map((p) => {
                const isAvail = p.isAvailable !== undefined ? p.isAvailable : (p.available !== undefined ? p.available : true);
                const catName = categoryMap.get(p.categoryId || p.category || '') || p.categoryId || p.category || 'عام';
                const isToggling = togglingId === p.id;

                return (
                  <div key={p.id} className="p-4 flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-neutral-900 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.imageUrl || p.image ? (
                        <img
                          src={p.imageUrl || p.image}
                          alt={p.nameAr}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-food.webp';
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-neutral-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-bold text-white text-sm truncate">{p.nameAr || p.name}</h4>
                        <span className="font-black text-amber-400 text-xs shrink-0">{p.price} ج.م</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mb-2">
                        <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700">{catName}</span>
                        <span className="font-mono">{p.id}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(p)}
                          disabled={isToggling}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            isAvail
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                          }`}
                        >
                          {isToggling ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          <span>{isAvail ? 'متاح' : 'موقوف'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenEditProduct(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-amber-400 text-xs font-medium"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>تعديل</span>
                          </button>

                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-rose-400 text-xs font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-neutral-700/60 bg-neutral-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
              <div>
                عرض {Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)} إلى{' '}
                {Math.min(filteredProducts.length, currentPage * itemsPerPage)} من إجمالي{' '}
                <span className="text-white font-bold">{filteredProducts.length}</span> صنف
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-neutral-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="px-3 py-1 rounded-xl bg-neutral-800 border border-neutral-700 text-white font-bold">
                  {currentPage} / {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-neutral-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">تأكيد حذف المنتج نهائياً</h3>
              <p className="text-xs text-neutral-300">
                هل أنت متأكد من رغبتك في حذف الصنف التالي من قاعدة بيانات المتجر وحذف صورته السحابية؟
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-700 overflow-hidden shrink-0">
                <img
                  src={productToDelete.imageUrl || productToDelete.image || '/default-food.webp'}
                  alt={productToDelete.nameAr}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-sm truncate">{productToDelete.nameAr || productToDelete.name}</h4>
                <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                  <span className="text-amber-400 font-bold">{productToDelete.price} جنيه</span>
                  <span>•</span>
                  <span className="font-mono text-[11px]">{productToDelete.id}</span>
                </div>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="border-neutral-800 text-neutral-400 flex-1"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex-1 py-2.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <span>نعم، احذف الصنف</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
