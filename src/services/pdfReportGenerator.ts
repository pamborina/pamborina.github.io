/**
 * Centralized 58mm Thermal POS Print Engine for Pamborina Ordering Platform
 * Architected specifically for 58mm POS Thermal Paper, Pure Black High Contrast,
 * Sharp Arabic Typography, Safe Area Constraint, and Zero Horizontal Overflow.
 */

import { Order, AuditLog, DeliveryDriver, DriverSettlement } from '../types';
import { 
  ComprehensiveAnalyticsReport, 
  TimeRangePreset, 
  CustomDateRange,
  getOrderProductsTotal,
  getOrderDeliveryFee,
  getOrderTotal
} from './orderAnalyticsEngine';
import { Images } from '../data/images';
import { STORE_CONFIG } from '../config/storeConfig';
import { getAccurateNow } from '../utils/dateFormatter';

export type PrintLayoutSize = '58' | '80' | 'a4' | 'a5';

export interface PDFReportOptions {
  periodLabel: string;
  timeRange: TimeRangePreset | CustomDateRange;
  generatedBy?: string;
  initialLayout?: PrintLayoutSize;
  autoPrint?: boolean;
}

/**
 * Shared, robust 58mm Thermal POS Print CSS Core
 * Strict 58mm boundary, zero-margin @page, pure black high contrast, safe printable area.
 */
