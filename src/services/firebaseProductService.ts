import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { Product } from '../types';
import { auditLogService } from './auditLogService';
import { firebaseStorageService } from './firebaseStorageService';

export const PRODUCTS_COLLECTION = 'products';

/**
 * Maps raw Firestore document data to application Product contract preserving all fields
 */
export const mapFirestoreDocToProduct = (docId: string, data: DocumentData): Product => {
  const productImg = data.imageUrl || data.image || '/default-food.webp';
  const priceNum = typeof data.price === 'number' ? data.price : (Number(data.price) || 0);

  return {
    id: docId || data.id,
    name: data.name || data.nameAr || '',
    nameAr: data.nameAr || data.name || '',
    nameEn: data.nameEn || '',
    description: data.description || data.descriptionAr || '',
    descriptionAr: data.descriptionAr || data.description || '',
    shortDescriptionAr: data.shortDescriptionAr || '',
    price: priceNum,
    originalPrice: data.originalPrice !== undefined ? Number(data.originalPrice) : (data.discount !== undefined ? Number(data.discount) : undefined),
    category: data.category || data.categoryId || 'burgers',
    categoryId: data.categoryId || data.category || 'burgers',
    slug: data.slug || docId || data.id,
    image: productImg,
    imageUrl: productImg,
    galleryImages: Array.isArray(data.galleryImages) ? data.galleryImages : [],
    available: data.available !== undefined
      ? Boolean(data.available)
      : (data.isAvailable !== undefined ? Boolean(data.isAvailable) : true),
    isAvailable: data.isAvailable !== undefined
      ? Boolean(data.isAvailable)
      : (data.available !== undefined ? Boolean(data.available) : true),
    featured: Boolean(data.featured || data.popular),
    sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : (data.displayOrder !== undefined ? Number(data.displayOrder) : 0),
    displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) : (data.sortOrder !== undefined ? Number(data.sortOrder) : 0),
    tags: Array.isArray(data.tags) ? data.tags : [],
    variants: Array.isArray(data.variants) ? data.variants : [],
    addonGroups: Array.isArray(data.addonGroups) ? data.addonGroups : [],
    ingredientsAr: Array.isArray(data.ingredientsAr) ? data.ingredientsAr : [],
    nutritionalInfoAr: data.nutritionalInfoAr || '',
    preparationTimeMinutes: data.preparationTimeMinutes !== undefined ? Number(data.preparationTimeMinutes) : (data.prepTime !== undefined ? Number(data.prepTime) : 15),
    calories: data.calories !== undefined && data.calories !== null ? Number(data.calories) : undefined,
    rating: data.rating !== undefined && data.rating !== null ? Number(data.rating) : 5.0,
    reviewCount: data.reviewCount !== undefined && data.reviewCount !== null ? Number(data.reviewCount) : 0,
    salesCount: data.salesCount !== undefined && data.salesCount !== null ? Number(data.salesCount) : 0,
    createdAt: data.createdAt || new Date().toISOString(),
  };
};

