import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { PRODUCTS_COLLECTION } from './firebaseProductService';
import { products as staticProductsList } from '../data';
import { Product } from '../types';

export interface SeedProgress {
  total: number;
  uploaded: number;
  failed: number;
  logs: string[];
}

/**
 * Idempotent Firestore Seeder using Batch Writes
 * Uploads current static product catalog into Firestore 'products' collection.
 * Uses exact product IDs as Document IDs so re-running merges existing docs without duplicating.
 * MUST be executed manually; never runs automatically during dev or build.
 */
export async function seedProductsToFirestore(
  onProgress?: (progress: SeedProgress) => void
): Promise<SeedProgress> {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase is not configured or initialized. Please check your environment variables in .env.');
  }

  const allProducts = staticProductsList as unknown as Product[];
  const total = allProducts.length;

  const progress: SeedProgress = {
    total,
    uploaded: 0,
    failed: 0,
    logs: [],
  };

  const addLog = (msg: string) => {
    progress.logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    console.log(`🌱 [Firestore Seeder] ${msg}`);
    if (onProgress) onProgress({ ...progress });
  };

  addLog(`Starting batch seed of ${total} products to Firestore...`);

  // Process in batches of 250 items (Firestore limit is 500 per batch)
  const BATCH_SIZE = 250;
  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const chunk = allProducts.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    let validInChunk = 0;

    for (let j = 0; j < chunk.length; j++) {
      const p = chunk[j];
      const docIdx = i + j;
      const docId = p.id;

      if (!docId) {
        addLog(`[Validation Error] Skipped product at index ${docIdx}: missing ID.`);
        progress.failed++;
        continue;
      }

      const name = p.nameAr || p.name;
      if (!name) {
        addLog(`[Validation Error] Product [${docId}] missing name/nameAr.`);
        progress.failed++;
        continue;
      }

      const priceNum = Number(p.price);
      if (isNaN(priceNum) || priceNum < 0) {
        addLog(`[Validation Error] Product [${docId}] has invalid price: ${p.price}`);
        progress.failed++;
        continue;
      }

      const categoryStr = p.categoryId || p.category;
      if (!categoryStr) {
        addLog(`[Validation Error] Product [${docId}] missing category/categoryId.`);
        progress.failed++;
        continue;
      }

      const docRef = doc(db, PRODUCTS_COLLECTION, docId);
      const productImg = p.imageUrl || p.image || '/default-food.webp';

      const firestorePayload = {
        ...p,
        id: docId,
        name: name,
        nameAr: p.nameAr || name,
        nameEn: p.nameEn || '',
        category: categoryStr,
        categoryId: categoryStr,
        slug: p.slug || docId,
        description: p.description || p.descriptionAr || '',
        descriptionAr: p.descriptionAr || p.description || '',
        price: priceNum,
        originalPrice: p.originalPrice ?? null,
        imageUrl: productImg,
        image: productImg,
        available: p.isAvailable !== undefined ? Boolean(p.isAvailable) : ((p as any).available !== undefined ? Boolean((p as any).available) : true),
        isAvailable: p.isAvailable !== undefined ? Boolean(p.isAvailable) : ((p as any).available !== undefined ? Boolean((p as any).available) : true),
        displayOrder: p.displayOrder ?? (p as any).sortOrder ?? docIdx,
        sortOrder: (p as any).sortOrder ?? p.displayOrder ?? docIdx,
        galleryImages: p.galleryImages || [],
        preparationTimeMinutes: p.preparationTimeMinutes ?? 15,
        calories: p.calories ?? null,
        rating: p.rating ?? 5.0,
        reviewCount: p.reviewCount ?? 0,
        salesCount: p.salesCount ?? 0,
        tags: p.tags || [],
        variants: p.variants || [],
        addonGroups: p.addonGroups || [],
        ingredientsAr: p.ingredientsAr || [],
        nutritionalInfoAr: p.nutritionalInfoAr || '',
        featured: Boolean(p.featured),
        updatedAt: new Date().toISOString(),
        createdAt: p.createdAt || new Date().toISOString(),
      };

      batch.set(docRef, firestorePayload, { merge: true });
      validInChunk++;
    }

    try {
      await batch.commit();
      progress.uploaded += validInChunk;
      addLog(`Committed batch of ${validInChunk} products to Firestore. (Total: ${progress.uploaded}/${total})`);
    } catch (err: any) {
      progress.failed += validInChunk;
      addLog(`ERROR committing batch: ${err.message}`);
    }
  }

  addLog(`Seeding complete! Successfully seeded ${progress.uploaded}/${total} products. Failed: ${progress.failed}.`);
  return progress;
}
