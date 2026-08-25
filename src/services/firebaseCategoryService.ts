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
import { Category, Product } from '../types';
import categoriesData from '../data/categories.json';
import { auditLogService } from './auditLogService';
import { firebaseProductService } from './firebaseProductService';

export const CATEGORIES_COLLECTION = 'categories';
export const DEFAULT_CATEGORIES: Category[] = categoriesData as Category[];
const CATEGORIES_CACHE_KEY = 'pamborina_custom_categories_v2';
const CATEGORIES_EVENT = 'pamborina_categories_changed';

// In-memory runtime store for active category state
let memoryCategories: Category[] = (() => {
  try {
    const cached = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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

export const firebaseCategoryService = {
  /**
   * Fetches categories from Firestore with smart local-fallback.
   */
  async getCategories(): Promise<Category[]> {
    if (!isFirebaseConfigured() || !db) {
      return memoryCategories.length > 0 ? memoryCategories : DEFAULT_CATEGORIES;
    }

    try {
      const snap = await getDocs(collection(db, CATEGORIES_COLLECTION));
      if (!snap.empty) {
        const firestoreCats: Category[] = [];
        snap.forEach((d) => {
          if (d.exists()) {
            firestoreCats.push({
              ...(d.data() as Category),
              id: d.id,
            });
          }
        });

        if (firestoreCats.length > 0) {
          // Sort by sortOrder
          firestoreCats.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
          saveToLocalStorage(firestoreCats);
          return firestoreCats;
        }
      }
    } catch (err) {
      console.warn('⚠️ [CategoryService] Failed to load categories from Firestore, using cached/local:', err);
    }

    return memoryCategories.length > 0 ? memoryCategories : DEFAULT_CATEGORIES;
  },

  /**
   * Subscribes to real-time category updates from Firestore and local broadcaster.
   */
  subscribeToCategories(
    callback: (categories: Category[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    // Initial notify with current memory state
    callback(memoryCategories.length > 0 ? memoryCategories : DEFAULT_CATEGORIES);

    // Listen to local window broadcast events for instant UI sync
    const handleLocalEvent = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        callback(e.detail);
      }
    };
    window.addEventListener(CATEGORIES_EVENT, handleLocalEvent);

    let firestoreUnsubscribe: Unsubscribe = () => {};

    if (isFirebaseConfigured() && db) {
      try {
        firestoreUnsubscribe = onSnapshot(
          collection(db, CATEGORIES_COLLECTION),
          (snap) => {
            if (!snap.empty) {
              const firestoreCats: Category[] = [];
              snap.forEach((d) => {
                if (d.exists()) {
                  firestoreCats.push({
                    ...(d.data() as Category),
                    id: d.id,
                  });
                }
              });

              if (firestoreCats.length > 0) {
                firestoreCats.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
                memoryCategories = firestoreCats;
                try {
                  localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(firestoreCats));
                } catch {}
                callback(firestoreCats);
              }
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

    // 1. Immediately remove from local memory & trigger broadcast
    const remainingCategories = memoryCategories.filter((c) => c.id !== id);
    saveToLocalStorage(remainingCategories);

    // 2. Delete category from Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, CATEGORIES_COLLECTION, id);
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
   * Instantly reorders categories and saves new sort orders in memory & Firestore.
   */
  async reorderCategories(reordered: Category[]): Promise<void> {
    const updatedWithOrder = reordered.map((cat, idx) => ({
      ...cat,
      sortOrder: idx + 1,
      updatedAt: new Date().toISOString(),
    }));

    // 1. Instant local broadcast
    saveToLocalStorage(updatedWithOrder);

    // 2. Persist in background
    if (isFirebaseConfigured() && db) {
      for (const cat of updatedWithOrder) {
        try {
          const docRef = doc(db, CATEGORIES_COLLECTION, cat.id);
          await updateDoc(docRef, { sortOrder: cat.sortOrder, updatedAt: cat.updatedAt });
        } catch (err) {
          console.warn(`⚠️ [CategoryService] Failed to update sortOrder for [${cat.id}]:`, err);
        }
      }
    }
  },

  /**
   * Instantly toggles the 'featured' status of a category.
   */
  async toggleCategoryFeatured(id: string, featured: boolean): Promise<void> {
    return this.updateCategory(id, { featured });
  },
};

