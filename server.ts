import express from 'express';
import path from 'path';
import fs from 'fs';
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
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'رمز الدخول مفقود' });
  }

  try {
    const { getAuthenticatedUserWithPermissions, verifyUserAdminClaim } = await import('./server/firebaseAdmin');
    await getAuthenticatedUserWithPermissions(idToken);
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
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'رمز الدخول مفقود' });
  }

  try {
    const { getAuthenticatedUserWithPermissions, assignAdminClaim } = await import('./server/firebaseAdmin');
    const authUser = await getAuthenticatedUserWithPermissions(idToken);
    
    // Strict Admin check: Only super admins can assign admin claims
    if (!authUser.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'فقط مدير النظام الرئيسي (Admin) يحق له تعيين صلاحيات المشرف',
      });
    }

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

// =========================================================================
// RBAC / User Management API Endpoints
// =========================================================================

// Session Synchronization & Profile Provisioning Endpoint
app.post('/api/auth/sync-session', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'رمز الدخول مفقود',
    });
  }

  try {
    const { getAuthenticatedUserWithPermissions } = await import('./server/firebaseAdmin');
    const user = await getAuthenticatedUserWithPermissions(idToken);
    return res.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('❌ [API /api/auth/sync-session] Error:', error?.message);
    return res.status(403).json({
      success: false,
      error: error.message || 'AUTH_SYNC_FAILED',
      message: error.message || 'فشل مزامنة جلسة المستخدم',
    });
  }
});

// Get Current Authenticated User & Permissions Profile
app.get('/api/admin/me', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'رمز الدخول مفقود',
    });
  }

  try {
    const { getAuthenticatedUserWithPermissions } = await import('./server/firebaseAdmin');
    const user = await getAuthenticatedUserWithPermissions(idToken);
    return res.json({
      success: true,
      user,
    });
  } catch (error: any) {
    return res.status(403).json({
      success: false,
      error: error.message || 'AUTH_FAILED',
      message: error.message || 'فشل التحقق من هوية وصلاحيات المستخدم',
    });
  }
});

// Get All Users (Requires 'users.view' or Admin)
app.get('/api/admin/users', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'رمز الدخول مفقود' });
  }

  try {
    const { assertUserPermission, executeAdminGetAllUsers } = await import('./server/firebaseAdmin');
    await assertUserPermission(idToken, 'users.view');

    const users = await executeAdminGetAllUsers();
    return res.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error: any) {
    console.error('❌ [API /api/admin/users] Error:', error?.message);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({
      success: false,
      error: error?.message || 'FAILED_TO_LOAD_USERS',
      message: error?.message || 'فشل تحميل قائمة المستخدمين',
    });
  }
});

// Create New System User (Requires 'users.create' or Admin)
app.post('/api/admin/users/create', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { email, password, displayName, role, permissions, branchId } = req.body;

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'رمز الدخول مفقود' });
  }

  try {
    const { assertUserPermission, executeAdminCreateUser } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'users.create');

    // Privilege escalation prevention: Only full Admins can create new Admin users
    if (role === 'admin' && !authUser.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'PRIVILEGE_ESCALATION_DENIED',
        message: 'فقط مدير النظام الرئيسي يحق له إنشاء حسابات بمستوى Admin',
      });
    }

    const result = await executeAdminCreateUser({
      email,
      password,
      displayName,
      role,
      permissions,
      branchId,
      adminUid: authUser.uid,
      adminEmail: authUser.email,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('❌ [API /api/admin/users/create] Error:', error?.message);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH') || error?.message?.includes('PRIVILEGE');
    return res.status(isForbidden ? 403 : 500).json({
      success: false,
      error: error?.message || 'FAILED_TO_CREATE_USER',
      message: error?.message || 'فشل إنشاء حساب المستخدم',
    });
  }
});

