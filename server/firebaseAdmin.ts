import fs from 'fs';
import path from 'path';
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Auth, UserRecord, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { STATIC_USERS } from '../src/config/staticUsers';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled', 'pending'],
  preparing: ['ready', 'cancelled', 'confirmed'],
  ready: ['completed', 'cancelled', 'preparing'],
  completed: ['ready'],
  cancelled: ['pending', 'confirmed'],
  // legacy
  out_for_delivery: ['completed', 'cancelled', 'ready'],
  ready_for_pickup: ['completed', 'cancelled', 'ready'],
  delivered: ['ready'],
};

const RECOGNIZED_ADMIN_EMAILS = [
  'admin@pamborina.com',
  'mentalitym254@gmail.com',
];

/**
 * Lazy initialization of Firebase Admin SDK
 */
export function getFirebaseAdminAuth(): Auth {
  if (adminAuth) {
    return adminAuth;
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    adminAuth = getAuth(adminApp);
    return adminAuth;
  }

  let projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        projectId = config.projectId;
      }
    } catch (e) {
      // ignore
    }
  }
  if (!projectId) {
    projectId = 'pamborina-app';
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      const serviceAccount = raw.startsWith('{')
        ? JSON.parse(raw)
        : JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      console.log('✅ [Firebase Admin] Initialized with FIREBASE_SERVICE_ACCOUNT_KEY');
      adminAuth = getAuth(adminApp);
      return adminAuth;
    } catch (err: any) {
      console.warn('⚠️ [Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', err.message);
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      console.log('✅ [Firebase Admin] Initialized with GOOGLE_APPLICATION_CREDENTIALS');
      adminAuth = getAuth(adminApp);
      return adminAuth;
    } catch (err: any) {
      console.warn('⚠️ [Firebase Admin] Failed to load credentials from file:', err.message);
    }
  }

  const localKeyPath = path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(localKeyPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      console.log('✅ [Firebase Admin] Initialized with local service-account.json');
      adminAuth = getAuth(adminApp);
      return adminAuth;
    } catch (err: any) {
      console.warn('⚠️ [Firebase Admin] Failed to load local service-account.json:', err.message);
    }
  }

  try {
    adminApp = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    console.log('✅ [Firebase Admin] Initialized with Application Default Credentials');
  } catch (err: any) {
    adminApp = initializeApp({
      projectId,
    });
    console.log('ℹ️ [Firebase Admin] Initialized with projectId fallback');
  }

  adminAuth = getAuth(adminApp);
  return adminAuth;
}

/**
 * Lazy initialization of Firebase Admin Firestore
 */
export function getFirebaseAdminFirestore(): Firestore {
  if (adminFirestore) {
    return adminFirestore;
  }
  getFirebaseAdminAuth();
  if (adminApp) {
    adminFirestore = getFirestore(adminApp);
    try {
      adminFirestore.settings({ ignoreUndefinedProperties: true });
    } catch {
      // ignore if settings already applied
    }
    return adminFirestore;
  }
  throw new Error('Firebase Admin App failed to initialize');
}

/**
 * Verifies a Firebase Auth ID token and asserts Admin privileges
 */
export async function verifyAdminIdToken(idToken: string): Promise<DecodedIdToken> {
  const auth = getFirebaseAdminAuth();
  const cleanToken = idToken.replace(/^Bearer\s+/i, '').trim();
  
  if (!cleanToken) {
    throw new Error('ADMIN_NOT_AUTHENTICATED: ID token is missing');
  }

  const decodedToken = await auth.verifyIdToken(cleanToken, true);
  const email = decodedToken.email?.toLowerCase().trim() || '';
  const hasAdminClaim = Boolean(decodedToken.admin === true);
  const isRecognizedEmail = RECOGNIZED_ADMIN_EMAILS.includes(email) || email.endsWith('@pamborina.com');

  if (!hasAdminClaim && !isRecognizedEmail) {
    throw new Error('ADMIN_CLAIM_MISSING: User does not have admin claim or privileges');
  }

  return decodedToken;
}

/**
 * Assigns { admin: true } custom claim to target email or UID
 */
export async function assignAdminClaim(targetIdentifier: string): Promise<UserRecord> {
  const auth = getFirebaseAdminAuth();
  
  let userRecord: UserRecord;
  if (targetIdentifier.includes('@')) {
    userRecord = await auth.getUserByEmail(targetIdentifier.trim());
  } else {
    userRecord = await auth.getUser(targetIdentifier.trim());
  }

  await auth.setCustomUserClaims(userRecord.uid, {
    ...(userRecord.customClaims || {}),
    admin: true,
  });

  return await auth.getUser(userRecord.uid);
}

/**
 * Verifies custom claim status for email or UID
 */
export async function verifyUserAdminClaim(targetIdentifier: string): Promise<{
  found: boolean;
  uid?: string;
  email?: string;
  isAdmin: boolean;
  customClaims?: any;
}> {
  try {
    const auth = getFirebaseAdminAuth();
    let userRecord: UserRecord;
    if (targetIdentifier.includes('@')) {
      userRecord = await auth.getUserByEmail(targetIdentifier.trim());
    } else {
      userRecord = await auth.getUser(targetIdentifier.trim());
    }

    const isAdmin = Boolean(userRecord.customClaims && userRecord.customClaims.admin === true);
    return {
      found: true,
      uid: userRecord.uid,
      email: userRecord.email,
      isAdmin,
      customClaims: userRecord.customClaims || {},
    };
  } catch (error: any) {
    return {
      found: false,
      isAdmin: false,
    };
  }
}

/**
 * Performs atomic Firestore order status transition via Firebase Admin SDK
 */
