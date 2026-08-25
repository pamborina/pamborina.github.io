import { Product, Category, SpecialOffer } from '../types';
import { categories as categoriesData, offers as offersData } from '../data';
import { menuSyncService } from './menuSyncService';
import { findMatchingProducts } from './searchEngine';
import { firebaseProductService } from './firebaseProductService';
import { firebaseCategoryService } from './firebaseCategoryService';
import { isFirebaseConfigured } from '../config/firebase';

// Service abstraction with Firebase primary source and Static Fallback
export const productService = {
  async getCategories(): Promise<Category[]> {
    try {
      return await firebaseCategoryService.getCategories();
    } catch {
      return categoriesData as Category[];
    }
  },

  async getProducts(params?: {
    categoryId?: string;
    tag?: string;
    searchQuery?: string;
    featuredOnly?: boolean;
    sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'popular';
  }): Promise<Product[]> {
    let items: Product[] = [];

    // Attempt Firebase fetch if configured, fallback seamlessly to static data if anything fails
    if (isFirebaseConfigured()) {
      try {
        const firestoreProducts = await firebaseProductService.getProductsFromFirestore();
        if (firestoreProducts && firestoreProducts.length > 0) {
          items = firestoreProducts;
        } else {
          items = [...menuSyncService.getCurrentProducts()];
        }
      } catch (err) {
        console.warn('[Firestore] Failed, using local products:', err);
        items = [...menuSyncService.getCurrentProducts()];
      }
    } else {
      items = [...menuSyncService.getCurrentProducts()];
    }

    if (params?.categoryId && params.categoryId !== 'all') {
      items = items.filter((p) => p.categoryId === params.categoryId || p.category === params.categoryId);
    }

    if (params?.tag) {
      items = items.filter((p) => p.tags?.includes(params.tag as any));
    }

    if (params?.featuredOnly) {
      items = items.filter((p) => p.featured);
    }

    if (params?.searchQuery) {
      items = findMatchingProducts(params.searchQuery, items, categoriesData as Category[]);
    }

    if (params?.sortBy) {
      switch (params.sortBy) {
        case 'price_asc':
          items.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          items.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'popular':
          items.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
          break;
      }
    }

    return items;
  },

  async getProductById(id: string): Promise<Product | null> {
    if (isFirebaseConfigured()) {
      try {
        const firestoreProduct = await firebaseProductService.getProductByIdFromFirestore(id);
        if (firestoreProduct) return firestoreProduct;
      } catch (err) {
        console.warn('⚠️ [ProductService] Firestore getProductById failed. Using fallback static data:', err);
      }
    }
    await new Promise((res) => setTimeout(res, 100));
    const item = menuSyncService.getCurrentProducts().find((p) => p.id === id || p.slug === id);
    return item || null;
  },

  /**
   * Subscribe to real-time product updates when Firestore is active.
   * Calls callback with updated product list if non-empty.
   */
  subscribeToProducts(
    onProductsUpdate: (products: Product[]) => void,
    onError?: (err: Error) => void
  ) {
    const safeUpdateHandler = (products: Product[]) => {
      if (products && products.length > 0) {
        onProductsUpdate(products);
      }
    };

    const safeErrorHandler = (err: Error) => {
      console.warn('⚠️ [ProductService Realtime] Realtime subscription notice:', err?.message || err);
      if (onError) {
        try {
          onError(err);
        } catch (cbErr) {
          console.warn('⚠️ [ProductService Realtime] Error in custom onError handler:', cbErr);
        }
      }
    };

    return firebaseProductService.subscribeToProducts(safeUpdateHandler, safeErrorHandler);
  },

  /**
   * Subscribe to real-time updates for a single product by ID.
   */
  subscribeToProduct(
    id: string,
    onProductUpdate: (product: Product | null) => void,
    onError?: (err: Error) => void
  ) {
    const safeErrorHandler = (err: Error) => {
      console.warn(`⚠️ [ProductService Realtime] Single product [${id}] notice:`, err?.message || err);
      if (onError) {
        try {
          onError(err);
        } catch (cbErr) {
          console.warn('⚠️ [ProductService Realtime] Error in custom onError handler:', cbErr);
        }
      }
    };

    return firebaseProductService.subscribeToProduct(id, onProductUpdate, safeErrorHandler);
  },

  async getSpecialOffers(): Promise<SpecialOffer[]> {
    await new Promise((res) => setTimeout(res, 100));
    return offersData as unknown as SpecialOffer[];
  }
};

