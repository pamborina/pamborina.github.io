import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  FileSpreadsheet,
  Receipt,
  CheckCircle2,
  Sparkles,
  Download,
} from 'lucide-react';
import { PrintLayoutSize } from '../../../services/pdfReportGenerator';

export interface PrintSizeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  reportSubtitle?: string;
  periodLabel?: string;
  recordCount?: number;
  defaultLayout?: PrintLayoutSize;
  onPrint?: (layout: PrintLayoutSize, mode: 'print' | 'pdf') => void;
  onConfirmPrint?: (layout: PrintLayoutSize, mode?: 'print' | 'pdf') => void;
  onExportCsv?: () => void;
}

interface SizeOption {
  id: PrintLayoutSize;
  name: string;
  type: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  widthLabel: string;
  description: string;
  recommendedFor: string;
}

export const PrintSizeSelectorModal: React.FC<PrintSizeSelectorModalProps> = ({
  isOpen,
  onClose,
  reportTitle,
  reportSubtitle,
  periodLabel,
  recordCount,
  defaultLayout = '58',
  onPrint,
  onConfirmPrint,
  onExportCsv,
}) => {
  const [selectedLayout, setSelectedLayout] = useState<PrintLayoutSize>(() => {
    try {
      return (localStorage.getItem('pamborina_preferred_print_size') as PrintLayoutSize) || '58';
    } catch {
      return '58';
    }
  });

  if (!isOpen) return null;

  const sizeOptions: SizeOption[] = [
    {
      id: '58',
      name: 'طابعة ريسيت 58 مم (الافتراضي والمعتمد)',
      type: '58mm Thermal POS Roll',
      badge: 'المعيار المعتمد للنظام (58mm Standard)',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: <Receipt className="w-5 h-5 text-emerald-400" />,
      widthLabel: '58mm Roll (عرض 5.8 سم)',
      description: 'المقاس القياسي المعتمد لجميع بونات الفواتير، كشوفات الحساب، وتقارير المبيعات، ومصمم بتباين أسود خالص لمنع أي قص أو تشويه.',
      recommendedFor: 'طابعات الكاشير والريسيت الحرارية والبلوتوث وطابعات الدليفري',
    },
    {
      id: '80',
      name: 'مقاس الريسيت 80 مم',
      type: 'Thermal POS Receipt',
      badge: 'طابعات ريسيت عريضة (80mm)',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: <Receipt className="w-5 h-5 text-amber-400" />,
      widthLabel: '80mm Roll (عرض 8 سم)',
      description: 'طابعات الكاشير والريسيت الحرارية العريضة 80 مم لبونات الاستلام وكشف الوردية ومستحقات الكابتن.',
      recommendedFor: 'طابعات كاشير المطاعم العريضة',
    },
    {
      id: 'a4',
      name: 'مقاس A4 القياسي',
      type: 'Full Page (210 × 297 mm)',
      badge: 'تقرير مالي وإداري رسمي',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      icon: <FileText className="w-5 h-5 text-sky-400" />,
      widthLabel: 'A4 Standard (21 سم)',
      description: 'ورقة قياسية كاملة تتضمن كافة الجداول والإحصائيات وتوقيعات الإدارة، الأنسب للأرشفة الرسمية.',
      recommendedFor: 'التقارير الشهرية، الأرشفة المحاسبية، وحفظ PDF',
    },
    {
      id: 'a5',
      name: 'مقاس A5 المدمج',
      type: 'Half Page (148 × 210 mm)',
      badge: 'نصف ورقة مدمجة',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
      widthLabel: 'A5 Compact (14.8 سم)',
      description: 'نصف ورقة قياسية بخطوط مضغوطة ومنسقة، ممتازة للتسليم المكتبي السريع وتوفير الورق.',
      recommendedFor: 'المراجعات السريعة والمستندات المكتبية المدمجة',
    },
  ];

  const handleSelect = (id: PrintLayoutSize) => {
    setSelectedLayout(id);
    try {
      localStorage.setItem('pamborina_preferred_print_size', id);
    } catch {}
  };

  const handleExecute = (mode: 'print' | 'pdf') => {
    const callback = onConfirmPrint || onPrint;
    if (typeof callback === 'function') {
      callback(selectedLayout, mode);
    }
    onClose();
  };

  return (
    <div
      id="print-size-selector-modal"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-neutral-900 border border-neutral-700/90 rounded-3xl w-full max-w-2xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-neutral-950 via-neutral-900 to-[#1c140a] border-b border-neutral-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  استخراج وطباعة التقرير
                </h3>
                {periodLabel && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {periodLabel}
                  </span>
                )}
                {recordCount !== undefined && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-800 text-amber-400 border border-neutral-700">
                    {recordCount} سجل
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {reportTitle} {reportSubtitle ? `• ${reportSubtitle}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Paper / Printer Size Options */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>اختر مقاس الطابعة المطلوب للاستخراج (طابعات الريسيت أو الورق العادي):</span>
            </label>
            <span className="text-[11px] text-neutral-500">
              يمكنك أيضاً تغيير المقاس من نافذة المعاينة
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sizeOptions.map((opt) => {
              const isSelected = selectedLayout === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-right ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                      : 'bg-neutral-800/80 border-neutral-700/80 hover:border-neutral-600 hover:bg-neutral-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl border ${
                          isSelected ? 'bg-amber-500/20 border-amber-500/50' : 'bg-neutral-900 border-neutral-700'
                        }`}>
                          {opt.icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{opt.name}</h4>
                          <span className="text-[11px] text-neutral-400 font-mono">{opt.widthLabel}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-md">
                          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="mb-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${opt.badgeColor}`}>
                        {opt.badge}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed mb-2">
                      {opt.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-700/50 text-[10.5px] text-neutral-400">
                    <span className="font-bold text-neutral-300">موصى به لـ: </span>
                    <span>{opt.recommendedFor}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-400 flex items-center gap-2.5">
            <span className="text-amber-400 font-bold">💡 ملاحظة الطابعات:</span>
            <span>
              عند اختيار <strong>مقاس الريسيت (80 مم أو 58 مم)</strong>، سيتم تنسيق التقرير تلقائياً كبون كاشير حراري بدون هوامش وبخطوط واضحة مناسبة لرول الطابعة.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-neutral-950 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          {onExportCsv ? (
            <button
              type="button"
              onClick={() => {
                onExportCsv();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-emerald-200 border border-emerald-600/50 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              title="تصدير البيانات بصيغة جدول Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>تصدير ملف Excel / CSV</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleExecute('pdf')}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-neutral-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="استعراض وحفظ كملف PDF"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>معاينة وحفظ PDF</span>
            </button>

            <button
              type="button"
              onClick={() => handleExecute('print')}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="إرسال أمر الطباعة فوراً للمقاس المحدد"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة فورية ({sizeOptions.find((o) => o.id === selectedLayout)?.name})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