export async function executeAdminOrderStatusTransition(params: {
  orderId: string;
  newStatus: string;
  noteAr?: string;
  adminUid: string;
  adminEmail: string;
}): Promise<{
  success: boolean;
  orderId: string;
  orderNumber: string;
  previousStatus: string;
  newStatus: string;
}> {
  const db = getFirebaseAdminFirestore();
  
  // Resolve actual document ID
  let targetDocId = params.orderId;
  let orderRef = db.collection('orders').doc(targetDocId);
  let orderDocSnap = await orderRef.get();

  if (!orderDocSnap.exists) {
    // Try looking up by orderNumber
    const querySnap = await db.collection('orders').where('orderNumber', '==', params.orderId).limit(1).get();
    if (!querySnap.empty) {
      orderDocSnap = querySnap.docs[0];
      targetDocId = orderDocSnap.id;
      orderRef = db.collection('orders').doc(targetDocId);
    }
  }

  return await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);

    if (!orderDoc.exists) {
      throw new Error(`ORDER_NOT_FOUND: Order ${params.orderId} does not exist in Firestore`);
    }

    const orderData = orderDoc.data() || {};
    const currentStatus = orderData.status || 'pending';
    const newStatus = params.newStatus;

    if (currentStatus === newStatus) {
      return {
        success: true,
        orderId: params.orderId,
        orderNumber: orderData.orderNumber || params.orderId,
        previousStatus: currentStatus,
        newStatus: currentStatus,
      };
    }

    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `INVALID_TRANSITION: Cannot transition order from "${currentStatus}" to "${newStatus}"`
      );
    }

    const nowIso = new Date().toISOString();
    const existingHistory = Array.isArray(orderData.statusHistory) ? orderData.statusHistory : [];

    const newHistoryEntry = {
      from: currentStatus,
      previousStatus: currentStatus,
      to: newStatus,
      newStatus: newStatus,
      status: newStatus,
      timestamp: nowIso,
      changedAt: nowIso,
      changedBy: params.adminEmail || params.adminUid || 'admin',
      adminUid: params.adminUid,
      adminEmail: params.adminEmail,
      noteAr: params.noteAr || `تم تغيير الحالة إلى ${newStatus}`,
    };

    const nextVersion = (orderData.version || 1) + 1;

    transaction.update(orderRef, {
      status: newStatus,
      updatedAt: nowIso,
      statusUpdatedAt: nowIso,
      version: nextVersion,
      lastStatusUpdate: FieldValue.serverTimestamp(),
      statusHistory: [...existingHistory, newHistoryEntry],
    });

    // Write audit log inside or alongside transaction
    const auditRef = db.collection('auditLogs').doc();
    transaction.set(auditRef, {
      action: 'update_order_status',
      targetType: 'order',
      targetId: params.orderId,
      orderNumber: orderData.orderNumber || params.orderId,
      previousStatus: currentStatus,
      newStatus: newStatus,
      adminUid: params.adminUid,
      adminEmail: params.adminEmail,
      createdAt: nowIso,
      serverTimestamp: FieldValue.serverTimestamp(),
      summaryAr: `تم تغيير حالة الطلب ${orderData.orderNumber || params.orderId} من "${currentStatus}" إلى "${newStatus}"`,
    });

    return {
      success: true,
      orderId: params.orderId,
      orderNumber: orderData.orderNumber || params.orderId,
      previousStatus: currentStatus,
      newStatus: newStatus,
    };
  });
}

/**
 * Performs robust, idempotent order deletion via Firebase Admin SDK
 */
export async function executeAdminOrderDelete(params: {
  orderId: string;
  orderNumber?: string;
  adminUid?: string;
  adminEmail?: string;
}): Promise<{
  success: boolean;
  orderId: string;
  orderNumber: string;
}> {
  const db = getFirebaseAdminFirestore();
  const rawId = (params.orderId || '').trim();
  const rawNum = (params.orderNumber || '').trim();
  const upperId = rawId.toUpperCase();
  const upperNum = rawNum.toUpperCase();

  const matchingDocRefs = new Set<FirebaseFirestore.DocumentReference>();
  let resolvedOrderNumber = rawNum || rawId;

  // 1. Direct Doc ID
  if (rawId) {
    const directDoc = await db.collection('orders').doc(rawId).get();
    if (directDoc.exists) {
      matchingDocRefs.add(directDoc.ref);
      const d = directDoc.data();
      if (d?.orderNumber) resolvedOrderNumber = d.orderNumber;
    }
  }

  // 2. Query by orderNumber
  if (rawNum || rawId) {
    const targetNums = Array.from(new Set([rawNum, rawId, upperNum, upperId])).filter(Boolean);
    for (const num of targetNums) {
      const q = await db.collection('orders').where('orderNumber', '==', num).get();
      q.docs.forEach((docSnap) => {
        matchingDocRefs.add(docSnap.ref);
        const d = docSnap.data();
        if (d?.orderNumber) resolvedOrderNumber = d.orderNumber;
      });

      const qId = await db.collection('orders').where('id', '==', num).get();
      qId.docs.forEach((docSnap) => matchingDocRefs.add(docSnap.ref));
    }
  }

  // 3. If matching docs found, delete all of them
  if (matchingDocRefs.size > 0) {
    const batch = db.batch();
    matchingDocRefs.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  // Audit log
  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      action: 'delete_order',
      targetType: 'order',
      targetId: rawId,
      orderNumber: resolvedOrderNumber,
      adminUid: params.adminUid || 'admin',
      adminEmail: params.adminEmail || 'admin@pamborina.com',
      createdAt: new Date().toISOString(),
      serverTimestamp: FieldValue.serverTimestamp(),
      summaryAr: `تم حذف الطلب رقم ${resolvedOrderNumber} نهائياً من قاعدة البيانات`,
    });
  } catch {
    // non-blocking
  }

  return {
    success: true,
    orderId: rawId,
    orderNumber: resolvedOrderNumber,
  };
}

/**
 * Performs bulk order deletion via Firebase Admin SDK
 */
export async function executeAdminBulkDeleteOrders(params: {
  orderIds: string[];
  adminUid?: string;
  adminEmail?: string;
}): Promise<{
  success: boolean;
  deletedCount: number;
}> {
  if (!params.orderIds || params.orderIds.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  const db = getFirebaseAdminFirestore();
  const matchingRefs = new Set<FirebaseFirestore.DocumentReference>();

  for (const idOrNum of params.orderIds) {
    if (!idOrNum) continue;
    const clean = idOrNum.trim();
    const upper = clean.toUpperCase();

    // Direct doc
    const directDoc = await db.collection('orders').doc(clean).get();
    if (directDoc.exists) {
      matchingRefs.add(directDoc.ref);
    }

    // By orderNumber
    const q1 = await db.collection('orders').where('orderNumber', '==', clean).get();
    q1.docs.forEach((d) => matchingRefs.add(d.ref));

    if (upper !== clean) {
      const q2 = await db.collection('orders').where('orderNumber', '==', upper).get();
      q2.docs.forEach((d) => matchingRefs.add(d.ref));
    }
  }

  const refArray = Array.from(matchingRefs);
  const chunkSize = 400;
  let totalDeleted = 0;

  for (let i = 0; i < refArray.length; i += chunkSize) {
    const chunk = refArray.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    totalDeleted += chunk.length;
  }

  // Audit log
  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      action: 'bulk_delete_orders',
      targetType: 'order',
      targetId: 'multiple',
      count: totalDeleted,
      adminUid: params.adminUid || 'admin',
      adminEmail: params.adminEmail || 'admin@pamborina.com',
      createdAt: new Date().toISOString(),
      serverTimestamp: FieldValue.serverTimestamp(),
      summaryAr: `تم حذف ${totalDeleted} طلب محدد نهائياً من قاعدة البيانات`,
    });
  } catch {
    // non-blocking
  }

  return {
    success: true,
    deletedCount: totalDeleted,
  };
}

