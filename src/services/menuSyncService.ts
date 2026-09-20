import { Product } from '../types';
import { products as baseProductsList } from '../data';
import { Images } from '../data/images';
import { storageService } from './storageService';

export interface IncomingMenuItem {
  nameAr: string;
  nameEn?: string;
  price: number;
  categoryId: string;
  descriptionAr?: string;
  imageUrl?: string;
  image?: string;
}

export interface SyncDiffResult {
  added: Product[];
  removed: Product[];
  updated: Array<{ product: Product; oldPrice: number; newPrice: number }>;
  unchangedCount: number;
  updatedProductsList: Product[];
}

export const menuSyncService = {
  /**
   * Retrieves current active products list (from LocalStorage or base json)
   */
  getCurrentProducts(): Product[] {
    const baseProducts = baseProductsList as unknown as Product[];
    return baseProducts;
  },

  /**
   * Compare incoming menu items with current database:
   * 1. Match by exact or normalized nameAr
   * 2. Keep product IDs stable whenever possible
   * 3. Update changed prices
   * 4. Add new products
   * 5. Remove deleted products
   * 6. Never regenerate whole database if only one product changed
   */
  compareAndSyncMenu(incomingItems: IncomingMenuItem[]): SyncDiffResult {
    const currentProducts = this.getCurrentProducts();

    // Map for fast lookup by normalized Arabic name
    const normalize = (str: string) =>
      str.trim().toLowerCase().replace(/[ًٌٍَُِّْـ]/g, '');

    const currentMap = new Map<string, Product>();
    currentProducts.forEach((p) => {
      currentMap.set(normalize(p.nameAr), p);
    });

    const updatedProductsList: Product[] = [];
    const added: Product[] = [];
    const removed: Product[] = [];
    const updated: Array<{ product: Product; oldPrice: number; newPrice: number }> = [];
    let unchangedCount = 0;

    const processedCurrentIds = new Set<string>();

    incomingItems.forEach((incoming, index) => {
      const normalizedName = normalize(incoming.nameAr);
      const existingProduct = currentMap.get(normalizedName);

      if (existingProduct) {
        // MATCH FOUND: Keep existing product ID stable!
        processedCurrentIds.add(existingProduct.id);

        const oldPrice = existingProduct.price;
        const newPrice = Number(incoming.price) || oldPrice;

        const productImg = incoming.imageUrl || incoming.image || existingProduct.imageUrl || existingProduct.image || Images.defaultFood;
        const updatedProduct: Product = {
          ...existingProduct,
          price: newPrice,
          categoryId: incoming.categoryId || existingProduct.categoryId,
          descriptionAr: incoming.descriptionAr || existingProduct.descriptionAr,
          imageUrl: productImg,
          image: productImg,
          nameEn: incoming.nameEn || existingProduct.nameEn,
        };

        if (oldPrice !== newPrice) {
          updated.push({ product: updatedProduct, oldPrice, newPrice });
        } else {
          unchangedCount++;
        }

        updatedProductsList.push(updatedProduct);
      } else {
        // NEW PRODUCT FOUND: Generate a stable unique ID
        const slug = incoming.nameEn
          ? `${incoming.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${index}`
          : `prod-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`;

        const newImg = incoming.imageUrl || incoming.image || Images.defaultFood;
        const newProduct: Product = {
          id: `pamborina-${slug}`,
          slug,
          nameAr: incoming.nameAr,
          nameEn: incoming.nameEn || incoming.nameAr,
          price: Number(incoming.price) || 0,
          categoryId: incoming.categoryId || 'burgers',
          descriptionAr: incoming.descriptionAr || `صنف طازج جديد من منيو بامبورينا الأصلي`,
          imageUrl: newImg,
          image: newImg,
          rating: 5.0,
          reviewCount: 12,
          salesCount: 1,
          preparationTimeMinutes: 15,
          isAvailable: true,
          tags: ['New'],
          featured: false,
          createdAt: new Date().toISOString(),
        };

        added.push(newProduct);
        updatedProductsList.push(newProduct);
      }
    });

    // Detect REMOVED products (exist in database but absent in incoming menu)
    currentProducts.forEach((p) => {
      if (!processedCurrentIds.has(p.id)) {
        removed.push(p);
      }
    });

    // Save updated products to storage
    storageService.setProducts(updatedProductsList);

    return {
      added,
      removed,
      updated,
      unchangedCount,
      updatedProductsList,
    };
  },

  /**
   * Reset menu to default static data
   */
  resetToDefaultMenu(): Product[] {
    const baseProducts = baseProductsList as unknown as Product[];
    storageService.setProducts(baseProducts);
    return baseProducts;
  },
};