// Update Existing User Profile & Permissions (Requires 'users.edit' or Admin)
app.post('/api/admin/users/update', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { uid, displayName, role, permissions, branchId } = req.body;

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'رمز الدخول مفقود' });
  }

  if (!uid) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم uid مطلوب' });
  }

  try {
    const { assertUserPermission, executeAdminUpdateUser, getFirebaseAdminFirestore } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'users.edit');

    // Privilege escalation checks
    if (!authUser.isAdmin) {
      if (role === 'admin') {
        return res.status(403).json({
          success: false,
          error: 'PRIVILEGE_ESCALATION_DENIED',
          message: 'فقط مدير النظام الرئيسي يحق له ترفيع الحسابات إلى Admin',
        });
      }
      const db = getFirebaseAdminFirestore();
      const targetSnap = await db.collection('users').doc(uid).get();
      if (targetSnap.exists && targetSnap.data()?.role === 'admin') {
        return res.status(403).json({
          success: false,
          error: 'PRIVILEGE_ESCALATION_DENIED',
          message: 'لا يمكنك تعديل بيانات أو صلاحيات حساب Admin',
        });
      }
    }

    const result = await executeAdminUpdateUser({
      uid,
      displayName,
      role,
      permissions,
      branchId,
      adminUid: authUser.uid,
      adminEmail: authUser.email,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('❌ [API /api/admin/users/update] Error:', error?.message);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH') || error?.message?.includes('PRIVILEGE');
    return res.status(isForbidden ? 403 : 500).json({
      success: false,
      error: error?.message || 'FAILED_TO_UPDATE_USER',
      message: error?.message || 'فشل تحديث بيانات وصلاحيات المستخدم',
    });
  }
});

// Toggle User Status (Activate / Suspend) (Requires 'users.edit' or Admin)
app.post('/api/admin/users/toggle-status', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { uid, isActive } = req.body;

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'رمز الدخول مفقود' });
  }

  if (!uid) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم uid مطلوب' });
  }

  try {
    const { assertUserPermission, executeAdminToggleUserStatus, getFirebaseAdminFirestore } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'users.edit');

    if (!authUser.isAdmin) {
      const db = getFirebaseAdminFirestore();
      const targetSnap = await db.collection('users').doc(uid).get();
      if (targetSnap.exists && targetSnap.data()?.role === 'admin') {
        return res.status(403).json({
          success: false,
          error: 'PRIVILEGE_ESCALATION_DENIED',
          message: 'لا يمكنك تغيير حالة حساب Admin',
        });
      }
    }

    const result = await executeAdminToggleUserStatus({
      uid,
      isActive: Boolean(isActive),
      adminUid: authUser.uid,
      adminEmail: authUser.email,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('❌ [API /api/admin/users/toggle-status] Error:', error?.message);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({
      success: false,
      error: error?.message || 'FAILED_TO_TOGGLE_USER_STATUS',
      message: error?.message || 'فشل تغيير حالة تفعيل المستخدم',
    });
  }
});

// Reset User Password (Requires 'users.edit' or Admin)
app.post('/api/admin/users/reset-password', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { uid, newPassword } = req.body;

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'رمز الدخول مفقود' });
  }

  if (!uid || !newPassword) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم وكلمة المرور الجديدة مطلوبان' });
  }

  try {
    const { assertUserPermission, executeAdminResetUserPassword, getFirebaseAdminFirestore } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'users.edit');

    if (!authUser.isAdmin) {
      const db = getFirebaseAdminFirestore();
      const targetSnap = await db.collection('users').doc(uid).get();
      if (targetSnap.exists && targetSnap.data()?.role === 'admin') {
        return res.status(403).json({
          success: false,
          error: 'PRIVILEGE_ESCALATION_DENIED',
          message: 'لا يمكنك تغيير كلمة مرور حساب Admin',
        });
      }
    }

    const result = await executeAdminResetUserPassword({
      uid,
      newPassword,
      adminUid: authUser.uid,
      adminEmail: authUser.email,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('❌ [API /api/admin/users/reset-password] Error:', error?.message);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({
      success: false,
      error: error?.message || 'FAILED_TO_RESET_PASSWORD',
      message: error?.message || 'فشل إعادة تعيين كلمة المرور',
    });
  }
});