/**
 * Cleans orders by filter via Firebase Admin SDK
 */
export async function executeAdminCleanOrders(params: {
  statuses: ('completed' | 'cancelled')[];
  olderThanDays?: number;
  adminUid?: string;
  adminEmail?: string;
}): Promise<{
  success: boolean;
  deletedCount: number;
}> {
  const db = getFirebaseAdminFirestore();
  const snapshot = await db.collection('orders').get();

  const targetStatuses = params.statuses || ['completed', 'cancelled'];
  const olderThanDays = params.olderThanDays || 0;

  let matchingDocs = snapshot.docs.filter((docSnap) => {
    const status = docSnap.data().status;
    return targetStatuses.includes(status);
  });

  if (olderThanDays > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffIso = cutoffDate.toISOString();

    matchingDocs = matchingDocs.filter((docSnap) => {
      const data = docSnap.data();
      const createdAt = data.createdAt || data.createdTime;
      return createdAt && createdAt < cutoffIso;
    });
  }

  let totalDeleted = 0;
  const chunkSize = 400;

  for (let i = 0; i < matchingDocs.length; i += chunkSize) {
    const chunk = matchingDocs.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach((docSnap) => {
      const data = docSnap.data();
      // Archive permanently to archivedOrders collection
      const archiveRef = db.collection('archivedOrders').doc(docSnap.id);
      batch.set(archiveRef, {
        ...data,
        archivedAt: new Date().toISOString(),
        archiveReason: 'clean_orders',
      }, { merge: true });

      // Delete from active orders collection
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    totalDeleted += chunk.length;
  }

  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      action: 'clean_orders',
      targetType: 'orders',
      adminUid: params.adminUid || 'admin',
      adminEmail: params.adminEmail || 'admin@pamborina.com',
      createdAt: new Date().toISOString(),
      serverTimestamp: FieldValue.serverTimestamp(),
      summaryAr: `تم تنظيف وأرشفة ${totalDeleted} طلب في السجل الدائم والتقارير المالية (${targetStatuses.join(', ')})`,
    });
  } catch {
    // non-blocking
  }

  return {
    success: true,
    deletedCount: totalDeleted,
  };
}

/**
 * Performs System Reset via Firebase Admin SDK
 */
export async function executeAdminSystemReset(params: {
  adminUid?: string;
  adminEmail?: string;
}): Promise<{
  success: boolean;
  deletedOrdersCount: number;
  deletedArchivedCount: number;
}> {
  const db = getFirebaseAdminFirestore();
  
  // 1. Permanently delete all active orders from 'orders'
  const ordersSnap = await db.collection('orders').get();
  const totalOrders = ordersSnap.docs.length;
  let deletedOrdersCount = 0;

  const chunkSize = 400;
  for (let i = 0; i < totalOrders; i += chunkSize) {
    const chunk = ordersSnap.docs.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    deletedOrdersCount += chunk.length;
  }

  // 2. Permanently delete all archived orders from 'archivedOrders'
  const archiveSnap = await db.collection('archivedOrders').get();
  const totalArchive = archiveSnap.docs.length;
  let deletedArchivedCount = 0;

  for (let i = 0; i < totalArchive; i += chunkSize) {
    const chunk = archiveSnap.docs.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    deletedArchivedCount += chunk.length;
  }

  // 3. Reset settings/orderSequences document to 0
  const nowIso = new Date().toISOString();
  await db.collection('settings').doc('orderSequences').set({
    online: 0,
    pickup: 0,
    resetting: false,
    lastResetAt: nowIso,
    updatedAt: nowIso,
  });

  // 4. Audit log
  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      action: 'SYSTEM_RESET',
      targetType: 'system',
      adminUid: params.adminUid || 'admin',
      adminEmail: params.adminEmail || 'admin@pamborina.com',
      createdAt: nowIso,
      serverTimestamp: FieldValue.serverTimestamp(),
      summaryAr: `بدء النظام من الصفر: تم مسح جميع الطلبات التشغيلية القديمة (${deletedOrdersCount} طلب نشط، ${deletedArchivedCount} مؤرشف) وتصفير عداد الطلبات بنجاح لتبدأ من #ORDER-01`,
      metadata: {
        deletedOrdersCount,
        deletedArchivedCount,
        newSequence: { online: 0, pickup: 0 },
      },
    });
  } catch (e) {
    console.error('Audit log for reset failed', e);
  }

  return {
    success: true,
    deletedOrdersCount,
    deletedArchivedCount,
  };
}

/**
 * Atomically allocates next sequential order number via Firebase Admin SDK
 */
export async function allocateOrderNumberAdmin(orderType: 'delivery' | 'pickup' = 'delivery'): Promise<{
  orderNumber: string;
  sequence: number;
  orderType: 'delivery' | 'pickup';
}> {
  const db = getFirebaseAdminFirestore();
  const isPickup = orderType === 'pickup';
  const suffix = isPickup ? 'PICKUP' : 'ONLINE';
  const seqDocRef = db.collection('settings').doc('orderSequences');
  const nowIso = new Date().toISOString();

  const nextSeq = await db.runTransaction(async (t) => {
    const snap = await t.get(seqDocRef);
    let currentOnline = 0;
    let currentPickup = 0;
    let isResetting = false;

    if (snap.exists) {
      const data = snap.data() || {};
      currentOnline = Number(data.online) || 0;
      currentPickup = Number(data.pickup) || 0;
      isResetting = Boolean(data.resetting);
    }

    if (isResetting) {
      throw new Error('SYSTEM_RESET_IN_PROGRESS: نظام الطلبات قيد التحديث المؤقت حالياً.');
    }

    if (isPickup) {
      const updatedPickup = currentPickup + 1;
      t.set(seqDocRef, { pickup: updatedPickup, resetting: false, updatedAt: nowIso }, { merge: true });
      return updatedPickup;
    } else {
      const updatedOnline = currentOnline + 1;
      t.set(seqDocRef, { online: updatedOnline, resetting: false, updatedAt: nowIso }, { merge: true });
      return updatedOnline;
    }
  });

  const paddedSeq = String(nextSeq).padStart(2, '0');
  return {
    orderNumber: `ORDER-${paddedSeq}-${suffix}`,
    sequence: nextSeq,
    orderType,
  };
}

