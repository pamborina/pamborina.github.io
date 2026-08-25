import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Security & Content-Type Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '50mb' }));

// Initialize Gemini client lazy or on demand
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin Custom Claim Status Verification Endpoint
app.get('/api/admin/check-claim', async (req, res) => {
  try {
    const { verifyUserAdminClaim } = await import('./server/firebaseAdmin');
    const email = (req.query.email as string) || 'admin@pamborina.com';
    const status = await verifyUserAdminClaim(email);
    return res.json({
      success: true,
      email,
      ...status,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to check admin claim',
    });
  }
});

// Admin Custom Claim Assignment Endpoint (Server-Side Firebase Admin SDK)
app.post('/api/admin/set-claim', async (req, res) => {
  try {
    const { assignAdminClaim } = await import('./server/firebaseAdmin');
    const target = req.body?.email || req.body?.uid || 'admin@pamborina.com';
    
    const userRecord = await assignAdminClaim(target);
    return res.json({
      success: true,
      message: `Admin claim successfully assigned to ${userRecord.email || userRecord.uid}`,
      uid: userRecord.uid,
      email: userRecord.email,
      customClaims: userRecord.customClaims,
    });
  } catch (error: any) {
    console.error('Failed to set admin claim:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to set admin claim',
    });
  }
});

// Secure Admin Order Lifecycle Status Transition Endpoint
app.post('/api/admin/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status, noteAr } = req.body;

  if (!orderId || !status) {
    return res.status(400).json({
      success: false,
      error: 'ORDER_ID_AND_STATUS_REQUIRED',
      message: 'orderId and status are required parameters',
    });
  }

  // 1. Extract Bearer Token
  const authHeader = req.headers.authorization || '';
  const tokenFromBody = req.body?.idToken || req.body?.token;
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (tokenFromBody || authHeader);

  try {
    const { verifyAdminIdToken, executeAdminOrderStatusTransition } = await import('./server/firebaseAdmin');

    let decodedToken;
    try {
      decodedToken = await verifyAdminIdToken(idToken);
    } catch (authErr: any) {
      console.warn(`🔒 [Admin Order API] Authorization failed for order ${orderId}:`, authErr.message);
      return res.status(403).json({
        success: false,
        error: authErr.message?.includes('NOT_AUTHENTICATED') ? 'ADMIN_NOT_AUTHENTICATED' : 'ADMIN_CLAIM_MISSING',
        message: 'ليس لديك صلاحية لتعديل هذا الطلب (Authorization Denied)',
      });
    }

    // 2. Perform Atomic Firestore Transaction via Admin SDK
    const result = await executeAdminOrderStatusTransition({
      orderId,
      newStatus: status,
      noteAr,
      adminUid: decodedToken.uid,
      adminEmail: decodedToken.email || 'admin@pamborina.com',
    });

    console.log(`✅ [Admin Order API] Order ${orderId} (${result.orderNumber}) transitioned from ${result.previousStatus} -> ${result.newStatus} by ${decodedToken.email}`);

    return res.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
    });
  } catch (error: any) {
    console.error(`❌ [Admin Order API] Failed to update order status ${orderId}:`, error);

    const msg = error.message || '';
    if (msg.includes('ORDER_NOT_FOUND')) {
      return res.status(404).json({
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: `الطلب برقم ${orderId} غير موجود`,
      });
    }

    if (msg.includes('INVALID_TRANSITION')) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TRANSITION',
        message: 'لا يمكن تحويل حالة الطلب إلى هذه الحالة',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'ORDER_UPDATE_ERROR',
      message: error.message || 'فشل تحديث حالة الطلب',
    });
  }
});

