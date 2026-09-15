import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Phone,
  MessageCircle,
  Bike,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  Calendar,
  Search,
  ExternalLink,
} from 'lucide-react';
import { DeliveryDriver, Order } from '../../../types';
import { formatPrice } from '../../../lib/utils';
import { getOrderStatusLabel } from '../../../lib/orderStatus';
import { exportAndPrintDriverReport, PrintLayoutSize } from '../../../services/pdfReportGenerator';
import { formatCairoDateTime } from '../../../utils/dateFormatter';
import { PrintSizeSelectorModal } from './PrintSizeSelectorModal';

interface DriverStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: DeliveryDriver | null;
  orders: Order[];
}

export const DriverStatementModal: React.FC<DriverStatementModalProps> = ({
  isOpen,
  onClose,
  driver,
  orders,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [showPrintSizeModal, setShowPrintSizeModal] = useState(false);
  const [autoPrintMode, setAutoPrintMode] = useState(true);

  if (!isOpen || !driver) return null;

  // Filter orders assigned to this driver
  const assignedOrders = orders.filter((order) => {
    return (
      order.driverId === driver.id ||
      (order.driverName && order.driverName.trim().toLowerCase() === driver.name.trim().toLowerCase())
    );
  });

  // Derived statistics
  const completedOrders = assignedOrders.filter(
    (o) => (o.status || '').toLowerCase() === 'completed'
  );
  const activeOrders = assignedOrders.filter((o) =>
    ['pending', 'confirmed', 'preparing', 'ready'].includes((o.status || '').toLowerCase())
  );

  const totalDeliveryFees = completedOrders.reduce((sum, o) => {
    const fee = Number(o.deliveryFee ?? o.pricing?.deliveryFee ?? 0);
    return sum + (isNaN(fee) || fee < 0 ? 0 : fee);
  }, 0);

  const totalProductsValue = completedOrders.reduce((sum, o) => {
    const tot = Number(o.pricing?.total ?? o.grandTotal ?? 0);
    return sum + (isNaN(tot) || tot < 0 ? 0 : tot);
  }, 0);

  // Filtered list for display
  const displayOrders = assignedOrders
    .filter((o) => {
      const status = (o.status || '').toLowerCase();
      if (statusFilter === 'completed') return status === 'completed';
      if (statusFilter === 'active') return ['pending', 'confirmed', 'preparing', 'ready'].includes(status);
      return true;
    })
    .filter((o) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const num = (o.orderNumber || o.id || '').toLowerCase();
      const name = (o.customer?.name || o.customerName || '').toLowerCase();
      const phone = (o.customer?.phone || o.customerPhone || '').toLowerCase();
      const addr = (o.customer?.address || o.address || '').toLowerCase();
      return num.includes(q) || name.includes(q) || phone.includes(q) || addr.includes(q);
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // WhatsApp summary text generator
  const sendWhatsAppStatement = () => {
    const whatsappNum = driver.phone.replace(/[^0-9]/g, '').replace(/^0/, '20');
    const msg = `*كشف حساب وتفاصيل عمليات كابتن التوصيل - حلواني بامبورينا* 🍰🛵
📍 *فرع الطالبية الرئيسي*
👤 *الكابتن:* ${driver.name}
📱 *الهاتف:* ${driver.phone}
━━━━━━━━━━━━━━━━
📊 *ملخص الأداء والإيرادات:*
✅ *الطلبات المسلمة بنجاح:* ${completedOrders.length} طلب
💰 *إجمالي مستحقات رسوم التوصيل:* ${totalDeliveryFees} ج.م
⏳ *الطلبات الجارية:* ${activeOrders.length} طلب
━━━━━━━━━━━━━━━━
📅 *تاريخ التقرير:* ${formatCairoDateTime(new Date())}
شكراً لجهودكم وتميزكم في خدمة عملاء بامبورينا! ✨`;

    window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handlePrint = (autoPrint: boolean = true) => {
    setAutoPrintMode(autoPrint);
    setShowPrintSizeModal(true);
  };

  const handleConfirmPrint = (layout: PrintLayoutSize, mode: 'print' | 'pdf' = 'print') => {
    exportAndPrintDriverReport(driver, assignedOrders, {
      autoPrint: mode === 'print' ? autoPrintMode : false,
      initialLayout: layout,
      generatedBy: 'إدارة فرع الطالبية - بامبورينا',
    });
  };

  return (
    <>
      <PrintSizeSelectorModal
        isOpen={showPrintSizeModal}
        onClose={() => setShowPrintSizeModal(false)}
        onPrint={handleConfirmPrint}
        onConfirmPrint={handleConfirmPrint}
        reportTitle={`كشف حساب كابتن التوصيل: ${driver.name}`}
        recordCount={assignedOrders.length}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-neutral-950 via-neutral-900 to-[#1c140a] border-b border-neutral-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Bike className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black text-white truncate">{driver.name}</h2>
                  <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                    فرع الطالبية
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                    نشط
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-neutral-400 mt-1 font-mono flex-wrap">
                  <span dir="ltr">{driver.phone}</span>
                  <span>•</span>
                  <span>{driver.vehicleType === 'motorcycle' ? 'موتوسيكل' : 'مركبة توصيل'}</span>
                  {driver.notes && <span>• {driver.notes}</span>}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors shrink-0"
              title="إغلاق"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Action buttons toolbar */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-800/80 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => handlePrint(true)}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer whitespace-nowrap"
              title="طباعة كشف الحساب الفوري"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>طباعة فورية</span>
            </button>

            <button
              onClick={() => handlePrint(false)}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-neutral-700 transition-all cursor-pointer whitespace-nowrap"
              title="تصدير كملف PDF"
            >
              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
              <span>حفظ PDF</span>
            </button>

            <button
              onClick={sendWhatsAppStatement}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              title="إرسال كشف الحساب عبر الواتساب"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>مشاركة واتساب</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Top KPI Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-neutral-800/80 border border-neutral-700/80">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                <span>الطلبات المسندة</span>
                <Package className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">{assignedOrders.length}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">إجمالي الطلبات للكابتن</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
              <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
                <span>مسلمة بنجاح</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-300 font-mono">{completedOrders.length}</div>
              <div className="text-[10px] text-emerald-400/70 mt-0.5">اكتملت وتم التحصيل</div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 to-neutral-800/80 border border-amber-500/40">
              <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
                <span>رسوم التوصيل المحققة</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {formatPrice(totalDeliveryFees)}
              </div>
              <div className="text-[10px] text-amber-300/70 mt-0.5">مستحقات التوصيل فقط</div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/30">
              <div className="flex items-center justify-between text-sky-400 text-xs mb-1">
                <span>قيد التوصيل الآن</span>
                <Clock className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-black text-sky-300 font-mono">{activeOrders.length}</div>
              <div className="text-[10px] text-sky-400/70 mt-0.5">طلبات جارية في الطريق</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الطلب، اسم العميل، الهاتف..."
                className="w-full pr-9 pl-4 py-2 text-xs rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-amber-500 text-neutral-950 shadow'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
                }`}
              >
                جميع الطلبات ({assignedOrders.length})
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-500 text-neutral-950 shadow'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
                }`}
              >
                المسلمة ({completedOrders.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'active'
                    ? 'bg-sky-500 text-neutral-950 shadow'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
                }`}
              >
                الجارية ({activeOrders.length})
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 overflow-hidden shadow-inner">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-neutral-800/80 border-b border-neutral-700/80 text-neutral-300 font-bold">
                    <th className="py-3 px-3.5">رقم الطلب</th>
                    <th className="py-3 px-3.5">التوقيت والتاريخ</th>
                    <th className="py-3 px-3.5">العميل والتواصل</th>
                    <th className="py-3 px-3.5">عنوان التوصيل</th>
                    <th className="py-3 px-3.5 text-center">رسوم التوصيل</th>
                    <th className="py-3 px-3.5 text-center">إجمالي الفاتورة</th>
                    <th className="py-3 px-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/70">
                  {displayOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-500">
                        لا توجد طلبات مسندة مطابقة لمعايير البحث الحالية
                      </td>
                    </tr>
                  ) : (
                    displayOrders.map((order) => {
                      const status = (order.status || '').toLowerCase();
                      const isCompleted = status === 'completed';
                      const fee = Number(order.deliveryFee ?? order.pricing?.deliveryFee ?? 0);
                      const total = Number(order.pricing?.total ?? order.grandTotal ?? 0);

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-neutral-800/40 transition-colors"
                        >
                          <td className="py-3 px-3.5 font-mono font-bold text-amber-400">
                            {order.orderNumber || order.id}
                          </td>
                          <td className="py-3 px-3.5 text-neutral-400">
                            <span className="block text-white font-medium">
                              {formatCairoDateTime(order.statusUpdatedAt || order.createdAt)}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-white block">
                              {order.customer?.name || order.customerName || 'عميل كريم'}
                            </span>
                            <span className="text-[11px] text-neutral-400 font-mono" dir="ltr">
                              {order.customer?.phone || order.customerPhone || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-neutral-300 max-w-[200px] truncate" title={order.customer?.address || order.address}>
                            {order.customer?.address || order.address || 'استلام / قيد التأكيد'}
                          </td>
                          <td className="py-3 px-3.5 text-center font-bold text-amber-400 font-mono">
                            {fee > 0 ? `${fee} ج.م` : 'معتمد'}
                          </td>
                          <td className="py-3 px-3.5 text-center font-bold text-white font-mono">
                            {formatPrice(total)}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isCompleted
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                  : status === 'cancelled'
                                  ? 'bg-red-950/80 text-red-300 border border-red-500/30'
                                  : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {getOrderStatusLabel(order.status as any)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Note */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>
                توقيت النظام المعتمد: <strong>{formatCairoDateTime(new Date())}</strong> (توقيت القاهرة)
              </span>
            </div>
            <div className="text-neutral-500 font-mono text-[11px]">
              إدارة حلواني بامبورينا • فرع الطالبية
            </div>
          </div>
        </div>

      </div>
    </div>
    </>
  );
};
