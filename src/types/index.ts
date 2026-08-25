export type Currency = 'EGP';

export interface Category {
  id: string;
  nameAr: string;
  nameEn?: string;
  slug: string;
  descriptionAr: string;
  descriptionEn?: string;
  imageUrl?: string;
  iconName?: string;
  emoji?: string;
  itemCount?: number;
  featured?: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariant {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
  originalPrice?: number;
  weightGrams?: number;
  piecesCount?: number;
  isDefault?: boolean;
}

export interface ProductAddon {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
}

export interface ProductAddonGroup {
  id: string;
  titleAr: string;
  titleEn: string;
  required: boolean;
  maxSelections: number;
  addons: ProductAddon[];
}

export interface Product {
  id: string;
  name?: string;
  nameAr: string;
  nameEn?: string;
  category?: string;
  categoryId: string;
  slug?: string;
  description?: string;
  descriptionAr: string;
  shortDescriptionAr?: string;
  price: number; // Starting price in EGP
  originalPrice?: number; // For sale badge
  image: string;
  imageUrl: string;
  available?: boolean;
  isAvailable: boolean;
  sortOrder?: number;
  displayOrder?: number;
  galleryImages?: string[];
  preparationTimeMinutes?: number;
  calories?: number;
  rating?: number; // e.g. 4.9
  reviewCount?: number;
  tags?: Array<'Bestseller' | 'New' | 'ChefChoice' | 'Signature' | 'Seasonal' | 'SugarFree' | 'RamadanSpecial'>;
  variants?: ProductVariant[];
  addonGroups?: ProductAddonGroup[];
  ingredientsAr?: string[];
  nutritionalInfoAr?: string;
  salesCount?: number;
  featured?: boolean;
  createdAt?: string;
}

export interface Branch {
  id: string;
  name?: string;
  nameAr: string;
  address?: string;
  addressAr: string;
  cityAr?: string;
  areaAr?: string;
  phone: string;
  secondaryPhone?: string;
  phoneNumbers?: string[];
  hotline?: string;
  whatsapp: string;
  whatsappUrl?: string;
  mapUrl?: string;
  googleMapsUrl?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  openingHoursAr?: string;
  isOpen: boolean;
  deliveryEstimateMinutes?: number;
  deliveryFee?: number;
  minOrderAmount?: number;
}

export interface HeroOffer {
  id: string;
  titleAr: string;
  subtitleAr: string;
  badgeAr: string;
  discountBadgeAr: string;
  trustBadge1Ar?: string;
  trustBadge2Ar?: string;
  ctaTextAr: string;
  imageUrl: string;
  categoryId?: string;
  productId?: string;
  targetType?: 'category' | 'product' | 'cart';
  hasCountdown: boolean;
  countdownType?: 'daily_recurring' | 'fixed_datetime';
  countdownHours?: number; // e.g. 4
  countdownEndDateTime?: string; // e.g. '2026-08-25T23:59:00'
  countdownLabelAr?: string; // 'ينتهي العرض خلال:'
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HeroOffersConfig {
  isEnabled: boolean;
  autoSlideIntervalSeconds: number;
  sectionTitleAr?: string;
  updatedAt?: string;
}

export interface SpecialOffer {
  id: string;
  titleAr: string;
  subtitleAr: string;
  descriptionAr: string;
  badgeAr: string;
  code?: string;
  discountPercentage?: number;
  discountAmount?: number;
  imageUrl: string;
  bgColor: string;
  validUntil: string;
  minSpend?: number;
  applicableProductIds?: string[];
}

export interface CartAddonSelection {
  groupId: string;
  groupTitleAr: string;
  addonId: string;
  addonNameAr: string;
  price: number;
}

export interface CartItem {
  id: string;
  product: Product;
  selectedVariant?: ProductVariant;
  selectedAddons: CartAddonSelection[];
  specialInstructions?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type OrderType = 'delivery' | 'pickup' | 'dinein';

export type PaymentMethod = 'cash_on_delivery' | 'card_on_delivery' | 'online_card' | 'instapay' | 'vodafone_cash';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'out_for_delivery'
  | 'ready_for_pickup'
  | 'delivered';

export interface OrderItemSnapshot {
  productId: string;
  name: string;
  nameAr: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedVariant?: {
    id: string;
    nameAr: string;
    nameEn?: string;
    price: number;
  };
  selectedAddons?: Array<{
    groupId: string;
    groupTitleAr: string;
    addonId: string;
    addonNameAr: string;
    price: number;
  }>;
  specialInstructions?: string;
}

export interface CustomerAddress {
  id?: string;
  labelAr?: string; // 'المنزل' | 'العمل' | 'شقة 4'
  cityAr?: string;
  areaAr?: string;
  streetAr?: string;
  buildingAr?: string;
  floorAr?: string;
  apartmentAr?: string;
  landmark?: string;
  notesAr?: string;
  isDefault?: boolean;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  addresses: CustomerAddress[];
  loyaltyPoints: number;
  tier: 'Gold' | 'Platinum' | 'Royal';
  savedFavoriteIds: string[];
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. ORDER-01-ONLINE

