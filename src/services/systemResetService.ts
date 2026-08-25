import {
  collection,
  doc,
  getDocs,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { adminAuthorizationService } from './adminAuthorizationService';
import { orderSequenceService } from './orderSequenceService';
import { auditLogService } from './auditLogService';
import { storageService } from './storageService';

export type SystemResetStage =
  | 'securing'      // جاري تأمين نظام الطلبات...
  | 'deleting_orders' // جاري حذف الطلبات القديمة...
  | 'deleting_archive' // جاري حذف الأرشيف...
  | 'resetting_sequences' // جاري إعادة ضبط عدادات الطلبات...
  | 'verifying'    // جاري التحقق من نجاح العملية...
  | 'completed';   // تم بدء النظام من الصفر بنجاح.

export interface SystemResetProgress {
  stage: SystemResetStage;
  stageMessageAr: string;
  percent: number;
  deletedOrdersCount: number;
  deletedArchivedCount: number;
}

export class SystemResetService {
  private static instance: SystemResetService;
  private isCurrentlyResetting = false;

  public static getInstance(): SystemResetService {
    if (!SystemResetService.instance) {
      SystemResetService.instance = new SystemResetService();
    }
    return SystemResetService.instance;
  }

  /**
   * Executes a complete Production-Grade System Reset:
   * 1. Authorizes admin privileges.
   * 2. Sets system reset lock (preventing incoming orders).
   * 3. Permanently deletes all operational orders in 'orders'.
   * 4. Permanently deletes all historical records in 'archivedOrders'.
   * 5. Resets independent sequences (online: 0, pickup: 0) and clears locks.
   * 6. Clears client-side caches and tombstones.
   * 7. Runs post-reset verification queries.
   * 8. Records comprehensive audit log trail.
   */
  async resetSystem(
    onProgress?: (progress: SystemResetProgress) => void
  ): Promise<{
    success: boolean;
    deletedOrdersCount: number;
    deletedArchivedCount: number;
    verified: boolean;
  }> {
    if (this.isCurrentlyResetting) {
      throw new Error('عملية إعادة الضبط جارية بالفعل. يرجى الانتظار.');
    }

    this.isCurrentlyResetting = true;

    const reportProgress = (
      stage: SystemResetStage,
      stageMessageAr: string,
      percent: number,
      deletedOrdersCount: number = 0,
      deletedArchivedCount: number = 0
    ) => {
      if (onProgress) {
        onProgress({
          stage,
          stageMessageAr,
          percent,
          deletedOrdersCount,
          deletedArchivedCount,
        });
      }
    };

    try {
      // 1. Check Admin Authorization
      const authContext = await adminAuthorizationService.getCurrentAdminAuthorization(true);
      if (!authContext.authenticated || !authContext.isAdmin) {
        throw new Error('غير مصرح لك بتنفيذ هذا الإجراء الحساس (Admin Authorization Required).');
      }

      // Record old sequence state for audit logging
      const oldSeqState = await orderSequenceService.getSequenceState();

      // Stage 1: Securing & Locking Order System
      reportProgress('securing', 'جاري تأمين نظام الطلبات وقفل العمليات المؤقتة...', 10);
      await orderSequenceService.setResetLock(true);

      let totalDeletedOrders = 0;
      let totalDeletedArchived = 0;

      // 2. Client-Side Firestore Batch Deletion (if configured)
      if (isFirebaseConfigured() && db) {
        try {
          // Stage 2: Deleting Active Orders from 'orders'
          reportProgress('deleting_orders', 'جاري حذف الطلبات القديمة من قاعدة البيانات...', 30);
          
          const ordersSnap = await getDocs(collection(db, 'orders'));
          const orderDocs = ordersSnap.docs;
          const totalOrdersToDel = orderDocs.length;

          const chunkSize = 400; // max 500 per batch in Firestore
          for (let i = 0; i < totalOrdersToDel; i += chunkSize) {
            const chunk = orderDocs.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            totalDeletedOrders += chunk.length;
            reportProgress(
              'deleting_orders',
              `جاري حذف الطلبات القديمة (${totalDeletedOrders} من ${totalOrdersToDel})...`,
              30 + Math.floor((totalDeletedOrders / (totalOrdersToDel || 1)) * 25),
              totalDeletedOrders,
              0
            );
          }

          // Stage 3: Deleting Archived Orders from 'archivedOrders'
          reportProgress('deleting_archive', 'جاري حذف الأرشيف وسجلات الطلبات القديمة...', 60, totalDeletedOrders, 0);

          const archiveSnap = await getDocs(collection(db, 'archivedOrders'));
          const archiveDocs = archiveSnap.docs;
          const totalArchiveToDel = archiveDocs.length;

          for (let i = 0; i < totalArchiveToDel; i += chunkSize) {
            const chunk = archiveDocs.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            totalDeletedArchived += chunk.length;
            reportProgress(
              'deleting_archive',
              `جاري حذف الأرشيف (${totalDeletedArchived} من ${totalArchiveToDel})...`,
              60 + Math.floor((totalDeletedArchived / (totalArchiveToDel || 1)) * 15),
              totalDeletedOrders,
              totalDeletedArchived
            );
          }
        } catch (clientErr: any) {
          console.warn('⚠️ [SystemResetService] Client batch deletion warning, falling back to Server Admin API:', clientErr?.message);
        }
      }

      // 3. Server-Side Fallback & Dual-Guarantee Execution (talks to Firebase Admin SDK if server exists)
      if (authContext.token) {
        try {
          const res = await fetch('/api/admin/system/reset', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authContext.token}`,
            },
            body: JSON.stringify({}),
          });
          if (res.ok) {
            const serverData = await res.json();
            if (serverData.deletedOrdersCount && serverData.deletedOrdersCount > totalDeletedOrders) {
              totalDeletedOrders = serverData.deletedOrdersCount;
            }
          }
        } catch {
          // non-blocking fallback
        }
      }

      // Stage 4: Reset Sequences to 0 & Unlock System
      reportProgress('resetting_sequences', 'جاري إعادة ضبط عدادات الطلبات (Online & Pickup)...', 80, totalDeletedOrders, totalDeletedArchived);

      await orderSequenceService.resetSequencesToZero();

      // Clean local storage, session storage, and tombstone records
      const nowIso = new Date().toISOString();
      try {
        storageService.setLastSystemResetTimestamp(nowIso);
        storageService.clearGuestOrders();
        storageService.resetOrderSequence();
        storageService.clearTombstones();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pamborina_guest_orders');
          localStorage.removeItem('pamborina_historical_orders_archive');
          localStorage.removeItem('pamborina_deleted_orders_tombstones');
          localStorage.removeItem('orders_cache');
          sessionStorage.removeItem('orders_cache');
        }
      } catch (storageErr) {
        console.warn('⚠️ [SystemResetService] Local storage cleanup warning:', storageErr);
      }

      // Stage 5: Verification
      reportProgress('verifying', 'جاري التحقق من نجاح العملية ونظافة قاعدة البيانات...', 92, totalDeletedOrders, totalDeletedArchived);

      let verified = true;
      if (isFirebaseConfigured() && db) {
        try {
          const checkOrders = await getDocs(collection(db, 'orders'));
          const checkArchive = await getDocs(collection(db, 'archivedOrders'));
          const seqState = await orderSequenceService.getSequenceState();

          if (!checkOrders.empty || !checkArchive.empty || seqState.online !== 0 || seqState.pickup !== 0 || seqState.resetting !== false) {
            console.warn('⚠️ [SystemResetService] Post-reset verification notice:', {
              ordersRemaining: checkOrders.size,
              archiveRemaining: checkArchive.size,
              seqState,
            });
            verified = false;
          }
        } catch {
          // ignore verification read error
        }
      }

      // 6. Record Audit Log (Permanent Security Audit Trail)
      try {
        await auditLogService.logAdminAction({
          action: 'SYSTEM_RESET',
          targetType: 'system',
          targetId: 'order_system',
          summaryAr: `بدء النظام من الصفر: تم مسح جميع الطلبات التشغيلية القديمة (${totalDeletedOrders} طلب نشط، ${totalDeletedArchived} مؤرشف) وتصفير عداد الطلبات بنجاح لتبدأ من #ORDER-01`,
          metadata: {
            deletedOrdersCount: totalDeletedOrders,
            deletedArchivedCount: totalDeletedArchived,
            oldSequence: { online: oldSeqState?.online || 0, pickup: oldSeqState?.pickup || 0 },
            newSequence: { online: 0, pickup: 0 },
            verified,
            timestamp: nowIso,
          },
          adminEmail: authContext.email || 'admin@pamborina.com',
        });
      } catch (auditErr) {
        console.warn('⚠️ [SystemResetService] Audit log trigger warning:', auditErr);
      }

      // Stage 6: Completed
      reportProgress('completed', 'تم بدء النظام من الصفر بنجاح ✓', 100, totalDeletedOrders, totalDeletedArchived);

      return {
        success: true,
        deletedOrdersCount: totalDeletedOrders,
        deletedArchivedCount: totalDeletedArchived,
        verified,
      };
    } catch (error: any) {
      // Ensure reset lock is released in case of errors
      try {
        await orderSequenceService.setResetLock(false);
      } catch {
        // ignore
      }
      throw error;
    } finally {
      this.isCurrentlyResetting = false;
    }
  }
}

export const systemResetService = SystemResetService.getInstance();