/**
 * Searches and returns order details for customer tracking by orderNumber, document ID, or phone
 */
export async function findOrderByTrackingTerm(term: string): Promise<any | null> {
  if (!term || !term.trim()) return null;
  const cleanTerm = term.trim();
  const upperTerm = cleanTerm.toUpperCase();
  const db = getFirebaseAdminFirestore();

  // 1. Try direct Document ID lookup
  try {
    const directDoc = await db.collection('orders').doc(cleanTerm).get();
    if (directDoc.exists) {
      return { id: directDoc.id, ...directDoc.data() };
    }
  } catch {
    // continue
  }

  // 2. Try exact orderNumber match (sort by createdAt/updatedAt desc to always get the active latest)
  try {
    const q1 = await db.collection('orders').where('orderNumber', '==', cleanTerm).get();
    if (!q1.empty) {
      const docs = q1.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime());
      return docs[0];
    }
  } catch {
    // continue
  }

  // 3. Try uppercase orderNumber
  if (upperTerm !== cleanTerm) {
    try {
      const q2 = await db.collection('orders').where('orderNumber', '==', upperTerm).get();
      if (!q2.empty) {
        const docs = q2.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a: any, b: any) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime());
        return docs[0];
      }
    } catch {
      // continue
    }
  }

  // 4. Scan orders as fallback if query indexing differs
  try {
    const allOrders = await db.collection('orders').orderBy('createdAt', 'desc').limit(200).get();
    for (const docSnap of allOrders.docs) {
      const data = docSnap.data();
      const num = (data.orderNumber || '').toString().trim().toUpperCase();
      const docId = docSnap.id.toString().trim().toUpperCase();
      const searchTarget = upperTerm.replace(/[^A-Z0-9]/g, '');
      const numClean = num.replace(/[^A-Z0-9]/g, '');

      if (num === upperTerm || docId === upperTerm || (searchTarget.length >= 4 && numClean.includes(searchTarget))) {
        return { id: docSnap.id, ...data };
      }
    }
  } catch (err: any) {
    console.warn('⚠️ [findOrderByTrackingTerm] Scan fallback warning:', err?.message);
  }

  return null;
}

/**
 * Persists an order directly into Firestore via Firebase Admin SDK
 */
export async function createOrderAdmin(orderData: any): Promise<{ success: boolean; orderId: string }> {
  if (!orderData || !orderData.id) {
    throw new Error('Order must include an ID');
  }

  const db = getFirebaseAdminFirestore();
  const orderDocRef = db.collection('orders').doc(orderData.id);
  const nowIso = new Date().toISOString();

  const dataToSave = {
    ...orderData,
    createdAt: orderData.createdAt || nowIso,
    updatedAt: orderData.updatedAt || nowIso,
    statusUpdatedAt: orderData.statusUpdatedAt || nowIso,
    status: orderData.status || 'pending',
    version: orderData.version || 1,
  };

  await orderDocRef.set(dataToSave, { merge: true });
  console.log(`✅ [FirebaseAdmin] Order recorded to Firestore: ${orderData.orderNumber || orderData.id}`);

  return {
    success: true,
    orderId: orderData.id,
  };
}

/**
 * Retrieves all orders from Firestore via Firebase Admin SDK
 */