export const firebaseProductService = {
  /**
   * Fetches all products from Firestore collection 'products'.
   * Safely returns empty array if unconfigured, times out, or fails.
   */
  async getProductsFromFirestore(): Promise<Product[]> {
    if (!isFirebaseConfigured() || !db) {
      console.warn('[Firestore] Failed, using local products (Firebase not configured)');
      return [];
    }

    try {
      // 5 second timeout guard to avoid stalling UI under slow networks
      const timeoutPromise = new Promise<QuerySnapshot<DocumentData>>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore fetch request timed out')), 5000)
      );

      const fetchPromise = getDocs(collection(db, PRODUCTS_COLLECTION));
      const querySnapshot = await Promise.race([fetchPromise, timeoutPromise]);

      const products: Product[] = [];
      querySnapshot.forEach((docSnap) => {
        if (docSnap.exists()) {
          const raw = docSnap.data();
          if (raw) {
            products.push(mapFirestoreDocToProduct(docSnap.id, raw));
          }
        }
      });

      // Stable sort by sortOrder / displayOrder
      products.sort((a, b) => (a.sortOrder ?? a.displayOrder ?? 0) - (b.sortOrder ?? b.displayOrder ?? 0));

      if (products.length > 0) {
        console.log(`[Firestore] Products loaded: ${products.length}`);
        return products;
      } else {
        console.warn('[Firestore] Failed, using local products (empty Firestore collection)');
        return [];
      }
    } catch (err: any) {
      console.warn('[Firestore] Failed, using local products:', err?.message || err);
      return [];
    }
  },

  /**
   * Fetches a single product by ID from Firestore collection 'products'.
   */
  async getProductByIdFromFirestore(id: string): Promise<Product | null> {
    if (!isFirebaseConfigured() || !db || !id) {
      return null;
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore getProductById timed out')), 3000)
      );

      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      const docSnap = await Promise.race([getDoc(docRef), timeoutPromise]);

      if (!docSnap.exists()) {
        return null;
      }

      return mapFirestoreDocToProduct(docSnap.id, docSnap.data());
    } catch (err: any) {
      console.warn(`⚠️ [Firestore] getProductByIdFromFirestore [${id}] failed:`, err?.message || err);
      return null;
    }
  },

  /**
   * Subscribes to real-time changes in Firestore 'products' collection.
   * Always returns a safe unsubscribe cleanup function.
   */
  subscribeToProducts(
    onProductsUpdate: (products: Product[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const noopUnsubscribe: Unsubscribe = () => {};

    if (!isFirebaseConfigured() || !db) {
      if (onError) onError(new Error('Firebase is not configured'));
      return noopUnsubscribe;
    }

    try {
      const colRef = collection(db, PRODUCTS_COLLECTION);
      let isFirstSnapshot = true;

      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          try {
            const products: Product[] = [];
            snapshot.forEach((docSnap) => {
              if (docSnap.exists()) {
                const raw = docSnap.data();
                if (raw) {
                  products.push(mapFirestoreDocToProduct(docSnap.id, raw));
                }
              }
            });

            // Stable sort by sortOrder / displayOrder
            products.sort((a, b) => (a.sortOrder ?? a.displayOrder ?? 0) - (b.sortOrder ?? b.displayOrder ?? 0));

            if (isFirstSnapshot) {
              console.log('[Firestore] Realtime listener active');
              isFirstSnapshot = false;
            }

            if (products.length > 0) {
              onProductsUpdate(products);
            }
          } catch (docErr: any) {
            console.warn('⚠️ [Firestore Realtime] Error processing documents:', docErr?.message || docErr);
          }
        },
        (error) => {
          console.warn('[Firestore] Failed, using local products (listener error):', error?.message || error);
          if (onError) {
            try {
              onError(error);
            } catch (cbErr) {
              console.warn('⚠️ [Firestore Realtime] Error in caller onError callback:', cbErr);
            }
          }
        }
      );
      return unsubscribe || noopUnsubscribe;
    } catch (err: any) {
      console.warn('⚠️ [Firestore Realtime] Failed to setup subscription:', err?.message || err);
      if (onError) {
        try {
          onError(err);
        } catch (cbErr) {
          console.warn('⚠️ [Firestore Realtime] Error in caller onError callback:', cbErr);
        }
      }
      return noopUnsubscribe;
    }
  },

  /**
   * Subscribes to real-time changes for a single product by ID.
   * Always returns a safe unsubscribe cleanup function.
   */
  subscribeToProduct(
    id: string,
    onProductUpdate: (product: Product | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const noopUnsubscribe: Unsubscribe = () => {};

    if (!isFirebaseConfigured() || !db || !id) {
      if (onError) onError(new Error('Firebase is not configured or missing product ID'));
      return noopUnsubscribe;
    }

    try {
      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          try {
            if (docSnap.exists()) {
              onProductUpdate(mapFirestoreDocToProduct(docSnap.id, docSnap.data()));
            } else {
              onProductUpdate(null);
            }
          } catch (docErr) {
            console.warn('⚠️ [Firestore Realtime] Error mapping single doc:', docErr);
          }
        },
        (error) => {
          console.warn(`⚠️ [Firestore Realtime] Single product [${id}] listener error:`, error?.message || error);
          if (onError) {
            try {
              onError(error);
            } catch (cbErr) {
              console.warn('⚠️ [Firestore Realtime] Error in caller onError callback:', cbErr);
            }
          }
        }
      );
      return unsubscribe || noopUnsubscribe;
    } catch (err: any) {
      console.warn(`⚠️ [Firestore Realtime] Failed to setup single product [${id}] subscription:`, err?.message || err);
      if (onError) {
        try {
          onError(err);
        } catch (cbErr) {
          console.warn('⚠️ [Firestore Realtime] Error in caller onError callback:', cbErr);
        }
      }
      return noopUnsubscribe;
    }
  },

  /**
   * Performs partial update on an existing product in Firestore.
   * Preserves all other existing document fields safely.
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    if (!isFirebaseConfigured() || !db || !id) {
      throw new Error('Firestore is not initialized or invalid product ID');
    }

    try {
      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      
      // Clean undefined keys to prevent Firestore payload rejection
      const cleanData: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      }

      // Synchronize availability flags if either is provided
      if (updates.isAvailable !== undefined) {
        cleanData.isAvailable = Boolean(updates.isAvailable);
        cleanData.available = Boolean(updates.isAvailable);
      } else if (updates.available !== undefined) {
        cleanData.isAvailable = Boolean(updates.available);
        cleanData.available = Boolean(updates.available);
      }

      // Synchronize order flags if provided
      if (updates.sortOrder !== undefined) {
        cleanData.sortOrder = Number(updates.sortOrder);
        cleanData.displayOrder = Number(updates.sortOrder);
      } else if (updates.displayOrder !== undefined) {
        cleanData.sortOrder = Number(updates.displayOrder);
        cleanData.displayOrder = Number(updates.displayOrder);
      }

      // Update timestamp
      cleanData.updatedAt = new Date().toISOString();

      await updateDoc(docRef, cleanData);
      console.log(`✅ [Firestore] Product [${id}] updated successfully.`);

      // Log to Audit Log
      const isPriceChange = updates.price !== undefined;
      await auditLogService.logAdminAction({
        action: isPriceChange ? 'update_price' : 'update_product',
        targetType: 'product',
        targetId: id,
        summaryAr: isPriceChange
          ? `تم تعديل سعر المنتج (${updates.nameAr || id}) إلى ${updates.price} ج.م`
          : `تم تعديل بيانات المنتج (${updates.nameAr || id})`,
        metadata: cleanData,
      });
    } catch (err: any) {
      console.error(`❌ [Firestore] Failed to update product [${id}]:`, err?.message || err);
      throw new Error(err?.message || 'فشل تحديث بيانات المنتج في قاعدة البيانات.');
    }
  },

  /**
   * Fast toggle for product availability state in Firestore with one click.
   */
  async updateProductAvailability(id: string, isAvailable: boolean, productNameAr?: string): Promise<void> {
    if (!isFirebaseConfigured() || !db || !id) {
      console.warn(`[Firestore] Local mode / Firestore unconfigured, updating product [${id}] availability locally`);
      return;
    }

    try {
      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      await updateDoc(docRef, {
        isAvailable,
        available: isAvailable,
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ [Firestore] Product [${id}] availability set to: ${isAvailable}`);

      await auditLogService.logAdminAction({
        action: 'toggle_availability',
        targetType: 'product',
        targetId: id,
        summaryAr: `تم تغيير حالة توفر المنتج (${productNameAr || id}) إلى: ${isAvailable ? 'متوفر' : 'غير متوفر'}`,
        metadata: { isAvailable },
      });
    } catch (err: any) {
      console.error(`❌ [Firestore] Failed to toggle availability for [${id}]:`, err);
      // Soft fail: don't break local state if network glitch occurs
    }
  },

  /**
   * High performance atomic bulk update for multiple products availability in Firestore.
   */
  async bulkUpdateProductAvailability(
    productsToUpdate: { id: string; nameAr?: string }[],
    isAvailable: boolean
  ): Promise<void> {
    if (!productsToUpdate || productsToUpdate.length === 0) return;

    if (isFirebaseConfigured() && db) {
      try {
        const batch = writeBatch(db);
        const now = new Date().toISOString();

        productsToUpdate.forEach((p) => {
          const docRef = doc(db, PRODUCTS_COLLECTION, p.id);
          batch.update(docRef, {
            isAvailable,
            available: isAvailable,
            updatedAt: now,
          });
        });

        await batch.commit();
        console.log(`✅ [Firestore] Bulk updated ${productsToUpdate.length} products availability to: ${isAvailable}`);

        await auditLogService.logAdminAction({
          action: 'bulk_toggle_availability',
          targetType: 'product',
          targetId: 'bulk',
          summaryAr: `تم تفعيل وتحديث حالة ${productsToUpdate.length} صنف دفعة واحدة إلى: ${isAvailable ? 'متوفر' : 'غير متوفر'}`,
          metadata: { count: productsToUpdate.length, isAvailable },
        });
      } catch (err: any) {
        console.error('❌ [Firestore] Failed to bulk update products:', err);
      }
    } else {
      console.warn(`[Firestore] Local mode: bulk updated ${productsToUpdate.length} products availability locally`);
    }
  },

  /**
   * Creates a new product document in Firestore.
   */
  async createProduct(productData: Omit<Product, 'id'>, customId?: string): Promise<string> {
    if (!isFirebaseConfigured() || !db) {
      throw new Error('Firestore is not initialized');
    }

    try {
      const newId = customId || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const docRef = doc(db, PRODUCTS_COLLECTION, newId);

      const cleanDoc: Record<string, any> = {
        id: newId,
        nameAr: productData.nameAr || '',
        nameEn: productData.nameEn || '',
        name: productData.name || productData.nameAr || '',
        descriptionAr: productData.descriptionAr || '',
        description: productData.description || productData.descriptionAr || '',
        shortDescriptionAr: productData.shortDescriptionAr || '',
        price: Number(productData.price) || 0,
        originalPrice: productData.originalPrice !== undefined && productData.originalPrice !== null ? Number(productData.originalPrice) : null,
        category: productData.category || productData.categoryId || 'burgers',
        categoryId: productData.categoryId || productData.category || 'burgers',
        slug: productData.slug || newId,
        image: productData.image || productData.imageUrl || '/default-food.webp',
        imageUrl: productData.imageUrl || productData.image || '/default-food.webp',
        galleryImages: productData.galleryImages || [],
        isAvailable: productData.isAvailable !== undefined ? productData.isAvailable : true,
        available: productData.available !== undefined ? productData.available : true,
        featured: Boolean(productData.featured),
        sortOrder: productData.sortOrder !== undefined ? Number(productData.sortOrder) : 0,
        displayOrder: productData.displayOrder !== undefined ? Number(productData.displayOrder) : 0,
        tags: productData.tags || [],
        variants: productData.variants || [],
        addonGroups: productData.addonGroups || [],
        ingredientsAr: productData.ingredientsAr || [],
        nutritionalInfoAr: productData.nutritionalInfoAr || '',
        preparationTimeMinutes: productData.preparationTimeMinutes || 15,
        calories: productData.calories || null,
        rating: productData.rating || 5.0,
        reviewCount: productData.reviewCount || 0,
        salesCount: productData.salesCount || 0,
        createdAt: new Date().toISOString(),
      };

      await setDoc(docRef, cleanDoc);
      console.log(`✅ [Firestore] New product [${newId}] created successfully.`);

      await auditLogService.logAdminAction({
        action: 'create_product',
        targetType: 'product',
        targetId: newId,
        summaryAr: `تم إضافة منتج جديد: ${productData.nameAr} بسعر ${productData.price} ج.م`,
        metadata: { product: cleanDoc },
      });

      return newId;
    } catch (err: any) {
      console.error('❌ [Firestore] Failed to create product:', err?.message || err);
      throw new Error(err?.message || 'فشل إضافة المنتج الجديد في قاعدة البيانات.');
    }
  },

  /**
   * Deletes a product from Firestore and cleans up associated Storage image safely.
   * Preserves historical orders because orders maintain their own snapshot of items.
   */
  async deleteProduct(productOrId: Product | string, optionalImageUrl?: string): Promise<void> {
    const id = typeof productOrId === 'string' ? productOrId : productOrId.id;
    const imgUrl = typeof productOrId === 'string' ? optionalImageUrl : (productOrId.imageUrl || productOrId.image);
    const productName = typeof productOrId === 'string' ? id : (productOrId.nameAr || id);

    if (!isFirebaseConfigured() || !db || !id) {
      throw new Error('قاعدة البيانات غير متصلة أو معرف المنتج غير صالح');
    }

    try {
      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      await deleteDoc(docRef);

      // Clean up Storage image if it is a Firebase Storage URL
      if (imgUrl && imgUrl.includes('firebasestorage.googleapis.com')) {
        try {
          await firebaseStorageService.deleteProductImage(imgUrl);
        } catch (storageErr) {
          console.warn('⚠️ [Storage] Could not delete image during product deletion:', storageErr);
        }
      }

      console.log(`🗑️ [Firestore] Product [${id}] deleted.`);

      await auditLogService.logAdminAction({
        action: 'delete_product',
        targetType: 'product',
        targetId: id,
        summaryAr: `تم حذف المنتج: ${productName}`,
        metadata: { deletedProduct: { id, imgUrl } },
      });
    } catch (err: any) {
      console.error(`❌ [Firestore] Failed to delete product [${id}]:`, err);
      throw new Error(err?.message || 'فشل حذف المنتج من قاعدة البيانات.');
    }
  },
};