// Delete User (Requires 'users.delete' or Admin)
app.post('/api/admin/users/delete', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { uid } = req.body;

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'رمز الدخول مفقود' });
  }

  if (!uid) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم مطلوب' });
  }

  try {
    const { assertUserPermission, executeAdminDeleteUser, getFirebaseAdminFirestore } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'users.delete');

    if (!authUser.isAdmin) {
      const db = getFirebaseAdminFirestore();
      const targetSnap = await db.collection('users').doc(uid).get();
      if (targetSnap.exists && targetSnap.data()?.role === 'admin') {
        return res.status(403).json({
          success: false,
          error: 'PRIVILEGE_ESCALATION_DENIED',
          message: 'لا يمكنك حذف حساب Admin',
        });
      }
    }

    const result = await executeAdminDeleteUser({
      uid,
      adminUid: authUser.uid,
      adminEmail: authUser.email,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('❌ [API /api/admin/users/delete] Error:', error?.message);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({
      success: false,
      error: error?.message || 'FAILED_TO_DELETE_USER',
      message: error?.message || 'فشل حذف حساب المستخدم',
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

  const authHeader = req.headers.authorization || '';
  const tokenFromBody = req.body?.idToken || req.body?.token;
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (tokenFromBody || authHeader);

  try {
    const { assertUserPermission, executeAdminOrderStatusTransition } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'orders.update_status');

    const result = await executeAdminOrderStatusTransition({
      orderId,
      newStatus: status,
      noteAr,
      adminUid: authUser.uid,
      adminEmail: authUser.email || 'admin@pamborina.com',
    });

    console.log(`✅ [Admin Order API] Order ${orderId} (${result.orderNumber}) transitioned from ${result.previousStatus} -> ${result.newStatus} by ${authUser.email}`);

    return res.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
    });
  } catch (error: any) {
    console.error(`❌ [Admin Order API] Failed to update order status ${orderId}:`, error);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    if (isForbidden) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: error.message });
    }

    const msg = error.message || '';
    if (msg.includes('ORDER_NOT_FOUND')) {
      return res.status(404).json({
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: 'الطلب غير موجود في قاعدة البيانات',
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
      error: 'STATUS_UPDATE_ERROR',
      message: error.message || 'فشل تحديث حالة الطلب في السيرفر',
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
    const { assertUserPermission, executeAdminOrderDelete } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'orders.delete');

    const result = await executeAdminOrderDelete({
      orderId: targetId,
      orderNumber: orderNumber || (orderId && orderId.startsWith('PB-') ? orderId : undefined),
      adminUid: authUser.uid,
      adminEmail: authUser.email || 'admin@pamborina.com',
    });

    return res.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
    });
  } catch (error: any) {
    console.error(`❌ [Admin Order API] Failed to delete order ${targetId}:`, error);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({
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
    const { assertUserPermission, executeAdminBulkDeleteOrders } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'orders.bulk_delete');

    const result = await executeAdminBulkDeleteOrders({
      orderIds,
      adminUid: authUser.uid,
      adminEmail: authUser.email || 'admin@pamborina.com',
    });

    return res.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error('❌ [Admin Bulk Delete API] Failed:', error);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({
      success: false,
      error: 'BULK_DELETE_ERROR',
      message: error.message || 'فشل حذف الطلبات المحددة',
    });
  }
});

// Admin and Public Order Listing Endpoint (Direct Firebase Admin Query)
app.get(['/api/admin/orders', '/api/orders'], async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'رمز الدخول مفقود',
    });
  }

  try {
    const { assertUserPermission, executeGetAllOrders } = await import('./server/firebaseAdmin');
    await assertUserPermission(idToken, 'orders.view');

    const limitCount = Number(req.query.limit) || 300;
    const orders = await executeGetAllOrders(limitCount);
    return res.json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (error: any) {
    console.error('❌ [Get Orders API] Failed:', error);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({
      success: false,
      error: 'FETCH_ORDERS_FAILED',
      message: error.message || 'فشل جلب قائمة الطلبات من السيرفر',
    });
  }
});

