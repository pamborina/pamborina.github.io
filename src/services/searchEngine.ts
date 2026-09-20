import { Product, Category } from '../types';
import { getCategoryArabicName } from '../constants/categoryTranslations';

const SEARCH_HISTORY_KEY = 'pamborina_recent_searches_v2';

export const POPULAR_SEARCH_TAGS = [
  'كحك العيد',
  'ساندوتشات فرنساوي',
  'البرجر',
  'الكريب الحلو',
  'ركن الكشري',
  'ركن الألبان',
  'سابليه',
  'بيتي فور',
  'التورت',
];

/**
 * Normalizes Arabic text by removing tashkeel and standardizing characters.
 */
export function normalizeArabicText(str: string): string {
  if (!str) return '';
  let text = str.trim().toLowerCase();

  // Remove Arabic diacritics
  text = text.replace(/[\u064B-\u0652]/g, '');

  // Normalize alefs
  text = text.replace(/[أإآ]/g, 'ا');

  // Normalize yaa & alef maqsura
  text = text.replace(/ى/g, 'ي');

  // Normalize taa marbouta
  text = text.replace(/ة/g, 'ه');

  return text;
}

/**
 * Strips leading "ال" (definite article) from words.
 */
export function stripDefiniteArticle(str: string): string {
  const norm = normalizeArabicText(str);
  return norm
    .split(/\s+/)
    .map((word) => (word.startsWith('ال') && word.length > 3 ? word.slice(2) : word))
    .join(' ');
}

// Map of common Arabic terms/aliases to category IDs
const CATEGORY_ALIASES: Record<string, string[]> = {
  'kahk-el-eid': ['كحك العيد', 'كحك', 'الكحك', 'العيد', 'سابليه', 'السابليه', 'كوكيز', 'الكوكيز', 'غريبة', 'الغريبة', 'بيتي فور', 'البيتي فور', 'بسكويت', 'البسكويت', 'لوتس', 'اللوتس'],
  'eid-kahk': ['كحك العيد', 'كحك', 'الكحك', 'العيد', 'سابليه', 'السابليه', 'كوكيز', 'الكوكيز', 'غريبة', 'الغريبة', 'بيتي فور', 'البيتي فور', 'بسكويت', 'البسكويت', 'لوتس', 'اللوتس'],
  'sandwiches-french': ['ساندوتشات فرنساوي', 'سندوتشات فرنساوي', 'الفرنساوي', 'ساندوتش فرنساوي', 'فرنساوي', 'سندوتشات'],
  'burgers': ['برجر', 'البرجر', 'همبرجر', 'سندوتشات برجر', 'برجر لحم', 'برجر فراخ'],
  'koshary': ['كشري', 'الكشري', 'ركن الكشري', 'طاجن كشري', 'علبة كشري'],
  'crepes-sweet': ['كريب', 'الكريب', 'كريب حلو', 'الكريب الحلو', 'كريب نوتيلا', 'كريب لوتس'],
  'dairy': ['البان', 'الألبان', 'ركن الألبان', 'ألبان', 'رز باللبن', 'أرز باللبن', 'مهلبية', 'أم علي'],
  'joy-boxes': ['ركن الفرحة', 'الفرحة', 'بوكس الفرحة', 'بوكسات الفرحة'],
  'torta': ['تورتة', 'تورتات', 'التورت', 'تورت', 'تورتة عيد ميلاد'],
  'gateaux': ['جاتوه', 'الجاتوه', 'قطع جاتوه', 'جاتوه سواريه'],
  'baklava': ['بقلاوة', 'البقلاوة'],
  'basbousa': ['بسبوسة', 'البسبوسة', 'بسبوسة بالسمن'],
  'kunafa': ['كنافة', 'الكنافة', 'كنافة بالمانجو', 'كنافة بالقشطة'],
  'goulash': ['جلاش', 'الجلاش', 'جلاش حلو'],
  'qashtota': ['قشطوطة', 'القشطوطة', 'ركن القشطوطة'],
  'happiness': ['ركن السعادة', 'السعادة'],
  'sweets-roqan': ['روقان', 'ركن الروقان'],
  'fried-chicken': ['دجاج مقلي', 'الدجاج المقلي', 'بروستد', 'فراخ مقلية', 'ستربس'],
  'crepes-chicken': ['كريب فراخ', 'كريبات الفراخ', 'كريب دجاج'],
  'crepes-meat': ['كريب لحم', 'كريب لحوم', 'كريب لحمة'],
  'crepes-mix': ['مكس كريب', 'المكس كريب', 'كريب مكس'],
  'boxes': ['بوكسات', 'البوكسات', 'وجبات البوكس'],
  'ramoosh': ['رموش', 'الرموش', 'رموش الست'],
  'zabona': ['زيوت', 'الزيوت'],
  'moshakal': ['مشكل', 'المشكل', 'مشكل شرقي'],
  'ice-cream': ['ايس كريم', 'الآيس كريم', 'آيس كريم', 'ركن الآيس كريم'],
  'addons': ['اضافات', 'الإضافات', 'صوصات'],
};

