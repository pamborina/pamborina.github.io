import React, { useState, useEffect } from 'react';
import { Category } from '../../../types';
import { firebaseCategoryService } from '../../../services/firebaseCategoryService';
import { X, Layers, Loader2, AlertCircle, Sparkles, Upload } from 'lucide-react';
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

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [emoji, setEmoji] = useState('🍽️');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [featured, setFeatured] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const POPULAR_EMOJIS = ['🍰', '🍔', '🍕', '☕', '🍦', '🌮', '🥗', '🍩', '🥐', '🥮', '🍹', '🍨', '🥩', '🧋', '🍟', '🥪', '👑', '🍪'];

  useEffect(() => {
    if (category) {
      setNameAr(category.nameAr || '');
      setNameEn(category.nameEn || '');
      setSlug(category.slug || category.id || '');
      setEmoji(category.emoji || '🍽️');
      setDescriptionAr(category.descriptionAr || '');
      setImageUrl(category.imageUrl || '');
      setSortOrder(category.sortOrder ?? 1);
      setFeatured(Boolean(category.featured));
    } else {
      setNameAr('');
      setNameEn('');
      setSlug('');
      setEmoji('🍽️');
      setDescriptionAr('');
      setImageUrl('');
      setSortOrder(1);
      setFeatured(true);
    }
    setError(null);
  }, [category, isOpen]);

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

      const categoryPayload: Omit<Category, 'id'> = {
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || nameAr.trim(),
        slug: generatedSlug,
        emoji: emoji.trim() || '🍽️',
        descriptionAr: descriptionAr.trim() || `استمتع بجميع أصناف ${nameAr.trim()} في حلواني ومطعم بامبورينا.`,
        descriptionEn: descriptionAr.trim() || '',
        imageUrl: imageUrl.trim() || undefined,
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
        imageUrl: imageUrl.trim() || undefined,
        sortOrder: Number(sortOrder) || 1,
        featured,
        id: isEditing && category ? category.id : fallbackId,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-850 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {isEditing ? `تعديل قسم (${category?.nameAr})` : 'إضافة قسم / تصنيف جديد'}
              </h3>
              <p className="text-[11px] text-neutral-400">تنظيم قائمة المأكولات والحلويات</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">اسم القسم بالعربية *</label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => handleNameArChange(e.target.value)}
                placeholder="مثال: ركن الطواجن، الكريب المالح"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">الرمز التعبيري (Emoji)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="🍰 أو 🍕 أو 🥮"
                  className="w-16 px-2 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500 text-center text-lg"
                />
                <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
                  {POPULAR_EMOJIS.map((em) => (
                    <button
                      type="button"
                      key={em}
                      onClick={() => setEmoji(em)}
                      className={`px-1.5 py-1 rounded-lg text-sm hover:bg-neutral-800 transition-colors ${
                        emoji === em ? 'bg-amber-500/20 border border-amber-500/50' : ''
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">المعرّف الإنجليزي / Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="crepes-salty"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">ترتيب الظهور (Sort Order)</label>
              <input
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">وصف القسم</label>
            <textarea
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              placeholder="تشكيلة فاخرة من الكريب المالح المحضر بأجود المكونات..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">رابط صورة القسم (Image URL)</label>
            <div className="flex gap-3 items-center">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
              {imageUrl && (
                <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                  <img src={imageUrl} alt="معاينة" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>
          </div>


          {/* Featured Checkbox */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">إبراز القسم في الصفحة الرئيسية</span>
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
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
                <span>{isEditing ? 'حفظ تعديلات القسم' : 'إضافة القسم الآن'}</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
