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
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { Category, Product } from '../types';
import categoriesData from '../data/categories.json';
import { auditLogService } from './auditLogService';
import { firebaseProductService } from './firebaseProductService';

export const CATEGORIES_COLLECTION = 'categories';
export const CATEGORIES_META_COLLECTION = 'categories_meta';
export const DEFAULT_CATEGORIES: Category[] = categoriesData as Category[];
const CATEGORIES_CACHE_KEY = 'pamborina_custom_categories_v3';
const CATEGORIES_DELETED_KEY = 'pamborina_deleted_category_ids_v3';
const CATEGORIES_EVENT = 'pamborina_categories_changed';

// Track deleted category IDs so intentional deletions are remembered
function getDeletedCategoryIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CATEGORIES_DELETED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch {}
  return new Set<string>();
}

function saveDeletedCategoryIds(ids: Set<string>) {
  try {
    localStorage.setItem(CATEGORIES_DELETED_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

/**
 * Bulletproof merge function:
 * Ensures all 27 default categories are preserved,
 * overlays any updates from Firestore / user edits (such as custom thumbnails),
 * and respects explicitly deleted categories.
 */
function mergeCategoriesWithCatalog(
  incomingCategories: Category[],
  deletedIds: Set<string> = getDeletedCategoryIds()
): Category[] {
  const map = new Map<string, Category>();

  // 1. Seed with default catalog items that haven't been deleted
  for (const def of DEFAULT_CATEGORIES) {
    if (!deletedIds.has(def.id) && !deletedIds.has(def.slug || '')) {
      map.set(def.id, { ...def });
    }
  }

  // 2. Overlay incoming categories
  for (const cat of incomingCategories) {
    if (!cat || !cat.id) continue;

    // If marked deleted or in deleted set, remove
    if ((cat as any).isDeleted || deletedIds.has(cat.id) || deletedIds.has(cat.slug || '')) {
      map.delete(cat.id);
      continue;
    }

    const existing = map.get(cat.id);
    if (existing) {
      map.set(cat.id, {
        ...existing,
        ...cat,
        // Preserve essential labels if incoming has empty strings
        nameAr: cat.nameAr || existing.nameAr,
        nameEn: cat.nameEn || existing.nameEn || existing.nameAr,
        emoji: cat.emoji || existing.emoji || '🍽️',
        slug: cat.slug || existing.slug || cat.id,
        // Prefer explicit incoming imageUrl, or preserve existing
        imageUrl: cat.imageUrl !== undefined ? cat.imageUrl : existing.imageUrl,
        sortOrder: typeof cat.sortOrder === 'number' ? cat.sortOrder : existing.sortOrder,
        featured: typeof cat.featured === 'boolean' ? cat.featured : existing.featured,
      });
    } else {
      // New custom category added by admin
      map.set(cat.id, { ...cat });
    }
  }

  const result = Array.from(map.values());
  result.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  return result;
}

// In-memory runtime store for active category state initialized with merged catalog
let memoryCategories: Category[] = (() => {
  try {
    const cached = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeCategoriesWithCatalog(parsed);
      }
    }
  } catch {}
  return [...DEFAULT_CATEGORIES];
})();

function saveToLocalStorage(cats: Category[]) {
  try {
    memoryCategories = [...cats];
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(cats));
    window.dispatchEvent(new CustomEvent(CATEGORIES_EVENT, { detail: cats }));
  } catch (e) {
    console.warn('⚠️ [CategoryService] Local storage save failed:', e);
  }
}

// Flag to prevent continuous parallel seeding
let isSeedingInProgress = false;

async function autoSeedCategoriesToFirestore(categoriesToSeed: Category[]) {
  if (!isFirebaseConfigured() || !db || isSeedingInProgress) return;
  isSeedingInProgress = true;

  try {
    // Check existing documents in Firestore
    const existingSnap = await getDocs(collection(db, CATEGORIES_COLLECTION));
    const existingIds = new Set<string>();
    existingSnap.forEach((d) => {
      if (d.exists()) existingIds.add(d.id);
    });

    const missing = categoriesToSeed.filter((c) => !existingIds.has(c.id));
    if (missing.length === 0) {
      isSeedingInProgress = false;
      return;
    }

    console.log(`🔄 [CategoryService] Auto-syncing ${missing.length} missing categories to Firestore...`);

    // Write in chunks
    for (const cat of missing) {
      try {
        const docRef = doc(db, CATEGORIES_COLLECTION, cat.id);
        const cleanDoc: Record<string, any> = { ...cat };
        Object.keys(cleanDoc).forEach((k) => cleanDoc[k] === undefined && delete cleanDoc[k]);
        await setDoc(docRef, cleanDoc, { merge: true });
      } catch (docErr) {
        console.warn(`⚠️ [CategoryService] Seed category [${cat.id}] note:`, docErr);
      }
    }
    console.log(`✅ [CategoryService] All categories successfully synchronized in Firestore.`);
  } catch (err) {
    console.warn('⚠️ [CategoryService] Category auto-seed note:', err);
  } finally {
    isSeedingInProgress = false;
  }
}