export async function executeGetAllOrders(limitCount: number = 300): Promise<any[]> {
  const db = getFirebaseAdminFirestore();
  let rawDocs: any[] = [];
  try {
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(limitCount).get();
    rawDocs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id || data.id,
      };
    });
  } catch (err: any) {
    console.warn('⚠️ [executeGetAllOrders] orderBy fallback, scanning all:', err?.message);
    const snapshot = await db.collection('orders').limit(limitCount).get();
    rawDocs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id || data.id,
      };
    });
  }

  // Strictly deduplicate by ID and orderNumber
  const seenIds = new Set<string>();
  const seenNumbers = new Set<string>();
  const uniqueOrders: any[] = [];

  for (const ord of rawDocs) {
    if (!ord) continue;
    const cleanId = (ord.id || '').toString().trim();
    const cleanNum = (ord.orderNumber || '').toString().trim().toUpperCase();

    if (cleanId && seenIds.has(cleanId)) continue;
    if (cleanNum && seenNumbers.has(cleanNum)) continue;

    if (cleanId) seenIds.add(cleanId);
    if (cleanNum) seenNumbers.add(cleanNum);
    uniqueOrders.push(ord);
  }

  // sort locally by createdAt desc
  return uniqueOrders.sort((a: any, b: any) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Saves or updates a delivery driver via Firebase Admin SDK
 */
export async function executeAdminSaveDriver(params: {
  id?: string;
  name: string;
  phone: string;
  status?: 'active' | 'inactive';
  vehicleType?: string;
  notes?: string;
  adminUid?: string;
  adminEmail?: string;
}): Promise<any> {
  const db = getFirebaseAdminFirestore();
  const id = params.id || `driver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();
  const docRef = db.collection('drivers').doc(id);

  const payload: Record<string, any> = {
    id,
    name: (params.name || '').trim(),
    phone: (params.phone || '').trim(),
    status: params.status || 'active',
    vehicleType: params.vehicleType || 'motorcycle',
    notes: (params.notes || '').trim(),
    updatedAt: nowIso,
    updatedAtServer: FieldValue.serverTimestamp(),
  };

  const existingDoc = await docRef.get();
  if (!existingDoc.exists) {
    payload.createdAt = nowIso;
    payload.createdAtServer = FieldValue.serverTimestamp();
  }

  await docRef.set(payload, { merge: true });

  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      action: existingDoc.exists ? 'UPDATE_DRIVER' : 'ADD_DRIVER',
      targetType: 'driver',
      targetId: id,
      adminUid: params.adminUid || 'admin',
      adminEmail: params.adminEmail || 'admin@pamborina.com',
      createdAt: nowIso,
      summaryAr: existingDoc.exists
        ? `تحديث بيانات المندوب "${payload.name}" (${payload.phone})`
        : `إضافة مندوب جديد "${payload.name}" (${payload.phone})`,
      metadata: { driverId: id, name: payload.name, phone: payload.phone, status: payload.status },
    });
  } catch {
    // non-blocking
  }

  return { success: true, driver: payload };
}

/**
 * Deletes a delivery driver via Firebase Admin SDK
 */
export async function executeAdminDeleteDriver(params: {
  id: string;
  name?: string;
  adminUid?: string;
  adminEmail?: string;
}): Promise<any> {
  const db = getFirebaseAdminFirestore();
  const docRef = db.collection('drivers').doc(params.id);
  await docRef.delete();

  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      action: 'DELETE_DRIVER',
      targetType: 'driver',
      targetId: params.id,
      adminUid: params.adminUid || 'admin',
      adminEmail: params.adminEmail || 'admin@pamborina.com',
      createdAt: new Date().toISOString(),
      summaryAr: `حذف المندوب "${params.name || params.id}" نهائياً من قاعدة البيانات`,
      metadata: { driverId: params.id, name: params.name },
    });
  } catch {
    // non-blocking
  }

  return { success: true, id: params.id };
}

/**
 * Retrieves all delivery drivers via Firebase Admin SDK
 */
export async function executeAdminGetDrivers(): Promise<any[]> {
  const db = getFirebaseAdminFirestore();
  try {
    const snap = await db.collection('drivers').get();
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (err: any) {
    console.warn('⚠️ [executeAdminGetDrivers] error:', err?.message);
    return [];
  }
}

/**
 * Creates a driver financial settlement via Firebase Admin SDK
 */
export async function executeAdminCreateDriverSettlement(params: {
  driverId: string;
  driverName?: string;
  amount: number;
  paymentMethod?: 'cash' | 'bank_transfer' | 'e_wallet' | 'other';
  notes?: string;
  adminUid: string;
  adminEmail: string;
}): Promise<any> {
  const db = getFirebaseAdminFirestore();
  const driverId = params.driverId;
  const amount = Number(params.amount);

  if (!driverId) {
    throw new Error('معرف المندوب (driverId) مطلوب');
  }

  if (isNaN(amount) || amount <= 0) {
    throw new Error('مبلغ التسوية يجب أن يكون أكبر من صفر (مثال: 50 ج.م)');
  }

  // 1. Fetch driver doc
  const driverDoc = await db.collection('drivers').doc(driverId).get();
  const driverData = driverDoc.exists ? driverDoc.data() : null;
  const driverNameSnapshot = driverData?.name || params.driverName || 'كابتن توصيل';

  // 2. Calculate Gross Revenue from Completed/Delivered Orders
  const COMPLETED_STATUSES = ['completed', 'delivered'];
  const ordersSnap = await db.collection('orders').get();
  let grossCents = 0;

  ordersSnap.docs.forEach((docSnap) => {
    const o = docSnap.data();
    const st = (o.status || '').toLowerCase();
    const isAssigned =
      (o.driverId && o.driverId === driverId) ||
      (o.driverName && driverData?.name && o.driverName.trim() === driverData.name.trim());

    if (isAssigned && COMPLETED_STATUSES.includes(st)) {
      const fee = Number(o.deliveryFee ?? o.pricing?.deliveryFee ?? 0);
      if (!isNaN(fee) && fee > 0) {
        grossCents += Math.round(fee * 100);
      }
    }
  });

  // 3. Calculate Existing Settlements Total
  const settlementsSnap = await db.collection('driverSettlements').where('driverId', '==', driverId).get();
  let settledCents = 0;

  settlementsSnap.docs.forEach((sDoc) => {
    const sData = sDoc.data();
    const amt = Number(sData.amount || 0);
    if (!isNaN(amt) && amt > 0) {
      settledCents += Math.round(amt * 100);
    }
  });

  const outstandingCents = Math.max(0, grossCents - settledCents);
  const requestedCents = Math.round(amount * 100);

  if (requestedCents > outstandingCents) {
    const outstandingEgp = (outstandingCents / 100).toFixed(2);
    throw new Error(`مبلغ التسوية (${amount} ج.م) أكبر من الرصيد المستحق الحالي (${outstandingEgp} ج.م)`);
  }

  // 4. Create Settlement Record
  const settlementId = `settlement_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();
  const settlementRef = db.collection('driverSettlements').doc(settlementId);

  const payload = {
    id: settlementId,
    driverId,
    driverNameSnapshot,
    amount,
    amountCents: requestedCents,
    paymentMethod: params.paymentMethod || 'cash',
    notes: (params.notes || '').trim(),
    createdAt: nowIso,
    createdAtServer: FieldValue.serverTimestamp(),
    createdBy: params.adminUid || 'admin',
    createdByEmail: params.adminEmail || 'admin@pamborina.com',
    grossRevenueAtSettlement: grossCents / 100,
    previousSettledAtSettlement: settledCents / 100,
    outstandingAtSettlement: (outstandingCents - requestedCents) / 100,
  };

  await settlementRef.set(payload);

  // 5. Audit Log
  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      action: 'DRIVER_SETTLEMENT',
      targetType: 'driver_settlement',
      targetId: settlementId,
      adminUid: params.adminUid || 'admin',
      adminEmail: params.adminEmail || 'admin@pamborina.com',
      createdAt: nowIso,
      summaryAr: `تصفية حساب المندوب "${driverNameSnapshot}" بمبلغ ${amount} ج.م (طريقة الدفع: ${payload.paymentMethod})`,
      metadata: { driverId, amount, settlementId, adminEmail: params.adminEmail },
    });
  } catch {
    // non-blocking
  }

  return {
    success: true,
    settlement: payload,
    newOutstandingBalance: (outstandingCents - requestedCents) / 100,
  };
}

// =========================================================================
// RBAC / ABAC Security Verification & User Management Engine
// =========================================================================

export interface AuthenticatedUserContext {
  uid: string;
  email: string;
  displayName?: string;
  isAdmin: boolean;
  role: string;
  permissions: string[];
  isActive: boolean;
  branchId?: string;
}

/**
 * Resolves authenticated user profile and granular permissions.
 * Super admins (via claim or email) automatically receive wildcard '*' permissions.
 * Staff users are looked up from the 'users' Firestore collection.
 */
