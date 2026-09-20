import React, { useState, useEffect, useRef } from 'react';
import { Category } from '../../../types';
import { firebaseCategoryService } from '../../../services/firebaseCategoryService';
import { firebaseStorageService } from '../../../services/firebaseStorageService';
import { Images } from '../../../data/images';
import {
  X,
  Layers,
  Loader2,
  AlertCircle,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Trash2,
  Check,
  Link2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../ui/Button';

interface AdminCategoryModalProps {
  isOpen: boolean;
  category: Category | null; // null for creating a new category
  onClose: () => void;
  onSaved: (category: Category) => void;
}

export const AdminCategoryModal: React.FC<AdminCategoryModalProps> = ({
  isOpen,
  category,
  onClose,
  onSaved,
}) => {
  const isEditing = Boolean(category);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [emoji, setEmoji] = useState('🍽️');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [featured, setFeatured] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const POPULAR_EMOJIS = ['🍰', '🍔', '🍕', '☕', '🍦', '🌮', '🥗', '🍩', '🥐', '🥮', '🍹', '🍨', '🥩', '🧋', '🍟', '🥪', '👑', '🍪'];

  const PRESET_THUMBNAILS = [
    { name: 'كريب مكس', url: Images.categories.crepesMix },
    { name: 'ساندوتشات', url: Images.categories.sandwichesFrench },
    { name: 'برجر ع الفحم', url: Images.categories.burgers },
    { name: 'فرايد تشيكن', url: Images.categories.friedChicken },
    { name: 'وافل وشوكولاتة', url: Images.categories.waffles },
    { name: 'حلويات شرقية', url: Images.categories.orientalSweets },
    { name: 'تورت وجاتوه', url: Images.categories.westernCakes },
    { name: 'كشري قشطوطة', url: Images.categories.kosharyKashtouta },
    { name: 'مشروبات وعصائر', url: Images.categories.coldDrinks },
    { name: 'قهوة وساخن', url: Images.categories.hotDrinks },
  ];

  useEffect(() => {
    if (category) {
      setNameAr(category.nameAr || '');
      setNameEn(category.nameEn || '');
      setSlug(category.slug || category.id || '');
      setEmoji(category.emoji || '🍽️');
      setDescriptionAr(category.descriptionAr || '');
      setImageUrl(category.imageUrl || '');
      setImagePreview(category.imageUrl || '');
      setSortOrder(category.sortOrder ?? 1);
      setFeatured(Boolean(category.featured));
    } else {
      setNameAr('');
      setNameEn('');
      setSlug('');
      setEmoji('🍽️');
      setDescriptionAr('');
      setImageUrl('');
      setImagePreview('');
      setSortOrder(1);
      setFeatured(true);
    }
    setSelectedImageFile(null);
    setIsUploadingImage(false);
    setShowUrlInput(false);
    setIsDraggingOver(false);
    setError(null);
  }, [category, isOpen]);

  // Handle image file selection from device
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 15 ميجابايت.');
      return;
    }

    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
    setImageUrl(objectUrl);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setImagePreview('');
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectPreset = (url: string) => {
    setSelectedImageFile(null);
    setImagePreview(url);
    setImageUrl(url);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Auto-generate slug if creating new and slug hasn't been custom typed
  const handleNameArChange = (value: string) => {
    setNameAr(value);
    if (!isEditing && (!slug || slug.startsWith('cat-'))) {
      const autoSlug = value
        .trim()
        .toLowerCase()
        .replace(/[\s\t]+/g, '-')
        .replace(/[^\u0600-\u06FFa-zA-Z0-9_-]/g, '');
      if (autoSlug) {
        setSlug(autoSlug);
      }
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) {
      setError('يرجى إدخال اسم القسم بالعربية.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const generatedSlug =
        slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') ||
        `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      let finalImageUrl = imageUrl.trim();

      // If user uploaded an image from device, upload it now
      if (selectedImageFile) {
        setIsUploadingImage(true);
        try {
          const targetId = category?.id || generatedSlug;
          finalImageUrl = await firebaseStorageService.uploadCategoryImage(selectedImageFile, targetId);
        } catch (uploadErr: any) {
          console.warn('⚠️ [CategoryModal] Upload warning, using local preview:', uploadErr);
          if (imagePreview && (imagePreview.startsWith('data:') || imagePreview.startsWith('http'))) {
            finalImageUrl = imagePreview;
          }
        } finally {
          setIsUploadingImage(false);
        }
      } else if (!imagePreview) {
        finalImageUrl = '';
      }

      const categoryPayload: Omit<Category, 'id'> = {
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || nameAr.trim(),
        slug: generatedSlug,
        emoji: emoji.trim() || '🍽️',
        descriptionAr: descriptionAr.trim() || `استمتع بجميع أصناف ${nameAr.trim()} في حلواني ومطعم بامبورينا.`,
        descriptionEn: descriptionAr.trim() || '',
        imageUrl: finalImageUrl || undefined,
        sortOrder: Number(sortOrder) || 1,
        featured,
      };

      if (isEditing && category) {
        await firebaseCategoryService.updateCategory(category.id, categoryPayload);
        onSaved({
          ...category,
          ...categoryPayload,
          id: category.id,
        });
      } else {
        const newId = await firebaseCategoryService.createCategory(categoryPayload, generatedSlug);
        onSaved({
          ...categoryPayload,
          id: newId,
        });
      }

      onClose();
    } catch (err: any) {
      console.warn('⚠️ [CategoryModal] Save warning:', err);
      // Fallback save locally so user is never blocked
      const fallbackId = slug.trim() || `cat_${Date.now()}`;
      onSaved({
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || nameAr.trim(),
        slug: fallbackId,
        emoji: emoji.trim() || '🍽️',
        descriptionAr: descriptionAr.trim(),
        descriptionEn: descriptionAr.trim(),
        imageUrl: imagePreview || imageUrl.trim() || undefined,
        sortOrder: Number(sortOrder) || 1,
        featured,
        id: isEditing && category ? category.id : fallbackId,
      });
      onClose();
    } finally {
      setLoading(false);
      setIsUploadingImage(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Sticky Header */}
        <div className="px-5 py-4 bg-neutral-900/95 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base sm:text-lg">
                {isEditing ? `تعديل قسم (${category?.nameAr})` : 'إضافة قسم / تصنيف جديد'}
              </h3>
              <p className="text-xs text-neutral-400">تنظيم قائمة المأكولات والحلويات في المنيو</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading || isUploadingImage}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="category-modal-form" onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Name and Emoji */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4">
            <div className="sm:col-span-7">
              <label className="block text-xs text-neutral-300 mb-1.5 font-bold">
                اسم القسم بالعربية <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => handleNameArChange(e.target.value)}
                placeholder="مثال: ركن الطواجن، كريب حلو، كحك العيد..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs text-neutral-300 mb-1.5 font-bold">
                الرمز التعبيري (Emoji)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="🍰"
                  maxLength={4}
                  className="w-14 h-10 rounded-xl bg-neutral-950 border border-neutral-800 text-center text-xl text-white focus:outline-none focus:border-amber-500 shrink-0"
                />
                <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800 h-10">
                  {POPULAR_EMOJIS.map((em) => (
                    <button
                      type="button"
                      key={em}
                      onClick={() => setEmoji(em)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center hover:bg-neutral-800 shrink-0 transition-colors ${
                        emoji === em ? 'bg-amber-500/25 border border-amber-500/60 shadow-sm' : ''
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Slug and Sort Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-bold">
                المعرّف الإنجليزي / Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="kahk-el-eid"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 font-mono transition-colors"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-bold">
                ترتيب الظهور (Sort Order)
              </label>
              <input
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 3: Description */}
          <div>
            <label className="block text-xs text-neutral-300 mb-1.5 font-bold">
              وصف القسم
            </label>
            <textarea
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              placeholder="تشكيلة مميزة وطازجة من أشهى الأصناف..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 resize-none transition-colors"
            />
          </div>

          {/* CATEGORY THUMBNAIL UPLOAD */}
          <div className="space-y-3 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>صورة مصغرة للقسم (Thumbnail)</span>
              </label>
              <span className="text-[11px] text-amber-400/90 font-medium">
                تظهر للعملاء في بطاقة القسم وتصفح المنيو
              </span>
            </div>

            {/* Hidden native input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
            />

            {/* Image Preview Box */}
            {imagePreview ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl bg-neutral-900 border border-amber-500/40">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-neutral-950 shrink-0 shadow-lg group">
                  <img
                    src={imagePreview}
                    alt="معاينة الصورة المصغرة"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = Images.defaultFood;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold bg-black/70 px-2 py-1 rounded-md">معاينة</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-right w-full sm:w-auto">
                  <div>
                    <p className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{selectedImageFile ? 'صورة مختارة من جهازك' : 'الصورة المصغرة المعتمدة'}</span>
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {selectedImageFile
                        ? `${selectedImageFile.name} (${(selectedImageFile.size / 1024).toFixed(0)} KB)`
                        : 'يتم استخدام هذه الصورة المصغرة لتمثيل القسم في المتجر وقائمة الطعام'}
                    </p>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-neutral-700 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>تغيير الصورة من الجهاز</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>إزالة الصورة</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Dropzone Upload Button */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-2.5 cursor-pointer select-none ${
                  isDraggingOver
                    ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                    : 'border-neutral-700 hover:border-amber-500/60 bg-neutral-900/60 hover:bg-neutral-900'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">
                    انقر لاختيار صورة مصغرة من جهازك (موبايل / كمبيوتر)
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    أو اسحب ملف الصورة وأفلته هنا (JPG, PNG, WEBP)
                  </p>
                </div>
                <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-black text-xs shadow-md mt-1 hover:brightness-105 active:scale-95 transition-all">
                  رفع صورة من الجهاز
                </span>
              </div>
            )}

            {/* Preset Suggestions & URL Link */}
            <div className="pt-2.5 border-t border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>أو اختر صورة مصغرة جاهزة من المقترحات:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Link2 className="w-3 h-3" />
                  <span>{showUrlInput ? 'إخفاء خانة الرابط' : 'كتابة رابط صورة (URL)'}</span>
                </button>
              </div>

              {/* Presets Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                {PRESET_THUMBNAILS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                      imagePreview === preset.url
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-5 h-5 rounded-md object-cover"
                      loading="lazy"
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>

              {/* Optional URL Input */}
              {showUrlInput && (
                <div className="mt-2 pt-2 border-t border-neutral-800 space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-400">رابط صورة خارجي (Image URL)</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value);
                      setSelectedImageFile(null);
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500"
                    dir="ltr"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Featured Toggle Switch */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">إبراز القسم في الصفحة الرئيسية</span>
              <span className="text-[11px] text-neutral-400">
                {featured ? 'يظهر القسم في الواجهة الرئيسية ضمن الأقسام المميزة' : 'يظهر القسم في صفحة المنيو فقط'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFeatured(!featured)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                featured ? 'bg-amber-500' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  featured ? 'translate-x-0' : '-translate-x-5'
                }`}
              />
            </button>
          </div>
        </form>

        {/* Sticky Modal Footer */}
        <div className="px-5 py-4 border-t border-neutral-800 bg-neutral-900/95 flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading || isUploadingImage}
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs sm:text-sm rounded-xl px-4 py-2.5"
          >
            إلغاء
          </Button>

          <Button
            type="submit"
            form="category-modal-form"
            disabled={loading || isUploadingImage}
            className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black px-6 py-2.5 rounded-xl cursor-pointer text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            {loading || isUploadingImage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isUploadingImage ? 'جاري رفع الصورة...' : 'جاري الحفظ...'}</span>
              </>
            ) : (
              <span>{isEditing ? 'حفظ تعديلات القسم' : 'إضافة القسم الآن'}</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