/**
 * Checks if a search query/tag corresponds to a Category.
 * Returns the matching Category or null.
 */
export function findMatchingCategory(term: string, categories: Category[]): Category | null {
  if (!term || !term.trim()) return null;
  const rawTerm = term.trim();
  const normTerm = normalizeArabicText(rawTerm);
  const strippedTerm = stripDefiniteArticle(rawTerm);

  for (const cat of categories) {
    const catNameAr = getCategoryArabicName(cat);
    const catNormName = normalizeArabicText(catNameAr);
    const catStrippedName = stripDefiniteArticle(catNameAr);

    // Direct ID or slug match
    if (
      cat.id.toLowerCase() === rawTerm.toLowerCase() ||
      cat.slug?.toLowerCase() === rawTerm.toLowerCase()
    ) {
      return cat;
    }

    // Exact or stripped Arabic name match
    if (
      normTerm === catNormName ||
      strippedTerm === catStrippedName ||
      normTerm.includes(catNormName) ||
      catNormName.includes(normTerm) ||
      (strippedTerm.length >= 3 && (strippedTerm.includes(catStrippedName) || catStrippedName.includes(strippedTerm)))
    ) {
      return cat;
    }
  }

  // Check aliases mapping
  for (const [catId, keywords] of Object.entries(CATEGORY_ALIASES)) {
    for (const kw of keywords) {
      const normKw = normalizeArabicText(kw);
      const strippedKw = stripDefiniteArticle(kw);
      if (
        normTerm === normKw ||
        strippedTerm === strippedKw ||
        normTerm.includes(normKw) ||
        normKw.includes(normTerm)
      ) {
        const found = categories.find((c) => c.id === catId || c.slug === catId);
        if (found) return found;
      }
    }
  }

  return null;
}

/**
 * Finds all products matching a query term.
 */
export function findMatchingProducts(
  term: string,
  products: Product[],
  categories: Category[]
): Product[] {
  if (!term || !term.trim()) return [];
  const rawTerm = term.trim();
  const normTerm = normalizeArabicText(rawTerm);
  const strippedTerm = stripDefiniteArticle(rawTerm);

  // Check if query matches a category
  const matchedCategory = findMatchingCategory(rawTerm, categories);
  const matchedCategoryIds = matchedCategory ? [matchedCategory.id] : [];

  return products.filter((p) => {
    // 1. Check if product belongs to matched category
    if (matchedCategoryIds.includes(p.categoryId)) {
      return true;
    }

    // 2. Check product Arabic Name
    const normNameAr = normalizeArabicText(p.nameAr);
    const strippedNameAr = stripDefiniteArticle(p.nameAr);
    if (
      normNameAr.includes(normTerm) ||
      normTerm.includes(normNameAr) ||
      strippedNameAr.includes(strippedTerm) ||
      strippedTerm.includes(strippedNameAr)
    ) {
      return true;
    }

    // 3. Check product English Name
    if (p.nameEn) {
      const normNameEn = p.nameEn.toLowerCase();
      if (normNameEn.includes(rawTerm.toLowerCase())) {
        return true;
      }
    }

    // 4. Check product description
    if (p.descriptionAr || p.shortDescriptionAr) {
      const descNorm = normalizeArabicText(
        (p.descriptionAr || '') + ' ' + (p.shortDescriptionAr || '')
      );
      if (descNorm.includes(normTerm)) {
        return true;
      }
    }

    // 5. Check price match
    if (p.price.toString() === rawTerm || p.price.toString().includes(rawTerm)) {
      return true;
    }

    return false;
  });
}

/**
 * Checks if the term matches an exact single product by name.
 */
export function isExactProductMatch(term: string, products: Product[]): Product | null {
  if (!term || !term.trim()) return null;
  const normTerm = normalizeArabicText(term);
  const strippedTerm = stripDefiniteArticle(term);

  const exactMatches = products.filter((p) => {
    const normNameAr = normalizeArabicText(p.nameAr);
    const strippedNameAr = stripDefiniteArticle(p.nameAr);
    return (
      normNameAr === normTerm ||
      strippedNameAr === strippedTerm
    );
  });

  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  return null;
}

/**
 * Search history storage helpers
 */
export const searchHistoryStorage = {
  getRecentSearches(): string[] {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading search history', e);
    }
    return POPULAR_SEARCH_TAGS;
  },

  addRecentSearch(term: string): string[] {
    if (!term || !term.trim()) return this.getRecentSearches();
    const clean = term.trim();
    const current = this.getRecentSearches().filter(
      (item) => normalizeArabicText(item) !== normalizeArabicText(clean)
    );
    const updated = [clean, ...current].slice(0, 10);
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving search history', e);
    }
    return updated;
  },

  clearRecentSearches(): string[] {
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (e) {
      console.warn('Error clearing search history', e);
    }
    return [];
  },
};