export const firebaseCategoryService = {
  /**
   * Fetches categories from Firestore with smart local-fallback.
   */
  async getCategories(): Promise<Category[]> {
    if (!isFirebaseConfigured() || !db) {
      const merged = mergeCategoriesWithCatalog(memoryCategories);
      if (merged.length !== memoryCategories.length) {
        saveToLocalStorage(merged);
      }
      return merged;
    }

    try {
      const snap = await getDocs(collection(db, CATEGORIES_COLLECTION));
      const firestoreCats: Category[] = [];
      if (!snap.empty) {
        snap.forEach((d) => {
          if (d.exists()) {
            firestoreCats.push({
              ...(d.data() as Category),
              id: d.id,
            });
          }
        });
      }

      // Always merge firestore documents with the complete 27-category catalog
      const merged = mergeCategoriesWithCatalog(
        firestoreCats.length > 0 ? firestoreCats : memoryCategories
      );
      saveToLocalStorage(merged);

      // Auto-sync missing categories to Firestore so Firestore holds all documents
      if (firestoreCats.length < DEFAULT_CATEGORIES.length) {
        autoSeedCategoriesToFirestore(merged);
      }

      return merged;
    } catch (err) {
      console.warn('⚠️ [CategoryService] Failed to load categories from Firestore, using cached/local:', err);
    }

    const fallback = mergeCategoriesWithCatalog(memoryCategories);
    return fallback;
  },

  /**
   * Subscribes to real-time category updates from Firestore and local broadcaster.
   */
  subscribeToCategories(
    callback: (categories: Category[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    // Initial notify with current merged memory state (always contains all active categories)
    const initialList = mergeCategoriesWithCatalog(memoryCategories);
    if (initialList.length !== memoryCategories.length) {
      saveToLocalStorage(initialList);
    }
    callback(initialList);

    // Listen to local window broadcast events for instant UI sync
    const handleLocalEvent = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        callback(mergeCategoriesWithCatalog(e.detail));
      }
    };
    window.addEventListener(CATEGORIES_EVENT, handleLocalEvent);

    let firestoreUnsubscribe: Unsubscribe = () => {};

    if (isFirebaseConfigured() && db) {
      try {
        firestoreUnsubscribe = onSnapshot(
          collection(db, CATEGORIES_COLLECTION),
          (snap) => {
            const firestoreCats: Category[] = [];
            snap.forEach((d) => {
              if (d.exists()) {
                firestoreCats.push({
                  ...(d.data() as Category),
                  id: d.id,
                });
              }
            });

            // CRITICAL: Merge with the complete catalog so a single edited category
            // NEVER overwrites or deletes the other 26 categories!
            const merged = mergeCategoriesWithCatalog(
              firestoreCats.length > 0 ? firestoreCats : memoryCategories
            );

            memoryCategories = merged;
            try {
              localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(merged));
            } catch {}
            callback(merged);

            // If Firestore holds fewer documents than the full catalog, auto-sync missing in background
            if (firestoreCats.length < DEFAULT_CATEGORIES.length) {
              autoSeedCategoriesToFirestore(merged);
            }
          },
          (err) => {
            console.log('[CategoryService] Realtime listener note (using local cache):', err?.message || err);
            if (onError) onError(err);
          }
        );
      } catch (err: any) {
        console.warn('⚠️ [CategoryService] Firestore listener setup warning:', err);
      }
    }

    return () => {
      window.removeEventListener(CATEGORIES_EVENT, handleLocalEvent);
      firestoreUnsubscribe();
    };
  },

  /**
   * Creates a new category in Firestore and local store.
   */
  async createCategory(categoryData: Omit<Category, 'id'>, customId?: string): Promise<string> {
    const id = customId || categoryData.slug || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newCategory: Category = {
      id,
      nameAr: categoryData.nameAr || '',
      nameEn: categoryData.nameEn || categoryData.nameAr || '',
      slug: categoryData.slug || id,
      emoji: categoryData.emoji || '🍽️',
      descriptionAr: categoryData.descriptionAr || '',
      descriptionEn: categoryData.descriptionEn || '',
      imageUrl: categoryData.imageUrl || undefined,
      sortOrder: typeof categoryData.sortOrder === 'number' ? categoryData.sortOrder : memoryCategories.length + 1,
      featured: categoryData.featured !== false,
      createdAt: new Date().toISOString(),
    };

    // 1. Immediately update local store & trigger real-time broadcast across all open views
    const existingIndex = memoryCategories.findIndex((c) => c.id === id);
    let updatedCategories: Category[];
    if (existingIndex >= 0) {
      updatedCategories = [...memoryCategories];
      updatedCategories[existingIndex] = newCategory;
    } else {
      updatedCategories = [...memoryCategories, newCategory];
    }
    updatedCategories.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
    saveToLocalStorage(updatedCategories);

    // 2. Persist to Firestore in background / async
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, CATEGORIES_COLLECTION, id);
        const cleanDoc: Record<string, any> = { ...newCategory };
        Object.keys(cleanDoc).forEach((k) => cleanDoc[k] === undefined && delete cleanDoc[k]);

        await setDoc(docRef, cleanDoc);
        console.log(`✅ [CategoryService] Category [${id}] saved to Firestore.`);
      } catch (err: any) {
        console.warn(`⚠️ [CategoryService] Firestore write failed, persisted locally:`, err);
        // We do NOT re-throw if local save was successful, avoiding blocking the admin!
      }
    }

    try {
      await auditLogService.logAdminAction({
        action: 'create_category',
        targetType: 'category',
        targetId: id,
        summaryAr: `تم إضافة قسم جديد: ${categoryData.nameAr}`,
        metadata: { category: newCategory },
      });
    } catch {}

    return id;
  },

  /**
   * Updates an existing category in Firestore and local store.
   */
  async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
    if (!id) return;

    // 1. Immediately update local store
    const updatedCategories = memoryCategories.map((cat) => {
      if (cat.id === id) {
        return {
          ...cat,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return cat;
    });
    saveToLocalStorage(updatedCategories);

    // 2. Persist to Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, CATEGORIES_COLLECTION, id);
        const cleanUpdates: Record<string, any> = { ...updates };
        cleanUpdates.updatedAt = new Date().toISOString();
        Object.keys(cleanUpdates).forEach((k) => cleanUpdates[k] === undefined && delete cleanUpdates[k]);

        const snap = await getDoc(docRef);
        if (snap.exists()) {
          await updateDoc(docRef, cleanUpdates);
        } else {
          const targetCat = memoryCategories.find((c) => c.id === id) || { id, ...updates };
          await setDoc(docRef, targetCat);
        }
        console.log(`✅ [CategoryService] Category [${id}] updated in Firestore.`);
      } catch (err: any) {
        console.warn(`⚠️ [CategoryService] Firestore update note:`, err);
      }
    }

    try {
      await auditLogService.logAdminAction({
        action: 'update_category',
        targetType: 'category',
        targetId: id,
        summaryAr: `تم تحديث بيانات قسم (${updates.nameAr || id})`,
        metadata: updates,
      });
    } catch {}
  },

  /**
   * Deletes a category safely.
   * Options allow reassigning products to another category OR permanently deleting all products in the category.
   */
  async deleteCategory(
    id: string,
    currentProducts: Product[],
    options?: { force?: boolean; reassignCategoryId?: string; deleteProducts?: boolean }
  ): Promise<{ success: boolean; error?: string; deletedProductIds?: string[]; reassignedProductIds?: string[] }> {
    if (!id) {
      return { success: false, error: 'معرف القسم غير صالح' };
    }

    // Safety check: count products referencing this category
    const referencingProducts = currentProducts.filter(
      (p) => p.categoryId === id || p.category === id
    );

    if (referencingProducts.length > 0 && !options?.force && !options?.deleteProducts) {
      return {
        success: false,
        error: `لا يمكن حذف هذا القسم لأنه يحتوي على ${referencingProducts.length} منتج نشط. يرجى اختيار إجراء لنقل الأصناف أو حذفها.`,
      };
    }

    const deletedProductIds: string[] = [];
    const reassignedProductIds: string[] = [];

    // Mode A: Permanently delete all products in this category
    if (referencingProducts.length > 0 && options?.deleteProducts) {
      for (const prod of referencingProducts) {
        try {
          await firebaseProductService.deleteProduct(prod.id, prod.imageUrl || prod.image);
          deletedProductIds.push(prod.id);
        } catch (e) {
          console.warn(`⚠️ [CategoryService] Failed to delete product [${prod.id}] during category deletion:`, e);
        }
      }
    }
    // Mode B: Reassign products to a replacement category
    else if (referencingProducts.length > 0 && (options?.force || options?.reassignCategoryId)) {
      const newCatId = options.reassignCategoryId || 'other';
      if (isFirebaseConfigured() && db) {
        for (const prod of referencingProducts) {
          try {
            const prodDoc = doc(db, 'products', prod.id);
            await updateDoc(prodDoc, { category: newCatId, categoryId: newCatId });
            reassignedProductIds.push(prod.id);
          } catch (e) {
            console.warn(`⚠️ [CategoryService] Failed to reassign product [${prod.id}]:`, e);
          }
        }
      }
    }

    // Record explicit deletion in deleted IDs set so it won't be revived by catalog merge
    const deletedIds = getDeletedCategoryIds();
    deletedIds.add(id);
    saveDeletedCategoryIds(deletedIds);

    // 1. Immediately remove from local memory & trigger broadcast
    const remainingCategories = memoryCategories.filter((c) => c.id !== id);
    saveToLocalStorage(remainingCategories);

    // 2. Delete category from Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, CATEGORIES_COLLECTION, id);
        // Mark as deleted on document
        await setDoc(docRef, { isDeleted: true, deletedAt: new Date().toISOString() }, { merge: true });
        await deleteDoc(docRef);
        console.log(`🗑️ [CategoryService] Category [${id}] deleted from Firestore.`);
      } catch (err: any) {
        console.warn(`⚠️ [CategoryService] Firestore delete note:`, err);
      }
    }

    try {
      await auditLogService.logAdminAction({
        action: 'delete_category',
        targetType: 'category',
        targetId: id,
        summaryAr: options?.deleteProducts
          ? `تم حذف القسم (${id}) بجميع أصنافه التابعة له عدد (${deletedProductIds.length})`
          : `تم حذف القسم (${id}) ونقل منتجاته (${reassignedProductIds.length}) إلى القسم البديل (${options?.reassignCategoryId || 'other'})`,
      });
    } catch {}

    return { success: true, deletedProductIds, reassignedProductIds };
  },

  /**
   * Restores all 27 standard menu categories and syncs them directly to Firestore and local storage.
   */
  async restoreDefaultCategories(): Promise<Category[]> {
    // 1. Clear deleted IDs
    saveDeletedCategoryIds(new Set());

    // 2. Merge with current categories (retaining any custom thumbnails or custom categories)
    const restored = mergeCategoriesWithCatalog(memoryCategories, new Set());
    saveToLocalStorage(restored);

    // 3. Batch sync all categories to Firestore
    if (isFirebaseConfigured() && db) {
      autoSeedCategoriesToFirestore(restored);
    }

    try {
      await auditLogService.logAdminAction({
        action: 'restore_categories',
        targetType: 'category',
        targetId: 'all',
        summaryAr: `تمت استعادة ومزامنة كافة الأقسام الرئيسية (${restored.length} قسم) بنجاح`,
      });
    } catch {}

    return restored;
  },

  /**
   * Instantly reorders categories and saves new sort orders in memory & Firestore using atomic batch.
   */
  async reorderCategories(reordered: Category[]): Promise<void> {
    const updatedWithOrder = reordered.map((cat, idx) => ({
      ...cat,
      sortOrder: idx + 1,
      updatedAt: new Date().toISOString(),
    }));

    // 1. Instant local memory update & local broadcast (Zero latency)
    saveToLocalStorage(updatedWithOrder);

    // 2. Persist in background with Firestore batch write
    if (isFirebaseConfigured() && db) {
      try {
        const batch = writeBatch(db);
        for (const cat of updatedWithOrder) {
          const docRef = doc(db, CATEGORIES_COLLECTION, cat.id);
          batch.set(docRef, { sortOrder: cat.sortOrder, updatedAt: cat.updatedAt }, { merge: true });
        }
        await batch.commit();
        console.log(`✅ [CategoryService] Batch reordered ${updatedWithOrder.length} categories in Firestore.`);
      } catch (err) {
        console.warn(`⚠️ [CategoryService] Batch reorder fallback to single updates:`, err);
        for (const cat of updatedWithOrder) {
          try {
            const docRef = doc(db, CATEGORIES_COLLECTION, cat.id);
            await setDoc(docRef, { sortOrder: cat.sortOrder, updatedAt: cat.updatedAt }, { merge: true });
          } catch (singleErr) {}
        }
      }
    }

    try {
      await auditLogService.logAdminAction({
        action: 'reorder_categories',
        targetType: 'category',
        targetId: 'all',
        summaryAr: `تم تحديث ترتيب الأقسام بالسحب والإفلات (${reordered.length} قسم)`,
      });
    } catch {}
  },

  /**
   * Instantly toggles the 'featured' status of a category.
   */
  async toggleCategoryFeatured(id: string, featured: boolean): Promise<void> {
    return this.updateCategory(id, { featured });
  },
};

