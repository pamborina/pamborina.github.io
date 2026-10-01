import productsRaw, { allProducts } from './allProducts';
import categoriesRaw from './categories.json';
import offersRaw from './offers.json';
import combosRaw from './combos.json';
import settings from './settings.json';
import storeRaw from './store.json';
import reviewsRaw from './reviews.json';
import branches from './branches.json';
import delivery from './delivery.json';
import favorites from './favorites.json';
import { Images, getImageUrlByKey } from './images';
import { categoryTranslations } from '../constants/categoryTranslations';

export const offers = (offersRaw as any[]).map((o) => ({
  ...o,
  imageUrl: getImageUrlByKey(o.imageKey || o.id),
}));

export const combos = (combosRaw as any[]).map((c) => ({
  ...c,
  imageUrl: getImageUrlByKey(c.imageKey || c.id),
}));

export const store = {
  ...(storeRaw as any),
  heroImageUrl: Images.store.hero,
  thumbnailUrl: Images.store.thumb,
};

export const reviews = (reviewsRaw as any[]).map((r) => ({
  ...r,
  imageUrl: getImageUrlByKey(r.imageKey || 'avatar1'),
}));

export const products = (productsRaw as any[]).map((p, idx) => {
  const rawImg = p.imageUrl || p.image || '';
  const finalImage = rawImg.trim() !== '' ? rawImg : '/default-food.webp';
  const nameVal = p.name || p.nameAr || '';
  const catVal = p.category || p.categoryId || 'أصناف متنوعة';
  const descVal = p.description || p.descriptionAr || '';
  const isAvail = p.available !== undefined ? p.available : (p.isAvailable !== undefined ? p.isAvailable : true);

  return {
    ...p,
    id: p.id || `p${idx + 1}`,
    name: nameVal,
    nameAr: nameVal,
    category: catVal,
    categoryId: catVal,
    price: Number(p.price) || 0,
    image: finalImage,
    imageUrl: finalImage,
    description: descVal,
    descriptionAr: descVal,
    isAvailable: isAvail,
    available: isAvail,
    featured: p.featured || false,
    sortOrder: p.sortOrder || p.displayOrder || (idx + 1),
    rating: p.rating || 4.9,
    reviewCount: p.reviewCount || 18,
    salesCount: p.salesCount || 10,
    tags: p.tags || [],
  };
});

export const categories = (() => {
  const catMap = new Map<string, any>();

  const categoriesRawMap = new Map<string, any>();
  (categoriesRaw as any[]).forEach((c) => {
    if (c.id) categoriesRawMap.set(c.id, c);
    if (c.nameAr) categoriesRawMap.set(c.nameAr, c);
    if (c.slug) categoriesRawMap.set(c.slug, c);
  });

  products.forEach((p) => {
    const catName = p.category;
    if (catName && !catMap.has(catName)) {
      const matchedMeta = categoriesRawMap.get(catName);
      const catId = matchedMeta?.id || catName;
      const count = products.filter((prod) => prod.category === catName).length;
      const displayNameAr =
        categoryTranslations[catId] ||
        categoryTranslations[catName] ||
        matchedMeta?.nameAr ||
        catName;

      catMap.set(catName, {
        id: catId,
        nameAr: displayNameAr,
        nameEn: displayNameAr,
        slug: catId,
        descriptionAr: matchedMeta?.descriptionAr || `استمتع بجميع أصناف ${displayNameAr} الفاخرة المحضرة في حلواني بامبورينا.`,
        imageUrl: matchedMeta?.imageUrl || getImageUrlByKey(matchedMeta?.imageKey || catId) || '/default-food.webp',
        iconName: matchedMeta?.iconName || 'UtensilsCrossed',
        itemCount: count,
        featured: matchedMeta?.featured ?? true,
        sortOrder: catMap.size + 1,
      });
    }
  });

  // Ensure unique IDs among generated categories
  const result: any[] = [];
  const usedIds = new Set<string>();

  Array.from(catMap.values()).forEach((cat, idx) => {
    let finalId = cat.id || `cat-${idx}`;
    if (usedIds.has(finalId)) {
      finalId = `${finalId}-${idx}`;
    }
    usedIds.add(finalId);
    result.push({ ...cat, id: finalId });
  });

  return result;
})();

export {
  allProducts,
  settings,
  branches,
  delivery,
  favorites,
  Images,
};

export const databaseSchemaMap = {
  products: 'public.products',
  categories: 'public.categories',
  offers: 'public.offers',
  combos: 'public.combos',
  settings: 'public.settings',
  store: 'public.store',
  reviews: 'public.reviews',
  branches: 'public.branches',
  delivery: 'public.delivery_zones',
  favorites: 'public.favorites',
};
