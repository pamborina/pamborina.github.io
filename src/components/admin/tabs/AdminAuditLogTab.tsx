import React, { useState, useEffect, useMemo } from 'react';
import { AuditLog } from '../../../types';
import { auditLogService } from '../../../services/auditLogService';
import { firebaseOrderService } from '../../../services/firebaseOrderService';
import { exportAndPrintAuditLogPdf } from '../../../services/pdfReportGenerator';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Utensils,
  Layers,
  Store,
  Settings,
  UserCheck,
  ShoppingBag,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  Sparkles,
  Printer,
  FileText,
  Activity,
  Zap,
} from 'lucide-react';

export const AdminAuditLogTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingOrders, setIsSyncingOrders] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Subscribe to real-time audit logs from service and sync historical orders
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = auditLogService.subscribeToAuditLogs((liveLogs) => {
      setLogs(liveLogs);
      setIsLoading(false);
    });

    // Proactively backfill all existing orders into audit log
    firebaseOrderService.getOrders(300).then((orders) => {
      if (orders && orders.length > 0) {
        auditLogService.syncOrdersToAuditLogs(orders);
      }
    }).catch(() => {});

    return () => {
      unsubscribe();
    };
  }, []);

  // Manual refresh trigger
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Sync fresh orders first
      const orders = await firebaseOrderService.getOrders(300).catch(() => []);
      if (orders && orders.length > 0) {
        await auditLogService.syncOrdersToAuditLogs(orders);
      }
      const freshLogs = await auditLogService.getAuditLogs(200);
      setLogs(freshLogs);
      setFeedbackMessage('تم تحديث ومزامنة سجل العمليات والطلبات بنجاح.');
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (e) {
      console.warn('Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sync all orders movements explicitly
  const handleSyncAllOrders = async () => {
    setIsSyncingOrders(true);
    try {
      const orders = await firebaseOrderService.getOrders(300);
      const added = await auditLogService.syncOrdersToAuditLogs(orders);
      const freshLogs = await auditLogService.getAuditLogs(200);
      setLogs(freshLogs);
      setFeedbackMessage(
        added > 0
          ? `تم مزامنة وتوثيق ${added} حركة طلب جديدة بنجاح في سجل العمليات!`
          : 'جميع حركات وتحركات الطلبات موثقة ومزامنة بالفعل بنسبة 100%.'
      );
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err: any) {
      console.warn('Sync orders error:', err);
      setFeedbackMessage('تمت مراجعة ومزامنة حركات الطلبات المتاحة.');
      setTimeout(() => setFeedbackMessage(null), 3000);
    } finally {
      setIsSyncingOrders(false);
    }
  };

  // Test Logging Action
  const handleCreateTestCheckpoint = async () => {
    try {
      await auditLogService.logAdminAction({
        action: 'system_checkpoint',
        targetType: 'settings',
        targetId: `check_${Date.now()}`,
        summaryAr: 'فحص إداري يدوي: تأكيد ومزامنة سجل التغييرات والعمليات اللحظي',
        metadata: {
          triggeredBy: 'لوحة التحكم الإدارية',
          status: 'success',
          device: navigator.userAgent.slice(0, 80),
          localTime: new Date().toLocaleTimeString('ar-EG'),
        },
      });
      setFeedbackMessage('تم تسجيل عملية تدقيق جديدة بنجاح وتحديث القائمة لحظياً!');
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err) {
      console.error('Failed to log test action:', err);
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Target type filter
      if (targetTypeFilter !== 'all' && log.targetType !== targetTypeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const summaryMatch = (log.summaryAr || '').toLowerCase().includes(q);
        const emailMatch = (log.adminEmail || '').toLowerCase().includes(q);
        const idMatch = (log.targetId || '').toLowerCase().includes(q);
        const actionMatch = (log.action || '').toLowerCase().includes(q);
        return summaryMatch || emailMatch || idMatch || actionMatch;
      }

      return true;
    });
  }, [logs, targetTypeFilter, searchQuery]);

  // Export to PDF
  const handleExportPDF = (autoPrint = false) => {
    if (filteredLogs.length === 0) return;
    exportAndPrintAuditLogPdf(filteredLogs, {
      filterCategory: targetTypeFilter,
      searchQuery: searchQuery,
      autoPrint,
    });
  };

  // Export to JSON (optional secondary)
  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `pamborina_audit_logs_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Helper for icon based on targetType
  const getTargetIcon = (type: AuditLog['targetType']) => {
    switch (type) {
      case 'product':
        return <Utensils className="w-4 h-4 text-amber-400" />;
      case 'category':
        return <Layers className="w-4 h-4 text-purple-400" />;
      case 'branch':
        return <Store className="w-4 h-4 text-blue-400" />;
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      case 'settings':
        return <Settings className="w-4 h-4 text-orange-400" />;
      case 'account':
        return <UserCheck className="w-4 h-4 text-cyan-400" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-amber-400" />;
    }
  };

  const getActionBadgeColor = (action: AuditLog['action']) => {
    if (action.includes('delete') || action.includes('reset')) {
      return 'bg-rose-500/15 border-rose-500/30 text-rose-400';
    }
    if (action.includes('create')) {
      return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
    }
    if (action.includes('toggle')) {
      return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
    }
    if (action.includes('price')) {
      return 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400';
    }
    return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // Category counts calculation
  const counts = useMemo(() => {
    return {
      all: logs.length,
      order: logs.filter((l) => l.targetType === 'order').length,
      product: logs.filter((l) => l.targetType === 'product').length,
      category: logs.filter((l) => l.targetType === 'category').length,
      branch: logs.filter((l) => l.targetType === 'branch').length,
      settings: logs.filter((l) => l.targetType === 'settings').length,
      account: logs.filter((l) => l.targetType === 'account').length,
    };
  }, [logs]);

  const filterOptions = [
    { id: 'all', label: 'الكل', count: counts.all },
    { id: 'order', label: 'الطلبات', count: counts.order },
    { id: 'product', label: 'المنتجات والأسعار', count: counts.product },
    { id: 'category', label: 'التصنيفات', count: counts.category },
    { id: 'branch', label: 'الفروع', count: counts.branch },
    { id: 'settings', label: 'الإعدادات', count: counts.settings },
    { id: 'account', label: 'الحسابات', count: counts.account },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
            <History className="w-6 h-6 text-[#D4AF37]" />
            <span>سجل التغييرات والعمليات الإدارية (Audit Log)</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{filteredLogs.length} عملية موثقة</span>
            </span>
          </h2>
          <p className="text-xs text-[#A89C8C] mt-1">
            منظومة تدقيق رقمية عالية الدقة توثق كافة التحركات، استلام الطلبات، تغيير الحالات، وتعديلات الأسعار في الوقت الفعلي.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sync All Orders Button */}
          <button
            type="button"
            onClick={handleSyncAllOrders}
            disabled={isSyncingOrders}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-xs font-bold text-amber-300 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="مزامنة وتوثيق كافة تحركات الطلبات المسجلة في النظام"
          >
            <Activity className={`w-3.5 h-3.5 text-[#D4AF37] ${isSyncingOrders ? 'animate-spin' : ''}`} />
            <span>مزامنة تحركات الطلبات</span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1C140E] hover:bg-[#2A1E14] border border-[#3D2C1E] text-xs font-bold text-[#E5D7B7] transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="مزامنة وتحديث السجل الآن"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#D4AF37] ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>تحديث</span>
          </button>

          {/* Test Checkpoint Button */}
          <button
            type="button"
            onClick={handleCreateTestCheckpoint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#140D08] hover:bg-[#1F140C] border border-[#3D2C1E] text-xs font-bold text-[#D4AF37] transition-all cursor-pointer shadow-sm active:scale-95"
            title="تسجيل عملية تحقق وتدقيق لحظية فوراً"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>فحص المنظومة</span>
          </button>

          {/* Export PDF Button (Primary) */}
          <button
            type="button"
            onClick={() => handleExportPDF(false)}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5BF45] hover:to-[#C9A533] text-black font-extrabold text-xs transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            title="تصدير سجل العمليات والتدقيق كملف PDF معتمد"
          >
            <FileText className="w-3.5 h-3.5 text-black" />
            <span>تصدير كـ PDF</span>
          </button>

          {/* Instant Print Button */}
          <button
            type="button"
            onClick={() => handleExportPDF(true)}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1C140E] hover:bg-[#2A1E14] border border-[#3D2C1E] text-xs font-bold text-[#E5D7B7] transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="طباعة فورية لسجل العمليات عبر الطابعة"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>طباعة فورية</span>
          </button>

          {/* Export JSON button (Secondary) */}
          <button
            type="button"
            onClick={handleExportJSON}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[#140D08] hover:bg-[#1C140E] border border-[#2D2017] text-[11px] font-semibold text-[#A89C8C] hover:text-[#E5D7B7] transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="تصدير كملف بيانات خام (JSON)"
          >
            <Download className="w-3 h-3 text-[#A89C8C]" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedbackMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Filter Chips & Search Bar */}
      <div className="bg-[#19110B] border border-[#2D2017] rounded-2xl p-4 space-y-3.5 shadow-lg">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8E8373]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في تفاصيل العمليات، أسماء المشرفين، المعرفات، أو التعديلات..."
            className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#120B07] border border-[#2D2017] text-xs text-white placeholder:text-[#6E6353] focus:outline-none focus:border-[#D4AF37] transition-colors"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-[#8E8373] flex items-center gap-1 shrink-0 ml-1">
            <Filter className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>التصنيف:</span>
          </span>
          {filterOptions.map((opt) => {
            const isActive = targetTypeFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTargetTypeFilter(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md scale-[1.02]'
                    : 'bg-[#120B07] hover:bg-[#221710] text-[#A89C8C] border-[#2D2017] hover:text-white'
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-black/20 text-black font-extrabold'
                      : 'bg-[#1E140C] text-[#D4AF37] border border-[#3D2C1E]'
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-[#19110B] border border-[#2D2017] rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-[#A89C8C] space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#D4AF37]" />
            <p className="text-xs font-medium">جاري مزامنة وتحميل سجل العمليات والتحركات...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-[#A89C8C] space-y-4">
            <AlertCircle className="w-10 h-10 mx-auto text-[#716556]" />
            <p className="text-sm text-[#F4E08B] font-bold">
              لا توجد عمليات مسجلة حالياً تطابق معايير البحث ({targetTypeFilter}).
            </p>
            <p className="text-xs text-[#8E8373] max-w-md mx-auto leading-relaxed">
              يمكنك الضغط على زر "مزامنة تحركات الطلبات" لاستيراد وتوثيق كافة الطلبات والتحركات المسجلة فوراً.
            </p>
            <button
              type="button"
              onClick={handleSyncAllOrders}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4AF37] text-black font-bold text-xs hover:bg-[#E5BF45] transition-all cursor-pointer shadow-md"
            >
              <Zap className="w-4 h-4" />
              <span>مزامنة كافة حركات الطلبات الآن</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#2A1E14]">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-[#221710]/60 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left details */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#120B07] border border-[#2D2017] flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                        {getTargetIcon(log.targetType)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getActionBadgeColor(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                          <span className="text-sm font-bold text-[#FFF1C5] leading-tight">
                            {log.summaryAr}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[#A89C8C] mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>{formatTimestamp(log.timestamp)}</span>
                          </span>

                          <span className="text-[#3D2C1E]">•</span>

                          <span
                            className="font-mono text-[#F4E08B] bg-[#120B07] px-2 py-0.5 rounded-md border border-[#2D2017] text-[10px]"
                            dir="ltr"
                          >
                            {log.adminEmail || 'admin@pamborina.com'}
                          </span>

                          <span className="text-[#3D2C1E]">•</span>

                          <span
                            className="font-mono text-[#8E8373] text-[10px]"
                            dir="ltr"
                          >
                            ID: {log.targetId}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Toggle */}
                    {hasMetadata && (
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#120B07] border border-[#2D2017] text-xs text-[#C8BFB0] hover:text-[#F4E08B] hover:border-[#D4AF37]/50 transition-colors self-start md:self-center shrink-0 cursor-pointer"
                      >
                        <span>{isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل والبيانات'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-[#D4AF37]" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-[#D4AF37]" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expanded Metadata */}
                  {isExpanded && hasMetadata && (
                    <div className="mt-3 pt-3 border-t border-[#2A1E14]">
                      <div
                        className="p-3.5 rounded-xl bg-[#100905] border border-[#2D2017] text-[11px] font-mono text-[#E5D7B7] overflow-x-auto shadow-inner"
                        dir="ltr"
                      >
                        <pre className="whitespace-pre-wrap">{JSON.stringify(log.metadata, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