  createdAt: string;
  updatedAt: string;
  statusUpdatedAt?: string;
  createdTime?: string; // backward compatibility

  status: OrderStatus;
  statusHistory?: Array<{
    from?: string;
    previousStatus?: string | null;
    to?: string;
    newStatus?: string;
    status: OrderStatus;
    timestamp: string;
    changedAt?: string;
    changedBy?: string;
    adminUid?: string;
    adminEmail?: string;
    noteAr?: string;
  }>;

  customer: {
    name: string;
    phone: string;
    address?: string;
    landmark?: string;
    locationUrl?: string;
  };
  // Backward compatibility top-level fields
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;

  branch: {
    id: string;
    name?: string;
    nameAr: string;
    phone?: string;
    whatsapp?: string;
    addressAr?: string;
  };
  // Backward compatibility
  branchId?: string;
  branchNameAr?: string;

  items: OrderItemSnapshot[] | CartItem[];

  orderType: OrderType;

  pricing: {
    subtotal: number;
    deliveryFee: number;
    discountAmount: number;
    total: number;
  };
  // Backward compatibility top-level pricing fields
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  appliedPromoCode?: string;
  taxAmount?: number;
  grandTotal: number;

  paymentMethod: PaymentMethod | string;
  paymentMethodAr?: string;
  paymentStatus?: 'paid' | 'unpaid' | 'refunded';

  deliveryAddress?: CustomerAddress;
  notes?: string;

  version?: number;

  whatsapp?: {
    sent: boolean;
    sentAt?: string;
    url?: string;
  };

  estimatedDeliveryTime?: string;
}

export interface StoreWorkingHours {
  openTime: string; // "10:00" in 24h format
  closeTime: string; // "02:00" in 24h format
  workingDays: number[]; // [0, 1, 2, 3, 4, 5, 6] where 0=Sunday
  scheduleEnabled: boolean;
}

export interface PaperMenuPage {
  id: string;
  titleAr: string;
  subtitleAr?: string;
  descriptionAr?: string;
  imageUrl: string;
  pageNumber: number;
  sortOrder: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Coupon {
  id?: string;
  code: string;
  discountPercent?: number;
  freeShipping?: boolean;
  description: string;
  enabled: boolean;
}

export interface StoreFeatureItem {
  id: string;
  emoji: string;
  titleAr: string;
  descAr: string;
}

export interface CustomerTestimonialItem {
  id: string;
  nameAr: string;
  locationAr: string;
  rating: number;
  commentAr: string;
  orderedItemAr: string;
  timeAr: string;
}

export interface SiteSettings {
  storeNameAr: string;
  storeDescriptionAr?: string;
  storeBadgeAr?: string;
  phone: string;
  whatsapp: string;
  customerServiceWhatsApp?: string;
  customerServicePhone?: string;
  addressAr: string;
  defaultDeliveryFee: number;
  minOrderAmount: number;
  isStoreOpen: boolean;
  storeStatusMode?: 'manual_open' | 'manual_closed' | 'auto_schedule';
  workingHours?: StoreWorkingHours;
  temporaryClosureReasonAr?: string;
  announcementEnabled: boolean;
  announcementTextAr?: string;
  couponsEnabled?: boolean;
  coupons?: Coupon[];
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  updatedAt?: string;

  // Custom Editable Features and Testimonials
  features?: StoreFeatureItem[];
  testimonials?: CustomerTestimonialItem[];
  testimonialsRating?: string;
  testimonialsTrustCount?: string;
  testimonialsTitle?: string;
  testimonialsSubtitle?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  adminUid: string;
  adminEmail: string;
  action: 'create_product' | 'update_product' | 'update_price' | 'toggle_availability' | 'delete_product' | 'update_category' | 'create_category' | 'delete_category' | 'update_branch' | 'create_branch' | 'delete_branch' | 'update_settings' | 'change_credentials' | 'update_order_status' | 'delete_order' | 'bulk_delete_orders' | 'system_reset_orders' | string;
  targetType: 'product' | 'order' | 'category' | 'branch' | 'settings' | 'account' | string;
  targetId: string;
  summaryAr: string;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    messageAr: string;
  };
}
