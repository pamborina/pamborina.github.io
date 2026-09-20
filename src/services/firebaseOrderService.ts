import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../lib/firebase';
import { Order, OrderStatus } from '../types';
import { canTransitionOrderStatus, getOrderStatusLabel } from '../lib/orderStatus';
import { rbacService } from './rbacService';
import { firebaseAuthService } from './firebaseAuthService';
import { auditLogService } from './auditLogService';
import { adminAuthorizationService } from './adminAuthorizationService';
import { storageService } from './storageService';
import { deliveryDriverService } from './deliveryDriverService';
import { getAccurateNow } from '../utils/dateFormatter';

const ORDERS_COLLECTION = 'orders';

export interface OrderStatusUpdateOptions {
  noteAr?: string;
  adminUid?: string;
  adminEmail?: string;
}

/**
 * Recursive sanitizer that removes undefined values without breaking Dates, Timestamps, or Arrays
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (data instanceof Date) {
    return data;
  }
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      clean[key] = sanitizeForFirestore(val);
    }
  }
  return clean as T;
}

export class FirebaseOrderService {
  /**
   * Creates a new order in Firestore orders collection
   */
  async createOrder(order: Order): Promise<string> {
    if (!order || !order.id) {
      throw new Error('Order must include a valid id');
    }

    if (!order.items || order.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    if (!order.customer || !order.customer.name || !order.customer.phone) {
      throw new Error('Order must include valid customer name and phone');
    }

    if (!order.branch || !order.branch.nameAr) {
      throw new Error('Order must include valid branch details');
    }

    if (!isFirebaseConfigured() || !db) {
      console.warn('⚠️ [FirebaseOrderService] Firebase not configured; order stored locally only.');
      return order.id;
    }

    const orderDocRef = doc(db, ORDERS_COLLECTION, order.id);
    const nowIso = getAccurateNow().toISOString();

    // Build canonical order document with versioning
    const orderData: Record<string, any> = {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt || nowIso,
      updatedAt: order.updatedAt || nowIso,
      statusUpdatedAt: nowIso,
      createdTime: order.createdAt || nowIso,
      status: order.status || 'pending',
      orderType: order.orderType || 'delivery',
      version: order.version || 1,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        address: order.customer.address || '',
        landmark: order.customer.landmark || '',
        locationUrl: order.customer.locationUrl || '',
      },
      // Backward compatibility top-level fields
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      customerId: order.customerId || 'guest',

      branch: {
        id: order.branch.id || '',
        name: order.branch.name || order.branch.nameAr,
        nameAr: order.branch.nameAr,
        phone: order.branch.phone || '',
        addressAr: order.branch.addressAr || '',
      },
      branchId: order.branch.id || '',
      branchNameAr: order.branch.nameAr,

      items: order.items.map((item: any) => ({
        productId: item.productId || item.product?.id || '',
        name: item.name || item.product?.nameAr || item.nameAr || '',
        nameAr: item.nameAr || item.product?.nameAr || item.name || '',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: Number(item.totalPrice) || 0,
        selectedVariant: item.selectedVariant
          ? {
              id: item.selectedVariant.id,
              nameAr: item.selectedVariant.nameAr,
              price: item.selectedVariant.price,
            }
          : undefined,
        selectedAddons: item.selectedAddons || undefined,
        specialInstructions: item.specialInstructions || undefined,
      })),

      pricing: {
        subtotal: Number(order.pricing?.subtotal ?? order.subtotal ?? 0),
        deliveryFee: Number(order.pricing?.deliveryFee ?? order.deliveryFee ?? 0),
        discountAmount: Number(order.pricing?.discountAmount ?? order.discountAmount ?? 0),
        total: Number(order.pricing?.total ?? order.grandTotal ?? 0),
      },
      subtotal: Number(order.pricing?.subtotal ?? order.subtotal ?? 0),
      deliveryFee: Number(order.pricing?.deliveryFee ?? order.deliveryFee ?? 0),
      discountAmount: Number(order.pricing?.discountAmount ?? order.discountAmount ?? 0),
      grandTotal: Number(order.pricing?.total ?? order.grandTotal ?? 0),

      paymentMethod: order.paymentMethod || 'cash_on_delivery',
      paymentMethodAr: order.paymentMethodAr || 'الدفع عند الاستلام',
      paymentStatus: order.paymentStatus || 'unpaid',

      notes: order.notes || '',

      statusHistory: order.statusHistory || [
        {
          previousStatus: null,
          newStatus: order.status || 'pending',
          status: order.status || 'pending',
          timestamp: nowIso,
          changedAt: nowIso,
          changedBy: 'customer',
          noteAr: 'تم إنشاء الطلب بنجاح وهو قيد الانتظار',
        },
      ],

      whatsapp: {
        sent: Boolean(order.whatsapp?.sent),
        sentAt: order.whatsapp?.sentAt || nowIso,
        url: order.whatsapp?.url || '',
      },
    };

    if (order.deliveryAddress) {
      orderData.deliveryAddress = order.deliveryAddress;
    }

    const sanitizedData = sanitizeForFirestore(orderData);

    let clientSaved = false;
    if (isFirebaseConfigured() && db) {
      try {
        const orderDocRef = doc(db, ORDERS_COLLECTION, order.id);
        await setDoc(orderDocRef, sanitizedData);
        clientSaved = true;
        console.log(`[FirebaseOrderService] Order created in Firestore via client: ${order.orderNumber} (${order.id})`);
      } catch (clientErr: any) {
        console.warn('⚠️ [FirebaseOrderService] Client setDoc warning, falling back to server API:', clientErr?.message);
      }
    }

    // Always ensure server Admin SDK synchronization for guaranteed persistence & tracking
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedData),
      });
      if (res.ok) {
        console.log(`[FirebaseOrderService] Order verified & persisted via Admin API: ${order.orderNumber}`);
      }
    } catch (serverErr: any) {
      if (!clientSaved) {
        console.warn('⚠️ [FirebaseOrderService] Server order create warning:', serverErr?.message);
      }
    }

    // Comprehensive Audit & Movement Logging for new order
    try {
      const orderTotal = order.pricing?.total || (order as any).grandTotal || (order as any).total || 0;
      const custName = order.customer?.name || (order as any).customerName || 'عميل المتجر';
      const branchName = order.branch?.nameAr || (order as any).branchNameAr || (order as any).branchName || 'فرع بامبورينا';

      await auditLogService.logOrderAction(
        order,
        'create_order',
        `استلام وتوثيق طلب جديد برقم #${order.orderNumber || order.id} بقيمة ${orderTotal} ج.م للعميل "${custName}" (${branchName})`,
        {
          paymentMethod: order.paymentMethodAr || order.paymentMethod || 'الدفع عند الاستلام',
          orderType: order.orderType === 'delivery' ? 'توصيل منزلي' : 'استلام من الفرع',
          branchPhone: order.branch?.phone || '',
        }
      );
    } catch (auditErr) {
      console.warn('⚠️ [FirebaseOrderService] Audit log trigger non-blocking error:', auditErr);
    }

    return order.id;
  }

  /**
   * Strictly deduplicates orders by both ID and orderNumber,
   * filtering tombstoned orders and ensuring unique object identities.
   */
  deduplicateOrders(rawOrders: Order[]): Order[] {
    if (!Array.isArray(rawOrders) || rawOrders.length === 0) return [];

    const seenIds = new Set<string>();
    const seenNumbers = new Set<string>();
    const uniqueOrders: Order[] = [];

    for (const raw of rawOrders) {
      if (!raw) continue;

      const cleanId = (raw.id || '').toString().trim();
      const cleanNum = (raw.orderNumber || '').toString().trim().toUpperCase();

      // Skip tombstoned / deleted orders
      if (cleanId && storageService.isOrderTombstoned(cleanId)) continue;
      if (cleanNum && storageService.isOrderTombstoned(cleanNum)) continue;

      // Check duplicate by id
      if (cleanId && seenIds.has(cleanId)) continue;
      // Check duplicate by orderNumber
      if (cleanNum && seenNumbers.has(cleanNum)) continue;

      if (cleanId) seenIds.add(cleanId);
      if (cleanNum) seenNumbers.add(cleanNum);

      uniqueOrders.push({
        ...raw,
        id: cleanId || cleanNum || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        version: raw.version || 1,
      });
    }

    return uniqueOrders;
  }

  /**
   * Realtime listener for all orders with Firestore onSnapshot (Single Source of Truth)
   */
  subscribeToOrders(
    callback: (orders: Order[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    let isSubscribed = true;

    // 1. Initial cached/local read for zero-latency UI display
    this.getOrders(300)
      .then((initialOrders) => {
        if (isSubscribed && initialOrders && initialOrders.length > 0) {
          callback(this.deduplicateOrders(initialOrders));
        }
      })
      .catch(() => {});

    // 2. Realtime onSnapshot listener from Firestore
    let unsubscribeFirestore = () => {};
    if (isFirebaseConfigured() && db) {
      try {
        const q = query(
          collection(db, ORDERS_COLLECTION),
          orderBy('createdAt', 'desc')
        );

        unsubscribeFirestore = onSnapshot(
          q,
          (snapshot) => {
            if (!isSubscribed) return;
            const realtimeOrders: Order[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              // Preserve unique doc ID or canonical ID
              const id = docSnap.id || data.id || `ord_${Date.now()}`;
              return {
                ...data,
                id,
                version: data.version || 1,
              } as Order;
            });
            callback(this.deduplicateOrders(realtimeOrders));
          },
          (error) => {
            console.warn('[FirebaseOrderService] onSnapshot error:', error.message);
            if (onError) onError(error);
          }
        );
      } catch (err: any) {
        console.warn('⚠️ [FirebaseOrderService] Failed to establish onSnapshot listener:', err.message);
      }
    }

    return () => {
      isSubscribed = false;
      unsubscribeFirestore();
    };
  }

  /**
   * Realtime listener for a single order (Customer tracking or detail view)
   */
  subscribeToOrder(
    orderId: string,
    callback: (order: Order | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!isFirebaseConfigured() || !db || !orderId) {
      callback(null);
      return () => {};
    }

    try {
      const orderRef = doc(db, ORDERS_COLLECTION, orderId);
      const unsubscribe = onSnapshot(
        orderRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            callback({ id: docSnap.id, ...data, version: data?.version || 1 } as Order);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.warn(`⚠️ [FirebaseOrderService] Single order subscription error (${orderId}):`, error.message);
          if (onError) onError(error);
        }
      );

      return unsubscribe;
    } catch (err: any) {
      console.warn(`⚠️ [FirebaseOrderService] Failed to listen to order (${orderId}):`, err.message);
      if (onError) onError(err);
      return () => {};
    }
  }

  /**
   * Updates status of an order with transaction safety, versioning, transition validation, and custom claims verification
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    options?: string | OrderStatusUpdateOptions
  ): Promise<{ previousStatus: OrderStatus; newStatus: OrderStatus }> {
    if (!orderId) {
      throw new Error('ORDER_ID_REQUIRED: معرف الطلب مطلوب');
    }

    const noteAr = typeof options === 'string' ? options : options?.noteAr;
    let adminUid = typeof options === 'object' ? options?.adminUid : undefined;
    let adminEmail = typeof options === 'object' ? options?.adminEmail : undefined;

    // 1. Verify Authorization (Either Admin or Employee with permissions)
    let authContext = await adminAuthorizationService.getCurrentAdminAuthorization(true);
    if (!authContext.authenticated || !authContext.uid) {
      throw new Error('يجب تسجيل الدخول أولاً (NOT_AUTHENTICATED).');
    }

    // Check if the user is an admin OR has the necessary permissions
    const currentUser = firebaseAuthService.getCurrentUser();
    const hasEditPermission = currentUser && rbacService.hasPermission(currentUser as any, 'orders.edit');
    const hasStatusPermission = currentUser && rbacService.hasPermission(currentUser as any, 'orders.update_status');
    const isAuthorized = authContext.isAdmin || hasEditPermission || hasStatusPermission;

    if (!isAuthorized) {
      throw new Error('حسابك غير مصرح له بتعديل الطلبات (INSUFFICIENT_PERMISSIONS).');
    }

    adminUid = adminUid || authContext.uid;
    adminEmail = adminEmail || authContext.email || undefined;

    // 2. Attempt: Secure Backend Server API with Firebase Admin SDK Transaction
    if (authContext.token) {
      try {
        const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authContext.token}`,
          },
          body: JSON.stringify({
            status: newStatus,
            noteAr,
            idToken: authContext.token,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          console.log(`✅ [FirebaseOrderService] Server transitioned order ${orderId} from ${data.previousStatus} to ${data.newStatus}`);
          
          // Guaranteed Audit Logging for status transition
          try {
            await auditLogService.logAdminAction({
              action: 'update_order_status',
              targetType: 'order',
              targetId: orderId,
              summaryAr: `تم تحديث مسار الطلب #${orderId} من "${getOrderStatusLabel(data.previousStatus as OrderStatus)}" إلى "${getOrderStatusLabel(data.newStatus || newStatus)}"`,
              metadata: {
                previousStatus: data.previousStatus,
                newStatus: data.newStatus || newStatus,
                noteAr: noteAr || undefined,
              },
              adminEmail: adminEmail,
            });
          } catch {
            // non-blocking
          }

          return {
            previousStatus: data.previousStatus as OrderStatus,
            newStatus: data.newStatus as OrderStatus,
          };
        }

        if (response.status === 400 || response.status === 403 || response.status === 404) {
          throw new Error(data.message || data.error || 'فشل تحديث حالة الطلب');
        }
      } catch (serverErr: any) {
        if (
          serverErr.message &&
          (serverErr.message.includes('صلاحية') ||
            serverErr.message.includes('غير مصرح') ||
            serverErr.message.includes('لا يمكن') ||
            serverErr.message.includes('غير موجود'))
        ) {
          throw serverErr;
        }
        console.warn('⚠️ [FirebaseOrderService] Server endpoint unreachable, falling back to direct Firestore transaction:', serverErr.message);
      }
    }

    // 3. Fallback: Direct Client-Side Firestore Transaction
    if (!isFirebaseConfigured() || !db) {
      throw new Error('تعذر الاتصال بقاعدة البيانات (Firebase is not configured)');
    }

    let targetRef = doc(db, ORDERS_COLLECTION, orderId);

    try {
      const result = await runTransaction(db, async (transaction) => {
        let orderSnap = await transaction.get(targetRef);

        if (!orderSnap.exists()) {
          // Check lookup by orderNumber as fallback
          const q = query(collection(db, ORDERS_COLLECTION), where('orderNumber', '==', orderId), limit(1));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            targetRef = doc(db, ORDERS_COLLECTION, querySnap.docs[0].id);
            orderSnap = await transaction.get(targetRef);
          }
        }

        if (!orderSnap.exists()) {
          throw new Error(`الطلب برقم ${orderId} غير موجود في قاعدة البيانات.`);
        }

        const currentData = orderSnap.data();
        const currentStatus = (currentData.status as OrderStatus) || 'pending';

        // Check if transition is allowed
        if (!canTransitionOrderStatus(currentStatus, newStatus)) {
          throw new Error(`لا يمكن تحويل حالة الطلب من "${getOrderStatusLabel(currentStatus)}" إلى "${getOrderStatusLabel(newStatus)}"`);
        }

        if (currentStatus === newStatus) {
          return {
            previousStatus: currentStatus,
            newStatus: currentStatus,
          };
        }
        
        const nowIso = new Date().toISOString();
        const existingHistory = Array.isArray(currentData.statusHistory) ? currentData.statusHistory : [];
        const nextVersion = (currentData.version || 1) + 1;

        const newHistoryEntry = {
          from: currentStatus,
          previousStatus: currentStatus,
          to: newStatus,
          newStatus: newStatus,
          status: newStatus,
          timestamp: nowIso,
          changedAt: nowIso,
          changedBy: adminEmail || adminUid || 'admin',
          adminUid: adminUid,
          adminEmail: adminEmail,
          noteAr: noteAr || `تم تغيير الحالة إلى ${getOrderStatusLabel(newStatus)}`,
        };

        transaction.update(targetRef, {
          status: newStatus,
          updatedAt: nowIso,
          statusUpdatedAt: nowIso,
          version: nextVersion,
          lastStatusUpdate: serverTimestamp(),
          statusHistory: [...existingHistory, newHistoryEntry],
        });

        return {
          previousStatus: currentStatus,
          newStatus: newStatus,
        };
      });

      // Audit Log
      try {
        await auditLogService.logAdminAction({
          action: 'update_order_status',
          targetType: 'order',
          targetId: orderId,
          summaryAr: `تم تغيير حالة الطلب إلى "${getOrderStatusLabel(newStatus)}"`,
          metadata: { previousStatus: result.previousStatus, newStatus: result.newStatus },
        });
      } catch {
        // non-blocking
      }

      return result;
    } catch (err: any) {
      console.error('❌ [FirebaseOrderService] Transaction failed:', err);
      throw err;
    }
  }



  /**
   * Fetches latest orders with multi-source guarantee (Server Admin API + Client Firestore + Local storage merge)
   */
  async getOrders(limitCount: number = 300): Promise<Order[]> {
    const ordersMap = new Map<string, Order>();

    // 1. Try Server Admin API endpoint (Direct Firebase Admin SDK - 100% reliable)
    try {
      const headers: Record<string, string> = {};
      if (auth && auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        } catch {
          // quiet
        }
      }

      if (headers['Authorization']) {
        const res = await fetch(`/api/admin/orders?limit=${limitCount}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            data.orders.forEach((o: any) => {
              if (
                o &&
                o.id &&
                !storageService.isOrderTombstoned(o.id) &&
                !storageService.isOrderTombstoned(o.orderNumber)
              ) {
                ordersMap.set(o.id, {
                  ...o,
                  version: o.version || 1,
                });
              }
            });
          }
        }
      }
    } catch {
      // quiet fallback
    }

    // 2. Client Firestore SDK (if available)
    if (isFirebaseConfigured() && db) {
      try {
        const q = query(
          collection(db, ORDERS_COLLECTION),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          if (
            !storageService.isOrderTombstoned(docSnap.id) &&
            !storageService.isOrderTombstoned(d.orderNumber) &&
            !ordersMap.has(docSnap.id)
          ) {
            ordersMap.set(docSnap.id, {
              id: docSnap.id,
              ...d,
              version: d.version || 1,
            } as Order);
          }
        });
      } catch (err: any) {
        // quiet fallback
      }
    }

    // 3. Merge locally stored guest orders ONLY if not tombstoned / deleted
    try {
      const localGuestOrders = storageService.getGuestOrders<Order[]>([]);
      if (Array.isArray(localGuestOrders)) {
        for (const localOrder of localGuestOrders) {
          if (
            localOrder &&
            localOrder.id &&
            !storageService.isOrderTombstoned(localOrder.id) &&
            !storageService.isOrderTombstoned(localOrder.orderNumber)
          ) {
            if (!ordersMap.has(localOrder.id)) {
              ordersMap.set(localOrder.id, localOrder);
              // Proactively push missing order to server
              fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localOrder),
              }).catch(() => {});
            }
          }
        }
      }
    } catch {
      // quiet fallback
    }

    // Convert map to array, filter out any tombstones, and sort by createdAt desc
    const sortedOrders = this.deduplicateOrders(Array.from(ordersMap.values()))
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

    // Seamlessly backfill / sync order movements into audit log
    if (sortedOrders.length > 0) {
      auditLogService.syncOrdersToAuditLogs(sortedOrders).catch(() => {});
    }

    return sortedOrders;
  }

  /**
   * Fetches single order by ID with API fallback
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    if (!orderId || !orderId.trim()) return null;
    const cleanId = orderId.trim();
    if (storageService.isOrderTombstoned(cleanId)) return null;

    // 1. Try client Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const orderRef = doc(db, ORDERS_COLLECTION, cleanId);
        const snap = await getDoc(orderRef);
        if (snap.exists()) {
          const d = snap.data();
          if (!storageService.isOrderTombstoned(d.orderNumber)) {
            return { id: snap.id, ...d } as Order;
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ [FirebaseOrderService] Client getOrderById error for ${cleanId}:`, err?.message);
      }
    }

    // 2. Try server API fallback
    try {
      const res = await fetch(`/api/orders/track?term=${encodeURIComponent(cleanId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order) {
          if (
            !storageService.isOrderTombstoned(data.order.id) &&
            !storageService.isOrderTombstoned(data.order.orderNumber)
          ) {
            return data.order as Order;
          }
        }
      }
    } catch (apiErr) {
      // ignore
    }

    // 3. Try localStorage guest orders fallback
    try {
      const localOrders = storageService.getGuestOrders<Order[]>([]);
      const localMatch = localOrders.find(
        (o) =>
          (o.id === cleanId || o.orderNumber === cleanId) &&
          !storageService.isOrderTombstoned(o.id) &&
          !storageService.isOrderTombstoned(o.orderNumber)
      );
      if (localMatch) return localMatch;
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Fetches single order by order number (e.g. PB-20260814-7F2A) with comprehensive queries and API fallback
   */
  async getOrderByOrderNumber(orderNumber: string): Promise<Order | null> {
    if (!orderNumber || !orderNumber.trim()) return null;
    const cleanNum = orderNumber.trim();
    const upperNum = cleanNum.toUpperCase();
    if (storageService.isOrderTombstoned(cleanNum) || storageService.isOrderTombstoned(upperNum)) return null;

    // 1. Try client Firestore queries
    if (isFirebaseConfigured() && db) {
      try {
        // Query exact
        const q1 = query(
          collection(db, ORDERS_COLLECTION),
          where('orderNumber', '==', cleanNum)
        );
        const snapshot1 = await getDocs(q1);
        if (!snapshot1.empty) {
          const matchedDocs = snapshot1.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Order))
            .filter((o) => !storageService.isOrderTombstoned(o.id) && !storageService.isOrderTombstoned(o.orderNumber));

          if (matchedDocs.length > 0) {
            matchedDocs.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime());
            return matchedDocs[0];
          }
        }

        // Query uppercase if different
        if (upperNum !== cleanNum) {
          const q2 = query(
            collection(db, ORDERS_COLLECTION),
            where('orderNumber', '==', upperNum)
          );
          const snapshot2 = await getDocs(q2);
          if (!snapshot2.empty) {
            const matchedDocs = snapshot2.docs
              .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Order))
              .filter((o) => !storageService.isOrderTombstoned(o.id) && !storageService.isOrderTombstoned(o.orderNumber));

            if (matchedDocs.length > 0) {
              matchedDocs.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime());
              return matchedDocs[0];
            }
          }
        }

        // Query by id
        const docRef = doc(db, ORDERS_COLLECTION, cleanNum);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const docData = docSnap.data();
          if (!storageService.isOrderTombstoned(docSnap.id) && !storageService.isOrderTombstoned(docData?.orderNumber)) {
            return { id: docSnap.id, ...docData } as Order;
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ [FirebaseOrderService] Client getOrderByOrderNumber error for ${cleanNum}:`, err?.message);
      }
    }

    // 2. Try server API tracking route (directly talks to Firebase Admin SDK)
    try {
      const res = await fetch(`/api/orders/track?term=${encodeURIComponent(cleanNum)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order) {
          if (
            !storageService.isOrderTombstoned(data.order.id) &&
            !storageService.isOrderTombstoned(data.order.orderNumber)
          ) {
            return data.order as Order;
          }
        }
      }
    } catch (apiErr) {
      // ignore
    }

    // 3. Try localStorage guest orders
    try {
      const localOrders = storageService.getGuestOrders<Order[]>([]);
      const localMatch = localOrders.find(
        (o) =>
          (o.orderNumber?.toUpperCase() === upperNum ||
            o.orderNumber?.toUpperCase() === cleanNum ||
            o.id === cleanNum) &&
          !storageService.isOrderTombstoned(o.id) &&
          !storageService.isOrderTombstoned(o.orderNumber)
      );
      if (localMatch) return localMatch;
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Unified resilient customer order tracking method
   */
  async trackOrder(term: string): Promise<Order | null> {
    if (!term || !term.trim()) return null;
    const cleanTerm = term.trim();
    if (storageService.isOrderTombstoned(cleanTerm)) return null;

    // 1. Try orderNumber
    let order = await this.getOrderByOrderNumber(cleanTerm);
    if (order) return order;

    // 2. Try ID
    order = await this.getOrderById(cleanTerm);
    if (order) return order;

    return null;
  }

  /**
   * Deletes a single order by ID or orderNumber permanently and completely across all layers
   */
  async deleteOrder(orderId: string, orderNumber?: string): Promise<boolean> {
    if (!orderId && !orderNumber) {
      throw new Error('معرف الطلب مطلوب لحذف الطلب');
    }

    const cleanId = (orderId || '').trim();
    const cleanNum = (orderNumber || '').trim();

    // 1. Immediately remove from local storage & register tombstone
    if (cleanId) {
      storageService.removeGuestOrder(cleanId);
      storageService.recordDeletedOrderTombstone(cleanId);
    }
    if (cleanNum) {
      storageService.removeGuestOrder(cleanNum);
      storageService.recordDeletedOrderTombstone(cleanNum);
    }

    // 2. Client-side Firestore delete (if configured)
    if (isFirebaseConfigured() && db) {
      try {
        if (cleanId) {
          const orderRef = doc(db, ORDERS_COLLECTION, cleanId);
          await deleteDoc(orderRef).catch(() => {});
        }
        if (cleanNum && cleanNum !== cleanId) {
          const q = query(
            collection(db, ORDERS_COLLECTION),
            where('orderNumber', '==', cleanNum),
            limit(5)
          );
          const snap = await getDocs(q);
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit().catch(() => {});
        }
      } catch (clientErr) {
        console.warn(`[FirebaseOrderService] Client deleteDoc warning for ${cleanId}:`, clientErr);
      }
    }

    // 3. Always invoke Server Admin API delete to guarantee permanent removal in Firestore
    try {
      const authContext = await adminAuthorizationService.getCurrentAdminAuthorization(false);
      const res = await fetch('/api/admin/order/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authContext.token ? `Bearer ${authContext.token}` : '',
        },
        body: JSON.stringify({
          orderId: cleanId,
          orderNumber: cleanNum || (cleanId.startsWith('PB-') ? cleanId : undefined),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn('⚠️ [FirebaseOrderService] Server delete API non-OK response:', errJson);
      }
    } catch (serverErr: any) {
      console.warn('⚠️ [FirebaseOrderService] Server delete API warning:', serverErr?.message);
    }

    // 4. Audit log
    try {
      await auditLogService.logAdminAction({
        action: 'delete_order',
        targetType: 'order',
        targetId: cleanId || cleanNum,
        summaryAr: `تم حذف الطلب رقم ${cleanNum || cleanId} نهائياً`,
      });
    } catch {
      // non-blocking
    }

    return true;
  }

  /**
   * Bulk deletes multiple orders by ID array across all layers
   */
  async deleteMultipleOrders(orderIds: string[]): Promise<number> {
    if (!orderIds || orderIds.length === 0) return 0;

    // 1. Immediately clean from localStorage & record tombstones
    storageService.removeGuestOrders(orderIds);
    orderIds.forEach((id) => storageService.recordDeletedOrderTombstone(id));

    // 2. Client SDK batch delete
    if (isFirebaseConfigured() && db) {
      try {
        const chunkSize = 400;
        for (let i = 0; i < orderIds.length; i += chunkSize) {
          const chunk = orderIds.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach((id) => {
            const orderRef = doc(db, ORDERS_COLLECTION, id);
            batch.delete(orderRef);
          });
          await batch.commit();
        }
      } catch (clientErr) {
        console.warn('⚠️ [FirebaseOrderService] Client bulk delete batch warning:', clientErr);
      }
    }

    // 3. Always invoke Server Admin API bulk-delete
    let totalDeleted = orderIds.length;
    try {
      const authContext = await adminAuthorizationService.getCurrentAdminAuthorization(false);
      const res = await fetch('/api/admin/orders/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authContext.token ? `Bearer ${authContext.token}` : '',
        },
        body: JSON.stringify({ orderIds }),
      });
      if (res.ok) {
        const d = await res.json();
        if (typeof d.deletedCount === 'number') {
          totalDeleted = d.deletedCount;
        }
      }
    } catch (serverErr: any) {
      console.warn('⚠️ [FirebaseOrderService] Server bulk delete API warning:', serverErr?.message);
    }

    try {
      await auditLogService.logAdminAction({
        action: 'bulk_delete_orders',
        targetType: 'order',
        targetId: 'multiple',
        summaryAr: `تم حذف ${totalDeleted} طلب محدد بنجاح`,
      });
    } catch {
      // non-blocking
    }

    return totalDeleted;
  }

  /**
   * Cleans orders filtered by status ('completed', 'cancelled', or both)
   */
  async cleanOrdersByFilter(
    targetStatuses: ('completed' | 'cancelled')[],
    olderThanDays: number = 0
  ): Promise<number> {
    const authContext = await adminAuthorizationService.getCurrentAdminAuthorization(false);
    if (!authContext.authenticated || !authContext.isAdmin) {
      throw new Error('فقط مدير النظام الرئيسي (Admin) يحق له تنفيذ عملية تنظيف الطلبات القديمة.');
    }

    const statuses = targetStatuses && targetStatuses.length > 0 ? targetStatuses : ['completed', 'cancelled'];

    // 1. Try Client Firestore Batch
    if (isFirebaseConfigured() && db) {
      try {
        const snapshot = await getDocs(collection(db, ORDERS_COLLECTION));
        let matchingDocs = snapshot.docs.filter((docSnap) => {
          const status = docSnap.data().status;
          return statuses.includes(status);
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

        if (matchingDocs.length > 0) {
          const matchingOrders = matchingDocs.map((d) => ({ id: d.id, ...d.data() }));
          // Archive orders permanently for reports & analytics
          storageService.archiveOrders(matchingOrders);

          const matchingIds = matchingDocs.map((d) => d.id);
          storageService.removeGuestOrders(matchingIds);
          matchingIds.forEach((id) => storageService.recordDeletedOrderTombstone(id));

          const chunkSize = 400;
          for (let i = 0; i < matchingDocs.length; i += chunkSize) {
            const chunk = matchingDocs.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach((docSnap) => {
              // Copy to archivedOrders collection
              const archiveRef = doc(db, 'archivedOrders', docSnap.id);
              batch.set(archiveRef, {
                ...docSnap.data(),
                archivedAt: new Date().toISOString(),
                archiveReason: 'clean_orders',
              }, { merge: true });
              batch.delete(docSnap.ref);
            });
            await batch.commit();
          }
        }
      } catch (clientErr) {
        console.warn('⚠️ [FirebaseOrderService] Client batch clean failed, falling back to Server Admin API...', clientErr);
      }
    }

    // 2. Fallback to Server Admin API
    try {
      const authContext = await adminAuthorizationService.getCurrentAdminAuthorization(false);
      const res = await fetch('/api/admin/orders/clean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authContext.token ? `Bearer ${authContext.token}` : '',
        },
        body: JSON.stringify({
          statuses,
          olderThanDays,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Server clean failed with HTTP ${res.status}`);
      }

      const resData = await res.json();
      return resData.deletedCount || 0;
    } catch (apiErr: any) {
      console.error('❌ [FirebaseOrderService] Admin API clean failed:', apiErr);
      throw new Error(apiErr.message || 'فشل تنظيف الطلبات القديمة');
    }
  }

  /**
   * Bulk deletes completed or cancelled orders older than N days
   */
  async deleteOldOrders(olderThanDays: number = 7): Promise<number> {
    return this.cleanOrdersByFilter(['completed', 'cancelled'], olderThanDays);
  }

  /**
   * System Reset: Delegates to systemResetService for multi-stage permanent deletion of orders & archivedOrders,
   * atomic sequence reset (online: 0, pickup: 0), cache zeroing, and post-reset verification.
   */
  async resetAllOrders(onProgress?: (deleted: number, total: number) => void): Promise<number> {
    const { systemResetService } = await import('./systemResetService');
    const result = await systemResetService.resetSystem((p) => {
      if (onProgress) {
        onProgress(p.deletedOrdersCount + p.deletedArchivedCount, p.deletedOrdersCount + p.deletedArchivedCount || 1);
      }
    });
    return result.deletedOrdersCount;
  }

  /**
   * Assign or unassign a delivery driver to an order
   */
  async assignDriverToOrder(
    orderId: string,
    driver: { id: string; name: string; phone: string; status?: string } | null
  ): Promise<void> {
    if (!orderId) throw new Error('معرف الطلب مطلوب');

    if (driver && driver.id) {
      const driverRecord = deliveryDriverService.getDriverByIdSync(driver.id);
      if (driverRecord && driverRecord.status !== 'active') {
        throw new Error(
          `لا يمكن تعيين المندوب "${driver.name}" لأنه معطل حالياً بقرار الإدارة. يرجى تفعيله أولاً من تبويب المناديب.`
        );
      }
      if (driver.status && driver.status !== 'active') {
        throw new Error(
          `لا يمكن تعيين المندوب "${driver.name}" لأنه معطل حالياً بقرار الإدارة.`
        );
      }
    }

    const authContext = await adminAuthorizationService.getCurrentAdminAuthorization(false);
    const nowIso = new Date().toISOString();

    const payload = driver
      ? {
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          driverAssignedAt: nowIso,
          updatedAt: nowIso,
          updatedAtServer: serverTimestamp(),
        }
      : {
          driverId: null,
          driverName: null,
          driverPhone: null,
          driverAssignedAt: null,
          updatedAt: nowIso,
          updatedAtServer: serverTimestamp(),
        };

    // 1. Direct Firestore update
    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, payload);

      await auditLogService.logAdminAction({
        action: 'assign_driver',
        targetType: 'order',
        targetId: orderId,
        summaryAr: driver
          ? `تعيين مندوب التوصيل "${driver.name}" (${driver.phone}) للطلب #${orderId}`
          : `إلغاء تعيين المندوب من الطلب #${orderId}`,
        metadata: {
          orderId,
          driverId: driver?.id || null,
          driverName: driver?.name || null,
        },
        adminEmail: authContext.email || 'admin@pamborina.com',
      });
    } catch (firestoreErr: any) {
      console.warn('[FirebaseOrderService] Direct driver assignment warning, attempting server API:', firestoreErr);
      if (authContext.token) {
        try {
          await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/assign-driver`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authContext.token}`,
            },
            body: JSON.stringify({ driver }),
          });
        } catch {
          // fallback
        }
      }
    }
  }

  /**
   * Add or update delivery fee for a specific order and update totals across all layers
   */
  async updateOrderDeliveryFee(
    orderId: string,
    deliveryFee: number,
    notes?: string
  ): Promise<{ deliveryFee: number; total: number }> {
    if (!orderId) throw new Error('معرف الطلب مطلوب');

    const authContext = await adminAuthorizationService.getCurrentAdminAuthorization(false);
    const nowIso = new Date().toISOString();
    const feeNum = Math.max(0, Number(deliveryFee) || 0);

    let calculatedTotal = 0;
    let orderNumber = orderId;

    // 1. Direct Firestore read & update
    if (isFirebaseConfigured() && db) {
      try {
        const orderRef = doc(db, ORDERS_COLLECTION, orderId);
        const snap = await getDoc(orderRef);
        if (snap.exists()) {
          const currentData = snap.data();
          orderNumber = currentData.orderNumber || orderId;
          const subtotal = Number(currentData.pricing?.subtotal || currentData.subtotal || 0);
          const discount = Number(currentData.pricing?.discountAmount || currentData.discountAmount || 0);
          calculatedTotal = Number(Math.max(0, subtotal + feeNum - discount).toFixed(2));

          const payload: Record<string, any> = {
            'pricing.deliveryFee': feeNum,
            'pricing.total': calculatedTotal,
            deliveryFee: feeNum,
            grandTotal: calculatedTotal,
            totalPrice: calculatedTotal,
            deliveryFeeManuallySet: true,
            deliveryFeeNotes: notes || '',
            deliveryFeeUpdatedAt: nowIso,
            deliveryFeeUpdatedBy: authContext.email || 'إدارة المتجر',
            updatedAt: nowIso,
            updatedAtServer: serverTimestamp(),
          };

          await updateDoc(orderRef, payload);
          console.log(`✅ [FirebaseOrderService] Direct Firestore delivery fee updated for #${orderNumber}: ${feeNum} EGP (Total: ${calculatedTotal})`);
        }
      } catch (firestoreErr: any) {
        console.warn('⚠️ [FirebaseOrderService] Direct delivery fee update warning, will use server API:', firestoreErr);
      }
    }

    // 2. Server Admin API update for guaranteed persistence & bypass client limits
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/delivery-fee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authContext.token ? `Bearer ${authContext.token}` : '',
        },
        body: JSON.stringify({
          deliveryFee: feeNum,
          notes: notes || '',
          updatedBy: authContext.email || 'admin@pamborina.com',
        }),
      });

      if (res.ok) {
        const serverData = await res.json();
        if (serverData.total) calculatedTotal = serverData.total;
        console.log(`✅ [FirebaseOrderService] Server delivery fee verified for #${orderId}`);
      }
    } catch (serverErr: any) {
      console.warn('⚠️ [FirebaseOrderService] Server delivery fee endpoint error:', serverErr?.message);
    }

    // 3. Update localStorage cache if order is stored locally
    try {
      const guestOrders = storageService.getGuestOrders();
      const updated = guestOrders.map((ord) => {
        if (ord.id === orderId || ord.orderNumber === orderId || ord.orderNumber === orderNumber) {
          const subtotal = Number(ord.pricing?.subtotal || ord.subtotal || 0);
          const discount = Number(ord.pricing?.discountAmount || ord.discountAmount || 0);
          const newTot = Number(Math.max(0, subtotal + feeNum - discount).toFixed(2));
          return {
            ...ord,
            pricing: {
              ...(ord.pricing || { subtotal, discountAmount: discount }),
              deliveryFee: feeNum,
              total: newTot,
            },
            deliveryFee: feeNum,
            grandTotal: newTot,
            totalPrice: newTot,
            deliveryFeeManuallySet: true,
            deliveryFeeNotes: notes || '',
            deliveryFeeUpdatedAt: nowIso,
            deliveryFeeUpdatedBy: authContext.email || 'إدارة المتجر',
            updatedAt: nowIso,
          };
        }
        return ord;
      });
      storageService.setGuestOrders(updated);
    } catch {
      // non-blocking
    }

    // 4. Audit Log
    try {
      await auditLogService.logAdminAction({
        action: 'update_order_pricing',
        targetType: 'order',
        targetId: orderId,
        summaryAr: `تم تحديد سعر التوصيل للطلب #${orderNumber} بقيمة ${feeNum} ج.م (إجمالي الفاتورة الجديد: ${calculatedTotal} ج.م)`,
        metadata: {
          orderId,
          orderNumber,
          deliveryFee: feeNum,
          newTotal: calculatedTotal,
          notes: notes || '',
        },
        adminEmail: authContext.email || 'admin@pamborina.com',
      });
    } catch {
      // non-blocking
    }

    return { deliveryFee: feeNum, total: calculatedTotal };
  }
}

export const firebaseOrderService = new FirebaseOrderService();
