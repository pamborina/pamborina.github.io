import React, { useState, useEffect, useRef } from 'react';
import { PaperMenuPage } from '../../../types';
import { paperMenuService, DEFAULT_PAPER_MENU_PAGES } from '../../../services/paperMenuService';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  MoveUp,
  MoveDown,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  ZoomIn,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  Sparkles,
  Layers,
  X,
  FileImage,
  Link2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPaperMenuTabProps {
  onPreviewCustomerMenu?: () => void;
}

export const AdminPaperMenuTab: React.FC<AdminPaperMenuTabProps> = ({ onPreviewCustomerMenu }) => {
  const [pages, setPages] = useState<PaperMenuPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PaperMenuPage | null>(null);
  const [pageToDelete, setPageToDelete] = useState<PaperMenuPage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [formTitleAr, setFormTitleAr] = useState('');
  const [formSubtitleAr, setFormSubtitleAr] = useState('');
  const [formDescriptionAr, setFormDescriptionAr] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formPageNumber, setFormPageNumber] = useState<number>(1);
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image zoom modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Auto clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Subscribe to real-time menu pages
  useEffect(() => {
    setIsLoading(true);
    const unsub = paperMenuService.subscribeToMenuPages(
      (livePages) => {
        if (livePages && livePages.length > 0) {
          setPages(livePages);
        } else {
          setPages(DEFAULT_PAPER_MENU_PAGES);
        }
        setIsLoading(false);
      },
      (err) => {
        console.warn('⚠️ [AdminPaperMenuTab] Notice on paper menu live sync:', err?.message || err);
        setPages((prev) => (prev.length > 0 ? prev : DEFAULT_PAPER_MENU_PAGES));
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Open modal for Adding
  const handleOpenAdd = () => {
    setEditingPage(null);
    const nextNum = pages.length + 1;
    setFormTitleAr(`صفحة رقم ${nextNum}`);
    setFormSubtitleAr(`حلواني بامبورينا - قائمة المنيو المطبوع الرسمية (صفحة ${nextNum})`);
    setFormDescriptionAr('');
    setFormImageUrl('');
    setFormPageNumber(nextNum);
    setFormImageFile(null);
    setImagePreviewUrl('');
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEdit = (page: PaperMenuPage) => {
    setEditingPage(page);
    setFormTitleAr(page.titleAr);
    setFormSubtitleAr(page.subtitleAr || '');
    setFormDescriptionAr(page.descriptionAr || '');
    setFormImageUrl(page.imageUrl);
    setFormPageNumber(page.pageNumber);
    setFormImageFile(null);
    setImagePreviewUrl(page.imageUrl);
    setIsModalOpen(true);
  };

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form submit
  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitleAr.trim()) {
      setToastMessage({ type: 'error', text: 'يرجى كتابة عنوان الصفحة.' });
      return;
    }

    if (!formImageUrl.trim() && !formImageFile && !imagePreviewUrl) {
      setToastMessage({ type: 'error', text: 'يرجى رفع صورة للمنيو أو وضع رابط الصورة.' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingPage) {
        // Update
        const updated = await paperMenuService.updateMenuPage(
          editingPage.id,
          {
            titleAr: formTitleAr.trim(),
            subtitleAr: formSubtitleAr.trim(),
            descriptionAr: formDescriptionAr.trim(),
            imageUrl: formImageUrl.trim() || imagePreviewUrl || editingPage.imageUrl,
            pageNumber: Number(formPageNumber) || editingPage.pageNumber,
          },
          formImageFile || undefined
        );

        setToastMessage({
          type: 'success',
          text: `✅ تم تحديث "${updated.titleAr}" بنجاح وانعكست فوراً على خانة المنيو المطبوع!`,
        });
      } else {
        // Create
        const created = await paperMenuService.addMenuPage(
          {
            titleAr: formTitleAr.trim(),
            subtitleAr: formSubtitleAr.trim(),
            descriptionAr: formDescriptionAr.trim(),
            imageUrl: formImageUrl.trim() || imagePreviewUrl,
            pageNumber: Number(formPageNumber) || pages.length + 1,
            sortOrder: pages.length + 1,
            isActive: true,
          },
          formImageFile || undefined
        );

        setToastMessage({
          type: 'success',
          text: `✅ تم بنجاح إضافة صفحة المنيو "${created.titleAr}" وتظهر الآن في المنيو الورقي!`,
        });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving paper menu page:', err);
      setToastMessage({
        type: 'error',
        text: `فشل حفظ صفحة المنيو: ${err?.message || 'يرجى المحاولة ثانية'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleDeletePage = (page: PaperMenuPage) => {
    setPageToDelete(page);
  };

  // Perform Immediate Deletion with Instant Optimistic UI Update and Realtime Sync
  const handleConfirmDelete = async (page: PaperMenuPage) => {
    setIsDeleting(true);
    // Optimistic UI update: Remove instantly from local state (0ms latency)
    setPages((prev) => prev.filter((p) => p.id !== page.id));
    setPageToDelete(null);
    if (editingPage && editingPage.id === page.id) {
      setIsModalOpen(false);
      setEditingPage(null);
    }

    setToastMessage({
      type: 'success',
      text: `🗑️ تم حذف (${page.titleAr}) فوراً وتحديث واجهة المتجر لحظياً!`,
    });

    try {
      await paperMenuService.deleteMenuPage(page.id);
    } catch (err: any) {
      console.error('Delete error:', err);
      setToastMessage({
        type: 'error',
        text: `فشل حذف الصفحة من السحابة: ${err?.message || 'يرجى المحاولة ثانية'}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Move page up
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newPages = [...pages];
    const temp = newPages[index - 1];
    newPages[index - 1] = newPages[index];
    newPages[index] = temp;
    setPages(newPages);
    try {
      await paperMenuService.reorderMenuPages(newPages);
      setToastMessage({ type: 'success', text: 'تم تحديث ترتيب صفحات المنيو بنجاح.' });
    } catch (err) {
      console.error(err);
    }
  };

  // Move page down
  const handleMoveDown = async (index: number) => {
    if (index === pages.length - 1) return;
    const newPages = [...pages];
    const temp = newPages[index + 1];
    newPages[index + 1] = newPages[index];
    newPages[index] = temp;
    setPages(newPages);
    try {
      await paperMenuService.reorderMenuPages(newPages);
      setToastMessage({ type: 'success', text: 'تم تحديث ترتيب صفحات المنيو بنجاح.' });
    } catch (err) {
      console.error(err);
    }
  };

  // Reset to default 7 pages
  const handleResetToDefaults = async () => {
    if (
      !window.confirm(
        'هل تريد استعادة صفحات المنيو المطبوع الرسمية الـ 7 الأصلية لبامبورينا؟ سيتم ضبط الصور والتسميات القياسية.'
      )
    ) {
      return;
    }

    setIsSaving(true);
    try {
      const reset = await paperMenuService.resetToDefaultMenuPages();
      setPages(reset);
      setToastMessage({
        type: 'success',
        text: '✅ تم استعادة الـ 7 صفحات الأصلية لمنيو بامبورينا المطبوع بنجاح!',
      });
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: `فشل الاستعادة: ${err?.message || 'يرجى المحاولة ثانية'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-2xl transition-all duration-300 animate-fade-in ${
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

      {/* Top Header Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>إدارة صور المنيو الورقي المطبوع الأصلي 📜</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                {pages.length} صفحات
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              تحكم كامل في رفع صور المنيو المطبوع، تعديلها، وإعادة ترتيبها. أي تعديل ينعكس مباشرة وفورياً على خانة المنيو الورقي بالموقع للعملاء.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onPreviewCustomerMenu && (
            <button
              type="button"
              onClick={onPreviewCustomerMenu}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>معاينة كما يراها العميل</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetToDefaults}
            disabled={isSaving}
            className="px-3.5 py-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700/80 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="استعادة الـ 7 صفحات الأصلية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">استعادة الأصل</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 border border-amber-400"
          >
            <Plus className="w-4 h-4 text-neutral-950" />
            <span>إضافة صفحة منيو جديدة</span>
          </button>
        </div>
      </div>

      {/* Pages Grid */}
      {isLoading ? (
        <div className="p-12 rounded-3xl bg-neutral-900 border border-neutral-800 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <span className="text-sm font-bold text-neutral-300">جاري تحميل صفحات المنيو المطبوع...</span>
        </div>
      ) : pages.length === 0 ? (
        <div className="p-12 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-neutral-800 border border-neutral-700 flex items-center justify-center mx-auto text-neutral-500">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">لا توجد صفحات منيو مضافة حالياً</h3>
            <p className="text-xs text-neutral-400">
              يمكنك إضافة أول صفحة منيو مطبوعة الآن أو استعادة الصفحات الـ 7 القياسية
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-2 cursor-pointer hover:bg-amber-400"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صفحة</span>
            </button>
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-200 font-bold text-xs flex items-center gap-2 cursor-pointer hover:bg-neutral-700 border border-neutral-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>استعادة الأصل (7 صفحات)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pages.map((page, index) => (
            <div
              key={page.id}
              className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-lg hover:border-amber-500/40 transition-all flex flex-col group"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-[3/4] bg-neutral-950 overflow-hidden border-b border-neutral-800">
                <img
                  src={page.imageUrl}
                  alt={page.titleAr}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=600&q=80';
                  }}
                />

                {/* Page Number Pill */}
                <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-amber-500/60 text-amber-300 font-black text-xs shadow-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>صفحة {index + 1}</span>
                </div>

                {/* Overlay Action Buttons */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3 backdrop-blur-[2px]">
                  <button
                    type="button"
                    onClick={() => setPreviewImage({ url: page.imageUrl, title: page.titleAr })}
                    className="p-2.5 rounded-xl bg-black/80 text-white hover:text-amber-400 hover:bg-black transition-colors border border-neutral-700 shadow-xl cursor-pointer"
                    title="تكبير الصورة"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(page)}
                    className="p-2.5 rounded-xl bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors shadow-xl cursor-pointer font-bold"
                    title="تعديل وتغيير الصورة"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Card Meta & Details */}
              <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                      {page.titleAr}
                    </h4>
                    <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                      ترتيب #{index + 1}
                    </span>
                  </div>
                  {page.descriptionAr && (
                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                      {page.descriptionAr}
                    </p>
                  )}
                  {page.subtitleAr && !page.descriptionAr && (
                    <p className="text-[11px] text-neutral-500 line-clamp-1">
                      {page.subtitleAr}
                    </p>
                  )}
                </div>

                {/* Action Bar */}
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-1">
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white disabled:opacity-30 disabled:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="تقديم لأعلى"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === pages.length - 1}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white disabled:opacity-30 disabled:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="تأخير لأسفل"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Edit & Delete Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(page)}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>تعديل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePage(page)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                      title="حذف الصفحة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm dir-rtl overflow-y-auto">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              className="relative w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl overflow-hidden my-6"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {editingPage ? 'تعديل صفحة المنيو المطبوع' : 'إضافة صفحة منيو مطبوع جديدة'}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      تنعكس التعديلات فوراً على شاشة المنيو الورقي في المتجر
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSavePage} className="p-4 sm:p-6 space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-200">
                    عنوان الصفحة <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitleAr}
                    onChange={(e) => setFormTitleAr(e.target.value)}
                    placeholder="مثال: صفحة رقم 1 - قائمة الحادق والساندوتشات"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                {/* Subtitle / Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-200">
                      الوصف الفرعي (اختياري)
                    </label>
                    <input
                      type="text"
                      value={formSubtitleAr}
                      onChange={(e) => setFormSubtitleAr(e.target.value)}
                      placeholder="مثال: قائمة المنيو المطبوع الرسمية"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-200">
                      رقم الصفحة في الترتيب
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={formPageNumber}
                      onChange={(e) => setFormPageNumber(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Notes / Content summary */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-200">
                    محتوى الصفحة / الأصناف المعروضة (اختياري)
                  </label>
                  <input
                    type="text"
                    value={formDescriptionAr}
                    onChange={(e) => setFormDescriptionAr(e.target.value)}
                    placeholder="مثال: الكريب، الساندوتشات، الفطائر، البرجر..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                {/* Image Upload / URL Section */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <label className="block text-xs font-bold text-neutral-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <span>صورة صفحة المنيو</span>
                    </span>
                    <span className="text-[11px] text-amber-400/80 font-normal">
                      (يمكنك رفع ملف صورة مباشرة أو وضع رابط)
                    </span>
                  </label>

                  {/* File Upload Box */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-700 hover:border-amber-400/60 rounded-xl p-4 text-center cursor-pointer transition-all bg-neutral-900/50 hover:bg-neutral-900 flex flex-col items-center justify-center gap-2 group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        اضغط لرفع صورة من جهازك (PNG, JPG, WebP)
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        تلقائياً تتم معالجة وضغط الصورة لتكون سريعة وفائقة الوضوح
                      </span>
                    </div>
                  </div>

                  {/* Direct Image URL input */}
                  <div className="space-y-1">
                    <label className="block text-[11px] text-neutral-400">
                      أو أدخل رابط الصورة المباشر (Image URL):
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={formImageUrl}
                        onChange={(e) => {
                          setFormImageUrl(e.target.value);
                          if (e.target.value) {
                            setImagePreviewUrl(e.target.value);
                            setFormImageFile(null);
                          }
                        }}
                        placeholder="https://i.postimg.cc/..."
                        className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 font-mono"
                        dir="ltr"
                      />
                      <Link2 className="w-4 h-4 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Image Preview */}
                  {imagePreviewUrl && (
                    <div className="pt-2 border-t border-neutral-800 flex items-center gap-3">
                      <div className="w-16 h-20 rounded-lg bg-black border border-neutral-700 overflow-hidden shrink-0">
                        <img
                          src={imagePreviewUrl}
                          alt="معاينة"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs space-y-1">
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تم اختيار الصورة بنجاح</span>
                        </span>
                        <span className="text-[10px] text-neutral-400 block truncate max-w-[280px]">
                          {formImageFile ? `الملف المرفوع: ${formImageFile.name}` : 'رابط مباشر'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2.5">
                  {editingPage ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleDeletePage(editingPage);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف هذه الصفحة</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50 border border-amber-400"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                          <span>جاري الحفظ والتطبيق...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-neutral-950" />
                          <span>{editingPage ? 'حفظ التعديلات' : 'إضافة الصفحة'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instant Delete Confirmation Modal */}
      <AnimatePresence>
        {pageToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm dir-rtl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-neutral-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">تأكيد حذف صفحة المنيو</h3>
                  <p className="text-xs text-neutral-400">سيتم الحذف فوراً والتحديث المباشر للمتجر</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                <div className="w-12 h-16 rounded-lg bg-neutral-900 overflow-hidden shrink-0 border border-neutral-800">
                  <img
                    src={pageToDelete.imageUrl}
                    alt={pageToDelete.titleAr}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-white">{pageToDelete.titleAr}</p>
                  <p className="text-neutral-400 text-[11px] line-clamp-1">{pageToDelete.subtitleAr || pageToDelete.descriptionAr}</p>
                  <span className="text-[10px] text-amber-400 font-mono">ترتيب #{pageToDelete.pageNumber}</span>
                </div>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                هل أنت متأكد من حذف هذه الصفحة نهائياً؟ ستختفي الصفحة فوراً من عارض المنيو المطبوع على موقع المتجر.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPageToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleConfirmDelete(pageToDelete)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 text-white" />
                      <span>حذف فوري الآن</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Fullscreen Modal */}
      <AnimatePresence>
        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 left-0 p-1.5 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-amber-500/40 shadow-2xl"
              />
              <span className="text-sm font-bold text-amber-300 mt-2">{previewImage.title}</span>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
