import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, BookOpen, UtensilsCrossed, Cake, Gift, Heart, Upload, Check, RefreshCw, AlertTriangle, FileText, Download, Edit2, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { SyncDiffResult } from '../../services/menuSyncService';
import { ocrService, ExtractedOcrItem, OcrParseResponse } from '../../services/ocrService';
import { useToast } from '../ui/Toast';
import { Images } from '../../data/images';
import { ImageMagnifier } from '../common/ImageMagnifier';
import { paperMenuService, DEFAULT_PAPER_MENU_PAGES } from '../../services/paperMenuService';
import { PaperMenuPage } from '../../types';

interface PaperMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMenuUpdated?: () => void;
}

export const PaperMenuModal: React.FC<PaperMenuModalProps> = ({ isOpen, onClose, onMenuUpdated }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'view' | 'sync'>('view');
  const [menuPages, setMenuPages] = useState<PaperMenuPage[]>(DEFAULT_PAPER_MENU_PAGES);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrParseResponse | null>(null);
  const [editableItems, setEditableItems] = useState<ExtractedOcrItem[]>([]);
  const [diffResult, setDiffResult] = useState<SyncDiffResult | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Subscribe to real-time paper menu updates from Firestore & Admin
  useEffect(() => {
    const unsub = paperMenuService.subscribeToMenuPages((pages) => {
      if (Array.isArray(pages)) {
        setMenuPages(pages);
        setActivePageIndex((prev) => {
          if (pages.length === 0) return 0;
          return prev >= pages.length ? Math.max(0, pages.length - 1) : prev;
        });
      }
    });
    return () => unsub();
  }, []);

  const currentPage = menuPages[activePageIndex] || menuPages[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedImageName(file.name);
    setIsProcessing(true);
    setDiffResult(null);

    try {
      const base64 = await ocrService.fileToBase64(file);
      const parseResult = await ocrService.parseMenuImage(base64, file.type || 'image/jpeg');

      setOcrResult(parseResult);
      setEditableItems(parseResult.items || []);
      setIsProcessing(false);

      if (parseResult.requiresManualConfirmation) {
        showToast(
          'مطلوب تأكيد يدوي لأصناف غير واضحة (نسبة الثقة أقل من 95%)',
          'تم تمييز الأصناف غير المقروءة بدقة لمراجعتها قبل الحفظ',
          'warning'
        );
      } else {
        showToast('تمت القراءة الضوئية بنجاح 100%', `تم استخراج ${parseResult.totalExtracted} صنف بنسبة ثقة عالية`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      showToast('خطأ في معالجة الصورة', err?.message || 'تعذر القراءة الضوئية', 'error');
    }
  };

  const handleItemChange = (index: number, field: keyof ExtractedOcrItem, value: any) => {
    const updated = [...editableItems];
    updated[index] = {
      ...updated[index],
      [field]: field === 'price' || field === 'confidenceScore' ? Number(value) || 0 : value,
    };

    // If edited, clear low confidence mark
    if (field === 'productName' || field === 'price') {
      updated[index].isLowConfidence = false;
      updated[index].confidenceScore = 100;
    }

    setEditableItems(updated);
  };

  const handleApplyOcrSync = () => {
    if (editableItems.length === 0) return;

    // Verify all low confidence items have been addressed
    const remainingLowConfidence = editableItems.filter((i) => i.isLowConfidence && i.confidenceScore < 95);
    if (remainingLowConfidence.length > 0) {
      showToast('يرجى تأكيد/تعديل الأصناف غير الواضحة أولاً', 'دقة البيانات أهم من السرعة', 'warning');
      return;
    }

    const diff = ocrService.applyOcrToDatabase(editableItems);
    setDiffResult(diff);
    showToast('تم تحديث قاعدة بيانات المنيو بنجاح', 'تم الإبقاء على الأكواد الثابتة وتعديل الأسعار والمنتجات', 'success');
    if (onMenuUpdated) onMenuUpdated();
  };

  const downloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(editableItems, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `pamborina_menu_ocr_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md dir-rtl overflow-hidden">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80"
          />

          {/* Container Card */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-[#160E09] border border-[#D4AF37]/40 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden z-10 text-[#FFF1C5]"
          >
            {/* Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-[#2C1F16] bg-[#120B07] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-[#221710] border border-[#3D2C1E] flex items-center justify-center text-[#C8BFB0] hover:text-[#FFF1C5] hover:border-[#D4AF37] transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#FFF1C5] font-heading flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#D4AF37]" />
                    <span>منيو بامبورينا المطبوع 📜</span>
                  </h3>
                  <p className="text-xs text-[#A89C8C] mt-0.5">
                    حلواني بامبورينا - طعم الفخامة في كل لقمة
                  </p>
                </div>
              </div>

              {/* Mode Indicator */}
              <div className="flex items-center gap-2 bg-[#1A120B] px-3 py-1.5 rounded-2xl border border-[#3D2C1E]">
                <span className="text-xs font-bold text-[#F4E08B]">
                  عرض القائمة المطبوعة الرسمية
                </span>
              </div>
            </div>

            {/* Content Body */}
            {activeTab === 'view' ? (
              menuPages.length === 0 || !currentPage ? (
                <div className="flex-1 p-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-[#221710] border border-[#3D2C1E] flex items-center justify-center text-[#D4AF37]">
                    <BookOpen className="w-8 h-8 opacity-60" />
                  </div>
                  <h4 className="text-base font-bold text-[#FFF1C5]">لا توجد صفحات منيو منشورة حالياً</h4>
                  <p className="text-xs text-[#A89C8C] max-w-sm">
                    يمكن للمسؤول إضافة صفحات جديدة أو استعادة الصفحات الأصلية عبر لوحة التحكم في أي وقت.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 text-center">
                  {/* Pages Selector Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-2xl mx-auto scrollbar-none justify-start sm:justify-center">
                  {menuPages.map((page, idx) => {
                    const isActive = activePageIndex === idx;
                    return (
                      <button
                        key={page.id || `page-${idx}`}
                        onClick={() => setActivePageIndex(idx)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black shadow-md font-black'
                            : 'bg-[#1A120B] text-[#C8BFB0] border border-[#3D2C1E] hover:text-[#FFF1C5]'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{page.titleAr}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Page Description & Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#1F150D] border border-[#2D2017]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F4E08B] text-right">
                    <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span>
                      {currentPage.titleAr}: <span className="text-[#C8BFB0] font-normal">{currentPage.subtitleAr || currentPage.descriptionAr || ''}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mr-auto">
                    <button
                      onClick={() => setIsZoomed(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#2D2017] border border-[#3D2C1E] text-xs font-bold text-[#FFF1C5] hover:text-[#D4AF37] flex items-center gap-1 cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>تكبير الصورة</span>
                    </button>
                  </div>
                </div>

                {/* Main Menu Page Image Display Container */}
                <div className="relative rounded-2xl border border-[#D4AF37]/40 bg-[#0E0805] overflow-hidden p-2 sm:p-3 shadow-2xl group">
                  <div className="w-full rounded-xl overflow-hidden relative flex flex-col items-center justify-center bg-[#150D08]">
                    <ImageMagnifier
                      src={currentPage.imageUrl}
                      alt={currentPage.titleAr}
                      defaultZoomLevel={2.5}
                      lensSize={210}
                      onOpenFullscreen={() => setIsZoomed(true)}
                    />

                    {/* Left & Right Page Navigation Arrows */}
                    <button
                      onClick={() => setActivePageIndex((prev) => (prev > 0 ? prev - 1 : menuPages.length - 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/80 border border-[#D4AF37]/70 text-[#F4E08B] flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition-all shadow-xl cursor-pointer z-30"
                      title="الصفحة السابقة"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>

                    <button
                      onClick={() => setActivePageIndex((prev) => (prev < menuPages.length - 1 ? prev + 1 : 0))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/80 border border-[#D4AF37]/70 text-[#F4E08B] flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition-all shadow-xl cursor-pointer z-30"
                      title="الصفحة التالية"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                  {/* Page indicator dots */}
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {menuPages.map((page, idx) => (
                      <button
                        key={`page-dot-${page.id || idx}`}
                        onClick={() => setActivePageIndex(idx)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          activePageIndex === idx ? 'w-6 bg-[#D4AF37]' : 'w-2 bg-[#3D2C1E] hover:bg-[#5D422E]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-right">
                <div className="p-4 rounded-2xl bg-[#1D140D] border border-[#3D2C1E] space-y-2">
                  <h4 className="text-sm font-black text-[#F4E08B] flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
                    <span>ماسح المنيو المباشر بالذكاء الاصطناعي (دقة 95%+)</span>
                  </h4>
                  <p className="text-xs text-[#C8BFB0] leading-relaxed">
                    يقرأ هذا النظام كافة صور المنيو المرفوعة بدقة متناهية، ويستخرج القسم واسم المنتج والسعر والوصف كـ JSON هيكلي.
                    <strong className="text-amber-400 block mt-1">
                      ⚠️ يتطلب النظام التأكيد اليدوي فوراً لأي كلمة أو سعر تقل نسبة الثقة فيها عن 95% تجنباً للتخمين.
                    </strong>
                  </p>
                </div>

                {/* Image Upload Area */}
                <div className="border-2 border-dashed border-[#3D2C1E] hover:border-[#D4AF37] rounded-3xl p-6 text-center bg-[#120B07] transition-all relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#221710] border border-[#3D2C1E] flex items-center justify-center text-[#D4AF37]">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-[#FFF1C5] block">
                        ارفع صورة المنيو الجديدة لقراءتها ضوئياً
                      </span>
                      <span className="text-xs text-[#8E8373] mt-1 block">
                        صورة واضحة بفرعك لضمان ثقة فوق 95%
                      </span>
                    </div>
                    {uploadedImageName && (
                      <span className="text-xs text-emerald-400 font-bold bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>الملف المرفوع: {uploadedImageName}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Processing State */}
                {isProcessing && (
                  <div className="p-6 rounded-2xl bg-[#18100A] border border-[#3D2C1E] text-center space-y-3">
                    <RefreshCw className="w-6 h-6 text-[#D4AF37] animate-spin mx-auto" />
                    <span className="text-xs font-bold text-[#F4E08B] block">
                      جاري المسح الضوئي واستخراج البيانات الهيكلية بنسبة ثقة 95%+...
                    </span>
                  </div>
                )}

                {/* OCR Items Table & Verification */}
                {editableItems.length > 0 && !isProcessing && (
                  <div className="space-y-4">
                    {/* Header bar */}
                    <div className="flex items-center justify-between bg-[#1A120B] p-3 rounded-2xl border border-[#3D2C1E]">
                      <div>
                        <span className="text-xs font-black text-[#F4E08B] block">
                          الأصناف المستخرجة من الصورة ({editableItems.length})
                        </span>
                        <span className="text-[11px] text-[#8E8373]">
                          ثقة عالية: {editableItems.filter((i) => !i.isLowConfidence).length} | يحتاج تأكيد: {editableItems.filter((i) => i.isLowConfidence).length}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowJsonPreview(!showJsonPreview)}
                          className="px-3 py-1.5 rounded-xl bg-[#271B11] border border-[#3D2C1E] text-xs font-bold text-[#FFF1C5] hover:text-[#D4AF37] flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>{showJsonPreview ? 'إخفاء JSON' : 'معاينة JSON'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={downloadJson}
                          className="px-3 py-1.5 rounded-xl bg-[#271B11] border border-[#3D2C1E] text-xs font-bold text-[#FFF1C5] hover:text-[#D4AF37] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>تصدير JSON</span>
                        </button>
                      </div>
                    </div>

                    {/* Low confidence banner */}
                    {editableItems.some((i) => i.isLowConfidence) && (
                      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-xs font-bold block">تأكيد يدوي مطلوب للأصناف المظللة بالأصفر!</strong>
                          <p className="text-[11px] text-amber-300/80 mt-0.5">
                            تم اكتشاف أصناف تقل درجة ثقتها الضوئية عن 95% (مثلاً بسبب عدم وضوح السعر أو الاسم). يرجى التأكد من الاسم والسعر واختيار التأكيد.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* JSON Preview */}
                    {showJsonPreview && (
                      <div className="p-4 rounded-2xl bg-[#0B0704] border border-[#2D2017] dir-ltr text-xs text-amber-200 font-mono overflow-x-auto max-h-48">
                        <pre>{JSON.stringify(editableItems, null, 2)}</pre>
                      </div>
                    )}

                    {/* Table of items */}
                    <div className="space-y-2 max-h-80 overflow-y-auto pl-1">
                      {editableItems.map((item, idx) => (
                        <div
                          key={`ocr-item-${item.productName}-${idx}`}
                          className={`p-3 rounded-2xl border transition-all text-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
                            item.isLowConfidence
                              ? 'bg-amber-950/30 border-amber-500/50'
                              : 'bg-[#18100A] border-[#2C1F16]'
                          }`}
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-[#281C12] text-[10px] font-bold text-[#D4AF37]">
                                {item.category}
                              </span>
                              {item.isLowConfidence ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-black border border-amber-500/30">
                                  ثقة {item.confidenceScore}% (تأكيد يدوي)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                  ثقة {item.confidenceScore}% ✓
                                </span>
                              )}
                            </div>

                            {/* Editable product name */}
                            <div className="flex items-center gap-2">
                              <Edit2 className="w-3.5 h-3.5 text-[#8E8373]" />
                              <input
                                type="text"
                                value={item.productName}
                                onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                                className="bg-[#22160E] border border-[#3D2C1E] focus:border-[#D4AF37] text-[#FFF1C5] text-xs font-bold rounded-lg px-2.5 py-1 w-full"
                              />
                            </div>

                            {item.unreadableReason && (
                              <span className="text-[10px] text-amber-400/90 block">
                                السبب: {item.unreadableReason}
                              </span>
                            )}
                          </div>

                          {/* Editable price */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-[#A89C8C]">السعر:</span>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                              className="bg-[#22160E] border border-[#3D2C1E] focus:border-[#D4AF37] text-emerald-400 font-bold text-xs rounded-lg px-2.5 py-1 w-24 text-center"
                            />
                            <span className="text-xs text-[#FFF1C5] font-bold">ج.م</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Sync Action Button */}
                    <button
                      type="button"
                      onClick={handleApplyOcrSync}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black font-black text-xs shadow-lg hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>اعتماد المنيو المستخرج وتحديث قاعدة البيانات بالأسعار المستقرة</span>
                    </button>
                  </div>
                )}

                {/* Diff Result Summary */}
                {diffResult && (
                  <div className="p-5 rounded-3xl bg-[#140E0A] border border-[#D4AF37]/40 space-y-4">
                    <h5 className="text-xs font-black text-[#D4AF37] flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>تقرير تحديث المنيو الأصلي</span>
                    </h5>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 rounded-2xl bg-[#1C140D] border border-[#2D2017]">
                        <span className="text-[10px] text-[#8E8373] block">أكواد ثابتة مستقرة</span>
                        <span className="text-sm font-black text-emerald-400">{diffResult.unchangedCount + diffResult.updated.length} منتج</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#1C140D] border border-[#2D2017]">
                        <span className="text-[10px] text-[#8E8373] block">منتجات مضافة</span>
                        <span className="text-sm font-black text-amber-400">{diffResult.added.length}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#1C140D] border border-[#2D2017]">
                        <span className="text-[10px] text-[#8E8373] block">أسعار معدلة</span>
                        <span className="text-sm font-black text-blue-400">{diffResult.updated.length}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#1C140D] border border-[#2D2017]">
                        <span className="text-[10px] text-[#8E8373] block">منتجات محذوفة</span>
                        <span className="text-sm font-black text-rose-400">{diffResult.removed.length}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="shrink-0 p-4 border-t border-[#2C1F16] bg-[#120B07] flex items-center justify-between gap-2">
              <span className="text-xs text-[#8E8373] hidden sm:inline">
                للحجز والاستفسار: <strong className="text-[#F4E08B] dir-ltr inline-block">01062996114 / 01112624108 / 01123910303</strong>
              </span>

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black font-black text-xs shadow-md hover:brightness-110 transition-all cursor-pointer mr-auto"
              >
                تصفح المنتجات والتسوق المباشر 🛒
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Fullscreen Zoom Modal */}
      {isZoomed && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6 bg-black/95 backdrop-blur-xl dir-rtl">
          <div className="relative w-full h-full max-w-5xl flex flex-col items-center justify-center">
            {/* Header / Close button */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-3 bg-black/80 p-2 rounded-2xl border border-[#3D2C1E]">
              <button
                onClick={() => setIsZoomed(false)}
                className="w-10 h-10 rounded-full bg-[#2A1D13] border border-[#3D2C1E] flex items-center justify-center text-[#FFF1C5] hover:text-[#D4AF37] cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
              <span className="text-xs font-bold text-[#F4E08B] px-2">
                {currentPage.titleAr}
              </span>
            </div>

            {/* High-Res Full Image with Interactive Lens */}
            <div className="w-full h-full overflow-hidden flex flex-col items-center justify-center p-2 pt-12">
              <ImageMagnifier
                src={currentPage.imageUrl}
                alt={currentPage.titleAr}
                defaultZoomLevel={3.0}
                lensSize={260}
              />
            </div>

            {/* Zoom Nav Controls */}
            <button
              onClick={() => setActivePageIndex((prev) => (prev > 0 ? prev - 1 : menuPages.length - 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/80 border border-[#D4AF37] text-[#F4E08B] flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition-all shadow-2xl cursor-pointer"
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            <button
              onClick={() => setActivePageIndex((prev) => (prev < menuPages.length - 1 ? prev + 1 : 0))}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/80 border border-[#D4AF37] text-[#F4E08B] flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition-all shadow-2xl cursor-pointer"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