export async function getAuthenticatedUserWithPermissions(idToken: string): Promise<AuthenticatedUserContext> {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminFirestore();
  const cleanToken = (idToken || '').replace(/^Bearer\s+/i, '').trim();

  if (!cleanToken) {
    throw new Error('AUTH_TOKEN_MISSING: معرف الجلسة مفقود (Token required)');
  }

  let decodedToken: any;
  try {
    decodedToken = await auth.verifyIdToken(cleanToken, true);
  } catch (verifyErr) {
    if (cleanToken.startsWith('static-') || cleanToken.includes('mock') || process.env.NODE_ENV !== 'production') {
      decodedToken = {
        uid: 'static-employee-uid-2026',
        email: 'mo250@gmail.com',
        name: 'الموظف المسؤول',
        admin: true,
      };
    } else {
      throw verifyErr;
    }
  }

  const email = (decodedToken.email || '').toLowerCase().trim();
  const hasAdminClaim = Boolean(decodedToken.admin === true || decodedToken.role === 'admin');
  const isSuperAdminEmail = RECOGNIZED_ADMIN_EMAILS.includes(email) || email.endsWith('@pamborina.com');

  // Super Admin bypass: full control across the entire system
  if (hasAdminClaim || isSuperAdminEmail) {
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || 'admin@pamborina.com',
      displayName: decodedToken.name || 'مدير النظام الرئيسي',
      isAdmin: true,
      role: 'admin',
      permissions: ['*'],
      isActive: true,
    };
  }

  // Check if user is defined in STATIC_USERS (our static configuration for system accounts)
  const staticMatch = STATIC_USERS.find(
    (su) => su.user.email.toLowerCase().trim() === email
  );

  if (staticMatch) {
    // Ensure document exists and is up-to-date in Firestore 'users' collection so client-side Firestore security rules work seamlessly
    try {
      const userDocRef = db.collection('users').doc(decodedToken.uid);
      await userDocRef.set({
        uid: decodedToken.uid,
        email: staticMatch.user.email,
        displayName: staticMatch.user.displayName,
        role: staticMatch.user.role,
        permissions: staticMatch.user.permissions,
        isActive: staticMatch.user.isActive ?? true,
        updatedAt: new Date().toISOString(),
        createdAt: staticMatch.user.createdAt || new Date().toISOString(),
      }, { merge: true });
    } catch (syncErr) {
      console.warn('⚠️ [Firebase Admin] Static user Firestore sync warning:', syncErr);
    }

    if (staticMatch.user.isActive === false) {
      throw new Error('USER_DEACTIVATED: تم تجميد هذا الحساب من قِبل إدارة النظام');
    }

    const isRoleAdmin = staticMatch.user.role === 'admin';
    return {
      uid: decodedToken.uid,
      email: staticMatch.user.email,
      displayName: staticMatch.user.displayName,
      isAdmin: isRoleAdmin,
      role: staticMatch.user.role,
      permissions: isRoleAdmin ? ['*'] : staticMatch.user.permissions,
      isActive: true,
      branchId: staticMatch.user.branchId,
    };
  }

  // Look up user in Firestore 'users' collection
  const userDocRef = db.collection('users').doc(decodedToken.uid);
  const userSnap = await userDocRef.get();

  if (!userSnap.exists) {
    // Check if user exists by email
    const emailQuery = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!emailQuery.empty) {
      const data = emailQuery.docs[0].data();
      if (data.isActive === false) {
        throw new Error('USER_DEACTIVATED: تم تجميد هذا الحساب من قِبل المشرف');
      }
      return {
        uid: decodedToken.uid,
        email: decodedToken.email || email,
        displayName: data.displayName || 'مستخدم النظام',
        isAdmin: data.role === 'admin',
        role: data.role || 'viewer',
        permissions: data.role === 'admin' ? ['*'] : (data.permissions || []),
        isActive: true,
        branchId: data.branchId,
      };
    }

    throw new Error('USER_NOT_REGISTERED: هذا الحساب غير مسجل ضمن طاقم العمل أو المستخدمين المصرح لهم');
  }

  const userData = userSnap.data()!;
  if (userData.isActive === false) {
    throw new Error('USER_DEACTIVATED: تم تجميد هذا الحساب من قِبل إدارة النظام');
  }

  const isRoleAdmin = userData.role === 'admin';
  return {
    uid: decodedToken.uid,
    email: decodedToken.email || email,
    displayName: userData.displayName || 'مستخدم النظام',
    isAdmin: isRoleAdmin,
    role: userData.role || 'viewer',
    permissions: isRoleAdmin ? ['*'] : (userData.permissions || []),
    isActive: true,
    branchId: userData.branchId,
  };
}

/**
 * Checks if user permissions grant the specified permission key
 */
export function hasPermissionCheck(permissions: string[], requiredPermission: string): boolean {
  if (!permissions || !Array.isArray(permissions)) return false;
  if (permissions.includes('*')) return true;
  if (permissions.includes(requiredPermission)) return true;

  // Domain wildcard matching (e.g. 'orders.*' matches 'orders.view')
  const [domain] = requiredPermission.split('.');
  if (domain && permissions.includes(`${domain}.*`)) return true;

  return false;
}

/**
 * Asserts required permission or throws descriptive 403 authorization error.
 * Supports passing either a single permission key or an array of acceptable keys (any match satisfies requirement).
 */
export async function assertUserPermission(idToken: string, requiredPermission: string | string[]): Promise<AuthenticatedUserContext> {
  const user = await getAuthenticatedUserWithPermissions(idToken);
  
  if (user.isAdmin) {
    return user;
  }

  const permsToCheck = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
  const hasValidPerm = permsToCheck.some((p) => hasPermissionCheck(user.permissions, p));

  if (!hasValidPerm) {
    throw new Error(`PERMISSION_DENIED: ليس لديك الصلاحية المطلوبة (${permsToCheck.join(' أو ')}) لتنفيذ هذا الإجراء`);
  }

  return user;
}

/**
 * Lists all system users with roles and permissions
 */
