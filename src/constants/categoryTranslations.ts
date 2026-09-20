export const categoryTranslations: Record<string, string> = {
  "crepes-chicken": "كريبات الفراخ",
  "burgers": "البرجر",
  "fried-chicken": "الدجاج المقلي",
  "crepes-sweet": "الكريب الحلو",
  "crepes-mix": "المكس كريب",
  "sandwiches-french": "السندوتشات الفرنساوي",
  "goulash": "الجلاش",
  "koshary": "الكشري",
  "moshakal": "المشكل",
  "addons": "الإضافات",
  "boxes": "البوكسات",
  "crepes-meat": "كريب اللحوم",
  "gateaux": "الجاتوه",
  "zabona": "الزيوت",
  "baklava": "البقلاوة",
  "ramoosh": "الرموش",
  "basbousa": "البسبوسة",
  "kunafa": "الكنافة",

  "milk-rice": "ركن الألبان",
  "dairy": "ركن الألبان",
  "happiness": "ركن السعادة",
  "ice-cream": "ركن الآيس كريم",
  "cream": "ركن القشطوطة",
  "qashtota": "ركن القشطوطة",
  "gifts": "ركن الفرحة",
  "joy-boxes": "ركن الفرحة",
  "desserts": "ركن الروقان",
  "sweets-roqan": "ركن الروقان",
  "cakes": "التورت",
  "torta": "التورت",
  "cake": "الكيك",
  "gatonoh": "الجاتوه",
  "drinks": "المشروبات",
  "waffle": "الوافل",
  "crepes": "الكريب",
  "special": "الأصناف المميزة",

  "kahk-el-eid": "كحك العيد",
  "eid-kahk": "كحك العيد",
  "sandwiches": "الساندوتشات",
  "sweets": "الحلويات",
  "milkshakes": "ميلك شيك",
  "halawani": "حلواني",
  "koshary-kashtouta": "كشري القشطوطة",
  "savory-menu": "القائمة المالحة",
  "milk-puddings": "ركن الألبان",
  "moulid-malban": "حلاوة المولد",
};

/**
 * Returns the Arabic display name for any category or category slug/ID.
 * Strictly avoids rendering raw English slugs in the user interface.
 */
export function getCategoryArabicName(category: any): string {
  if (!category) return '';
  if (typeof category === 'string') {
    return categoryTranslations[category] || category;
  }
  const slug = category.slug || category.id || '';
  return (
    categoryTranslations[slug] ||
    categoryTranslations[category.id] ||
    categoryTranslations[category.slug] ||
    category.nameAr ||
    category.name ||
    slug
  );
}
