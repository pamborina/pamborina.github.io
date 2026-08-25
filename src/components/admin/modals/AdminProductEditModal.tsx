import React, { useState, useEffect } from 'react';
import { Product, Category } from '../../../types';
import { firebaseProductService } from '../../../services/firebaseProductService';
import { firebaseStorageService } from '../../../services/firebaseStorageService';
import { X, Upload, Check, AlertCircle, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '../../ui/Button';

interface AdminProductEditModalProps {
  isOpen: boolean;
  product: Product | null; // null for creating a new product
  categories: Category[];
  onClose: () => void;
  onSaved: (product: Product) => void;
}

export const AdminProductEditModal: React.FC<AdminProductEditModalProps> = ({
  isOpen,
  product,
  categories,
  onClose,
  onSaved,
}) => {
  const isEditing = Boolean(product);

  // Form States
  const [nameAr, setNameAr] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [prepTime, setPrepTime] = useState<number>(15);
  const [imageUrl, setImageUrl] = useState('');

  // Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Submission States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate when product changes
  useEffect(() => {
    if (product) {
      setNameAr(product.nameAr || product.name || '');
      setDescriptionAr(product.descriptionAr || product.description || '');
      setPrice(product.price ?? 0);
      setOriginalPrice(product.originalPrice ?? '');
      setCategoryId(product.categoryId || product.category || (categories[0]?.id || ''));
      setIsAvailable(product.isAvailable !== undefined ? product.isAvailable : (product.available !== undefined ? product.available : true));
      setFeatured(Boolean(product.featured));
      setSortOrder(product.sortOrder ?? product.displayOrder ?? 0);
      setPrepTime(product.preparationTimeMinutes ?? 15);
      setImageUrl(product.imageUrl || product.image || '');
      setImagePreview(product.imageUrl || product.image || '');
    } else {
      setNameAr('');
      setDescriptionAr('');
      setPrice('');
      setOriginalPrice('');
      setCategoryId(categories[0]?.id || '');
      setIsAvailable(true);
      setFeatured(false);
      setSortOrder(0);
      setPrepTime(15);
      setImageUrl('');
      setImagePreview('');
    }
    setSelectedFile(null);
    setError(null);
  }, [product, categories, isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً. يجب أن يكون أقل من 5 ميجابايت.');
      return;
    }

    // Validate MIME type
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP).');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) {
      setError('يرجى كتابة اسم المنتج بالعربية.');
      return;
    }
    if (price === '' || isNaN(Number(price)) || Number(price) < 0) {
      setError('يرجى إدخال سعر صالح للمنتج.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let finalImageUrl = imageUrl;
      const targetId = product?.id || `prod_${Date.now()}`;

      // 1. Process and upload new image if selected
      if (selectedFile) {
        setUploadingImage(true);
        try {
          finalImageUrl = await firebaseStorageService.uploadProductImage(selectedFile, targetId);
          setImageUrl(finalImageUrl);
        } catch (uploadErr: any) {
          console.warn('⚠️ [Image Upload] Falling back to direct preview image:', uploadErr);
          // Guaranteed fallback if anything goes wrong
          finalImageUrl = imagePreview || imageUrl || '/default-food.webp';
        } finally {
          setUploadingImage(false);
        }
      }

      // 2. Prepare payload
      const cleanPrice = Number(price);
      const cleanOriginalPrice = originalPrice !== '' ? Number(originalPrice) : undefined;
      const cleanSortOrder = Number(sortOrder) || 0;

      if (isEditing && product) {
        // Partial atomic update to preserve extra fields
        const updates: Partial<Product> = {
          nameAr: nameAr.trim(),
          name: nameAr.trim(),
          descriptionAr: descriptionAr.trim(),
          description: descriptionAr.trim(),
          price: cleanPrice,
          originalPrice: cleanOriginalPrice,
          categoryId: categoryId || 'burgers',
          category: categoryId || 'burgers',
          isAvailable,
          available: isAvailable,
          featured,
          sortOrder: cleanSortOrder,
          displayOrder: cleanSortOrder,
          preparationTimeMinutes: Number(prepTime) || 15,
          image: finalImageUrl || product.image || '/default-food.webp',
          imageUrl: finalImageUrl || product.imageUrl || '/default-food.webp',
        };

        await firebaseProductService.updateProduct(product.id, updates);

        const updatedFullProduct: Product = {
          ...product,
          ...updates,
        };
        onSaved(updatedFullProduct);
      } else {
        // Create new product
        const newProductData: Omit<Product, 'id'> = {
          nameAr: nameAr.trim(),
          name: nameAr.trim(),
          nameEn: '',
          descriptionAr: descriptionAr.trim(),
          description: descriptionAr.trim(),
          price: cleanPrice,
          originalPrice: cleanOriginalPrice,
          categoryId: categoryId || 'burgers',
          category: categoryId || 'burgers',
          slug: targetId,
          image: finalImageUrl || '/default-food.webp',
          imageUrl: finalImageUrl || '/default-food.webp',
          isAvailable,
          available: isAvailable,
          featured,
          sortOrder: cleanSortOrder,
          displayOrder: cleanSortOrder,
          preparationTimeMinutes: Number(prepTime) || 15,
          rating: 5.0,
          reviewCount: 0,
          salesCount: 0,
        };

        const createdId = await firebaseProductService.createProduct(newProductData, targetId);
        onSaved({
          id: createdId,
          ...newProductData,
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Save product error:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ المنتج في قاعدة البيانات.');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" dir="rtl">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] max-h-[92dvh] my-auto">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-bold text-white">
                {isEditing ? `تعديل صنف: ${product?.nameAr}` : 'إضافة صنف جديد'}
              </h3>
              <p className="text-[10px] sm:text-xs text-neutral-400">
                {isEditing ? `معرّف الصنف: ${product?.id}` : 'إدخال بيانات الصنف الجديد في قائمة الطعام'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 text-xs sm:text-sm text-neutral-200 scrollbar-thin">
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 flex items-start gap-3 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Grid: Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                اسم الصنف (بالعربية) <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: شاورما فراخ عربي"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                التصنيف <span className="text-amber-400">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-amber-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nameAr} ({cat.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              وصف الصنف
            </label>
            <textarea
              rows={2}
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              placeholder="اكتب وصفاً جذاباً ومختصراً للمنتج والمكونات..."
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Pricing & Order */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                السعر الحالي (جنيه) <span className="text-amber-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="80"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                السعر قبل الخصم (اختياري)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="مثال: 95"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                ترتيب العرض
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Image Upload & URL */}
          <div className="p-4 rounded-xl bg-neutral-800/60 border border-neutral-700/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                صورة الصنف
              </label>
              <span className="text-[11px] text-neutral-400">يدعم JPG / PNG / WebP (أقل من 5MB)</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Image Preview */}
              <div className="w-24 h-24 rounded-xl bg-neutral-900 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="معاينة"
                    className="w-full h-full object-cover"
                    onError={() => setImagePreview('/default-food.webp')}
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-neutral-600" />
                )}
              </div>

              {/* Upload or Link Input */}
              <div className="flex-1 w-full space-y-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-medium transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع صورة جديدة من جهازك</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  {selectedFile && (
                    <span className="text-xs text-emerald-400 truncate max-w-[150px]">
                      {selectedFile.name}
                    </span>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    placeholder="أو ضع رابط الصورة المباشر (URL)"
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-neutral-300 placeholder-neutral-500"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Toggles: Availability & Featured */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Availability */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-800/80 border border-neutral-700">
              <div>
                <span className="text-xs font-bold text-white block">حالة التوفر بالمطعم</span>
                <span className="text-[11px] text-neutral-400">
                  {isAvailable ? 'متاح للطلب الفوري في المتجر' : 'غير متاح حالياً (موقوف)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAvailable(!isAvailable)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAvailable ? 'bg-emerald-500' : 'bg-neutral-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAvailable ? 'translate-x-0' : '-translate-x-5'
                  }`}
                />
              </button>
            </div>

            {/* Featured */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-800/80 border border-neutral-700">
              <div>
                <span className="text-xs font-bold text-white block">صنف مميز (Featured)</span>
                <span className="text-[11px] text-neutral-400">يظهر في قائمة الأكثر طلباً والمميزة</span>
              </div>
              <button
                type="button"
                onClick={() => setFeatured(!featured)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  featured ? 'bg-amber-500' : 'bg-neutral-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    featured ? 'translate-x-0' : '-translate-x-5'
                  }`}
                />
              </button>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-end gap-3 sticky bottom-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
          >
            إلغاء
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || uploadingImage}
            className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold px-6 flex items-center gap-2"
          >
            {loading || uploadingImage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{uploadingImage ? 'جاري رفع الصورة...' : 'جاري الحفظ...'}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'حفظ التعديلات' : 'إضافة الصنف'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
