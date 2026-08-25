import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../config/firebase';

/**
 * Compresses an image file on the client using HTMLCanvasElement.
 * Produces an optimized, lightweight Data URL (WebP or JPEG) suitable for
 * Firestore and instant rendering without requiring an external storage bucket.
 */
export async function compressImageToDataUrl(
  file: File,
  maxWidth = 640,
  maxHeight = 640,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawUrl = e.target?.result as string;
      const img = new Image();
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData && webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // fallback to jpeg
        }

        const jpegData = canvas.toDataURL('image/jpeg', quality);
        resolve(jpegData || rawUrl);
      };

      img.onerror = () => {
        resolve(rawUrl);
      };

      img.src = rawUrl;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const firebaseStorageService = {
  /**
   * Uploads a product image file.
   * First attempts Firebase Storage with a fast timeout (3.5s).
   * If Firebase Storage is not provisioned, times out, or fails,
   * automatically falls back to an optimized, compressed client-side Data URL
   * so product creation and updates never fail.
   */
  async uploadProductImage(file: File, productId: string): Promise<string> {
    // Generate optimized local compressed image first as guaranteed fallback
    let compressedFallbackUrl = '';
    try {
      compressedFallbackUrl = await compressImageToDataUrl(file, 640, 640, 0.8);
    } catch {
      // ignore
    }

    // If Firebase Storage is configured and initialized, try cloud upload with timeout
    if (isFirebaseConfigured() && storage) {
      try {
        const fileExtension = file.name.split('.').pop() || 'webp';
        const storageRef = ref(storage, `products/${productId}_${Date.now()}.${fileExtension}`);

        const uploadPromise = (async () => {
          const snapshot = await uploadBytes(storageRef, file, {
            contentType: file.type || 'image/jpeg',
            customMetadata: { productId },
          });
          return await getDownloadURL(snapshot.ref);
        })();

        // 3.5s timeout to prevent hanging on unprovisioned buckets
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firebase Storage retry/timeout limit exceeded')), 3500)
        );

        const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
        if (downloadUrl) {
          return downloadUrl;
        }
      } catch (err: any) {
        console.warn('⚠️ [Firebase Storage] Cloud bucket unavailable, using optimized compressed image:', err?.message || err);
      }
    }

    // Return the compressed fallback data URL if cloud storage is unavailable
    if (compressedFallbackUrl) {
      return compressedFallbackUrl;
    }

    // Final raw file reader fallback
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Uploads a paper menu page image file with high-definition compression.
   */
  async uploadMenuPageImage(file: File, pageId: string): Promise<string> {
    // Generate optimized high-def compressed image (up to 1600x1600) for sharp text legibility
    let compressedFallbackUrl = '';
    try {
      compressedFallbackUrl = await compressImageToDataUrl(file, 1600, 1600, 0.88);
    } catch {
      // ignore
    }

    if (isFirebaseConfigured() && storage) {
      try {
        const fileExtension = file.name.split('.').pop() || 'webp';
        const storageRef = ref(storage, `menu_pages/${pageId}_${Date.now()}.${fileExtension}`);

        const uploadPromise = (async () => {
          const snapshot = await uploadBytes(storageRef, file, {
            contentType: file.type || 'image/jpeg',
            customMetadata: { pageId, type: 'paper_menu' },
          });
          return await getDownloadURL(snapshot.ref);
        })();

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firebase Storage timeout')), 4000)
        );

        const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
        if (downloadUrl) {
          return downloadUrl;
        }
      } catch (err: any) {
        console.warn('⚠️ [Firebase Storage] Paper menu upload fallback:', err?.message || err);
      }
    }

    if (compressedFallbackUrl) {
      return compressedFallbackUrl;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Deletes a product image from Storage using its full URL or path ref.
   */
  async deleteProductImage(imageUrl: string): Promise<void> {
    if (!isFirebaseConfigured() || !storage || !imageUrl || !imageUrl.includes('firebasestorage')) {
      return;
    }

    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch (err) {
      console.warn('⚠️ [Firebase Storage] Could not delete image ref:', err);
    }
  },
};
