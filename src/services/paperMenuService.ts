import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { PaperMenuPage } from '../types';
import { Images } from '../data/images';
import { auditLogService } from './auditLogService';
import { firebaseStorageService } from './firebaseStorageService';

export const PAPER_MENU_COLLECTION = 'paper_menu_pages';
const PAPER_MENU_CACHE_KEY = 'pamborina_paper_menu_pages_v1';
const PAPER_MENU_EVENT = 'pamborina_paper_menu_changed';

export const DEFAULT_PAPER_MENU_PAGES: PaperMenuPage[] = [
  {
    id: 'menu-page-1',
    titleAr: 'صفحة رقم 1',
    subtitleAr: 'حلواني بامبورينا - قائمة المنيو المطبوع الرسمية (صفحة 1 من 7)',
    descriptionAr: 'قائمة الحادق والساندوتشات والوجبات السريعة',
    imageUrl: Images.menuPage1 || 'https://i.postimg.cc/prjH0dLv/bambwryna-Pamborina-1.jpg',
    pageNumber: 1,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'menu-page-2',
    titleAr: 'صفحة رقم 2',
    subtitleAr: 'حلواني بامبورينا - قائمة المنيو المطبوع الرسمية (صفحة 2 من 7)',
    descriptionAr: 'الكريب والفطائر الحادقة والبرجر',
    imageUrl: Images.menuPage2 || 'https://i.postimg.cc/28jfsQg1/bambwryna-Pamborina-2.jpg',
    pageNumber: 2,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'menu-page-3',
    titleAr: 'صفحة رقم 3',
    subtitleAr: 'حلواني بامبورينا - قائمة المنيو المطبوع الرسمية (صفحة 3 من 7)',
    descriptionAr: 'الحلويات الشرقية والبسبوسة والكنافة بالسمن البلدي',
    imageUrl: Images.menuPage3 || 'https://i.postimg.cc/MHWh8wPs/bambwryna-Pamborina-3.jpg',
    pageNumber: 3,
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'menu-page-4',
    titleAr: 'صفحة رقم 4',
    subtitleAr: 'حلواني بامبورينا - قائمة المنيو المطبوع الرسمية (صفحة 4 من 7)',
    descriptionAr: 'التورت والجاتوه والحلويات الغربية والمناسبات',
    imageUrl: Images.menuPage4 || 'https://i.postimg.cc/YqCJnpmt/bambwryna-Pamborina-4.jpg',
    pageNumber: 4,
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 'menu-page-5',
    titleAr: 'صفحة رقم 5',
    subtitleAr: 'حلواني بامبورينا - قائمة المنيو المطبوع الرسمية (صفحة 5 من 7)',
    descriptionAr: 'الكشري الحلو والقشطوطة وأم علي والأطباق الخاصة',
    imageUrl: Images.menuPage5 || 'https://i.postimg.cc/N0mV9FZD/bambwryna-Pamborina-5.jpg',
    pageNumber: 5,
    sortOrder: 5,
    isActive: true,
  },
  {
    id: 'menu-page-6',
    titleAr: 'صفحة رقم 6',
    subtitleAr: 'حلواني بامبورينا - قائمة المنيو المطبوع الرسمية (صفحة 6 من 7)',
    descriptionAr: 'الوافل والكريب الحلو والبان كيك والمثلجات',
    imageUrl: Images.menuPage6 || 'https://i.postimg.cc/25QcjJZy/bambwryna-Pamborina-6.jpg',
    pageNumber: 6,
    sortOrder: 6,
    isActive: true,
  },
  {
    id: 'menu-page-7',
    titleAr: 'صفحة رقم 7',
    subtitleAr: 'حلواني بامبورينا - قائمة المنيو المطبوع الرسمية (صفحة 7 من 7)',
    descriptionAr: 'المشروبات الباردة والساخنة والميلك شيك والعصائر الطازجة',
    imageUrl: Images.menuPage7 || 'https://i.postimg.cc/597Pt86z/bambwryna-Pamborina-7.jpg',
    pageNumber: 7,
    sortOrder: 7,
    isActive: true,
  },
];

