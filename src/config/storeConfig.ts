/**
 * StoreConfig
 * Single source of truth for store info, official branches, testing WhatsApp number,
 * currency, hotline, and delivery parameters.
 * Any modification to prices, branches, phone numbers, or metadata can be made here.
 */

export interface BranchConfig {
  id: string;
  nameAr: string;
  addressAr: string;
  cityAr: string;
  areaAr: string;
  phone: string;
  secondaryPhone?: string;
  hotline: string;
  whatsapp: string;
  whatsappUrl: string;
  mapUrl: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  openingHoursAr: string;
  isOpen: boolean;
  deliveryEstimateMinutes: number;
  deliveryFee: number;
  minOrderAmount: number;
}

export const STORE_CONFIG = {
  nameAr: 'حلواني بامبورينا',
  subtitleAr: 'حلويات فاخرة، مأكولات شرقية وغربية، وكريب وطواجن طازجة يومياً',
  brandNameEn: 'Pamborina',
  currencyAr: 'جنيه',
  hotline: '01112624108',
  
  // Official test & receiving WhatsApp number
  whatsappPrimary: '01112624108',
  whatsappCleanNumber: '201112624108',

  // Delivery settings
  defaultDeliveryFee: 0,
  freeDeliveryThreshold: 200,

  // Official Branch (Single Branch Operation)
  branches: [
    {
      id: 'branch-talbiya',
      nameAr: 'فرع بامبورينا - الطالبية هرم',
      addressAr: '97 عثمان محرم، الطالبية / هرم',
      cityAr: 'الطالبية هرم',
      areaAr: 'الطالبية هرم',
      phone: '01112624108',
      secondaryPhone: '',
      hotline: '01112624108',
      whatsapp: '201117419822',
      whatsappUrl: 'https://wa.me/201117419822',
      mapUrl: 'https://maps.app.goo.gl/kBFkLDC3xrRVxz2R6',
      coordinates: {
        lat: 30.0035,
        lng: 31.1965,
      },
      openingHoursAr: 'يومياً من 9:00 صباحاً حتى 2:00 بعد منتصف الليل',
      isOpen: true,
      deliveryEstimateMinutes: 25,
      deliveryFee: 0,
      minOrderAmount: 50,
    },
  ] as BranchConfig[],
};