function getThermalPrintCss(docTitle: string): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

    @page {
      size: 58mm auto;
      margin: 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      color: #000000;
      border-color: #000000;
      outline: none;
    }

    html, body {
      width: 58mm;
      max-width: 58mm;
      min-width: 0;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 9px;
      line-height: 1.35;
      direction: rtl;
      text-align: right;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Screen Preview: Display actual 58mm paper roll on a centered dark container */
    @media screen {
      html {
        background: #0f172a;
        padding: 16px 0 36px 0;
        min-height: 100vh;
      }
      body {
        background: #ffffff;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        border-radius: 4px;
        padding-bottom: 24px;
      }
    }

    /* Print Mode: Exact physical 58mm roll output, pure black, zero margins, no headers/footers */
    @media print {
      @page {
        size: 58mm auto;
        margin: 0;
      }
      html, body {
        width: 58mm !important;
        max-width: 58mm !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
      *, *::before, *::after {
        color: #000000 !important;
        border-color: #000000 !important;
        text-shadow: none !important;
        box-shadow: none !important;
        background: transparent !important;
      }
      img {
        filter: grayscale(100%) contrast(150%) !important;
      }
    }

    /* Safe Print Area Container: 58mm width with 2.2mm side padding for thermal heads */
    .receipt-wrapper {
      width: 58mm;
      max-width: 58mm;
      margin: 0 auto;
      padding: 3mm 2.2mm;
      background: #ffffff;
      color: #000000;
      box-sizing: border-box;
      overflow-x: hidden;
      word-break: break-word;
    }

    /* Screen-Only Action Bar */
    .action-bar {
      width: 58mm;
      max-width: 58mm;
      margin: 0 auto 8px auto;
      background: #1e293b;
      color: #ffffff;
      padding: 6px 8px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      text-align: center;
      font-size: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .action-bar * {
      color: #ffffff;
    }
    .action-bar .bar-title {
      font-weight: 800;
      font-size: 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .action-bar .btn-row {
      display: flex;
      gap: 4px;
    }
    .action-bar .btn {
      background: #d97706;
      color: #ffffff !important;
      border: none;
      padding: 5px 6px;
      border-radius: 4px;
      font-family: inherit;
      font-size: 9px;
      font-weight: 800;
      cursor: pointer;
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
    }
    .action-bar .btn:hover {
      background: #b45309;
    }
    .action-bar .btn-pdf {
      background: #0284c7;
    }
    .action-bar .btn-pdf:hover {
      background: #0369a1;
    }
    .action-bar .btn-close {
      background: #475569;
      flex: 0 0 auto;
      padding: 5px 8px;
    }
    .action-bar .btn-close:hover {
      background: #334155;
    }

    /* Pure Black Thermal Typography & Layout */
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; color: #000000; }
    .font-black { font-weight: 900; color: #000000; }
    .font-mono { font-family: monospace, 'Courier New', Courier, sans-serif; }

    /* Brand Header */
    .brand-header {
      text-align: center;
      padding-bottom: 2px;
    }
    .brand-logo-img {
      width: 36px;
      height: 36px;
      object-fit: cover;
      border-radius: 50%;
      margin: 0 auto 3px auto;
      display: block;
      border: 1px solid #000000;
      filter: grayscale(100%) contrast(150%);
    }
    .brand-title {
      font-size: 13.5px;
      font-weight: 900;
      color: #000000;
      line-height: 1.2;
    }
    .brand-slogan {
      font-size: 8px;
      font-weight: 700;
      color: #000000;
      margin-top: 1px;
    }
    .brand-meta {
      font-size: 8px;
      font-weight: 600;
      color: #000000;
      margin-top: 1px;
    }
    .doc-title {
      font-size: 11px;
      font-weight: 900;
      color: #000000;
      margin-top: 3px;
      padding: 1.5px 0;
    }

    /* High-Contrast Thermal Dividers */
    .divider-solid {
      border-top: 1.5px solid #000000;
      margin: 3.5px 0;
    }
    .divider-dashed {
      border-top: 1px dashed #000000;
      margin: 3px 0;
    }
    .divider-double {
      border-top: 3px double #000000;
      margin: 4px 0;
    }

    /* Key-Value Pair */
    .kv-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 1.2px 0;
      font-size: 8.5px;
      line-height: 1.3;
    }
    .kv-label {
      font-weight: 700;
      color: #000000;
      white-space: nowrap;
    }
    .kv-value {
      font-weight: 800;
      color: #000000;
      text-align: left;
      word-break: break-word;
    }

    /* Section Header */
    .section-title {
      font-size: 9.5px;
      font-weight: 900;
      color: #000000;
      border-bottom: 1px solid #000000;
      padding-bottom: 1.5px;
      margin: 4px 0 2.5px 0;
    }

    /* Receipt Cards (For multi-column data: drivers, fleet, logs, orders) */
    .receipt-card {
      border-bottom: 1px dashed #000000;
      padding: 3px 0;
      margin-bottom: 2px;
    }
    .receipt-card:last-child {
      border-bottom: none;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 900;
      font-size: 9px;
      color: #000000;
      margin-bottom: 2px;
    }

    /* KPI Highlight Box */
    .kpi-box {
      border: 1px solid #000000;
      padding: 3px 4px;
      margin: 3px 0;
      text-align: center;
    }
    .kpi-title {
      font-size: 8px;
      font-weight: 700;
      color: #000000;
    }
    .kpi-value {
      font-size: 12px;
      font-weight: 900;
      color: #000000;
      font-family: monospace, sans-serif;
    }

    /* Items Table (58mm 3-Column Safe Layout) */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 3px 0;
      font-size: 8.5px;
      table-layout: fixed;
    }
    .items-table th {
      border-bottom: 1px solid #000000;
      padding: 2px 1px;
      font-weight: 900;
      color: #000000;
      font-size: 8px;
    }
    .items-table td {
      padding: 2px 1px;
      vertical-align: top;
      border-bottom: 1px dotted #000000;
      color: #000000;
    }

    /* Totals Box */
    .totals-box {
      margin: 3px 0;
    }
    .grand-total {
      border-top: 1.5px solid #000000;
      border-bottom: 1.5px solid #000000;
      padding: 3px 0;
      margin-top: 3px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 900;
      color: #000000;
    }

    /* Thermal Badge */
    .thermal-badge {
      border: 1px solid #000000;
      padding: 0.5px 3px;
      font-size: 7.5px;
      font-weight: 800;
      display: inline-block;
      color: #000000;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      font-size: 8.5px;
      font-weight: 700;
      color: #000000;
      border: 1px dashed #000000;
      padding: 6px;
      margin: 4px 0;
    }

    /* Notes Box */
    .notes-box {
      border: 1px dashed #000000;
      padding: 3px 4px;
      margin: 3px 0;
      font-size: 8px;
      font-weight: 600;
      color: #000000;
      line-height: 1.3;
    }

    /* Footer & QR */
    .receipt-footer {
      text-align: center;
      font-size: 7.5px;
      font-weight: 700;
      color: #000000;
      margin-top: 5px;
      padding-top: 4px;
      border-top: 1px dashed #000000;
    }
    .qr-code-img {
      width: 64px;
      height: 64px;
      margin: 4px auto 2px auto;
      display: block;
      filter: contrast(200%);
    }
    .qr-container {
      display: flex;
      justify-content: space-around;
      align-items: flex-start;
      margin: 6px 0;
      gap: 8px;
    }
    .qr-item {
      text-align: center;
      flex: 1;
    }
    .qr-label {
      font-size: 7px;
      font-weight: 800;
      margin-top: 3px;
      color: #000000;
    }
    .qr-code-img-small {
      width: 58px;
      height: 58px;
      margin: 0 auto;
      display: block;
      filter: contrast(200%);
    }
  `;
}

/**
 * Shared screen action bar and auto-print script generator
 */
function getThermalShell(title: string, autoPrint: boolean, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    ${getThermalPrintCss(title)}
  </style>
</head>
<body>
  <!-- Screen Preview Action Bar (Hidden on Print) -->
  <div class="action-bar no-print">
    <div class="bar-title">🖨️ ${title}</div>
    <div class="btn-row">
      <button type="button" class="btn" onclick="window.print()">طباعة فورية</button>
      <button type="button" class="btn btn-pdf" onclick="window.print()">حفظ PDF</button>
      <button type="button" class="btn btn-close" onclick="window.close()">✕</button>
    </div>
  </div>

  <!-- Physical 58mm Thermal Safe Area Wrapper -->
  <div class="receipt-wrapper">
    ${contentHtml}
  </div>

  <script>
    window.addEventListener('load', function() {
      if (${autoPrint}) {
        setTimeout(function() {
          window.print();
        }, 300);
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Helper to open the preview window consistently
 */
function openThermalPrintWindow(htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=460,height=800,menubar=no,toolbar=no,location=no,status=no');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

/* ==========================================================================
   1. CUSTOMER ORDER INVOICE / RECEIPT (فاتورة الطلب)
   ========================================================================== */

export function generateSingleInvoiceHtml(order: Order, options?: { autoPrint?: boolean; initialLayout?: PrintLayoutSize }): string {
  const total = Number(order.pricing?.total ?? order.grandTotal ?? 0);
  const deliveryFee = Number(order.pricing?.deliveryFee ?? order.deliveryFee ?? 0);
  const discount = Number(order.pricing?.discountAmount ?? order.discountAmount ?? 0);
  const subtotal = Number(order.pricing?.subtotal ?? order.subtotal ?? Math.max(0, total - deliveryFee + discount));
  
  const now = getAccurateNow();
  const orderDate = order.createdAt ? new Date(order.createdAt) : now;
  const orderDateStr = orderDate.toLocaleDateString('ar-EG', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const orderTimeStr = orderDate.toLocaleTimeString('ar-EG', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const printTimeStr = now.toLocaleTimeString('ar-EG', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const customerName = order.customer?.name || order.customerName || 'عميل كريم';
  const customerPhone = order.customer?.phone || order.customerPhone || 'غير مسجل';
  const customerAddress = order.customer?.address || order.address || (order.orderType === 'pickup' ? 'استلام من الفرع' : 'العنوان قيد التأكيد');
  const branchName = order.branch?.nameAr || order.branchNameAr || 'فرع بامبورينا - الطالبية هرم';
  const orderTypeLabel = order.orderType === 'pickup' ? 'استلام من الفرع' : 'توصيل للمنزل (دليفري)';
  const paymentMethodLabel = order.paymentMethodAr || (
    order.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' :
    order.paymentMethod === 'online_card' ? 'بطاقة بنكية' :
    order.paymentMethod === 'instapay' ? 'انستاباي' : 'نقداً عند الاستلام (COD)'
  );
  const isPaid = order.status === 'completed' || order.paymentStatus === 'paid';
  const orderNumber = order.orderNumber || order.id;
  const items = order.items || [];
  const autoPrint = Boolean(options?.autoPrint);
  const currencyLabel = STORE_CONFIG?.currencyAr || 'ج.م';
  const origin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://pamborina.github.io';
  const trackingUrl = `${origin}/?track=${encodeURIComponent(orderNumber)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(trackingUrl)}`;
  const websiteQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('https://pamborina.github.io/')}`;

  const content = `
    <!-- Header -->
    <div class="brand-header">
      <img src="${Images.logo}" alt="شعار بامبورينا" class="brand-logo-img" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <div class="brand-title">حلواني بامبورينا</div>
      <div class="brand-slogan">Pamborina Pâtisserie & Bakery</div>
      <div class="brand-meta">📍 ${branchName} • هاتف: 01112624108</div>
      <div class="doc-title">إيصال مبيعات معتمد #${orderNumber}</div>
    </div>

    <div class="divider-solid"></div>

    <!-- Order & Customer Details -->
    <div class="kv-row">
      <span class="kv-label">تاريخ الطلب:</span>
      <span class="kv-value font-mono">${orderDateStr} ${orderTimeStr}</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">العميل:</span>
      <span class="kv-value">${customerName}</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">الهاتف:</span>
      <span class="kv-value font-mono" dir="ltr">${customerPhone}</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">نوع الطلب:</span>
      <span class="kv-value font-bold">${orderTypeLabel}</span>
    </div>
    ${order.orderType === 'delivery' ? `
      <div class="kv-row">
        <span class="kv-label">العنوان:</span>
        <span class="kv-value">${customerAddress}</span>
      </div>
      ${(order.driverName || order.driverId) ? `
        <div class="kv-row">
          <span class="kv-label">كابتن الدليفري:</span>
          <span class="kv-value font-bold">${order.driverName}</span>
        </div>
        ${order.driverPhone ? `
          <div class="kv-row">
            <span class="kv-label">هاتف الكابتن:</span>
            <span class="kv-value font-mono" dir="ltr">${order.driverPhone}</span>
          </div>
        ` : ''}
      ` : ''}
    ` : ''}
    <div class="kv-row">
      <span class="kv-label">طريقة الدفع:</span>
      <span class="kv-value font-bold">${paymentMethodLabel}</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">حالة السداد:</span>
      <span class="kv-value">
        <span class="thermal-badge font-bold">${isPaid ? 'مدفوعة بالكامل ✓' : 'قيد التحصيل'}</span>
      </span>
    </div>

    <div class="divider-dashed"></div>

    <!-- Items Table (58mm 3-Column Compact) -->
    <div class="section-title">الأصناف المطلوبة</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 52%; text-align: right;">الصنف</th>
          <th style="width: 24%; text-align: center;">الكمية × السعر</th>
          <th style="width: 24%; text-align: left;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${items.length === 0 ? `
          <tr><td colspan="3" class="text-center font-bold">لا توجد أصناف مسجلة</td></tr>
        ` : items.map((item: any) => {
          const itemName = item.nameAr || item.name || 'صنف حلويات';
          const unitPrice = Number(item.unitPrice || 0);
          const qty = Number(item.quantity || 1);
          const lineTotal = Number(item.totalPrice || (unitPrice * qty));
          const variantName = item.selectedVariant?.nameAr || item.selectedVariant?.nameEn;
          const addons = item.selectedAddons && Array.isArray(item.selectedAddons) ? item.selectedAddons : [];

          return `
            <tr>
              <td>
                <div class="font-bold">${itemName}</div>
                ${variantName ? `<div style="font-size: 7.5px;">الحجم: ${variantName}</div>` : ''}
                ${addons.length > 0 ? `<div style="font-size: 7.5px;">إضافات: ${addons.map((a: any) => a.addonNameAr || a.nameAr).join('، ')}</div>` : ''}
                ${item.specialInstructions ? `<div style="font-size: 7.5px;">ملاحظة: ${item.specialInstructions}</div>` : ''}
              </td>
              <td class="text-center font-mono">
                ${qty} × ${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </td>
              <td class="text-left font-mono font-bold">
                ${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyLabel}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="divider-dashed"></div>

    <!-- Financial Breakdown -->
    <div class="totals-box">
      <div class="kv-row">
        <span class="kv-label">المجموع الفرعي:</span>
        <span class="kv-value font-mono">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyLabel}</span>
      </div>
      ${order.orderType === 'delivery' ? `
        <div class="kv-row">
          <span class="kv-label">رسوم التوصيل:</span>
          <span class="kv-value font-mono">${deliveryFee > 0 ? `${deliveryFee.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyLabel}` : 'مجاناً 🎁'}</span>
        </div>
      ` : ''}
      ${discount > 0 ? `
        <div class="kv-row">
          <span class="kv-label">الخصم المطبق:</span>
          <span class="kv-value font-mono">-${discount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyLabel}</span>
        </div>
      ` : ''}

      <!-- Grand Total Highlight Box -->
      <div class="grand-total">
        <span>الإجمالي النهائي:</span>
        <span class="font-mono">${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyLabel}</span>
      </div>
    </div>

    <!-- Notes & Instructions -->
    ${order.notes ? `
      <div class="notes-box">
        <strong>ملاحظات العميل:</strong> ${order.notes}
      </div>
    ` : ''}

    <!-- QR Code & Footer -->
    <div class="receipt-footer">
      <img src="${websiteQrUrl}" alt="موقع حلواني بامبورينا" class="qr-code-img" crossorigin="anonymous" />
      <div class="qr-label" style="font-size: 8px; font-weight: 800; margin-bottom: 6px;">موقع حلواني بامبورينا الإلكتروني 🌐</div>
      <div style="margin-top: 4px;">رقم الفاتورة: #${orderNumber}</div>
      <div style="font-weight: 800; margin-top: 2px;">شكراً لتعاملكم مع حلواني بامبورينا</div>
      <div>نسعد بخدمتكم دائماً • وقت الطباعة: ${printTimeStr}</div>
    </div>
  `;

  return getThermalShell(`فاتورة طلب #${orderNumber}`, autoPrint, content);
}

export function exportAndPrintSingleInvoice(order: Order, mode: 'print' | 'pdf' = 'pdf') {
  const htmlContent = generateSingleInvoiceHtml(order, { autoPrint: mode === 'print' });
  openThermalPrintWindow(htmlContent);
}

/* ==========================================================================
   2. COMPREHENSIVE FINANCIAL & OPERATIONAL ANALYTICS REPORT (تقرير الأداء المالي)
   ========================================================================== */

export function generateReportHtml(
  report: ComprehensiveAnalyticsReport,
  filteredOrders: Order[],
  options: PDFReportOptions
): string {
  const { kpis, branchPerformance, topProducts, paymentPerformance } = report;
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const autoPrint = Boolean(options.autoPrint);

  const content = `
    <!-- Header -->
    <div class="brand-header">
      <img src="${Images.logo}" alt="شعار بامبورينا" class="brand-logo-img" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <div class="brand-title">حلواني بامبورينا</div>
      <div class="doc-title">التقرير المالي والتشغيلي</div>
      <div class="brand-meta">الفترة: ${options.periodLabel}</div>
    </div>

    <div class="divider-solid"></div>

    <div class="kv-row">
      <span class="kv-label">تاريخ الاستخراج:</span>
      <span class="kv-value font-mono">${dateStr} ${timeStr}</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">المسؤول:</span>
      <span class="kv-value">${options.generatedBy || 'إدارة النظام'}</span>
    </div>

    <div class="divider-dashed"></div>

    <!-- Executive Financial KPIs -->
    <div class="section-title">المؤشرات المالية الرئيسية</div>
    
    <div class="kpi-box" style="border: 2px dashed #000000 !important; background: #ffffff !important; color: #000000 !important;">
      <div class="kpi-title" style="color: #000000 !important; font-weight: 900;">إجمالي مبيعات المنتجات (الأصناف)</div>
      <div class="kpi-value font-mono" style="color: #000000 !important; font-size: 14px;">${Number(kpis.productsRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</div>
    </div>

    <div class="kpi-box" style="border: 2px dashed #000000 !important; background: #ffffff !important; color: #000000 !important; margin-top: 4px;">
      <div class="kpi-title" style="color: #000000 !important; font-weight: 900;">إجمالي رسوم التوصيل (الدليفري)</div>
      <div class="kpi-value font-mono" style="color: #000000 !important; font-size: 14px;">${Number(kpis.deliveryFeesRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</div>
    </div>

    <div class="kpi-box" style="border: 4px double #000000 !important; background: #ffffff !important; color: #000000 !important; margin-top: 4px;">
      <div class="kpi-title" style="font-weight: 900; color: #000000 !important;">إجمالي الدخل الشامل (الخزينة)</div>
      <div class="kpi-value font-mono" style="font-size: 15px; color: #000000 !important;">${Number(kpis.grossRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</div>
    </div>

    <div class="kv-row" style="margin-top: 6px;">
      <span class="kv-label">الطلبات المكتملة:</span>
      <span class="kv-value font-mono font-bold">${kpis.completedOrders || 0} طلب</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">متوسط مبيعات الطلب الأصلي (AOPV):</span>
      <span class="kv-value font-mono">${Number(kpis.averageProductsValue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">متوسط القيمة الشاملة للطلب (AOV):</span>
      <span class="kv-value font-mono">${Number(kpis.averageOrderValue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">نسبة طلبات التوصيل:</span>
      <span class="kv-value font-mono font-bold">${kpis.deliveryPercentage || 0}%</span>
    </div>

    <div class="divider-dashed"></div>

    <!-- Branch Performance -->
    <div class="section-title">أداء الفروع والمنافذ</div>
    ${(!branchPerformance || branchPerformance.length === 0) ? `
      <div class="empty-state">لا توجد بيانات فروع</div>
    ` : branchPerformance.map((b: any) => {
      const count = Number(b.completedOrders ?? b.totalOrders ?? b.ordersCount ?? 0);
      const share = b.percentage != null ? b.percentage : (kpis.completedOrders > 0 ? ((count / kpis.completedOrders) * 100).toFixed(0) : '0');
      return `
        <div class="receipt-card">
          <div class="card-header">
            <span>${b.branchNameAr || b.branchName || b.branchId || 'الفرع'}</span>
            <span class="font-mono">${Number(b.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">الطلبات:</span>
            <span class="kv-value font-mono">${count} طلب (${share}%)</span>
          </div>
        </div>
      `;
    }).join('')}

    <div class="divider-dashed"></div>

    <!-- Top Selling Products -->
    <div class="section-title">أكثر الأصناف مبيعاً</div>
    ${(!topProducts || topProducts.length === 0) ? `
      <div class="empty-state">لا توجد مبيعات أصناف</div>
    ` : topProducts.slice(0, 5).map((p: any, idx: number) => {
      const qty = Number(p.quantitySold ?? p.quantity ?? p.totalQuantity ?? 0);
      const rev = Number(p.revenue ?? p.totalSales ?? 0);
      return `
        <div class="receipt-card">
          <div class="card-header">
            <span>${idx + 1}. ${p.nameAr || p.productNameAr || p.productName || p.name}</span>
            <span class="font-mono">${rev.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">الكمية المباعة:</span>
            <span class="kv-value font-mono font-bold">${qty} قطعة</span>
          </div>
        </div>
      `;
    }).join('')}

    <div class="divider-dashed"></div>

    <!-- Payment Performance -->
    <div class="section-title">طرق السداد والتحصيل</div>
    ${(!paymentPerformance || paymentPerformance.length === 0) ? `
      <div class="empty-state">لا توجد بيانات دفع</div>
    ` : paymentPerformance.map((pm: any) => {
      const pName = pm.paymentMethodAr || pm.methodAr || pm.paymentMethod || pm.method || 'نقداً';
      const pRev = Number(pm.revenue ?? pm.total ?? pm.amount ?? 0);
      const pShare = pm.percentageOfRevenue != null ? pm.percentageOfRevenue.toFixed(0) : (pm.percentage != null ? Number(pm.percentage).toFixed(0) : (kpis.grossRevenue > 0 ? ((pRev / kpis.grossRevenue) * 100).toFixed(0) : '0'));
      return `
        <div class="kv-row">
          <span class="kv-label">${pName}:</span>
          <span class="kv-value font-mono">${pRev.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م (${pShare}%)</span>
        </div>
      `;
    }).join('')}

    <!-- Footer -->
    <div class="receipt-footer">
      <div>نهاية التقرير المالي والتشغيلي المعتمد</div>
      <div>حلواني بامبورينا • نظام الإدارة المركزي</div>
    </div>
  `;

  return getThermalShell(`التقرير المالي - ${options.periodLabel}`, autoPrint, content);
}

export function exportAndPrintReport(
  report: ComprehensiveAnalyticsReport,
  filteredOrders: Order[],
  options: PDFReportOptions,
  mode: 'print' | 'pdf' = 'pdf'
) {
  const htmlContent = generateReportHtml(report, filteredOrders, { ...options, autoPrint: mode === 'print' });
  openThermalPrintWindow(htmlContent);
}

/* ==========================================================================
   3. COMPLETED ORDERS REGISTER (سجل وفواتير الطلبات المكتملة)
   ========================================================================== */

export function exportAndPrintCompletedOrdersRegister(
  orders: Order[],
  options: { periodLabel: string; totalRevenue: number; autoPrint?: boolean }
) {
  const completed = orders.filter((o) => {
    const s = (o.status || '').toLowerCase();
    return s === 'completed' || s === 'delivered';
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const autoPrint = Boolean(options.autoPrint);

  // High precision dynamic accounting splits
  const productsRevenueSum = completed.reduce((sum, o) => sum + getOrderProductsTotal(o), 0);
  const deliveryFeesSum = completed.reduce((sum, o) => sum + getOrderDeliveryFee(o), 0);
  const grossRevenueSum = completed.reduce((sum, o) => sum + getOrderTotal(o), 0);

  const content = `
    <!-- Header -->
    <div class="brand-header">
      <img src="${Images.logo}" alt="شعار بامبورينا" class="brand-logo-img" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <div class="brand-title">حلواني بامبورينا</div>
      <div class="doc-title">سجل الطلبات المكتملة</div>
      <div class="brand-meta">الفترة: ${options.periodLabel}</div>
    </div>

    <div class="divider-solid"></div>

    <div class="kv-row">
      <span class="kv-label">تاريخ الاستخراج:</span>
      <span class="kv-value font-mono">${dateStr} ${timeStr}</span>
    </div>

    <div class="divider-dashed"></div>

    <!-- Summary Box -->
    <div class="kpi-box" style="border: 2px dashed #000000 !important; background: #ffffff !important; color: #000000 !important;">
      <div class="kpi-title" style="color: #000000 !important; font-weight: 900;">إجمالي مبيعات المنتجات (الأصناف)</div>
      <div class="kpi-value font-mono" style="color: #000000 !important; font-size: 14px;">${productsRevenueSum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</div>
    </div>

    <div class="kpi-box" style="border: 2px dashed #000000 !important; background: #ffffff !important; color: #000000 !important; margin-top: 4px;">
      <div class="kpi-title" style="color: #000000 !important; font-weight: 900;">إجمالي رسوم التوصيل (الدليفري)</div>
      <div class="kpi-value font-mono" style="color: #000000 !important; font-size: 14px;">${deliveryFeesSum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</div>
    </div>

    <div class="kpi-box" style="border: 4px double #000000 !important; background: #ffffff !important; color: #000000 !important; margin-top: 4px;">
      <div class="kpi-title" style="font-weight: 900; color: #000000 !important;">إجمالي الدخل الشامل المكتمل (الخزينة)</div>
      <div class="kpi-value font-mono" style="font-size: 15px; color: #000000 !important;">${grossRevenueSum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</div>
    </div>

    <div class="kv-row" style="margin-top: 6px;">
      <span class="kv-label">عدد الفواتير المكتملة:</span>
      <span class="kv-value font-mono font-bold">${completed.length} فاتورة</span>
    </div>

    <div class="divider-dashed"></div>

    <!-- Orders List -->
    <div class="section-title">بيان الفواتير والطلبات</div>
    ${completed.length === 0 ? `
      <div class="empty-state">لا توجد طلبات مكتملة في هذه الفترة</div>
    ` : completed.map((order, idx) => {
      const orderTotal = getOrderTotal(order);
      const prodTotal = getOrderProductsTotal(order);
      const deliveryFee = getOrderDeliveryFee(order);
      const customer = order.customer?.name || order.customerName || 'عميل كرام';
      const orderNum = order.orderNumber || order.id;
      const orderTime = order.createdAt ? new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';

      return `
        <div class="receipt-card">
          <div class="card-header">
            <span>${idx + 1}. فاتورة #${orderNum}</span>
            <span class="font-mono font-bold">${orderTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">تفاصيل الفصل المالي:</span>
            <span class="kv-value font-mono font-bold" style="font-size: 9px; color: #10b981;">
              الأصناف: ${prodTotal.toLocaleString('en-US')} ج.م ${deliveryFee > 0 ? `• دليفري: ${deliveryFee.toLocaleString('en-US')} ج.م` : ''}
            </span>
          </div>
          <div class="kv-row">
            <span class="kv-label">العميل:</span>
            <span class="kv-value">${customer}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">الفرع والوقت:</span>
            <span class="kv-value">${order.branch?.nameAr || order.branchNameAr || 'الطالبية'} • ${orderTime}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">النوع والدفع:</span>
            <span class="kv-value">${order.orderType === 'delivery' ? 'دليفري 🛵' : 'استلام 🛍️'} • ${order.paymentMethodAr || 'نقداً'}</span>
          </div>
        </div>
      `;
    }).join('')}

    <!-- Footer -->
    <div class="receipt-footer">
      <div>نهاية سجل الطلبات المكتملة (${completed.length} فاتورة)</div>
      <div>حلواني بامبورينا • قسم الحسابات والمالية</div>
    </div>
  `;

  const html = getThermalShell(`سجل الطلبات المكتملة - ${options.periodLabel}`, autoPrint, content);
  openThermalPrintWindow(html);
}

/* ==========================================================================
   4. AUDIT LOG REPORT (سجل الرقابة والعمليات الإدارية)
   ========================================================================== */

export function generateAuditLogReportHtml(
  logs: AuditLog[],
  options?: { filterCategory?: string; searchQuery?: string; autoPrint?: boolean }
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const filterName = options?.filterCategory && options.filterCategory !== 'all' ? options.filterCategory : 'جميع العمليات';
  const autoPrint = Boolean(options?.autoPrint);

  const content = `
    <!-- Header -->
    <div class="brand-header">
      <img src="${Images.logo}" alt="شعار بامبورينا" class="brand-logo-img" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <div class="brand-title">حلواني بامبورينا</div>
      <div class="doc-title">سجل الرقابة والعمليات الإدارية</div>
      <div class="brand-meta">الفلتر: ${filterName}</div>
    </div>

    <div class="divider-solid"></div>

    <div class="kv-row">
      <span class="kv-label">تاريخ الاستخراج:</span>
      <span class="kv-value font-mono">${dateStr} ${timeStr}</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">إجمالي السجلات:</span>
      <span class="kv-value font-mono font-bold">${logs.length} عملية</span>
    </div>

    <div class="divider-dashed"></div>

    <!-- Logs Cards -->
    <div class="section-title">سجل الأنشطة الإدارية</div>
    ${logs.length === 0 ? `
      <div class="empty-state">لا توجد عمليات مسجلة</div>
    ` : logs.map((log, idx) => {
      const logDate = log.timestamp ? new Date(log.timestamp) : now;
      const logDateStr = logDate.toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' });
      const logTimeStr = logDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="receipt-card">
          <div class="card-header">
            <span>${idx + 1}. [${log.targetType || 'عملية'}]</span>
            <span class="font-mono">${logDateStr} ${logTimeStr}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">المشرف:</span>
            <span class="kv-value font-mono" dir="ltr">${log.adminEmail || 'إدارة النظام'}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">العملية:</span>
            <span class="kv-value font-bold">${log.action}</span>
          </div>
          ${log.summaryAr ? `
            <div style="font-size: 7.5px; margin-top: 1.5px;">
              ${log.summaryAr}
            </div>
          ` : ''}
        </div>
      `;
    }).join('')}

    <!-- Footer -->
    <div class="receipt-footer">
      <div>سجل تدقيق رقابي معتمد وموثق</div>
      <div>حلواني بامبورينا • الإدارة العليا</div>
    </div>
  `;

  return getThermalShell(`سجل العمليات الإدارية (${logs.length})`, autoPrint, content);
}

export function exportAndPrintAuditLogPdf(
  logs: AuditLog[],
  options?: { filterCategory?: string; searchQuery?: string; autoPrint?: boolean }
) {
  const htmlContent = generateAuditLogReportHtml(logs, options);
  openThermalPrintWindow(htmlContent);
}

/* ==========================================================================
   5. DRIVER STATEMENT REPORT (كشف حساب كابتن التوصيل)
   ========================================================================== */

export function generateDriverReportHtml(
  driver: DeliveryDriver,
  driverOrders: Order[],
  settlements: DriverSettlement[] = [],
  options?: { generatedBy?: string; autoPrint?: boolean; initialLayout?: PrintLayoutSize; periodLabel?: string }
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  const completedOrders = driverOrders.filter((o) => (o.status || '').toLowerCase() === 'completed' || (o.status || '').toLowerCase() === 'delivered');
  const activeOrders = driverOrders.filter((o) => ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes((o.status || '').toLowerCase()));
  
  const totalDeliveryFees = completedOrders.reduce((sum, o) => {
    const fee = Number(o.deliveryFee ?? o.pricing?.deliveryFee ?? 0);
    return sum + (isNaN(fee) || fee < 0 ? 0 : fee);
  }, 0);

  const driverSettlements = settlements.filter(s => s.driverId === driver.id);
  const totalSettled = driverSettlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const outstandingBalance = Math.max(0, totalDeliveryFees - totalSettled);

  const totalOrdersAmount = completedOrders.reduce((sum, o) => {
    const tot = Number(o.pricing?.total ?? o.grandTotal ?? 0);
    return sum + (isNaN(tot) || tot < 0 ? 0 : tot);
  }, 0);

  const vehicleLabel = 
    driver.vehicleType === 'motorcycle' ? 'موتوسيكل' :
    driver.vehicleType === 'car' ? 'سيارة' :
    driver.vehicleType === 'bicycle' ? 'عجلة' : 'مركبة';

  const autoPrint = Boolean(options?.autoPrint);

  const content = `
    <!-- Header -->
    <div class="brand-header">
      <img src="${Images.logo}" alt="شعار بامبورينا" class="brand-logo-img" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <div class="brand-title">حلواني بامبورينا</div>
      <div class="doc-title">كشف حساب وتصفية الكابتن</div>
      <div class="brand-meta">الكابتن: ${driver.name}</div>
    </div>

    <div class="divider-solid"></div>

    <div class="kv-row">
      <span class="kv-label">تاريخ الكشف:</span>
      <span class="kv-value font-mono">${dateStr} ${timeStr}</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">رقم الهاتف:</span>
      <span class="kv-value font-mono" dir="ltr">${driver.phone}</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">نوع المركبة:</span>
      <span class="kv-value font-bold">${vehicleLabel}</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">الفترة المحددة:</span>
      <span class="kv-value">${options?.periodLabel || 'جميع العمليات'}</span>
    </div>

    <div class="divider-dashed"></div>

    <!-- Summary Box -->
    <div class="kpi-box">
      <div class="kpi-title">إجمالي رسوم التوصيل المحققة</div>
      <div class="kpi-value">${totalDeliveryFees.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</div>
    </div>

    <div class="kv-row">
      <span class="kv-label">إجمالي السحوبات والمسوّى:</span>
      <span class="kv-value font-mono font-bold">${totalSettled.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">الرصيد المستحق المتبقي:</span>
      <span class="kv-value font-mono font-bold" style="color: #b45309;">${outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
    </div>

    <div class="kv-row">
      <span class="kv-label">الطلبات المسلمة بنجاح:</span>
      <span class="kv-value font-mono font-bold">${completedOrders.length} طلب</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">قيمة مبيعات الطلبات:</span>
      <span class="kv-value font-mono">${totalOrdersAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">الطلبات قيد التوصيل الآن:</span>
      <span class="kv-value font-mono font-bold">${activeOrders.length} طلب</span>
    </div>

    ${driverSettlements.length > 0 ? `
      <div class="divider-dashed"></div>
      <div class="section-title">سجل السحوبات والتسويات السابقة</div>
      ${driverSettlements.map((s, idx) => `
        <div class="receipt-card">
          <div class="card-header">
            <span>تسوية #${idx + 1} (${s.paymentMethod === 'cash' ? 'كاش' : s.paymentMethod === 'bank_transfer' ? 'تحويل' : 'محفظة'})</span>
            <span class="font-mono font-bold">-${Number(s.amount || 0).toLocaleString('en-US')} ج.م</span>
          </div>
          ${s.notes ? `<div class="kv-row"><span class="kv-label">ملاحظات:</span><span class="kv-value">${s.notes}</span></div>` : ''}
          <div class="kv-row"><span class="kv-label">بواسطة:</span><span class="kv-value">${s.createdByEmail || 'إدارة النظام'}</span></div>
        </div>
      `).join('')}
    ` : ''}

    <div class="divider-dashed"></div>

    <!-- Detailed Orders -->
    <div class="section-title">تفاصيل الطلبات المنفذة</div>
    ${completedOrders.length === 0 ? `
      <div class="empty-state">لا توجد طلبات مسلمة مسجلة</div>
    ` : completedOrders.map((o, idx) => {
      const fee = Number(o.deliveryFee ?? o.pricing?.deliveryFee ?? 0);
      const totalAmt = Number(o.pricing?.total ?? o.grandTotal ?? 0);
      const orderNum = o.orderNumber || o.id;

      return `
        <div class="receipt-card">
          <div class="card-header">
            <span>${idx + 1}. طلب #${orderNum}</span>
            <span class="font-mono font-bold">${totalAmt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">العميل:</span>
            <span class="kv-value">${o.customer?.name || o.customerName || 'عميل'}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">رسوم التوصيل:</span>
            <span class="kv-value font-mono font-bold">${fee.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
          </div>
        </div>
      `;
    }).join('')}

    <div class="divider-double"></div>

    <!-- Settlement Box -->
    <div class="grand-total">
      <span>صافي المستحق للتصفية:</span>
      <span class="font-mono">${outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
    </div>

    <!-- Signatures -->
    <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 8px; font-weight: 700;">
      <div>توقيع الكابتن: .........</div>
      <div>توقيع الحسابات: .........</div>
    </div>

    <!-- Footer -->
    <div class="receipt-footer">
      <div>كشف حساب وتصفية معتمد للكابتن</div>
      <div>حلواني بامبورينا • قسم الحركة واللوجستيات</div>
    </div>
  `;

  return getThermalShell(`كشف حساب وتصفية كابتن ${driver.name}`, autoPrint, content);
}

export function exportAndPrintDriverReport(
  driver: DeliveryDriver,
  driverOrders: Order[],
  settlements: DriverSettlement[] = [],
  options?: { generatedBy?: string; autoPrint?: boolean; initialLayout?: PrintLayoutSize; periodLabel?: string },
  mode: 'print' | 'pdf' = 'pdf'
) {
  const htmlContent = generateDriverReportHtml(driver, driverOrders, settlements, { ...options, autoPrint: mode === 'print' });
  openThermalPrintWindow(htmlContent);
}

/* ==========================================================================
   6. FLEET OPERATIONS REPORT (تقرير أسطول كباتن التوصيل الشامل)
   ========================================================================== */

export function generateAllDriversReportHtml(
  drivers: DeliveryDriver[],
  orders: Order[],
  options?: {
    periodLabel?: string;
    generatedBy?: string;
    autoPrint?: boolean;
    initialLayout?: PrintLayoutSize;
  }
): string {
  const autoPrint = options?.autoPrint ?? true;
  const periodLabel = options?.periodLabel || 'جميع الفترات';

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  const COMPLETED_STATUSES = new Set(['completed', 'delivered']);
  const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']);

  const completedDeliveryOrders = orders.filter((o) => {
    const st = (o.status || '').toLowerCase();
    return COMPLETED_STATUSES.has(st) && (o.orderType === 'delivery' || o.driverId || o.driverName);
  });

  const totalDeliveryFeesCollected = completedDeliveryOrders.reduce((sum, o) => {
    const fee = Number(o.deliveryFee ?? o.pricing?.deliveryFee ?? 0);
    return sum + (isNaN(fee) || fee < 0 ? 0 : fee);
  }, 0);

  const totalDriversCount = drivers.length;
  const activeDriversCount = drivers.filter((d) => d.status === 'active').length;
  const avgFeePerOrder = completedDeliveryOrders.length > 0 
    ? (totalDeliveryFeesCollected / completedDeliveryOrders.length).toFixed(1)
    : '0';

  const content = `
    <!-- Header -->
    <div class="brand-header">
      <img src="${Images.logo}" alt="شعار بامبورينا" class="brand-logo-img" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <div class="brand-title">حلواني بامبورينا</div>
      <div class="doc-title">تقرير أسطول كباتن التوصيل</div>
      <div class="brand-meta">الفترة: ${periodLabel}</div>
    </div>

    <div class="divider-solid"></div>

    <div class="kv-row">
      <span class="kv-label">تاريخ التقرير:</span>
      <span class="kv-value font-mono">${dateStr} ${timeStr}</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">المسؤول:</span>
      <span class="kv-value">${options?.generatedBy || 'إدارة النظام'}</span>
    </div>

    <div class="divider-dashed"></div>

    <!-- Summary Box -->
    <div class="kpi-box">
      <div class="kpi-title">إجمالي رسوم التوصيل المحصلة</div>
      <div class="kpi-value">${totalDeliveryFeesCollected.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</div>
    </div>

    <div class="kv-row">
      <span class="kv-label">إجمالي الكباتن:</span>
      <span class="kv-value font-mono font-bold">${totalDriversCount} كابتن (${activeDriversCount} نشط)</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">إجمالي طلبات التوصيل:</span>
      <span class="kv-value font-mono font-bold">${completedDeliveryOrders.length} طلب</span>
    </div>
    <div class="kv-row">
      <span class="kv-label">متوسط رسوم الطلب:</span>
      <span class="kv-value font-mono">${avgFeePerOrder} ج.م</span>
    </div>

    <div class="divider-dashed"></div>

    <!-- Drivers Fleet Cards -->
    <div class="section-title">كشوفات وأداء الكباتن</div>
    ${drivers.length === 0 ? `
      <div class="empty-state">لا يوجد كباتن مسجلين</div>
    ` : drivers.map((driver, idx) => {
      const driverDeliveredOrders = completedDeliveryOrders.filter((o) => o.driverId === driver.id || o.driverName === driver.name);
      const driverDeliveredCount = driverDeliveredOrders.length;
      const driverFees = driverDeliveredOrders.reduce((sum, o) => {
        const fee = Number(o.deliveryFee ?? o.pricing?.deliveryFee ?? 0);
        return sum + (isNaN(fee) || fee < 0 ? 0 : fee);
      }, 0);
      const driverShare = completedDeliveryOrders.length > 0 
        ? ((driverDeliveredCount / completedDeliveryOrders.length) * 100).toFixed(1) 
        : '0';
      const driverActiveCount = orders.filter((o) => 
        (o.driverId === driver.id || o.driverName === driver.name) && 
        ACTIVE_STATUSES.has((o.status || '').toLowerCase())
      ).length;

      return `
        <div class="receipt-card">
          <div class="card-header">
            <span>${idx + 1}. ${driver.name}</span>
            <span class="thermal-badge font-bold">${driver.status === 'active' ? 'نشط' : 'غير نشط'}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">الهاتف والنوع:</span>
            <span class="kv-value font-mono" dir="ltr">${driver.phone} (${driver.vehicleType || 'مركبة'})</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">الطلبات المسلمة:</span>
            <span class="kv-value font-mono font-bold">${driverDeliveredCount} طلب (${driverShare}%)</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">إجمالي رسوم التوصيل:</span>
            <span class="kv-value font-mono font-bold">${driverFees.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">قيد التوصيل الآن:</span>
            <span class="kv-value font-mono">${driverActiveCount} طلب</span>
          </div>
        </div>
      `;
    }).join('')}

    <!-- Footer -->
    <div class="receipt-footer">
      <div>نهاية تقرير أداء أسطول التوصيل</div>
      <div>حلواني بامبورينا • قسم الحركة والتشغيل اللوجستي</div>
    </div>
  `;

  return getThermalShell(`تقرير أسطول التوصيل - ${periodLabel}`, autoPrint, content);
}

export function exportAndPrintAllDriversReport(
  drivers: DeliveryDriver[],
  orders: Order[],
  options?: {
    periodLabel?: string;
    generatedBy?: string;
    autoPrint?: boolean;
    initialLayout?: PrintLayoutSize;
  },
  mode: 'print' | 'pdf' = 'pdf'
) {
  const htmlContent = generateAllDriversReportHtml(drivers, orders, { ...options, autoPrint: mode === 'print' });
  openThermalPrintWindow(htmlContent);
}