// In-memory runtime cache for paper menu pages
let memoryPages: PaperMenuPage[] = (() => {
  try {
    const cached = localStorage.getItem(PAPER_MENU_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [...DEFAULT_PAPER_MENU_PAGES];
})();

function saveToLocalStorage(pages: PaperMenuPage[]) {
  try {
    memoryPages = [...pages];
    localStorage.setItem(PAPER_MENU_CACHE_KEY, JSON.stringify(pages));
    window.dispatchEvent(new CustomEvent(PAPER_MENU_EVENT, { detail: pages }));
  } catch (e) {
    console.warn('⚠️ [PaperMenuService] Local storage save failed:', e);
  }
}

let isInitializedInFirestore = false;

/**
 * Ensures Firestore is properly initialized with default pages on very first run
 * if the Firestore collection is completely empty.
 */
async function ensureFirestoreSeeded(): Promise<void> {
  if (!isFirebaseConfigured() || !db || isInitializedInFirestore) return;

  try {
    const snap = await getDocs(collection(db, PAPER_MENU_COLLECTION));
    if (snap.empty) {
      const batch = writeBatch(db);
      DEFAULT_PAPER_MENU_PAGES.forEach((page) => {
        const ref = doc(db, PAPER_MENU_COLLECTION, page.id);
        batch.set(ref, page);
      });
      await batch.commit();
      console.log('✅ [PaperMenuService] Seeded default 7 paper menu pages to Firestore');
    }
    isInitializedInFirestore = true;
  } catch (e) {
    console.warn('⚠️ [PaperMenuService] Seeding check warning:', e);
  }
}

export const paperMenuService = {
  /**
   * Get all menu pages sorted by sortOrder / pageNumber.
   */
  async getMenuPages(): Promise<PaperMenuPage[]> {
    if (!isFirebaseConfigured() || !db) {
      return memoryPages.length > 0 ? memoryPages : DEFAULT_PAPER_MENU_PAGES;
    }

    try {
      await ensureFirestoreSeeded();
      const snap = await getDocs(collection(db, PAPER_MENU_COLLECTION));
      if (!snap.empty) {
        const firestorePages: PaperMenuPage[] = [];
        snap.forEach((d) => {
          if (d.exists()) {
            firestorePages.push({
              ...(d.data() as PaperMenuPage),
              id: d.id,
            });
          }
        });

        firestorePages.sort((a, b) => (a.sortOrder ?? a.pageNumber ?? 1) - (b.sortOrder ?? b.pageNumber ?? 1));
        saveToLocalStorage(firestorePages);
        return firestorePages;
      }
    } catch (err) {
      console.warn('⚠️ [PaperMenuService] Failed to load menu pages from Firestore, using cached/local:', err);
    }

    return memoryPages.length > 0 ? memoryPages : DEFAULT_PAPER_MENU_PAGES;
  },

  /**
   * Subscribe to realtime paper menu pages changes across all screens.
   */
  subscribeToMenuPages(
    callback: (pages: PaperMenuPage[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    // Initial notify from memory/local storage immediately
    callback(memoryPages.length > 0 ? memoryPages : DEFAULT_PAPER_MENU_PAGES);

    // Listen to window event for instant local updates across components
    const handleLocalEvent = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        callback(e.detail);
      }
    };
    window.addEventListener(PAPER_MENU_EVENT, handleLocalEvent);

    if (!isFirebaseConfigured() || !db) {
      return () => {
        window.removeEventListener(PAPER_MENU_EVENT, handleLocalEvent);
      };
    }

    // Trigger seed in background if empty
    ensureFirestoreSeeded().catch(() => {});

    try {
      const unsubFirestore = onSnapshot(
        collection(db, PAPER_MENU_COLLECTION),
        (snap) => {
          const firestorePages: PaperMenuPage[] = [];
          snap.forEach((d) => {
            if (d.exists()) {
              firestorePages.push({
                ...(d.data() as PaperMenuPage),
                id: d.id,
              });
            }
          });

          // Sort pages by sortOrder or pageNumber
          firestorePages.sort((a, b) => (a.sortOrder ?? a.pageNumber ?? 1) - (b.sortOrder ?? b.pageNumber ?? 1));
          
          // Only update if documents exist or were explicitly managed
          if (firestorePages.length > 0 || isInitializedInFirestore) {
            saveToLocalStorage(firestorePages);
            callback(firestorePages);
          }
        },
        (err) => {
          console.warn('⚠️ [PaperMenuService] Realtime listener error:', err);
          if (onError) onError(err);
        }
      );

      return () => {
        unsubFirestore();
        window.removeEventListener(PAPER_MENU_EVENT, handleLocalEvent);
      };
    } catch (err: any) {
      console.warn('⚠️ [PaperMenuService] Subscription setup failed:', err);
      return () => {
        window.removeEventListener(PAPER_MENU_EVENT, handleLocalEvent);
      };
    }
  },

  /**
   * Add a new paper menu page with optional image file upload.
   */
  async addMenuPage(
    pageData: Omit<PaperMenuPage, 'id'>,
    imageFile?: File
  ): Promise<PaperMenuPage> {
    const pageId = `menu-page-${Date.now()}`;
    let finalImageUrl = pageData.imageUrl || '';

    if (imageFile) {
      try {
        finalImageUrl = await firebaseStorageService.uploadMenuPageImage(imageFile, pageId);
      } catch (uploadErr) {
        console.warn('⚠️ [PaperMenuService] Image upload fallback:', uploadErr);
        if (!finalImageUrl) {
          finalImageUrl = Images.menuPage1;
        }
      }
    }

    const currentPages = memoryPages.length > 0 ? memoryPages : DEFAULT_PAPER_MENU_PAGES;
    const newPageNumber = pageData.pageNumber || currentPages.length + 1;
    const newSortOrder = pageData.sortOrder ?? newPageNumber;

    const newPage: PaperMenuPage = {
      id: pageId,
      titleAr: pageData.titleAr || `صفحة رقم ${newPageNumber}`,
      subtitleAr:
        pageData.subtitleAr ||
        `حلواني بامبورينا - قائمة المنيو المطبوع الرسمية (صفحة ${newPageNumber})`,
      descriptionAr: pageData.descriptionAr || '',
      imageUrl: finalImageUrl || Images.menuPage1,
      pageNumber: newPageNumber,
      sortOrder: newSortOrder,
      isActive: pageData.isActive !== undefined ? pageData.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedPages = [...currentPages, newPage].sort(
      (a, b) => (a.sortOrder ?? a.pageNumber ?? 1) - (b.sortOrder ?? b.pageNumber ?? 1)
    );
    saveToLocalStorage(updatedPages);

    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, PAPER_MENU_COLLECTION, pageId), newPage);
      } catch (err: any) {
        console.warn('⚠️ [PaperMenuService] Firestore addDoc failed, saved locally:', err);
      }
    }

    await auditLogService.logAdminAction({
      action: 'update_settings',
      targetType: 'settings',
      targetId: pageId,
      summaryAr: `إضافة صفحة منيو مطبوع جديدة: ${newPage.titleAr}`,
      metadata: { pageId, titleAr: newPage.titleAr, pageNumber: newPage.pageNumber },
    });

    return newPage;
  },

  /**
   * Update an existing paper menu page.
   */
  async updateMenuPage(
    id: string,
    updates: Partial<PaperMenuPage>,
    imageFile?: File
  ): Promise<PaperMenuPage> {
    let finalImageUrl = updates.imageUrl;

    if (imageFile) {
      try {
        finalImageUrl = await firebaseStorageService.uploadMenuPageImage(imageFile, id);
      } catch (uploadErr) {
        console.warn('⚠️ [PaperMenuService] Image upload error:', uploadErr);
      }
    }

    const currentPages = memoryPages.length > 0 ? memoryPages : DEFAULT_PAPER_MENU_PAGES;
    const pageIndex = currentPages.findIndex((p) => p.id === id);

    const existingPage =
      pageIndex >= 0
        ? currentPages[pageIndex]
        : {
            id,
            titleAr: 'صفحة منيو',
            subtitleAr: '',
            imageUrl: Images.menuPage1,
            pageNumber: 1,
            sortOrder: 1,
            isActive: true,
          };

    const updatedPage: PaperMenuPage = {
      ...existingPage,
      ...updates,
      id,
      imageUrl: finalImageUrl || updates.imageUrl || existingPage.imageUrl,
      updatedAt: new Date().toISOString(),
    };

    let updatedPages: PaperMenuPage[];
    if (pageIndex >= 0) {
      updatedPages = [...currentPages];
      updatedPages[pageIndex] = updatedPage;
    } else {
      updatedPages = [...currentPages, updatedPage];
    }

    updatedPages.sort((a, b) => (a.sortOrder ?? a.pageNumber ?? 1) - (b.sortOrder ?? b.pageNumber ?? 1));
    saveToLocalStorage(updatedPages);

    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, PAPER_MENU_COLLECTION, id), updatedPage, { merge: true });
      } catch (err: any) {
        console.warn('⚠️ [PaperMenuService] Firestore updateDoc failed, saved locally:', err);
      }
    }

    await auditLogService.logAdminAction({
      action: 'update_settings',
      targetType: 'settings',
      targetId: id,
      summaryAr: `تعديل صفحة المنيو المطبوع: ${updatedPage.titleAr}`,
      metadata: { pageId: id, titleAr: updatedPage.titleAr },
    });

    return updatedPage;
  },

  /**
   * Delete a paper menu page by ID.
   */
  async deleteMenuPage(id: string): Promise<void> {
    const currentPages = memoryPages.length > 0 ? memoryPages : DEFAULT_PAPER_MENU_PAGES;
    const targetPage = currentPages.find((p) => p.id === id);
    const updatedPages = currentPages.filter((p) => p.id !== id);

    saveToLocalStorage(updatedPages);

    if (isFirebaseConfigured() && db) {
      try {
        await deleteDoc(doc(db, PAPER_MENU_COLLECTION, id));
      } catch (err: any) {
        console.warn('⚠️ [PaperMenuService] Firestore deleteDoc failed, saved locally:', err);
      }
    }

    await auditLogService.logAdminAction({
      action: 'update_settings',
      targetType: 'settings',
      targetId: id,
      summaryAr: `حذف صفحة منيو مطبوع: ${targetPage?.titleAr || id}`,
      metadata: { pageId: id },
    });
  },

  /**
   * Reorder paper menu pages.
   */
  async reorderMenuPages(orderedPages: PaperMenuPage[]): Promise<void> {
    const adjustedPages = orderedPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
      sortOrder: index + 1,
      updatedAt: new Date().toISOString(),
    }));

    saveToLocalStorage(adjustedPages);

    if (isFirebaseConfigured() && db) {
      try {
        const batch = writeBatch(db);
        adjustedPages.forEach((page) => {
          const ref = doc(db, PAPER_MENU_COLLECTION, page.id);
          batch.set(ref, page, { merge: true });
        });
        await batch.commit();
      } catch (err: any) {
        console.warn('⚠️ [PaperMenuService] Firestore batch reorder failed:', err);
      }
    }
  },

  /**
   * Reset all pages to initial default 7 pages.
   */
  async resetToDefaultMenuPages(): Promise<PaperMenuPage[]> {
    saveToLocalStorage(DEFAULT_PAPER_MENU_PAGES);

    if (isFirebaseConfigured() && db) {
      try {
        const batch = writeBatch(db);
        // Clear current docs
        const snap = await getDocs(collection(db, PAPER_MENU_COLLECTION));
        snap.forEach((d) => {
          batch.delete(d.ref);
        });
        // Seed default 7 pages
        DEFAULT_PAPER_MENU_PAGES.forEach((page) => {
          const ref = doc(db, PAPER_MENU_COLLECTION, page.id);
          batch.set(ref, page);
        });
        await batch.commit();
      } catch (err) {
        console.warn('⚠️ [PaperMenuService] Reset in Firestore failed:', err);
      }
    }

    await auditLogService.logAdminAction({
      action: 'update_settings',
      targetType: 'settings',
      targetId: 'paper_menu_reset',
      summaryAr: 'إعادة تعيين صفحات المنيو المطبوع إلى الـ 7 صفحات الأصلية',
      metadata: { count: DEFAULT_PAPER_MENU_PAGES.length },
    });

    return DEFAULT_PAPER_MENU_PAGES;
  },
};