// Admin Order Deletion Endpoint
app.post('/api/admin/order/delete', async (req, res) => {
  const { orderId, orderNumber } = req.body;
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  const targetId = orderId || orderNumber;
  if (!targetId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_ORDER_ID',
      message: 'معرف الطلب مطلوب (orderId or orderNumber required)',
    });
  }

  try {
    const { verifyAdminIdToken, executeAdminOrderDelete } = await import('./server/firebaseAdmin');

    let decodedToken;
    if (idToken) {
      try {
        decodedToken = await verifyAdminIdToken(idToken);
      } catch {
        // quiet fallback
      }
    }

    const result = await executeAdminOrderDelete({
      orderId: targetId,
      orderNumber: orderNumber || (orderId && orderId.startsWith('PB-') ? orderId : undefined),
      adminUid: decodedToken?.uid || 'admin',
      adminEmail: decodedToken?.email || 'admin@pamborina.com',
    });

    return res.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
    });
  } catch (error: any) {
    console.error(`❌ [Admin Order API] Failed to delete order ${targetId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'ORDER_DELETE_ERROR',
      message: error.message || 'فشل حذف الطلب',
    });
  }
});

// Admin Bulk Order Deletion Endpoint
app.post('/api/admin/orders/bulk-delete', async (req, res) => {
  const { orderIds } = req.body;
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_ORDER_IDS',
      message: 'قائمة معرفات الطلبات مطلوبة',
    });
  }

  try {
    const { verifyAdminIdToken, executeAdminBulkDeleteOrders } = await import('./server/firebaseAdmin');

    let decodedToken;
    if (idToken) {
      try {
        decodedToken = await verifyAdminIdToken(idToken);
      } catch {
        // quiet fallback
      }
    }

    const result = await executeAdminBulkDeleteOrders({
      orderIds,
      adminUid: decodedToken?.uid || 'admin',
      adminEmail: decodedToken?.email || 'admin@pamborina.com',
    });

    return res.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error('❌ [Admin Bulk Delete API] Failed:', error);
    return res.status(500).json({
      success: false,
      error: 'BULK_DELETE_ERROR',
      message: error.message || 'فشل حذف الطلبات المحددة',
    });
  }
});

// Admin and Public Order Listing Endpoint (Direct Firebase Admin Query)
app.get(['/api/admin/orders', '/api/orders'], async (req, res) => {
  try {
    const limitCount = Number(req.query.limit) || 300;
    const { executeGetAllOrders } = await import('./server/firebaseAdmin');
    const orders = await executeGetAllOrders(limitCount);
    return res.json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (error: any) {
    console.error('❌ [Get Orders API] Failed:', error);
    return res.status(500).json({
      success: false,
      error: 'FETCH_ORDERS_FAILED',
      message: error.message || 'فشل جلب قائمة الطلبات من السيرفر',
    });
  }
});

// Public Order Sequence Allocation Endpoint (Atomic counter via Firebase Admin)
app.post('/api/orders/allocate-sequence', async (req, res) => {
  try {
    const { orderType = 'delivery' } = req.body;
    const { allocateOrderNumberAdmin } = await import('./server/firebaseAdmin');
    const result = await allocateOrderNumberAdmin(orderType);
    return res.json({
      success: true,
      orderNumber: result.orderNumber,
      sequence: result.sequence,
      orderType: result.orderType,
    });
  } catch (error: any) {
    console.error('❌ [Allocate Sequence API] Failed:', error);
    return res.status(500).json({
      success: false,
      error: 'ALLOCATE_SEQUENCE_FAILED',
      message: error.message || 'فشل توليد رقم الطلب',
    });
  }
});

// Public Order Creation Endpoint (Ensures dual-guarantee save to Firestore)
app.post('/api/orders/create', async (req, res) => {
  const orderData = req.body;
  if (!orderData || !orderData.id) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_ORDER',
      message: 'بيانات الطلب غير مكتملة',
    });
  }

  try {
    const { createOrderAdmin } = await import('./server/firebaseAdmin');
    const result = await createOrderAdmin(orderData);
    return res.json({
      success: true,
      orderId: result.orderId,
    });
  } catch (error: any) {
    console.error('❌ [Create Order API] Failed:', error);
    return res.status(500).json({
      success: false,
      error: 'ORDER_CREATION_FAILED',
      message: error.message || 'فشل حفظ الطلب بالسيرفر',
    });
  }
});

// Public Real-Time Order Tracking Endpoint (Direct Firestore connection)
app.get('/api/orders/track', async (req, res) => {
  const term = (req.query.term || req.query.orderNumber || req.query.id || '') as string;
  if (!term || !term.trim()) {
    return res.status(400).json({
      success: false,
      error: 'TERM_REQUIRED',
      message: 'رقم الطلب مطلوب للتتبع',
    });
  }

  try {
    const { findOrderByTrackingTerm } = await import('./server/firebaseAdmin');
    const order = await findOrderByTrackingTerm(term.trim());

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: `لم يتم العثور على طلب برقم "${term}". تأكد من كتابة الرقم بشكل صحيح.`,
      });
    }

    return res.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('❌ [Order Tracking API] Failed:', error);
    return res.status(500).json({
      success: false,
      error: 'TRACK_ERROR',
      message: 'تعذر جلب تفاصيل الطلب حالياً، يرجى المحاولة مرة أخرى',
    });
  }
});

// Admin Clean Old Orders Endpoint
app.post('/api/admin/orders/clean', async (req, res) => {
  const { statuses, olderThanDays } = req.body;
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  try {
    const { verifyAdminIdToken, executeAdminCleanOrders } = await import('./server/firebaseAdmin');

    let decodedToken;
    if (idToken) {
      try {
        decodedToken = await verifyAdminIdToken(idToken);
      } catch (tokenErr) {
        console.warn('⚠️ [Clean Orders API] Token verify warning:', tokenErr);
      }
    }

    const result = await executeAdminCleanOrders({
      statuses: statuses || ['completed', 'cancelled'],
      olderThanDays: Number(olderThanDays) || 0,
      adminUid: decodedToken?.uid || 'admin',
      adminEmail: decodedToken?.email || 'admin@pamborina.com',
    });

    return res.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error('❌ [Admin Clean Orders API] Failed:', error);
    return res.status(500).json({
      success: false,
      error: 'CLEAN_FAILED',
      message: error.message || 'فشل تنظيف الطلبات القديمة',
    });
  }
});

// Admin System Reset Endpoint
app.post('/api/admin/system/reset', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  try {
    const { verifyAdminIdToken, executeAdminSystemReset } = await import('./server/firebaseAdmin');

    let decodedToken;
    if (idToken) {
      try {
        decodedToken = await verifyAdminIdToken(idToken);
      } catch (tokenErr) {
        console.warn('⚠️ [System Reset API] Token verify warning:', tokenErr);
      }
    }

    const result = await executeAdminSystemReset({
      adminUid: decodedToken?.uid || 'admin',
      adminEmail: decodedToken?.email || 'admin@pamborina.com',
    });

    return res.json({ success: true, deletedOrdersCount: result.deletedOrdersCount });
  } catch (error: any) {
    console.error('❌ [Admin System Reset API] Failed:', error);
    return res.status(500).json({ success: false, error: 'RESET_FAILED', message: error.message || 'فشل إعادة ضبط النظام' });
  }
});




// Menu OCR Endpoint with 95% threshold & manual verification flags
app.post('/api/ocr/parse-menu', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 parameter is required' });
    }

    const ai = getGeminiClient();

    // Clean base64 string
    const cleanBase64 = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1]
      : imageBase64;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          {
            text: `أنت خبير محترف في القراءة الضوئية (OCR) لقوائم المطاعم والحلويات العربية بأعلى دقة ممكنة.
المطلوب استخراج كافة أصناف المنيو من الصورة بدقة متناهية:
1. Category (اسم القسم مثل: ساندوتشات, كريب, برجر, ألبان, حلويات...)
2. Product Name (اسم المنتج بالضبط باللغة العربية)
3. Product Name English (الاسم بالإنجليزية إن وجد أو ترجمة حرفية دقيقة)
4. Price (السعر بالضبط كرقم)
5. Description (الوصف والمكونات المكتوبة إن وجدت)
6. confidenceScore (درجة الثقة من 0 إلى 100)
7. isLowConfidence (ضع true إذا كانت نسبة الثقة بأي كلمة أو سعر أقل من 95% أو غير واضحة 100%)
8. unreadableReason (السبب إذا كانت القراءة غير أكيدة)

قاعدة صارمة: لا تخمن أو تفترض أي كلمة أو سعر غير واضح بنسبة 100%. إذا كان السعر أو الاسم غير مقروء بدقة 95% على الأقل، علم الصنف على أنه isLowConfidence: true واشرح الكلمة غير الواضحة ليطلب النظام تأكيداً يدوي من المستخدم.`,
          },
        ],
      },
      config: {
        systemInstruction: `High Precision OCR System for Arabic Menu Reading.
Accuracy is strictly prioritized over speed.
Rules:
- Extract Category, Product Name (Arabic), Product Name (English), Price, and Description.
- Evaluate OCR confidence for each item on a 0-100 scale.
- NEVER guess or output estimated values when text/price is blurry, low contrast, or cut off.
- If ANY word or digit has confidence below 95%, set \`isLowConfidence: true\`, \`confidenceScore < 95\`, and detail \`unreadableReason\`.
- Output strictly structured JSON conforming to the requested response schema.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            menuTitle: { type: Type.STRING, description: 'عنوان أو اسم القائمة المكتشفة' },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: 'قسم المنتج' },
                  productName: { type: Type.STRING, description: 'اسم المنتج باللغة العربية' },
                  productNameEn: { type: Type.STRING, description: 'اسم المنتج باللغة الإنجليزية' },
                  price: { type: Type.NUMBER, description: 'سعر المنتج بالضبط' },
                  description: { type: Type.STRING, description: 'وصف المنتج أو المكونات' },
                  confidenceScore: { type: Type.NUMBER, description: 'درجة الثقة من 0 إلى 100' },
                  isLowConfidence: {
                    type: Type.BOOLEAN,
                    description: 'true إذا كانت نسبة الثقة أقل من 95% أو غير واضحة',
                  },
                  unreadableReason: {
                    type: Type.STRING,
                    description: 'سبب عدم وضوح النص أو السعر إن وجد',
                  },
                },
                required: ['category', 'productName', 'price', 'confidenceScore', 'isLowConfidence'],
              },
            },
          },
          required: ['items'],
        },
      },
    });

    const responseText = response.text || '{}';
    const parsedData = JSON.parse(responseText);

    const items = parsedData.items || [];
    const highConfidenceItems = items.filter((item: any) => !item.isLowConfidence && item.confidenceScore >= 95);
    const lowConfidenceItems = items.filter((item: any) => item.isLowConfidence || item.confidenceScore < 95);

    return res.json({
      success: true,
      menuTitle: parsedData.menuTitle || 'قائمة بامبورينا المكتشفة',
      totalExtracted: items.length,
      highConfidenceCount: highConfidenceItems.length,
      lowConfidenceCount: lowConfidenceItems.length,
      items,
      highConfidenceItems,
      lowConfidenceItems,
      requiresManualConfirmation: lowConfidenceItems.length > 0,
      structuredJson: parsedData,
    });
  } catch (error: any) {
    console.error('OCR Processing error:', error);
    return res.status(500).json({
      error: 'فشل في قراءة صورة المنيو عبر الذكاء الاصطناعي',
      details: error?.message || String(error),
    });
  }
});

// Setup Vite or Static File Server
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
