import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { Branch } from '../types';
import branchesData from '../data/branches.json';
import { auditLogService } from './auditLogService';

export const BRANCHES_COLLECTION = 'branches';
export const DEFAULT_BRANCHES: Branch[] = branchesData as Branch[];
const BRANCHES_CACHE_KEY = 'pamborina_custom_branches_v2';
const BRANCHES_EVENT = 'pamborina_branches_changed';

// In-memory runtime store for active branch state
let memoryBranches: Branch[] = (() => {
  try {
    const cached = localStorage.getItem(BRANCHES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [...DEFAULT_BRANCHES];
})();

function saveToLocalStorage(branches: Branch[]) {
  try {
    memoryBranches = [...branches];
    localStorage.setItem(BRANCHES_CACHE_KEY, JSON.stringify(branches));
    window.dispatchEvent(new CustomEvent(BRANCHES_EVENT, { detail: branches }));
  } catch (e) {
    console.warn('⚠️ [BranchService] Local storage save failed:', e);
  }
}

export const firebaseBranchService = {
  /**
   * Returns branches synchronously from memory/local cache.
   */
  getBranchesSync(): Branch[] {
    return memoryBranches.length > 0 ? memoryBranches : DEFAULT_BRANCHES;
  },

  /**
   * Fetches all branches from Firestore, falling back to cached/static official branches.
   */
  async getBranches(): Promise<Branch[]> {
    if (!isFirebaseConfigured() || !db) {
      return memoryBranches.length > 0 ? memoryBranches : DEFAULT_BRANCHES;
    }

    try {
      const snap = await getDocs(collection(db, BRANCHES_COLLECTION));
      if (!snap.empty) {
        const firestoreBranches: Branch[] = [];
        snap.forEach((d) => {
          if (d.exists()) {
            firestoreBranches.push({
              ...(d.data() as Branch),
              id: d.id,
            });
          }
        });
        if (firestoreBranches.length > 0) {
          saveToLocalStorage(firestoreBranches);
          return firestoreBranches;
        }
      }
    } catch (err) {
      console.warn('⚠️ [BranchService] Failed to load branches from Firestore, using local cache:', err);
    }

    return memoryBranches.length > 0 ? memoryBranches : DEFAULT_BRANCHES;
  },

  /**
   * Subscribes to real-time branch updates.
   */
  subscribeToBranches(
    callback: (branches: Branch[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    // Initial notify
    callback(memoryBranches.length > 0 ? memoryBranches : DEFAULT_BRANCHES);

    // Local broadcast listener
    const handleLocalEvent = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        callback(e.detail);
      }
    };
    window.addEventListener(BRANCHES_EVENT, handleLocalEvent);

    let firestoreUnsubscribe: Unsubscribe = () => {};

    if (isFirebaseConfigured() && db) {
      try {
        firestoreUnsubscribe = onSnapshot(
          collection(db, BRANCHES_COLLECTION),
          (snap) => {
            if (!snap.empty) {
              const firestoreBranches: Branch[] = [];
              snap.forEach((d) => {
                if (d.exists()) {
                  firestoreBranches.push({
                    ...(d.data() as Branch),
                    id: d.id,
                  });
                }
              });
              if (firestoreBranches.length > 0) {
                memoryBranches = firestoreBranches;
                try {
                  localStorage.setItem(BRANCHES_CACHE_KEY, JSON.stringify(firestoreBranches));
                } catch {}
                callback(firestoreBranches);
              }
            }
          },
          (err) => {
            console.log('[BranchService] Realtime listener note (using local cache):', err?.message || err);
            if (onError) onError(err);
          }
        );
      } catch (err: any) {
        console.warn('⚠️ [BranchService] Subscription setup failed:', err);
      }
    }

    return () => {
      window.removeEventListener(BRANCHES_EVENT, handleLocalEvent);
      firestoreUnsubscribe();
    };
  },

  /**
   * Updates an existing branch in Firestore and local store.
   */
  async updateBranch(id: string, updates: Partial<Branch>): Promise<void> {
    if (!id) return;

    // 1. Immediately update local store & memory
    const existingIndex = memoryBranches.findIndex((b) => b.id === id);
    let updatedBranches: Branch[];
    if (existingIndex >= 0) {
      updatedBranches = [...memoryBranches];
      updatedBranches[existingIndex] = {
        ...updatedBranches[existingIndex],
        ...updates,
      };
    } else {
      const defaultB = DEFAULT_BRANCHES.find((b) => b.id === id) || ({} as Branch);
      updatedBranches = [...memoryBranches, { ...defaultB, ...updates, id } as Branch];
    }
    saveToLocalStorage(updatedBranches);

    // 2. Persist to Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, BRANCHES_COLLECTION, id);
        const cleanUpdates: Record<string, any> = {};
        Object.entries(updates).forEach(([k, v]) => {
          if (v !== undefined) {
            cleanUpdates[k] = v;
          }
        });

        const snap = await getDoc(docRef);
        if (snap.exists()) {
          await updateDoc(docRef, cleanUpdates);
        } else {
          const defaultB = DEFAULT_BRANCHES.find((b) => b.id === id);
          const fullBranch = {
            ...(defaultB || {}),
            ...cleanUpdates,
            id,
          };
          Object.keys(fullBranch).forEach((k) => fullBranch[k] === undefined && delete fullBranch[k]);
          await setDoc(docRef, fullBranch);
        }
        console.log(`✅ [BranchService] Branch [${id}] updated in Firestore.`);
      } catch (err: any) {
        console.warn(`⚠️ [BranchService] Firestore update note (saved locally):`, err);
      }
    }

    try {
      await auditLogService.logAdminAction({
        action: 'update_branch',
        targetType: 'branch',
        targetId: id,
        summaryAr: `تم تحديث بيانات الفرع (${updates.nameAr || id})`,
        metadata: updates,
      });
    } catch {}
  },

  /**
   * Toggles branch open/closed status.
   */
  async toggleBranchStatus(id: string, isOpen: boolean): Promise<void> {
    return this.updateBranch(id, { isOpen });
  },

  /**
   * Adds a new branch to Firestore and local store.
   */
  async createBranch(branchData: Omit<Branch, 'id'>, customId?: string): Promise<string> {
    const id = customId || `branch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newBranch: Branch = {
      ...branchData,
      id,
    };

    // 1. Immediately update local store
    const updatedBranches = [...memoryBranches.filter((b) => b.id !== id), newBranch];
    saveToLocalStorage(updatedBranches);

    // 2. Persist to Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, BRANCHES_COLLECTION, id);
        const cleanBranch: Record<string, any> = { ...newBranch };
        Object.keys(cleanBranch).forEach((k) => cleanBranch[k] === undefined && delete cleanBranch[k]);

        await setDoc(docRef, cleanBranch);
        console.log(`✅ [BranchService] Branch [${id}] created in Firestore.`);
      } catch (err: any) {
        console.warn(`⚠️ [BranchService] Firestore create note (saved locally):`, err);
      }
    }

    try {
      await auditLogService.logAdminAction({
        action: 'create_branch',
        targetType: 'branch',
        targetId: id,
        summaryAr: `تم إضافة فرع جديد: ${branchData.nameAr}`,
        metadata: { branch: newBranch },
      });
    } catch {}

    return id;
  },

  /**
   * Deletes a branch.
   */
  async deleteBranch(id: string): Promise<void> {
    if (!id) return;

    // 1. Remove from local store
    const remaining = memoryBranches.filter((b) => b.id !== id);
    saveToLocalStorage(remaining);

    // 2. Delete from Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, BRANCHES_COLLECTION, id);
        await deleteDoc(docRef);
      } catch (err: any) {
        console.warn(`⚠️ [BranchService] Firestore delete note:`, err);
      }
    }

    try {
      await auditLogService.logAdminAction({
        action: 'delete_branch',
        targetType: 'branch',
        targetId: id,
        summaryAr: `تم حذف الفرع (${id})`,
      });
    } catch {}
  },
};