// Admin and Public Drivers Listing Endpoint
app.get(['/api/admin/drivers', '/api/drivers'], async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'رمز الدخول مفقود',
    });
  }

  try {
    const { assertUserPermission, executeAdminGetDrivers } = await import('./server/firebaseAdmin');
    await assertUserPermission(idToken, 'drivers.view');

    const drivers = await executeAdminGetDrivers();
    return res.json({
      success: true,
      drivers,
      count: drivers.length,
    });
  } catch (error: any) {
    console.error('❌ [Get Drivers API] Failed:', error);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({
      success: false,
      error: 'FETCH_DRIVERS_FAILED',
      message: error.message || 'فشل جلب قائمة المناديب',
    });
  }
});

// Admin Save / Update Driver Endpoint
app.post(['/api/admin/drivers/save', '/api/admin/drivers'], async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  try {
    const { id, name, phone, status, vehicleType, notes } = req.body;
    const { assertUserPermission, executeAdminSaveDriver } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'drivers.manage');

    const result = await executeAdminSaveDriver({
      id,
      name,
      phone,
      status,
      vehicleType,
      notes,
      adminUid: authUser.uid,
      adminEmail: authUser.email || 'admin@pamborina.com',
    });

    return res.json(result);
  } catch (error: any) {
    console.error('❌ [Admin Save Driver API] Failed:', error);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({
      success: false,
      error: 'SAVE_DRIVER_FAILED',
      message: error.message || 'فشل حفظ بيانات المندوب',
    });
  }
});

// Admin Delete Driver Endpoint
app.post(['/api/admin/drivers/delete', '/api/admin/drivers/:id/delete'], async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  try {
    const id = req.params.id || req.body.id;
    const name = req.body.name;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_DRIVER_ID',
        message: 'معرف المندوب مطلوب',
      });
    }

    const { assertUserPermission, executeAdminDeleteDriver } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'drivers.manage');

    const result = await executeAdminDeleteDriver({
      id,
      name,
      adminUid: authUser.uid,
      adminEmail: authUser.email || 'admin@pamborina.com',
    });

    return res.json(result);
  } catch (error: any) {
    console.error('❌ [Admin Delete Driver API] Failed:', error);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({
      success: false,
      error: 'DELETE_DRIVER_FAILED',
      message: error.message || 'فشل حذف المندوب',
    });
  }
});

// Admin Driver Settlement Endpoint
app.post('/api/admin/drivers/settle', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  try {
    const { driverId, driverName, amount, paymentMethod, notes } = req.body;
    const { assertUserPermission, executeAdminCreateDriverSettlement } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'drivers.settle');

    const result = await executeAdminCreateDriverSettlement({
      driverId,
      driverName,
      amount: Number(amount),
      paymentMethod,
      notes,
      adminUid: authUser.uid,
      adminEmail: authUser.email || 'admin@pamborina.com',
    });

    return res.json(result);
  } catch (error: any) {
    console.error('❌ [Admin Driver Settlement API] Failed:', error);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 400).json({
      success: false,
      error: 'SETTLEMENT_FAILED',
      message: error.message || 'تعذر إتمام تصفية حساب المندوب',
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
    const { assertUserPermission, executeAdminCleanOrders } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'orders.view');

    if (!authUser.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'فقط مدير النظام الرئيسي (Admin) يحق له تنظيف الطلبات القديمة',
      });
    }

    const result = await executeAdminCleanOrders({
      statuses: statuses || ['completed', 'cancelled'],
      olderThanDays: Number(olderThanDays) || 0,
      adminUid: authUser.uid,
      adminEmail: authUser.email || 'admin@pamborina.com',
    });

    return res.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error('❌ [Admin Clean Orders API] Failed:', error);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({
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
    const { assertUserPermission, executeAdminSystemReset } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'system.reset');

    if (!authUser.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'فقط مدير النظام الرئيسي (Admin) يحق له إرسال طلب إعادة ضبط النظام',
      });
    }

    const result = await executeAdminSystemReset({
      adminUid: authUser.uid,
      adminEmail: authUser.email || 'admin@pamborina.com',
    });

    return res.json({ success: true, deletedOrdersCount: result.deletedOrdersCount });
  } catch (error: any) {
    console.error('❌ [Admin System Reset API] Failed:', error);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({ success: false, error: 'RESET_FAILED', message: error.message || 'فشل إعادة ضبط النظام' });
  }
});