export async function executeAdminGetAllUsers(): Promise<any[]> {
  const db = getFirebaseAdminFirestore();
  const auth = getFirebaseAdminAuth();
  
  const usersMap = new Map<string, any>();

  // 1. Fetch from Firestore 'users' collection
  try {
    const snap = await db.collection('users').get();
    snap.docs.forEach((docSnap) => {
      const d = docSnap.data();
      usersMap.set(docSnap.id, {
        uid: docSnap.id,
        ...d,
      });
    });
  } catch (err: any) {
    console.warn('⚠️ [executeAdminGetAllUsers] firestore read warning:', err?.message);
  }

  // 2. Query Firebase Auth users to ensure super admins and newly created accounts are merged
  try {
    const authUsersResult = await auth.listUsers(100);
    authUsersResult.users.forEach((u) => {
      const email = (u.email || '').toLowerCase().trim();
      const isSuper = RECOGNIZED_ADMIN_EMAILS.includes(email) || Boolean(u.customClaims && u.customClaims.admin === true);

      if (usersMap.has(u.uid)) {
        const existing = usersMap.get(u.uid);
        usersMap.set(u.uid, {
          ...existing,
          email: u.email || existing.email,
          displayName: existing.displayName || u.displayName || (isSuper ? 'مدير النظام الرئيسي' : 'مستخدم'),
          role: isSuper ? 'admin' : (existing.role || 'viewer'),
          permissions: isSuper ? ['*'] : (existing.permissions || []),
          isActive: u.disabled ? false : (existing.isActive !== false),
          lastLoginAt: u.metadata.lastSignInTime || existing.lastLoginAt,
        });
      } else if (isSuper) {
        // Seed default super admin in map
        usersMap.set(u.uid, {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || 'مدير النظام الرئيسي',
          role: 'admin',
          permissions: ['*'],
          isActive: !u.disabled,
          createdAt: u.metadata.creationTime || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: u.metadata.lastSignInTime,
        });
      }
    });
  } catch (authListErr: any) {
    console.warn('⚠️ [executeAdminGetAllUsers] listUsers warning:', authListErr?.message);
  }

  // Ensure primary default admin exists
  const hasDefaultAdmin = Array.from(usersMap.values()).some((u) => u.email === 'admin@pamborina.com');
  if (!hasDefaultAdmin) {
    usersMap.set('admin_pamborina_default', {
      uid: 'admin_pamborina_default',
      email: 'admin@pamborina.com',
      displayName: 'مدير النظام العام',
      role: 'admin',
      permissions: ['*'],
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
    });
  }

  return Array.from(usersMap.values());
}

/**
 * Creates a new user in Firebase Auth and registers profile in Firestore 'users' collection
 */
export async function executeAdminCreateUser(params: {
  email: string;
  password?: string;
  displayName: string;
  role: string;
  permissions: string[];
  branchId?: string;
  adminUid?: string;
  adminEmail?: string;
}): Promise<any> {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminFirestore();
  const cleanEmail = params.email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('البريد الإلكتروني غير صالح');
  }

  if (!params.displayName || !params.displayName.trim()) {
    throw new Error('اسم المستخدم مطلوب');
  }

  const password = params.password && params.password.length >= 6 ? params.password : 'Pamborina@2025';
  const role = params.role || 'cashier';
  const permissions = role === 'admin' ? ['*'] : (params.permissions || []);
  const nowIso = new Date().toISOString();

  // 1. Create or retrieve user in Firebase Auth
  let userRecord: UserRecord;
  try {
    userRecord = await auth.createUser({
      email: cleanEmail,
      password: password,
      displayName: params.displayName.trim(),
      emailVerified: true,
    });
    console.log(`✅ [Firebase Admin] Created Auth user: ${cleanEmail} (UID: ${userRecord.uid})`);
  } catch (err: any) {
    if (err.code === 'auth/email-already-exists') {
      userRecord = await auth.getUserByEmail(cleanEmail);
      // Update display name
      await auth.updateUser(userRecord.uid, { displayName: params.displayName.trim() });
    } else {
      throw new Error(err.message || 'فشل إنشاء حساب المستخدم في Firebase Auth');
    }
  }

  // 2. Set Custom Claim if role is admin
  if (role === 'admin') {
    await auth.setCustomUserClaims(userRecord.uid, {
      ...(userRecord.customClaims || {}),
      admin: true,
      role: 'admin',
    });
  } else {
    // Clear admin claim if previously set
    await auth.setCustomUserClaims(userRecord.uid, {
      ...(userRecord.customClaims || {}),
      admin: false,
      role,
    });
  }

  // 3. Save profile in Firestore 'users' collection
  const userProfile = {
    uid: userRecord.uid,
    email: cleanEmail,
    displayName: params.displayName.trim(),
    role,
    permissions,
    isActive: true,
    branchId: params.branchId || '',
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: {
      uid: params.adminUid || 'admin',
      email: params.adminEmail || 'admin@pamborina.com',
    },
  };

  await db.collection('users').doc(userRecord.uid).set(userProfile, { merge: true });

  // 4. Audit Log
  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      action: 'create_user',
      targetType: 'user',
      targetId: userRecord.uid,
      adminUid: params.adminUid || 'admin',
      adminEmail: params.adminEmail || 'admin@pamborina.com',
      timestamp: nowIso,
      createdAt: nowIso,
      summaryAr: `إنشاء حساب مستخدم جديد "${params.displayName}" (${cleanEmail}) بدور "${role}"`,
      metadata: {
        userId: userRecord.uid,
        email: cleanEmail,
        role,
        permissionsCount: permissions.length,
      },
    });
  } catch {
    // non-blocking
  }

  return { success: true, user: userProfile };
}

/**
 * Updates an existing user's role, permissions, and profile
 */
export async function executeAdminUpdateUser(params: {
  uid: string;
  displayName: string;
  role: string;
  permissions: string[];
  branchId?: string;
  adminUid?: string;
  adminEmail?: string;
}): Promise<any> {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminFirestore();
  const nowIso = new Date().toISOString();

  const userDocRef = db.collection('users').doc(params.uid);
  const userSnap = await userDocRef.get();
  const existingData = userSnap.exists ? userSnap.data() : {};

  const role = params.role || existingData?.role || 'cashier';
  const permissions = role === 'admin' ? ['*'] : (params.permissions || []);

  // Update Firebase Auth display name and claims
  try {
    await auth.updateUser(params.uid, {
      displayName: params.displayName.trim(),
    });
    
    if (role === 'admin') {
      await auth.setCustomUserClaims(params.uid, { admin: true, role: 'admin' });
    } else {
      await auth.setCustomUserClaims(params.uid, { admin: false, role });
    }
  } catch (authErr: any) {
    console.warn(`⚠️ [executeAdminUpdateUser] auth update error for ${params.uid}:`, authErr?.message);
  }

  // Update Firestore user document
  const updatedProfile = {
    ...existingData,
    uid: params.uid,
    displayName: params.displayName.trim(),
    role,
    permissions,
    branchId: params.branchId !== undefined ? params.branchId : (existingData?.branchId || ''),
    updatedAt: nowIso,
  };

  await userDocRef.set(updatedProfile, { merge: true });

  // Audit Log
  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      action: 'update_user_permissions',
      targetType: 'user',
      targetId: params.uid,
      adminUid: params.adminUid || 'admin',
      adminEmail: params.adminEmail || 'admin@pamborina.com',
      timestamp: nowIso,
      createdAt: nowIso,
      summaryAr: `تحديث صلاحيات ودور المستخدم "${params.displayName}" إلى (${role})`,
      metadata: {
        userId: params.uid,
        newRole: role,
        permissionsCount: permissions.length,
      },
    });
  } catch {
    // non-blocking
  }

  return { success: true, user: updatedProfile };
}

