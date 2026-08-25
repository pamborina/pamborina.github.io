import fs from 'fs';
import path from 'path';
import { initializeApp, cert, applicationDefault, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth, UserRecord, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  // legacy
  out_for_delivery: ['completed', 'cancelled'],
  ready_for_pickup: ['completed', 'cancelled'],
  delivered: [],
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

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'pamborina-app';

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

  // 2. Try exact orderNumber match (e.g. PB-20260820-2M4P)
  try {
    const q1 = await db.collection('orders').where('orderNumber', '==', cleanTerm).limit(1).get();
    if (!q1.empty) {
      const docSnap = q1.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
  } catch {
    // continue
  }

  // 3. Try uppercase orderNumber
  const upperTerm = cleanTerm.toUpperCase();
  if (upperTerm !== cleanTerm) {
    try {
      const q2 = await db.collection('orders').where('orderNumber', '==', upperTerm).limit(1).get();
      if (!q2.empty) {
        const docSnap = q2.docs[0];
        return { id: docSnap.id, ...docSnap.data() };
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
  try {
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(limitCount).get();
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (err: any) {
    console.warn('⚠️ [executeGetAllOrders] orderBy fallback, scanning all:', err?.message);
    const snapshot = await db.collection('orders').limit(limitCount).get();
    const orders = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    // sort locally by createdAt desc
    return orders.sort((a: any, b: any) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }
}