// Admin Assign Driver to Order Endpoint
app.post('/api/admin/orders/:orderId/assign-driver', async (req, res) => {
  const { orderId } = req.params;
  const { driver } = req.body;
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  try {
    const { assertUserPermission, getFirebaseAdminFirestore } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, ['orders.assign_driver', 'orders.edit']);

    const adminDb = getFirebaseAdminFirestore();
    const orderRef = adminDb.collection('orders').doc(orderId);

    const updatePayload = driver
      ? {
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          driverAssignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : {
          driverId: null,
          driverName: null,
          driverPhone: null,
          driverAssignedAt: null,
          updatedAt: new Date().toISOString(),
        };

    await orderRef.update(updatePayload);

    // Audit log
    try {
      const auditRef = adminDb.collection('auditLogs').doc();
      await auditRef.set({
        action: 'ASSIGN_DRIVER',
        targetType: 'order',
        targetId: orderId,
        adminUid: authUser.uid,
        adminEmail: authUser.email,
        createdAt: new Date().toISOString(),
        summaryAr: driver ? `تعيين المندوب "${driver.name}" للطلب #${orderId}` : `إلغاء تعيين المندوب للطلب #${orderId}`,
      });
    } catch {
      // non-blocking
    }

    return res.json({ success: true, orderId, driver });
  } catch (error: any) {
    console.error('❌ [Admin Assign Driver API] Failed:', error);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({ success: false, error: error.message || 'Failed to assign driver' });
  }
});

// Admin Update Order Delivery Fee Endpoint
app.post('/api/admin/orders/:orderId/delivery-fee', async (req, res) => {
  const { orderId } = req.params;
  const { deliveryFee, notes, updatedBy } = req.body;
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  try {
    const { assertUserPermission, getFirebaseAdminFirestore } = await import('./server/firebaseAdmin');
    const authUser = await assertUserPermission(idToken, 'orders.edit');

    const adminDb = getFirebaseAdminFirestore();
    const orderRef = adminDb.collection('orders').doc(orderId);
    const docSnap = await orderRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const orderData = docSnap.data() || {};
    const subtotal = Number(orderData.pricing?.subtotal || orderData.subtotal || 0);
    const discountAmount = Number(orderData.pricing?.discountAmount || orderData.discountAmount || 0);
    const fee = Number(deliveryFee) || 0;
    const newTotal = Number(Math.max(0, subtotal + fee - discountAmount).toFixed(2));
    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      'pricing.deliveryFee': fee,
      'pricing.total': newTotal,
      deliveryFee: fee,
      grandTotal: newTotal,
      totalPrice: newTotal,
      deliveryFeeManuallySet: true,
      deliveryFeeNotes: notes || '',
      deliveryFeeUpdatedAt: nowIso,
      deliveryFeeUpdatedBy: updatedBy || authUser.email || 'admin@pamborina.com',
      updatedAt: nowIso,
    };

    await orderRef.update(updatePayload);

    // Audit Log
    try {
      const auditRef = adminDb.collection('auditLogs').doc();
      await auditRef.set({
        action: 'UPDATE_DELIVERY_FEE',
        targetType: 'order',
        targetId: orderId,
        adminUid: authUser.uid,
        adminEmail: authUser.email,
        createdAt: nowIso,
        summaryAr: `تعديل رسوم التوصيل للطلب #${orderId} إلى ${fee} ج.م (الإجمالي الجديد: ${newTotal} ج.م)`,
      });
    } catch {
      // non-blocking
    }

    return res.json({ success: true, orderId, deliveryFee: fee, total: newTotal, subtotal });
  } catch (error: any) {
    console.error('❌ [Admin Update Delivery Fee API] Failed:', error);
    const isForbidden = error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('AUTH');
    return res.status(isForbidden ? 403 : 500).json({ success: false, error: error.message || 'Failed to update delivery fee' });
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
  // Always serve /uploads statically (both in development and production)
  const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
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

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    try {
      const { syncAllStaticUsersToFirestore } = await import('./server/firebaseAdmin');
      await syncAllStaticUsersToFirestore();
    } catch (err: any) {
      console.warn('⚠️ [Startup] Static users background sync notice:', err?.message);
    }
  });
}

start();