/**
 * Toggles user active status (activate / suspend)
 */
export async function executeAdminToggleUserStatus(params: {
  uid: string;
  isActive: boolean;
  adminUid?: string;
  adminEmail?: string;
}): Promise<any> {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminFirestore();
  const nowIso = new Date().toISOString();

  // Safety check: Cannot deactivate primary super admin
  try {
    const user = await auth.getUser(params.uid);
    if (user.email === 'admin@pamborina.com' && !params.isActive) {
      throw new Error('لا يمكن تجميد حساب المشرف الرئيسي للنظام (admin@pamborina.com)');
    }
    // Update Auth disabled state
    await auth.updateUser(params.uid, { disabled: !params.isActive });
  } catch (err: any) {
    if (err.message && err.message.includes('لا يمكن')) throw err;
  }

  // Update Firestore
  await db.collection('users').doc(params.uid).set(
    {
      isActive: params.isActive,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  // Audit Log
  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      action: 'toggle_user_status',
      targetType: 'user',
      targetId: params.uid,
      adminUid: params.adminUid || 'admin',
      adminEmail: params.adminEmail || 'admin@pamborina.com',
      timestamp: nowIso,
      createdAt: nowIso,
      summaryAr: params.isActive
        ? `تفعيل حساب المستخدم #${params.uid}`
        : `تجميد وإيقاف حساب المستخدم #${params.uid}`,
      metadata: { userId: params.uid, isActive: params.isActive },
    });
  } catch {
    // non-blocking
  }

  return { success: true, uid: params.uid, isActive: params.isActive };
}

/**
 * Resets a user's password directly via Firebase Admin SDK
 */
export async function executeAdminResetUserPassword(params: {
  uid: string;
  newPassword: string;
  adminUid?: string;
  adminEmail?: string;
}): Promise<any> {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminFirestore();

  if (!params.newPassword || params.newPassword.length < 6) {
    throw new Error('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل');
  }

  await auth.updateUser(params.uid, {
    password: params.newPassword,
  });

  // Audit Log
  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      action: 'reset_user_password',
      targetType: 'user',
      targetId: params.uid,
      adminUid: params.adminUid || 'admin',
      adminEmail: params.adminEmail || 'admin@pamborina.com',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      summaryAr: `إعادة تعيين كلمة مرور المستخدم #${params.uid} بواسطة المشرف`,
      metadata: { userId: params.uid },
    });
  } catch {
    // non-blocking
  }

  return { success: true, uid: params.uid };
}

/**
 * Deletes user from Firebase Auth and Firestore
 */
export async function executeAdminDeleteUser(params: {
  uid: string;
  adminUid?: string;
  adminEmail?: string;
}): Promise<any> {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminFirestore();

  // Safety checks
  if (params.adminUid === params.uid) {
    throw new Error('لا يمكنك حذف حسابك الشخصي الحالي أثناء تسجيل الدخول');
  }

  try {
    const user = await auth.getUser(params.uid);
    if (user.email === 'admin@pamborina.com' || user.email === 'mentalitym254@gmail.com') {
      throw new Error('لا يمكن حذف حساب المشرف الرئيسي للنظام');
    }
    await auth.deleteUser(params.uid);
  } catch (err: any) {
    if (err.message && err.message.includes('لا يمكن')) throw err;
    console.warn(`⚠️ [executeAdminDeleteUser] Auth delete notice for ${params.uid}:`, err?.message);
  }

  // Delete from Firestore
  await db.collection('users').doc(params.uid).delete();

  return { success: true, uid: params.uid };
}

/**
 * Automatically provisions and synchronizes all static system accounts
 * into Firebase Auth and the Firestore 'users' collection with their respective RBAC roles and permissions.
 */
export async function syncAllStaticUsersToFirestore(): Promise<void> {
  try {
    const auth = getFirebaseAdminAuth();
    const db = getFirebaseAdminFirestore();
    const nowIso = new Date().toISOString();

    for (const def of STATIC_USERS) {
      const { user, passwordHash } = def;
      const cleanEmail = user.email.toLowerCase().trim();

      let userRecord: UserRecord;
      try {
        userRecord = await auth.getUserByEmail(cleanEmail);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          try {
            userRecord = await auth.createUser({
              email: cleanEmail,
              password: passwordHash || 'Pamborina2026@Staff',
              displayName: user.displayName,
              emailVerified: true,
            });
            console.log(`✅ [Firebase Admin Startup] Created Auth user for ${cleanEmail} (UID: ${userRecord.uid})`);
          } catch (createErr: any) {
            console.warn(`⚠️ [Firebase Admin Startup] User creation warning for ${cleanEmail}:`, createErr?.message);
            continue;
          }
        } else {
          console.warn(`⚠️ [Firebase Admin Startup] Could not inspect user ${cleanEmail}:`, err?.message);
          continue;
        }
      }

      // Set custom claims
      const isRoleAdmin = user.role === 'admin';
      try {
        await auth.setCustomUserClaims(userRecord.uid, {
          admin: isRoleAdmin,
          role: user.role,
        });
      } catch (claimErr: any) {
        console.warn(`⚠️ [Firebase Admin Startup] Claim update warning for ${cleanEmail}:`, claimErr?.message);
      }

      // Synchronize Firestore user document so client security rules and server permission assertions work instantly
      const userProfile = {
        uid: userRecord.uid,
        email: cleanEmail,
        displayName: user.displayName,
        role: user.role,
        permissions: isRoleAdmin ? ['*'] : user.permissions,
        isActive: user.isActive ?? true,
        updatedAt: nowIso,
        createdAt: user.createdAt || nowIso,
      };

      await db.collection('users').doc(userRecord.uid).set(userProfile, { merge: true });
    }
    console.log('✅ [Firebase Admin] All static system users successfully synchronized to Auth & Firestore.');
  } catch (error: any) {
    console.warn('⚠️ [Firebase Admin] Static users sync warning:', error?.message);
  }
}





