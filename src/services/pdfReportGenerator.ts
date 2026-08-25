/**
 * PDF / Printable HTML Report Generator for Pamborina Ordering Platform
 * Supports clean, styled PDF generation & direct thermal/A4 printing for Daily, Weekly, Monthly, Yearly, and Custom intervals.
 */

import { Order, AuditLog } from '../types';
import { ComprehensiveAnalyticsReport, TimeRangePreset, CustomDateRange, toCairoDateString } from './orderAnalyticsEngine';
import { formatPrice } from '../lib/utils';
import { getOrderStatusLabel } from '../lib/orderStatus';
import { Images } from '../data/images';
import { STORE_CONFIG } from '../config/storeConfig';

export interface PDFReportOptions {
  periodLabel: string;
  timeRange: TimeRangePreset | CustomDateRange;
  generatedBy?: string;
}

export function generateReportHtml(
  report: ComprehensiveAnalyticsReport,
  filteredOrders: Order[],
  options: PDFReportOptions
): string {
  const { kpis, branchPerformance, topProducts, paymentPerformance, statusDistribution } = report;
  const completedOrdersList = filteredOrders.filter((o) => o.status === 'completed');
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير بامبورينا المالي والتشغيلي - ${options.periodLabel}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Cairo', sans-serif;
      background-color: #ffffff;
      color: #1a1a1a;
      padding: 24px;
      line-height: 1.5;
      font-size: 13px;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .page-break {
        page-break-before: always;
      }
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #D4AF37;
      padding-bottom: 16px;
      margin-bottom: 20px;
      gap: 16px;
    }

    .report-brand-wrapper {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .report-logo-img {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #D4AF37;
      box-shadow: 0 2px 8px rgba(212, 175, 55, 0.25);
      background: #ffffff;
      flex-shrink: 0;
    }

    .brand-title {
      font-size: 24px;
      font-weight: 900;
      color: #1a1a1a;
    }

    .brand-subtitle {
      font-size: 13px;
      color: #73541D;
      font-weight: 600;
    }

    .meta-box {
      text-align: left;
      font-size: 12px;
      color: #555;
    }

    .report-badge {
      display: inline-block;
      background: #FFF9E6;
      color: #92400E;
      border: 1px solid #FCD34D;
      padding: 4px 12px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 12px;
      margin-top: 4px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: #fdfdfd;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px;
      text-align: center;
    }

    .kpi-card.highlight {
      background: #f0fdf4;
      border-color: #86efac;
    }

    .kpi-title {
      font-size: 11px;
      color: #6b7280;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .kpi-val {
      font-size: 20px;
      font-weight: 900;
      color: #111827;
    }

    .kpi-val.green {
      color: #15803d;
    }

    .kpi-sub {
      font-size: 10px;
      color: #9ca3af;
      margin-top: 4px;
    }

    .section-title {
      font-size: 15px;
      font-weight: 800;
      color: #1f2937;
      margin: 20px 0 10px 0;
      border-right: 4px solid #D4AF37;
      padding-right: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }

    th {
      background: #f9fafb;
      color: #374151;
      font-weight: 700;
      padding: 8px 10px;
      text-align: right;
      border: 1px solid #e5e7eb;
    }

    td {
      padding: 8px 10px;
      border: 1px solid #e5e7eb;
      color: #1f2937;
    }

    tr:nth-child(even) {
      background: #fafafa;
    }

    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .font-mono { font-family: monospace, sans-serif; }
    .font-bold { font-weight: 700; }
    .text-emerald { color: #15803d; font-weight: bold; }

    .footer {
      margin-top: 30px;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      font-size: 11px;
      color: #9ca3af;
      display: flex;
      justify-content: space-between;
    }

    .btn-print {
      background: #111827;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-family: 'Cairo', sans-serif;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .btn-print:hover {
      background: #374151;
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: left; margin-bottom: 16px;">
    <button class="btn-print" onclick="window.print()">
      🖨️ طباعة التقرير / حفظ كـ PDF
    </button>
  </div>

  <div class="header-bar">
    <div class="report-brand-wrapper">
      <img src="${Images.logo}" alt="شعار حلواني بامبورينا" class="report-logo-img" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <div>
        <h1 class="brand-title">حلواني بامبورينا - PAMBORINA</h1>
        <p class="brand-subtitle">نظام الإدارة والتحليلات المالية والتشغيلية المعتمد</p>
        <div class="report-badge">الفترة: ${options.periodLabel}</div>
      </div>
    </div>
    <div class="meta-box" dir="ltr">
      <div><strong>تاريخ الاستخراج:</strong> ${dateStr}</div>
      <div><strong>التوقيت:</strong> ${timeStr} (توقيت القاهرة)</div>
      <div><strong>المشرف:</strong> ${options.generatedBy || 'admin@pamborina.com'}</div>
    </div>
  </div>

  <!-- Key Metrics Summary Cards -->
  <div class="kpi-grid">
    <div class="kpi-card highlight">
      <div class="kpi-title">إجمالي الإيرادات المحققة</div>
      <div class="kpi-val green">${kpis.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</div>
      <div class="kpi-sub">من ${kpis.completedOrders} طلب مكتمل</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-title">إجمالي الطلبات المستلمة</div>
      <div class="kpi-val">${kpis.totalOrders}</div>
      <div class="kpi-sub">نسبة النجاح: ${kpis.totalOrders > 0 ? Math.round((kpis.completedOrders / kpis.totalOrders) * 100) : 0}%</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-title">متوسط قيمة الفاتورة (AOV)</div>
      <div class="kpi-val">${kpis.averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</div>
      <div class="kpi-sub">معدل الفاتورة المكتملة</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-title">الطلبات المكتملة / الملغاة</div>
      <div class="kpi-val">${kpis.completedOrders} / ${kpis.cancelledOrders}</div>
      <div class="kpi-sub">توصيل: ${kpis.deliveryOrders} | استلام: ${kpis.pickupOrders}</div>
    </div>
  </div>

  <!-- Breakdown by Branch -->
  <div class="section-title">📊 تحليل أداء المبيعات حسب الفروع</div>
  <table>
    <thead>
      <tr>
        <th>اسم الفرع</th>
        <th class="text-center">إجمالي الطلبات</th>
        <th class="text-center">المكتملة</th>
        <th class="text-center">توصيل / استلام</th>
        <th class="text-left">متوسط الفاتورة</th>
        <th class="text-left">الإيراد الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${branchPerformance.length === 0 ? '<tr><td colspan="6" class="text-center">لا توجد مبيعات مسجلة في هذه الفترة</td></tr>' : 
        branchPerformance.map(b => `
          <tr>
            <td class="font-bold">${b.branchNameAr}</td>
            <td class="text-center font-mono">${b.totalOrders}</td>
            <td class="text-center font-mono text-emerald">${b.completedOrders}</td>
            <td class="text-center font-mono">${b.deliveryOrders} دليفري / ${b.pickupOrders} استلام</td>
            <td class="text-left font-mono">${b.averageOrderValue.toLocaleString()} ج.م</td>
            <td class="text-left font-mono text-emerald">${b.revenue.toLocaleString()} ج.م</td>
          </tr>
        `).join('')
      }
    </tbody>
  </table>

  <!-- Top Selling Products -->
  <div class="section-title">🍰 الأصناف الأكثر مبيعاً بالفترة</div>
  <table>
    <thead>
      <tr>
        <th style="width: 40px;" class="text-center">#</th>
        <th>اسم الصنف</th>
        <th class="text-center">الكمية المباعة</th>
        <th class="text-left">نسبة المساهمة</th>
        <th class="text-left">إجمالي القيمة</th>
      </tr>
    </thead>
    <tbody>
      ${topProducts.length === 0 ? '<tr><td colspan="5" class="text-center">لا توجد أصناف مباعة في هذه الفترة</td></tr>' :
        topProducts.slice(0, 10).map((p, idx) => `
          <tr>
            <td class="text-center font-mono">${idx + 1}</td>
            <td class="font-bold">${p.nameAr}</td>
            <td class="text-center font-mono font-bold">${p.quantitySold} قطعة</td>
            <td class="text-left font-mono">${p.percentageOfRevenue}%</td>
            <td class="text-left font-mono text-emerald">${p.revenue.toLocaleString()} ج.م</td>
          </tr>
        `).join('')
      }
    </tbody>
  </table>

  <!-- Detailed Completed Orders Register -->
  <div class="page-break"></div>
  <div class="section-title">🧾 سجل وفواتير الطلبات المكتملة بالتفصيل (مصدر إجمالي الإيرادات: ${kpis.grossRevenue.toLocaleString()} ج.م)</div>
  <table>
    <thead>
      <tr>
        <th>رقم الطلب</th>
        <th>العميل والهاتف</th>
        <th>الفرع</th>
        <th>النوع</th>
        <th>طريقة الدفع</th>
        <th>تاريخ ووقت الإتمام</th>
        <th class="text-left">قيمة الفاتورة</th>
      </tr>
    </thead>
    <tbody>
      ${completedOrdersList.length === 0 ? '<tr><td colspan="7" class="text-center">لا توجد طلبات مكتملة بالفترة</td></tr>' :
        completedOrdersList.map(o => {
          const total = o.pricing?.total ?? o.grandTotal ?? 0;
          const orderDate = o.createdAt ? new Date(o.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'غير محدد';
          const itemsSummary = o.items ? o.items.map(i => `${i.nameAr || i.name} (${i.quantity})`).join(', ') : '';
          return `
            <tr>
              <td class="font-mono font-bold">${o.orderNumber || o.id.slice(0, 8)}</td>
              <td>
                <div class="font-bold">${o.customer?.name || o.customerName || 'عميل'}</div>
                <div style="font-size: 10px; color: #666;" dir="ltr">${o.customer?.phone || o.customerPhone || ''}</div>
              </td>
              <td>${o.branch?.nameAr || o.branchNameAr || 'الفرع الرئيسي'}</td>
              <td>${o.orderType === 'pickup' ? 'استلام فرع' : 'توصيل منزلي'}</td>
              <td>${o.paymentMethodAr || (o.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : 'عند الاستلام')}</td>
              <td style="font-size: 11px;">${orderDate}</td>
              <td class="text-left font-mono text-emerald font-bold">${Number(total).toLocaleString()} ج.م</td>
            </tr>
          `;
        }).join('')
      }
    </tbody>
    <tfoot>
      <tr style="background: #f0fdf4; font-weight: bold;">
        <td colspan="6" style="text-align: right; padding: 10px;">إجمالي الإيرادات المسجلة (${completedOrdersList.length} فاتورة مكتملة):</td>
        <td class="text-left font-mono text-emerald" style="font-size: 14px; padding: 10px;">${kpis.grossRevenue.toLocaleString()} ج.م</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <div>تم إنشاء هذا التقرير تلقائياً بواسطة منصة بامبورينا الموحدة للطلبات</div>
    <div>الصفحة 1 من 1 • توثيق رسمي</div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate high-precision, official A4 & Thermal printable invoice HTML for any single order.
 */
export function generateSingleInvoiceHtml(order: Order, options?: { autoPrint?: boolean }): string {
  const total = Number(order.pricing?.total ?? order.grandTotal ?? 0);
  const subtotal = Number(order.pricing?.subtotal ?? order.subtotal ?? (total - (order.pricing?.deliveryFee || order.deliveryFee || 0)));
  const deliveryFee = Number(order.pricing?.deliveryFee ?? order.deliveryFee ?? 0);
  const discount = Number(order.pricing?.discountAmount ?? order.discountAmount ?? 0);
  
  const now = new Date();
  const orderDate = order.createdAt ? new Date(order.createdAt) : now;
  const orderDateStr = orderDate.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const orderTimeStr = orderDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const printDateStr = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' });
  const printTimeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  const customerName = order.customer?.name || order.customerName || 'عميل كريم';
  const customerPhone = order.customer?.phone || order.customerPhone || 'غير مسجل';
  const customerAddress = order.customer?.address || order.address || (order.orderType === 'pickup' ? 'استلام من الفرع' : 'العنوان قيد التأكيد');
  const branchName = order.branch?.nameAr || order.branchNameAr || 'فرع الطالبية - الهرم';
  const orderTypeLabel = order.orderType === 'pickup' ? 'استلام من الفرع (Pickup)' : 'توصيل للمنزل (Delivery)';
  const paymentMethodLabel = order.paymentMethodAr || (
    order.paymentMethod === 'vodafone_cash' ? 'فودافون كاش (Vodafone Cash)' :
    order.paymentMethod === 'online_card' ? 'بطاقة بنكية إلكترونية' :
    order.paymentMethod === 'instapay' ? 'انستاباي (InstaPay)' : 'نقداً عند الاستلام (COD)'
  );
  const isPaid = order.status === 'completed' || order.paymentStatus === 'paid';
  const orderNumber = order.orderNumber || order.id;

  const items = order.items || [];
  const autoPrint = Boolean(options?.autoPrint);
  const currencyLabel = STORE_CONFIG?.currencyAr || 'ج.م';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(order.id)}`;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة ضريبية / إيصال طلب #${orderNumber} - بامبورينا</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      line-height: 1.5;
    }

    .action-bar {
      max-width: 800px;
      margin: 0 auto 20px auto;
      background: #1e293b;
      padding: 12px 20px;
      border-radius: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .action-bar .title {
      color: #f8fafc;
      font-weight: 700;
      font-size: 14px;
    }

    .btn-action {
      background: #d97706;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 10px;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }

    .btn-action:hover {
      background: #b45309;
    }

    .btn-pdf {
      background: #0284c7;
    }
    .btn-pdf:hover {
      background: #0369a1;
    }

    .btn-close {
      background: #475569;
    }
    .btn-close:hover {
      background: #334155;
    }

    .btn-layout {
      background: #334155;
      color: #94a3b8;
      border: 1px solid #475569;
      padding: 6px 12px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-layout:hover {
      background: #475569;
      color: #f8fafc;
    }
    .btn-layout.active {
      background: #d97706;
      color: #ffffff;
      border-color: #f59e0b;
    }

    .invoice-card {
      background: #ffffff;
      position: relative;
    }

    /* Standard A4 styling when body has class layout-a4 */
    body.layout-a4 {
      background-color: #f8fafc;
      padding: 24px;
    }
    body.layout-a4 .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }

    /* 80mm thermal receipt styling */
    body.layout-80 {
      background-color: #ffffff;
      padding: 0;
      font-size: 12px;
    }
    body.layout-80 .invoice-card {
      max-width: 80mm;
      width: 80mm;
      margin: 0 auto;
      padding: 12px;
      border: none;
      box-shadow: none;
    }
    body.layout-80 .brand-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 12px;
      margin-bottom: 12px;
      gap: 8px;
    }
    body.layout-80 .brand-logo-container {
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    body.layout-80 .brand-logo-img {
      width: 48px;
      height: 48px;
    }
    body.layout-80 .brand-logo-text {
      font-size: 20px;
    }
    body.layout-80 .brand-slogan {
      font-size: 10px;
    }
    body.layout-80 .invoice-badge-box {
      text-align: center;
      margin-top: 4px;
    }
    body.layout-80 .invoice-title {
      font-size: 14px;
    }
    body.layout-80 .invoice-number {
      font-size: 13px;
      padding: 2px 6px;
    }
    body.layout-80 .grid-details {
      grid-template-columns: 1fr !important;
      gap: 12px;
      padding: 10px !important;
      background: none !important;
      border: none !important;
      border-bottom: 1px dashed #000 !important;
      border-top: 1px dashed #000 !important;
      border-radius: 0 !important;
      margin-bottom: 12px !important;
    }
    body.layout-80 .detail-group h4 {
      border-bottom: 1px solid #e2e8f0;
      font-size: 11.5px;
    }
    body.layout-80 .detail-item {
      font-size: 11.5px;
    }
    body.layout-80 table {
      margin-bottom: 12px;
    }
    body.layout-80 th, body.layout-80 td {
      padding: 6px 4px;
      font-size: 11.5px;
    }
    body.layout-80 .totals-wrapper {
      flex-direction: column-reverse !important;
      gap: 12px !important;
      border-top: 1px dashed #000 !important;
      padding-top: 10px !important;
      margin-bottom: 12px !important;
    }
    body.layout-80 .notes-box {
      width: 100% !important;
      background: none !important;
      border: 1px dashed #cbd5e1 !important;
      padding: 8px !important;
      font-size: 10.5px !important;
    }
    body.layout-80 .totals-table {
      width: 100% !important;
    }
    body.layout-80 .totals-row.grand-total {
      font-size: 14px;
      border-top: 1.5px solid #000 !important;
    }
    body.layout-80 .totals-row.grand-total .amount {
      font-size: 15px;
    }
    body.layout-80 .footer-stamp {
      flex-direction: column !important;
      align-items: center !important;
      text-align: center !important;
      gap: 12px !important;
      border-top: 1px dashed #000 !important;
      padding-top: 10px !important;
    }
    body.layout-80 .footer-stamp > div {
      text-align: center !important;
    }
    body.layout-80 .qr-stamp {
      flex-direction: column !important;
      align-items: center !important;
      gap: 4px !important;
    }
    body.layout-80 .stamp-logo-img {
      width: 36px;
      height: 36px;
    }

    /* 58mm thermal receipt styling */
    body.layout-58 {
      background-color: #ffffff;
      padding: 0;
      font-size: 10.5px;
    }
    body.layout-58 .invoice-card {
      max-width: 58mm;
      width: 58mm;
      margin: 0 auto;
      padding: 6px;
      border: none;
      box-shadow: none;
    }
    body.layout-58 .brand-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
      gap: 6px;
    }
    body.layout-58 .brand-logo-container {
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    body.layout-58 .brand-logo-img {
      width: 38px;
      height: 38px;
    }
    body.layout-58 .brand-logo-text {
      font-size: 17px;
    }
    body.layout-58 .brand-slogan {
      display: none !important; /* Hide slogan on ultra-narrow 58mm */
    }
    body.layout-58 .invoice-badge-box {
      text-align: center;
      margin-top: 2px;
    }
    body.layout-58 .invoice-title {
      font-size: 13px;
    }
    body.layout-58 .invoice-number {
      font-size: 11.5px;
      padding: 1px 4px;
    }
    body.layout-58 .grid-details {
      grid-template-columns: 1fr !important;
      gap: 8px;
      padding: 6px !important;
      background: none !important;
      border: none !important;
      border-bottom: 1px dashed #000 !important;
      border-top: 1px dashed #000 !important;
      border-radius: 0 !important;
      margin-bottom: 8px !important;
    }
    body.layout-58 .detail-group h4 {
      border-bottom: 1px solid #e2e8f0;
      font-size: 10.5px;
      margin-bottom: 4px;
    }
    body.layout-58 .detail-item {
      font-size: 10.5px;
      margin-bottom: 2px;
    }
    body.layout-58 table {
      margin-bottom: 8px;
    }
    body.layout-58 th, body.layout-58 td {
      padding: 4px 2px;
      font-size: 10px;
    }
    body.layout-58 .totals-wrapper {
      flex-direction: column-reverse !important;
      gap: 8px !important;
      border-top: 1px dashed #000 !important;
      padding-top: 8px !important;
      margin-bottom: 8px !important;
    }
    body.layout-58 .notes-box {
      width: 100% !important;
      background: none !important;
      border: 1px dashed #cbd5e1 !important;
      padding: 6px !important;
      font-size: 9.5px !important;
    }
    body.layout-58 .totals-table {
      width: 100% !important;
    }
    body.layout-58 .totals-row {
      font-size: 10.5px;
      padding: 2px 0;
    }
    body.layout-58 .totals-row.grand-total {
      font-size: 12px;
      border-top: 1.5px solid #000 !important;
    }
    body.layout-58 .totals-row.grand-total .amount {
      font-size: 13px;
    }
    body.layout-58 .footer-stamp {
      flex-direction: column !important;
      align-items: center !important;
      text-align: center !important;
      gap: 10px !important;
      border-top: 1px dashed #000 !important;
      padding-top: 8px !important;
    }
    body.layout-58 .footer-stamp > div {
      text-align: center !important;
    }
    body.layout-58 .qr-stamp {
      flex-direction: column !important;
      align-items: center !important;
      gap: 2px !important;
    }
    body.layout-58 .stamp-logo-img {
      width: 30px;
      height: 30px;
    }

    /* Shared structure styles */
    .brand-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 20px;
      margin-bottom: 24px;
      gap: 16px;
    }

    .brand-logo-container {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo-img {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      object-fit: cover;
      border: 2.5px solid #d4af37;
      box-shadow: 0 3px 12px rgba(212, 175, 55, 0.3);
      background: #ffffff;
      flex-shrink: 0;
    }

    .brand-logo-text {
      font-size: 26px;
      font-weight: 900;
      color: #d97706;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
      line-height: 1.2;
    }

    .brand-slogan {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      margin-top: 2px;
    }

    .invoice-badge-box {
      text-align: left;
    }

    .invoice-title {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
    }

    .invoice-number {
      font-family: monospace;
      font-size: 16px;
      font-weight: 800;
      color: #d97706;
      background: #fef3c7;
      padding: 3px 10px;
      border-radius: 8px;
      display: inline-block;
      margin-top: 4px;
      border: 1px solid #fde68a;
    }

    .grid-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .detail-group h4 {
      font-size: 12px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 8px;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 4px;
    }

    .detail-item {
      display: flex;
      margin-bottom: 4px;
      font-size: 12.5px;
    }

    .detail-label {
      width: 90px;
      color: #64748b;
      font-weight: 600;
      flex-shrink: 0;
    }

    .detail-value {
      color: #0f172a;
      font-weight: 700;
      flex: 1;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
    }

    .status-paid {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }

    .status-pending {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    /* Items Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      font-size: 12px;
      padding: 10px 12px;
      text-align: right;
      border-bottom: 2px solid #cbd5e1;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12.5px;
      vertical-align: middle;
    }

    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }

    .item-variant {
      font-size: 11px;
      color: #d97706;
      font-weight: 600;
      margin-top: 2px;
    }

    .item-addons {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }

    .item-note {
      font-size: 11px;
      color: #ef4444;
      margin-top: 2px;
    }

    /* Totals Box */
    .totals-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      border-top: 2px solid #f1f5f9;
      padding-top: 16px;
      margin-bottom: 24px;
    }

    .notes-box {
      flex: 1;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 10px;
      padding: 12px;
      font-size: 12px;
      color: #92400e;
    }

    .totals-table {
      width: 320px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 13px;
      color: #475569;
    }

    .totals-row.grand-total {
      border-top: 2px solid #0f172a;
      margin-top: 8px;
      padding-top: 8px;
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
    }

    .totals-row.grand-total .amount {
      color: #d97706;
      font-family: monospace;
      font-size: 18px;
    }

    .footer-stamp {
      border-top: 1px dashed #cbd5e1;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748b;
    }

    .qr-stamp {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stamp-logo-img {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #d4af37;
      box-shadow: 0 2px 6px rgba(212, 175, 55, 0.25);
      background: #ffffff;
      flex-shrink: 0;
    }

    /* Responsive visibility */
    .pos-inline-price {
      display: none;
    }
    body.layout-80 .pos-inline-price,
    body.layout-58 .pos-inline-price {
      display: block;
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }

    /* POS table layouts - hide original unit price column */
    body.layout-80 th:nth-child(4), body.layout-80 td:nth-child(4),
    body.layout-58 th:nth-child(4), body.layout-58 td:nth-child(4) {
      display: none !important;
    }

    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body class="layout-a4">

  <!-- No-Print Action Bar -->
  <div class="action-bar no-print">
    <div class="title" style="display: flex; align-items: center; gap: 8px;">
      <span>📄 فاتورة الطلب #${orderNumber}</span>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <span style="color: #94a3b8; font-size: 11.5px; font-weight: bold; margin-left: 6px;">عرض الطباعة:</span>
      <button class="btn-layout active" id="btn-layout-a4" onclick="setPrintLayout('a4')">A4 عادي</button>
      <button class="btn-layout" id="btn-layout-80" onclick="setPrintLayout('80')">80 مم حراري</button>
      <button class="btn-layout" id="btn-layout-58" onclick="setPrintLayout('58')">58 مم حراري</button>
      
      <span style="border-left: 1px solid #475569; height: 18px; margin: 0 4px;"></span>
      
      <button class="btn-action" onclick="window.print()" title="طباعة الفاتورة فوراً للطابعة">
        🖨️ طباعة فورية
      </button>
      <button class="btn-action btn-pdf" onclick="window.print()" title="حفظ كملف PDF">
        📥 حفظ PDF
      </button>
      <button class="btn-action btn-close" onclick="window.close()" title="إغلاق">
        ✕ إغلاق
      </button>
    </div>
  </div>

  <!-- Printable Invoice Document -->
  <div class="invoice-card">
    <!-- Header -->
    <div class="brand-header">
      <div class="brand-logo-container">
        <img
          src="${Images.logo}"
          alt="شعار حلواني بامبورينا الرسمي"
          class="brand-logo-img"
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
        />
        <div>
          <div class="brand-logo-text">
            <span>حلواني بامبورينا</span>
          </div>
          <div class="brand-slogan">Pamborina Pâtisserie & Bakery • أجود أنواع الحلويات والمخبوزات</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
            📍 الفروع: الهرم • فيصل • الطالبية • الجيزة
          </div>
        </div>
      </div>
      <div class="invoice-badge-box">
        <div class="invoice-title">فاتورة مبيعات معتمدة</div>
        <div class="invoice-number">#${orderNumber}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
          تاريخ الطباعة: ${printDateStr} ${printTimeStr}
        </div>
      </div>
    </div>

    <!-- Order and Customer Details -->
    <div class="grid-details">
      <!-- Customer Box -->
      <div class="detail-group">
        <h4>بيانات العميل والتوصيل</h4>
        <div class="detail-item">
          <span class="detail-label">الاسم:</span>
          <span class="detail-value">${customerName}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">الهاتف:</span>
          <span class="detail-value font-mono" dir="ltr">${customerPhone}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">نوع الطلب:</span>
          <span class="detail-value">${orderTypeLabel}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">العنوان:</span>
          <span class="detail-value">${customerAddress}</span>
        </div>
      </div>

      <!-- Order Metadata Box -->
      <div class="detail-group">
        <h4>بيانات الطلب والتشغيل</h4>
        <div class="detail-item">
          <span class="detail-label">تاريخ الطلب:</span>
          <span class="detail-value">${orderDateStr}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">وقت التسجيل:</span>
          <span class="detail-value font-mono">${orderTimeStr}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">الفرع المنفذ:</span>
          <span class="detail-value">${branchName}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">طريقة الدفع:</span>
          <span class="detail-value">${paymentMethodLabel}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">حالة الفاتورة:</span>
          <span class="detail-value">
            <span class="status-badge ${isPaid ? 'status-paid' : 'status-pending'}">
              ${isPaid ? 'مكتملة ومسددة ✓' : 'قيد التحصيل'}
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 35px;" class="text-center">#</th>
          <th>بيان الصنف والمنتج</th>
          <th style="width: 80px;" class="text-center">الكمية</th>
          <th style="width: 100px;" class="text-left">سعر الوحدة</th>
          <th style="width: 110px;" class="text-left">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${items.length === 0 ? '<tr><td colspan="5" class="text-center">لا توجد أصناف مسجلة</td></tr>' :
          items.map((item: any, idx: number) => {
            const itemName = item.nameAr || item.name || 'صنف حلويات';
            const unitPrice = Number(item.unitPrice || 0);
            const qty = Number(item.quantity || 1);
            const lineTotal = Number(item.totalPrice || (unitPrice * qty));
            const variantName = item.selectedVariant?.nameAr || item.selectedVariant?.nameEn;
            const addons = item.selectedAddons && Array.isArray(item.selectedAddons) ? item.selectedAddons : [];

            return `
              <tr>
                <td class="text-center font-mono">${idx + 1}</td>
                <td>
                  <div class="font-bold">${itemName}</div>
                  ${variantName ? `<div class="item-variant">الحجم/النوع: ${variantName}</div>` : ''}
                  ${addons.length > 0 ? `<div class="item-addons">الإضافات: ${addons.map((a: any) => a.addonNameAr || a.nameAr).join('، ')}</div>` : ''}
                  ${item.specialInstructions ? `<div class="item-note">ملاحظة: ${item.specialInstructions}</div>` : ''}
                  <div class="pos-inline-price">${qty} × ${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyLabel}</div>
                </td>
                <td class="text-center font-mono font-bold">${qty}×</td>
                <td class="text-left font-mono">${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyLabel}</td>
                <td class="text-left font-mono font-bold" style="color: #0f172a;">${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyLabel}</td>
              </tr>
            `;
          }).join('')
        }
      </tbody>
    </table>

    <!-- Totals and Notes -->
    <div class="totals-wrapper">
      <div class="notes-box">
        <strong>ملاحظات وتعليمات:</strong>
        <p style="margin-top: 4px;">${order.notes ? order.notes : 'شكراً لتعاملكم مع حلواني ومخبوزات بامبورينا. نضمن لكم أعلى معايير الجودة والمذاق الفاخر.'}</p>
      </div>

      <div class="totals-table">
        <div class="totals-row">
          <span>المجموع الفرعي:</span>
          <span class="font-mono">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyLabel}</span>
        </div>
        ${deliveryFee > 0 ? `
          <div class="totals-row">
            <span>رسوم التوصيل:</span>
            <span class="font-mono">${deliveryFee.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyLabel}</span>
          </div>
        ` : ''}
        ${discount > 0 ? `
          <div class="totals-row" style="color: #15803d;">
            <span>الخصم المطبق:</span>
            <span class="font-mono">-${discount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyLabel}</span>
          </div>
        ` : ''}
        <div class="totals-row grand-total">
          <span>المبلغ المستحق:</span>
          <span class="amount">${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyLabel}</span>
        </div>
      </div>
    </div>

    <!-- Stamp & Footer -->
    <div class="footer-stamp">
      <div class="qr-stamp">
        <img src="${qrCodeUrl}" alt="رمز الاستجابة السريعة للطلب" style="width: 70px; height: 70px; border: 1px solid #e2e8f0; padding: 4px; border-radius: 6px; background: white;" crossorigin="anonymous" />
        <div>
          <div style="font-weight: 800; color: #1e293b; font-size: 12.5px;">منظومة بامبورينا الرقمية الموحدة</div>
          <div style="color: #64748b; font-size: 11px;">رقم الطلب الموحد: ${orderNumber}</div>
          <div style="color: #64748b; font-size: 11px;">امسح الرمز لتتبع تفاصيل الطلب</div>
        </div>
      </div>
      <div style="text-align: left;">
        <div style="font-weight: 700; color: #1e293b;">شكراً لثقتكم في حلواني بامبورينا</div>
        <div style="font-size: 10.5px; color: #64748b; font-family: monospace; direction: ltr;">https://pamborina.github.io/</div>
      </div>
    </div>
  </div>

  <script>
    function setPrintLayout(layout) {
      document.body.className = 'layout-' + layout;
      
      // Update active button styling
      document.querySelectorAll('.btn-layout').forEach(function(btn) {
        btn.classList.remove('active');
      });
      var activeBtn = document.getElementById('btn-layout-' + layout);
      if (activeBtn) {
        activeBtn.classList.add('active');
      }
      
      try {
        localStorage.setItem('pamborina_print_layout', layout);
      } catch (e) {}
    }

    window.onload = function() {
      // Restore layout choice or default to 'a4'
      var layout = 'a4';
      try {
        layout = localStorage.getItem('pamborina_print_layout') || 'a4';
      } catch (e) {}
      
      setPrintLayout(layout);

      ${autoPrint ? `
        setTimeout(function() {
          window.print();
        }, 350);
      ` : ''}
    };
  </script>
</body>
</html>
  `;
}

/**
 * Direct print/export for a single order invoice (either instant print or PDF preview)
 */
export function exportAndPrintSingleInvoice(order: Order, mode: 'print' | 'pdf' = 'pdf') {
  const htmlContent = generateSingleInvoiceHtml(order, { autoPrint: mode === 'print' });
  const printWindow = window.open('', '_blank', 'width=900,height=850');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

/**
 * Generate full printable report for the Completed Orders Register
 */
export function exportAndPrintCompletedOrdersRegister(
  orders: Order[],
  options: { periodLabel: string; totalRevenue: number; autoPrint?: boolean }
) {
  const completed = orders.filter((o) => o.status === 'completed');
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const autoPrint = Boolean(options.autoPrint);

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>سجل وفواتير الطلبات المكتملة - ${options.periodLabel}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cairo', sans-serif; background: #fff; color: #1a1a1a; padding: 24px; font-size: 12.5px; }
    @media print { body { padding: 0; } .no-print { display: none !important; } }
    .action-bar { background: #1e293b; color: #fff; padding: 12px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .btn-print { background: #d97706; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 12.5px; }
    .btn-print:hover { background: #b45309; }
    .btn-pdf { background: #0284c7; }
    .btn-pdf:hover { background: #0369a1; }
    .header { border-bottom: 2px solid #d97706; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 22px; font-weight: 900; color: #0f172a; }
    .subtitle { font-size: 13px; color: #64748b; }
    .kpi-box { display: flex; gap: 16px; margin-bottom: 20px; }
    .kpi-card { flex: 1; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 10px; padding: 12px; }
    .kpi-title { font-size: 11px; color: #64748b; font-weight: 700; }
    .kpi-value { font-size: 20px; font-weight: 900; color: #0f172a; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f1f5f9; padding: 10px 8px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 800; font-size: 11.5px; }
    td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; vertical-align: middle; }
    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
    .price-col { color: #15803d; font-weight: 800; font-family: monospace; font-size: 12px; }
    .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <div style="font-weight: 700;">🧾 سجل وفواتير الطلبات المكتملة (${completed.length} فاتورة) - ${options.periodLabel}</div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-print" onclick="window.print()">🖨️ طباعة فورية</button>
      <button class="btn-print btn-pdf" onclick="window.print()">📥 حفظ كـ PDF</button>
      <button class="btn-print" style="background: #475569;" onclick="window.close()">✕ إغلاق</button>
    </div>
  </div>

  <div class="header">
    <div style="display: flex; align-items: center; gap: 14px;">
      <img
        src="${Images.logo}"
        alt="شعار حلواني بامبورينا الرسمي"
        style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid #d4af37; box-shadow: 0 2px 8px rgba(212,175,55,0.25); background: #ffffff; flex-shrink: 0;"
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
      />
      <div>
        <div class="title">سجل وفواتير المبيعات المكتملة - حلواني بامبورينا</div>
        <div class="subtitle">الفترة المحددة: ${options.periodLabel} • مصدر الإيرادات المحققة المعتمدة</div>
      </div>
    </div>
    <div style="text-align: left; font-size: 11px; color: #64748b;">
      <div>تاريخ التقرير: ${dateStr}</div>
      <div>الوقت: ${timeStr}</div>
    </div>
  </div>

  <div class="kpi-box">
    <div class="kpi-card" style="border-color: #86efac; background: #f0fdf4;">
      <div class="kpi-title" style="color: #15803d;">إجمالي الإيرادات المحققة</div>
      <div class="kpi-value" style="color: #166534;">${options.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">عدد الفواتير المنفذة والمحصلة</div>
      <div class="kpi-value">${completed.length} طلب مكتمل</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">متوسط قيمة الفاتورة</div>
      <div class="kpi-value">${completed.length > 0 ? (options.totalRevenue / completed.length).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : 0} ج.م</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px;" class="text-center">#</th>
        <th>رقم الفاتورة</th>
        <th>العميل ورقم الهاتف</th>
        <th>الفرع المنفذ</th>
        <th>نوع الطلب</th>
        <th>طريقة الدفع</th>
        <th>تاريخ ووقت الإتمام</th>
        <th class="text-left">قيمة الفاتورة</th>
      </tr>
    </thead>
    <tbody>
      ${completed.length === 0 ? '<tr><td colspan="8" class="text-center" style="padding: 24px;">لا توجد فواتير مكتملة في هذه الفترة</td></tr>' :
        completed.map((o, idx) => {
          const tot = Number(o.pricing?.total ?? o.grandTotal ?? 0);
          const dStr = o.createdAt ? new Date(o.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'غير محدد';
          const pay = o.paymentMethodAr || (o.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : 'عند الاستلام');
          return `
            <tr>
              <td class="text-center font-mono">${idx + 1}</td>
              <td class="font-mono font-bold" style="color: #d97706;">#${o.orderNumber || o.id.slice(0, 8)}</td>
              <td>
                <div class="font-bold">${o.customer?.name || o.customerName || 'عميل'}</div>
                <div style="font-size: 10px; color: #64748b;" dir="ltr">${o.customer?.phone || o.customerPhone || ''}</div>
              </td>
              <td>${o.branch?.nameAr || o.branchNameAr || 'الطالبية'}</td>
              <td>${o.orderType === 'pickup' ? 'استلام فرع' : 'توصيل منزلي'}</td>
              <td>${pay}</td>
              <td>${dStr}</td>
              <td class="text-left price-col">${tot.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</td>
            </tr>
          `;
        }).join('')
      }
    </tbody>
    <tfoot>
      <tr style="background: #f8fafc; font-weight: 900; font-size: 13px;">
        <td colspan="7" style="text-align: right; padding: 12px;">الإجمالي الكلي المحقق (${completed.length} فاتورة):</td>
        <td class="text-left price-col" style="font-size: 14px; padding: 12px;">${options.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <div>تم استخراج هذا السجل آلياً عبر منظومة حلواني بامبورينا المعتمدة للطلبات</div>
    <div>توثيق الحسابات المالية الرسمي</div>
  </div>

  <script>
    window.onload = function() {
      ${autoPrint ? `
        setTimeout(function() {
          window.print();
        }, 350);
      ` : ''}
    };
  </script>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Generate official printable/exportable PDF HTML for Audit Logs (سجل العمليات الإدارية)
 */
export function generateAuditLogReportHtml(
  logs: AuditLog[],
  options?: { filterCategory?: string; searchQuery?: string; autoPrint?: boolean }
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const filterName = options?.filterCategory && options.filterCategory !== 'all' ? options.filterCategory : 'جميع العمليات الإدارية';
  const autoPrint = Boolean(options?.autoPrint);

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>سجل التغييرات والعمليات الإدارية (Audit Log) - حلواني بامبورينا</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cairo', sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; font-size: 12.5px; line-height: 1.5; }
    @media print { body { background: #fff; padding: 0; } .no-print { display: none !important; } .report-card { border: none !important; box-shadow: none !important; padding: 10px !important; } }
    .action-bar { max-width: 950px; margin: 0 auto 20px auto; background: #1e293b; padding: 12px 20px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .action-bar .title { color: #f8fafc; font-weight: 700; font-size: 13.5px; }
    .btn-action { background: #d97706; color: #ffffff; border: none; padding: 8px 16px; border-radius: 10px; font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .btn-action:hover { background: #b45309; }
    .btn-pdf { background: #0284c7; }
    .btn-pdf:hover { background: #0369a1; }
    .btn-close { background: #475569; color: #ffffff; }
    .btn-close:hover { background: #334155; }
    .report-card { max-width: 950px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
    .header { border-bottom: 2px solid #d4af37; padding-bottom: 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .brand-wrap { display: flex; align-items: center; gap: 14px; }
    .logo-img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid #d4af37; box-shadow: 0 2px 8px rgba(212,175,55,0.25); background: #ffffff; flex-shrink: 0; }
    .title { font-size: 20px; font-weight: 900; color: #0f172a; }
    .subtitle { font-size: 12.5px; color: #64748b; }
    .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; }
    .kpi-label { font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px; }
    .kpi-val { font-size: 18px; font-weight: 900; color: #0f172a; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f1f5f9; padding: 10px 8px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 800; font-size: 11.5px; color: #334155; }
    td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; vertical-align: top; }
    .text-center { text-align: center; }
    .font-mono { font-family: monospace; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 10.5px; font-weight: 700; }
    .badge-product { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-order { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-settings { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
    .badge-category { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
    .badge-branch { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
    .badge-account { background: #cffafe; color: #155e75; border: 1px solid #a5f3fc; }
    .badge-other { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .footer { margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <div class="title">📋 تقرير سجل التغييرات والعمليات الإدارية (${logs.length} عملية)</div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-action" onclick="window.print()">🖨️ طباعة فورية (Print)</button>
      <button class="btn-action btn-pdf" onclick="window.print()">📥 حفظ كـ PDF</button>
      <button class="btn-action btn-close" onclick="window.close()">✕ إغلاق</button>
    </div>
  </div>

  <div class="report-card">
    <div class="header">
      <div class="brand-wrap">
        <img src="${Images.logo}" alt="شعار حلواني بامبورينا" class="logo-img" crossorigin="anonymous" referrerpolicy="no-referrer" />
        <div>
          <div class="title">سجل التغييرات والعمليات الإدارية (Audit Log)</div>
          <div class="subtitle">حلواني ومخبوزات بامبورينا • التوثيق الإداري والرقابي المعتمد</div>
        </div>
      </div>
      <div style="text-align: left; font-size: 11px; color: #64748b;">
        <div>تاريخ الاستخراج: ${dateStr}</div>
        <div>الوقت: ${timeStr}</div>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">إجمالي العمليات الموثقة</div>
        <div class="kpi-val">${logs.length} عملية</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">التصنيف المطبق</div>
        <div class="kpi-val" style="font-size: 14px; font-weight: 700; color: #d97706;">${filterName}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">حالة السجل</div>
        <div class="kpi-val" style="font-size: 14px; color: #16a34a;">محمي وغير قابل للتعديل ✓</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 30px;" class="text-center">#</th>
          <th style="width: 130px;">التاريخ والتوقيت</th>
          <th style="width: 140px;">المشرف المسؤول</th>
          <th style="width: 90px;">التصنيف</th>
          <th>تفاصيل الإجراء والتغيير</th>
          <th style="width: 110px;">معرف الهدف</th>
        </tr>
      </thead>
      <tbody>
        ${logs.length === 0 ? '<tr><td colspan="6" class="text-center" style="padding: 24px;">لا توجد عمليات مسجلة تطابق هذا الفلتر</td></tr>' :
          logs.map((log, idx) => {
            const dateVal = log.timestamp ? new Date(log.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'غير محدد';
            let badgeClass = 'badge-other';
            let catLabel = log.targetType;
            if (log.targetType === 'product') { badgeClass = 'badge-product'; catLabel = 'منتجات'; }
            else if (log.targetType === 'order') { badgeClass = 'badge-order'; catLabel = 'طلبات'; }
            else if (log.targetType === 'settings') { badgeClass = 'badge-settings'; catLabel = 'إعدادات'; }
            else if (log.targetType === 'category') { badgeClass = 'badge-category'; catLabel = 'تصنيفات'; }
            else if (log.targetType === 'branch') { badgeClass = 'badge-branch'; catLabel = 'فروع'; }
            else if (log.targetType === 'account') { badgeClass = 'badge-account'; catLabel = 'حسابات'; }

            return `
              <tr>
                <td class="text-center font-mono">${idx + 1}</td>
                <td class="font-mono" style="font-size: 11px;">${dateVal}</td>
                <td>
                  <div style="font-weight: 700; color: #1e293b;">${log.adminEmail || 'مسؤول النظام'}</div>
                  <div style="font-size: 9.5px; color: #94a3b8;" class="font-mono">${log.adminUid ? log.adminUid.slice(0, 10) : ''}</div>
                </td>
                <td><span class="badge ${badgeClass}">${catLabel}</span></td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">${log.summaryAr || log.action}</div>
                  ${log.metadata ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">بيانات إضافية: ${JSON.stringify(log.metadata).slice(0, 80)}</div>` : ''}
                </td>
                <td class="font-mono" style="font-size: 10.5px; color: #64748b;">${log.targetId || '-'}</td>
              </tr>
            `;
          }).join('')
        }
      </tbody>
    </table>

    <div class="footer">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="${Images.logo}" alt="شعار توثيق" style="width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid #d4af37;" />
        <div>
          <div style="font-weight: 700; color: #1e293b;">منظومة الأمان والرقابة الإدارية - حلواني بامبورينا</div>
          <div style="font-size: 10px; color: #94a3b8;">تم الاستخراج والتوثيق آلياً من قاعدة البيانات اللحظية</div>
        </div>
      </div>
      <div>الصفحة 1 من 1</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      ${autoPrint ? `
        setTimeout(function() {
          window.print();
        }, 350);
      ` : ''}
    };
  </script>
</body>
</html>
  `;
}

/**
 * Direct print/export for Audit Log Report
 */
export function exportAndPrintAuditLogPdf(
  logs: AuditLog[],
  options?: { filterCategory?: string; searchQuery?: string; autoPrint?: boolean }
) {
  const html = generateAuditLogReportHtml(logs, options);
  const printWindow = window.open('', '_blank', 'width=1000,height=850');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

export function exportAndPrintReport(
  report: ComprehensiveAnalyticsReport,
  filteredOrders: Order[],
  options: PDFReportOptions
) {
  const htmlContent = generateReportHtml(report, filteredOrders, options);
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

