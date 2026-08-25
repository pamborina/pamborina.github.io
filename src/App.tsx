import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { ToastProvider, useToast } from './components/ui/Toast';
import { NotificationProvider } from './context/NotificationProvider';
import { SiteSettingsProvider, useSiteSettings } from './context/SiteSettingsContext';
import { useNotifications } from './hooks/useNotifications';
import { Footer } from './components/common/Footer';
import { BottomSheet } from './components/ui/BottomSheet';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { productService } from './services/productService';
import { branchService } from './services/branchService';
import { menuSyncService } from './services/menuSyncService';
import { firebaseCategoryService } from './services/firebaseCategoryService';
import { firebaseBranchService } from './services/firebaseBranchService';
import { categories as categoriesData } from './data';
import { analyticsService } from './services/analyticsService';
import { storageService } from './services/storageService';
import { notificationService } from './services/NotificationService';
import { notificationStorage } from './services/notification.storage';
import { notificationScheduler } from './services/notification.scheduler';
import { Product, Category, Branch, CartItem } from './types';
import { categoryTranslations, getCategoryArabicName } from './constants/categoryTranslations';
import { MapPin, Clock } from 'lucide-react';
import { formatPrice } from './lib/utils';
import { ProductImage, preloadImages } from './components/common/ProductImage';

// Navigation & Layout Components
import { SplashScreen } from './components/navigation/SplashScreen';
import { TopAnnouncementBar } from './components/navigation/TopAnnouncementBar';
import { StickyHeader } from './components/navigation/StickyHeader';
import { CategoryTabs } from './components/navigation/CategoryTabs';
import { FloatingSearch } from './components/navigation/FloatingSearch';
import { FloatingCartBar } from './components/navigation/FloatingCartBar';
import { BottomNavDock, NavTabId } from './components/navigation/BottomNavDock';
import { NotificationsSheet } from './components/navigation/NotificationsSheet';
import { BranchSelectorSheet } from './components/navigation/BranchSelectorSheet';
import { BackHeader } from './components/navigation/BackHeader';
import { ScrollToTopButton } from './components/navigation/ScrollToTopButton';
import { HomePage } from './components/home/HomePage';
import { CategoryGrid } from './components/home/CategoryGrid';
import { CategoryProductsView } from './components/category/CategoryProductsView';
import { ProductDetailModal } from './components/product/ProductDetailModal';
import { CartSheet } from './components/cart/CartSheet';
import { CheckoutModal } from './components/checkout/CheckoutModal';
import { OrderTrackingModal } from './components/checkout/OrderTrackingModal';
import { SecretAdminTrigger } from './components/admin/SecretAdminTrigger';

// Code-split AdminRoute to keep initial customer bundle lightweight
const AdminRoute = React.lazy(() =>
  import('./components/admin/AdminRoute').then((m) => ({ default: m.AdminRoute }))
);

function MainAppContent() {
  const { showToast } = useToast();
  const { isStoreOpen, temporaryClosureReasonAr, formattedWorkingHoursAr } = useSiteSettings();
  const {
    unreadCount,
    notifyProductAdded,
    notifyCartItemRemoved,
    notifyProductModalOpen,
    notifyProductModalClose,
    notifyOrderPlaced,
    notifyBranchChanged,
    openCartExitDialog,
  } = useNotifications();

  // Navigation & Screen States
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activeNavTab, setActiveNavTab] = useState<NavTabId>('home');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    return window.location.hash === '#admin' || window.location.pathname === '/admin';
  });

  // URL Hash Listener for routing
  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminRoute(window.location.hash === '#admin' || window.location.pathname === '/admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sheets & Overlays
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBranchSelectorOpen, setIsBranchSelectorOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState(false);
  const [trackingOrderNumber, setTrackingOrderNumber] = useState<string>('');

  // Data States - Pre-loaded with static local data to guarantee instant, fail-safe UI rendering
  const [categories, setCategories] = useState<Category[]>(() => categoriesData as Category[]);
  const [allProducts, setAllProducts] = useState<Product[]>(() => menuSyncService.getCurrentProducts());
  const [branches, setBranches] = useState<Branch[]>(() => branchService.getBranchesSync());
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(
    () => branchService.getSelectedBranch() || branchService.getBranchesSync()[0] || null
  );
  const [loading, setLoading] = useState<boolean>(false);

  // Cart & Favorites State (Persisted locally)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const raw = storageService.getCart<CartItem[]>([]);
    const seen = new Set<string>();
    return raw.map((item, idx) => {
      let uniqueId = item.id;
      if (!uniqueId || seen.has(uniqueId)) {
        uniqueId = `cart-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      }
      seen.add(uniqueId);
      return { ...item, id: uniqueId };
    });
  });
  const [favorites, setFavorites] = useState<string[]>(() => storageService.getFavorites(['prod-1', 'prod-3']));

  // Selected Product Detail Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Track if real-time Firestore products have arrived so initial fetch doesn't overwrite
  const hasRealtimeSnapshotArrivedRef = useRef<boolean>(false);

  // Refresh products from productService
  const handleRefreshProducts = async () => {
    try {
      const prods = await productService.getProducts({});
      if (prods && prods.length > 0) {
        setAllProducts(prods);
      }
    } catch (e) {
      console.warn('⚠️ Failed to refresh products, keeping current catalog:', e);
    }
  };

  // Initialize Data
  useEffect(() => {
    let isMounted = true;
    async function initData() {
      try {
        const [cats, prods, bns] = await Promise.all([
          productService.getCategories().catch(() => categoriesData as Category[]),
          productService.getProducts({}).catch(() => menuSyncService.getCurrentProducts()),
          branchService.getBranches().catch(() => branchService.getBranchesSync()),
        ]);

        if (!isMounted) return;

        if (cats && cats.length > 0) setCategories(cats);
        // Only set products if real-time snapshot has not arrived yet
        if (prods && prods.length > 0 && !hasRealtimeSnapshotArrivedRef.current) {
          setAllProducts(prods);
        }
        if (bns && bns.length > 0) {
          setBranches(bns);
          const defaultBranch = branchService.getSelectedBranch() || bns[0];
          if (defaultBranch) setSelectedBranch(defaultBranch);
        }

        // Preload category and top product images immediately for ultra-fast UI rendering
        const categoryImgUrls = (cats || []).map((c) => c.imageUrl).filter(Boolean) as string[];
        const productImgUrls = (prods || []).map((p) => p.image || p.imageUrl).filter(Boolean) as string[];
        preloadImages([...categoryImgUrls, ...productImgUrls.slice(0, 30)]);

        // Progressively pre-warm remaining products in background without blocking UI
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            preloadImages(productImgUrls.slice(30));
          });
        } else {
          setTimeout(() => {
            preloadImages(productImgUrls.slice(30));
          }, 800);
        }

        // Record site open activity
        storageService.logActivity('فتح الموقع', 'زيارة الصفحة الرئيسية');
        analyticsService.trackPageView('home');
      } catch (err) {
        console.warn('⚠️ Non-critical initialization error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Realtime product updates listener from Firestore
  useEffect(() => {
    const unsubscribeProds = productService.subscribeToProducts((updatedProducts) => {
      if (updatedProducts && updatedProducts.length > 0) {
        hasRealtimeSnapshotArrivedRef.current = true;
        setAllProducts(updatedProducts);
      }
    });

    const unsubscribeCats = firebaseCategoryService.subscribeToCategories((updatedCats) => {
      if (updatedCats && updatedCats.length > 0) {
        setCategories(updatedCats);
      }
    });

    const unsubscribeBranches = firebaseBranchService.subscribeToBranches((updatedBranches) => {
      if (updatedBranches && updatedBranches.length > 0) {
        setBranches(updatedBranches);
        setSelectedBranch((prev) => {
          if (!prev) return updatedBranches[0];
          const match = updatedBranches.find((b) => b.id === prev.id);
          return match || updatedBranches[0];
        });
      }
    });

    return () => {
      if (unsubscribeProds) unsubscribeProds();
      if (unsubscribeCats) unsubscribeCats();
      if (unsubscribeBranches) unsubscribeBranches();
    };
  }, []);

  // Keep cartItems synchronized with real-time product availability and price changes
  useEffect(() => {
    if (cartItems.length > 0 && allProducts.length > 0) {
      let hasChanges = false;
      const syncedCart = cartItems.map((item) => {
        const live = allProducts.find((p) => p.id === item.product.id);
        if (live) {
          const liveAvail =
            live.isAvailable !== undefined
              ? live.isAvailable
              : (live.available !== undefined ? live.available : true);
          const itemAvail =
            item.product.isAvailable !== undefined
              ? item.product.isAvailable
              : (item.product.available !== undefined ? item.product.available : true);
          if (liveAvail !== itemAvail || live.price !== item.product.price || live.nameAr !== item.product.nameAr) {
            hasChanges = true;
            return {
              ...item,
              product: live,
              unitPrice: live.price,
              totalPrice: live.price * item.quantity,
            };
          }
        }
        return item;
      });

      if (hasChanges) {
        setCartItems(syncedCart);
      }
    }
  }, [allProducts]);

  // Keep selectedProduct in modal synchronized with real-time Firestore updates
  useEffect(() => {
    if (selectedProduct) {
      const latest = allProducts.find((p) => p.id === selectedProduct.id);
      if (latest && (
        latest.isAvailable !== selectedProduct.isAvailable ||
        latest.available !== selectedProduct.available ||
        latest.price !== selectedProduct.price ||
        latest.nameAr !== selectedProduct.nameAr
      )) {
        setSelectedProduct(latest);
      }
    }
  }, [allProducts, selectedProduct]);

  // Sync Cart changes to local storage & Notification Scheduler
  useEffect(() => {
    storageService.setCart(cartItems);
    notificationStorage.setCart(cartItems);
    if (cartItems.length > 0) {
      notificationScheduler.scheduleAbandonedCartCheck();
    } else {
      notificationScheduler.cancelAbandonedCartCheck();
    }
  }, [cartItems]);

  // Sync Favorites changes to local storage
  useEffect(() => {
    storageService.setFavorites(favorites);
  }, [favorites]);

  // Register Notification Router Callbacks for real routing
  useEffect(() => {
    notificationService.registerRouterCallbacks({
      onOpenCart: () => {
        setIsCartOpen(true);
        setIsCheckoutOpen(false);
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setSelectedProduct(null);
      },
      onOpenProduct: (productId: string) => {
        const prod = allProducts.find((p) => p.id === productId);
        if (prod) {
          setSelectedProduct(prod);
          setIsNotificationsOpen(false);
          setIsCartOpen(false);
        }
      },
      onAddToCart: (productId: string) => {
        const prod = allProducts.find((p) => p.id === productId);
        if (prod) {
          handleAddToCart(prod, 1);
          setIsCartOpen(true);
          setIsNotificationsOpen(false);
        }
      },
      onProceedCheckout: () => {
        setIsCartOpen(false);
        setIsCheckoutOpen(true);
        setIsNotificationsOpen(false);
      },
      onNavigateToCategory: (categoryId: string) => {
        setSelectedCategoryId(categoryId);
        setActiveNavTab('home');
        setIsNotificationsOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  }, [allProducts]);

  // Abandoned Cart Notification on page hide / exit
  useEffect(() => {
    const handleVisibilityChange = () => {
      try {
        if (document.visibilityState === 'hidden' && cartItems.length > 0) {
          notificationScheduler.triggerFastAbandonedCheck();
          storageService.addNotification({
            type: 'cart_abandoned',
            titleAr: 'لا تنس إكمال طلبك 🛒',
            messageAr: 'تنتظرك منتجات فاخرة في السلة، اضغط لإكمال الطلب الآن.',
          });
          storageService.logActivity('خرج من الموقع والسلة بها منتجات');
        }
      } catch (err) {
        // Benign exit event during tab close or hide
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cartItems]);

  // Cart Handlers
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    if (!isStoreOpen) {
      showToast(
        'الفرع مغلق حالياً 🔴',
        temporaryClosureReasonAr || 'تم انتهاء مواعيد العمل الرسمية نعتذر عن استقبال الطلبات حالياً لان الفرع مغق الان ، سنعود قريباً..',
        'error'
      );
      return;
    }

    // Check freshest real-time availability from allProducts state
    const liveProduct = allProducts.find((p) => p.id === product.id) || product;
    const isAvail =
      liveProduct.isAvailable !== undefined
        ? liveProduct.isAvailable
        : liveProduct.available !== undefined
        ? liveProduct.available
        : true;

    if (!isAvail) {
      showToast('المنتج غير متوفر حالياً', 'نعتذر، هذا الصنف موقوف ولا يمكن إضافته للسلة', 'error');
      return;
    }

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === liveProduct.id);
      if (existingIdx > -1) {
        const copy = [...prev];
        const newQty = copy[existingIdx].quantity + quantity;
        copy[existingIdx] = {
          ...copy[existingIdx],
          product: liveProduct,
          quantity: newQty,
          unitPrice: liveProduct.price,
          totalPrice: newQty * liveProduct.price,
        };
        return copy;
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}-${prev.length}-${Math.random().toString(36).substring(2, 7)}`,
          product: liveProduct,
          selectedAddons: [],
          quantity,
          unitPrice: liveProduct.price,
          totalPrice: liveProduct.price * quantity,
        },
      ];
    });

    // Activity Timeline & Notification
    storageService.logActivity('أضاف منتج', `${liveProduct.nameAr} (الكمية: ${quantity})`);
    analyticsService.trackAddToCart(liveProduct.id, liveProduct.nameAr, liveProduct.price, quantity);

    // Smart Event Notification Trigger
    notifyProductAdded(liveProduct.nameAr, liveProduct.id);
  };

  const handleUpdateCartQty = (cartId: string, newQty: number) => {
    if (cartId === 'ALL_CLEAR') {
      setCartItems([]);
      storageService.logActivity('إفراغ السلة بالكامل');
      notifyCartItemRemoved(0);
      return;
    }

    const targetItem = cartItems.find((item) => item.id === cartId);

    if (newQty <= 0) {
      if (targetItem) {
        storageService.logActivity('حذف منتج من السلة', targetItem.product.nameAr);
        analyticsService.trackRemoveFromCart(targetItem.product.id, targetItem.product.nameAr);
      }
      const updatedCart = cartItems.filter((item) => item.id !== cartId);
      setCartItems(updatedCart);
      notifyCartItemRemoved(updatedCart.length, targetItem?.product?.nameAr);
      return;
    }

    if (targetItem) {
      storageService.logActivity('تعديل كمية منتج', `${targetItem.product.nameAr} -> ${newQty}`);
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.id === cartId
          ? { ...item, quantity: newQty, totalPrice: newQty * item.unitPrice }
          : item
      )
    );
  };

  const toggleFavorite = (productId: string) => {
    const product = allProducts.find((p) => p.id === productId);
    setFavorites((prev) => {
      const isFav = prev.includes(productId);
      const newFavs = isFav ? prev.filter((id) => id !== productId) : [...prev, productId];

      if (product) {
        storageService.logActivity(isFav ? 'حذف من المفضلة' : 'أضاف للمفضلة', product.nameAr);
        analyticsService.trackFavoriteToggle(productId, product.nameAr, !isFav);
      }

      showToast(
        isFav ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة للمفضلة ❤️',
        '',
        isFav ? 'info' : 'success'
      );
      return newFavs;
    });
  };

  const handleSelectProduct = (product: Product | null) => {
    setSelectedProduct(product);
    if (product) {
      storageService.logActivity('فتح تفاصيل منتج', product.nameAr);
      analyticsService.trackProductView(product.id, product.nameAr);
      notifyProductModalOpen(product.id);
    } else {
      notifyProductModalClose();
    }
  };

  const handleSelectCategory = (catId: string | null) => {
    setSelectedCategoryId(catId);
    if (catId) {
      const category = categories.find((c) => c.id === catId);
      const catName = category ? getCategoryArabicName(category) : (categoryTranslations[catId] || catId);
      storageService.logActivity('دخل قسم', catName);
      analyticsService.trackCategoryView(catId, catName);
    }
  };

  const handleTabChange = (tab: NavTabId) => {
    if (tab === 'cart') {
      setIsCartOpen(true);
      storageService.logActivity('فتح سلة التسوق');
    } else {
      setActiveNavTab(tab);
      storageService.logActivity('تصفح التبويب', tab);
      analyticsService.trackPageView(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogoClick = () => {
    const hasActiveOverlaysOrTab =
      selectedProduct !== null ||
      selectedCategoryId !== null ||
      isSearchOpen ||
      isNotificationsOpen ||
      isBranchSelectorOpen ||
      isCartOpen ||
      isCheckoutOpen ||
      isFavoritesOpen ||
      activeNavTab !== 'home';

    if (hasActiveOverlaysOrTab) {
      setSelectedProduct(null);
      setSelectedCategoryId(null);
      setIsSearchOpen(false);
      setIsNotificationsOpen(false);
      setIsBranchSelectorOpen(false);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
      setIsFavoritesOpen(false);
      setActiveNavTab('home');
      analyticsService.trackPageView('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const cartGrandTotal = cartSubtotal;

  // Filter products by active category
  const displayedProducts = allProducts.filter((p) => {
    if (!selectedCategoryId) return true;
    return p.categoryId === selectedCategoryId;
  });

  // Admin Dashboard View
  if (isAdminRoute) {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-neutral-300 font-sans" dir="rtl">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">جاري تحميل لوحة التحكم...</p>
          </div>
        }
      >
        <AdminRoute
          categories={categories}
          branches={branches}
          products={allProducts}
          onBackToStore={() => {
            setIsAdminRoute(false);
            window.location.hash = '';
          }}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0B08] text-[#F7F3E8] font-sans antialiased dir-rtl flex flex-col selection:bg-[#D4AF37] selection:text-black">
      {/* Realtime Announcement / Store Closure Alert Bar */}
      <TopAnnouncementBar />

      {/* 1. Animated Premium Splash Screen */}
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen
            key="pamborina-splash-screen"
            onComplete={() => setShowSplash(false)}
            taglineAr="طعم الفخامة في كل لقمة"
          />
        )}
      </AnimatePresence>

      {/* Contextual Back Header if selectedProduct detail is active */}
      {selectedProduct ? (
        <BackHeader
          title={selectedProduct.nameAr}
          breadcrumbs={['الرئيسية', 'تفاصيل الصنف']}
          onBack={() => setSelectedProduct(null)}
          onHome={() => {
            setSelectedProduct(null);
            setActiveNavTab('home');
            analyticsService.trackPageView('home');
          }}
        />
      ) : selectedBranch ? (
        <StickyHeader
          currentBranch={selectedBranch}
          onOpenBranchSelector={() => setIsBranchSelectorOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenOrderTracking={() => setIsOrderTrackingOpen(true)}
          unreadNotificationsCount={unreadCount}
          activeNavTab={activeNavTab}
          onTabChange={handleTabChange}
          onOpenCart={() => setIsCartOpen(true)}
          cartBadgeCount={totalCartCount}
          cartTotal={cartSubtotal}
          onLogoClick={handleLogoClick}
        />
      ) : null}

      {/* 3. Category Tabs Bar */}
      {!selectedProduct && (
        <CategoryTabs
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
          totalProductsCount={allProducts.length}
        />
      )}

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-12">
        {/* BRANCHES TAB VIEW */}
        {activeNavTab === 'branches' && (
          <div className="space-y-6">
            <div className="border-b border-[#2C1F16] pb-4">
              <h1 className="text-2xl font-black text-gold-gradient font-heading">
                فروع حلواني بامبورينا الرسمية
              </h1>
              <p className="text-xs text-[#C8BFB0] mt-1">
                خدمة التوصيل السريع من فرع الطالبية وفرع الجيزة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map((b, idx) => (
                <div
                  key={`${b.id}-${idx}`}
                  className="p-5 rounded-3xl bg-[#18110B] border border-[#D4AF37]/30 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F4E08B] bg-[#221710] px-3 py-1 rounded-full border border-[#3D2C1E]">
                      {b.cityAr} - {b.areaAr}
                    </span>
                    <Badge variant="chef">مفتوح الآن</Badge>
                  </div>

                  <h3 className="text-lg font-bold text-[#FFF1C5]">{b.nameAr}</h3>
                  <p className="text-xs text-[#C8BFB0] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span>{b.addressAr}</span>
                  </p>

                  <div className="pt-3 border-t border-[#2C1F16] space-y-2 text-xs text-[#C8BFB0]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>ساعات العمل: {formattedWorkingHoursAr || b.openingHoursAr}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#120B07] p-2.5 rounded-xl border border-[#2A1D13]">
                      <span className="text-xs text-[#8E8373] font-bold">الهاتف والخط الساخن:</span>
                      <div className="flex flex-wrap items-center gap-3 dir-ltr">
                        <a href={`tel:${b.phone}`} className="font-bold text-[#F4E08B] hover:underline flex items-center gap-1">
                          📱 {b.phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="gold-outline"
                    fullWidth
                    onClick={() => {
                      setSelectedBranch(b);
                      branchService.setSelectedBranch(b.id);
                      showToast(`تم اختيار ${b.nameAr}`, '', 'success');
                      setActiveNavTab('menu');
                      analyticsService.trackPageView('menu');
                    }}
                  >
                    طلب التوصيل من هذا الفرع
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DEDICATED CATEGORY PRODUCTS VIEW */}
        {selectedCategoryId ? (
          <CategoryProductsView
            category={
              categories.find((c) => c.id === selectedCategoryId) || {
                id: selectedCategoryId,
                nameAr: categoryTranslations[selectedCategoryId] || 'الركن المحدد',
                nameEn: categoryTranslations[selectedCategoryId] || 'الركن المحدد',
                slug: selectedCategoryId,
                descriptionAr: 'قائمة أصناف هذا الركن المميز',
                imageUrl: '',
                itemCount: displayedProducts.length,
                sortOrder: 1,
              }
            }
            products={allProducts}
            onBack={() => setSelectedCategoryId(null)}
            onAddToCart={(p, qty) => handleAddToCart(p, qty || 1)}
            onSelectProduct={handleSelectProduct}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            allCategories={categories}
            onSelectOtherCategory={(catId) => handleSelectCategory(catId)}
          />
        ) : (
          <>
            {/* HOME VIEW */}
            {activeNavTab === 'home' && (
              <HomePage
                categories={categories}
                products={allProducts}
                branches={branches}
                cartSubtotal={cartSubtotal}
                onAddToCart={(p, qty) => handleAddToCart(p, qty || 1)}
                onSelectProduct={handleSelectProduct}
                onSelectCategory={handleSelectCategory}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onOpenCart={() => setIsCartOpen(true)}
                onMenuUpdated={handleRefreshProducts}
              />
            )}

            {/* MENU TAB VIEW */}
            {(activeNavTab === 'menu' || activeNavTab === 'cart') && (
              <div className="space-y-6">
                <CategoryGrid
                  categories={categories}
                  selectedCategoryId={null}
                  onSelectCategory={(catId) => handleSelectCategory(catId)}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* 4. Floating Search Overlay Modal */}
      <FloatingSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={allProducts}
        categories={categories}
        onAddToCart={(p) => handleAddToCart(p, 1)}
        onSelectCategory={handleSelectCategory}
        onSelectProduct={handleSelectProduct}
      />

      {/* 5. One-Hand Floating Cart Bar */}
      <FloatingCartBar
        itemCount={totalCartCount}
        totalAmount={cartGrandTotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* 6. Notifications Drawer Sheet */}
      <NotificationsSheet
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* 7. Branch Selector Bottom Sheet */}
      <BranchSelectorSheet
        isOpen={isBranchSelectorOpen}
        onClose={() => setIsBranchSelectorOpen(false)}
        branches={branches}
        currentBranchId={selectedBranch?.id || ''}
        onSelectBranch={(branch) => {
          setSelectedBranch(branch);
          branchService.setSelectedBranch(branch.id);
          notifyBranchChanged(branch.id, branch.nameAr);
          showToast(`تم تغيير الفرع إلى ${branch.nameAr}`, '', 'success');
        }}
      />

      {/* 8. Shopping Cart Drawer Sheet */}
      <CartSheet
        isOpen={isCartOpen}
        onClose={() => {
          if (cartItems.length > 0) {
            openCartExitDialog();
          }
          setIsCartOpen(false);
        }}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQty}
        onClearCart={() => handleUpdateCartQty('ALL_CLEAR', 0)}
        allProducts={allProducts}
        onAddToCart={(p, qty) => handleAddToCart(p, qty || 1)}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* 9. Favorites Bottom Sheet */}
      <BottomSheet
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        title="المفضلة ❤️"
        subtitle={`${favorites.length} منتجات في قائمتك المفضلة`}
      >
        <div className="space-y-3">
          {favorites.length === 0 ? (
            <p className="text-xs text-center text-[#8E8373] py-8">لا توجد أصناف في المفضلة بعد</p>
          ) : (
            allProducts
              .filter((p) => favorites.includes(p.id))
              .map((p, idx) => (
                <div
                  key={`${p.id}-${idx}`}
                  className="p-3 rounded-2xl bg-[#140E0A] border border-[#2D2017] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <ProductImage
                      src={p.image || p.imageUrl}
                      alt={p.nameAr}
                      className="w-12 h-12 rounded-xl"
                    />
                    <div>
                      <h5 className="text-xs font-bold text-[#FFF1C5]">{p.nameAr}</h5>
                      <span className="text-xs font-bold text-[#F4E08B]">{formatPrice(p.price)}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="gold-outline" onClick={() => handleAddToCart(p, 1)}>
                    أضف
                  </Button>
                </div>
              ))
          )}
        </div>
      </BottomSheet>

      {/* 10. Bottom Navigation Dock */}
      <BottomNavDock
        activeTab={activeNavTab}
        onTabChange={handleTabChange}
        cartBadgeCount={totalCartCount}
      />

      {/* 11. Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(product, qty) => {
          handleAddToCart(product, qty);
        }}
        allProducts={allProducts}
        onSelectProduct={handleSelectProduct}
        isFavorite={selectedProduct ? favorites.includes(selectedProduct.id) : false}
        onToggleFavorite={toggleFavorite}
      />

      {/* 12. Guest Checkout Modal with WhatsApp Dispatch */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        selectedBranch={selectedBranch}
        branches={branches}
        onOrderSuccess={(orderData) => {
          setCartItems([]);
          storageService.setCart([]);
          const orderNum = orderData?.orderNumber || orderData?.orderId || 'ORD-0001';
          notifyOrderPlaced(orderNum);
          setTrackingOrderNumber(orderNum);
          setIsCheckoutOpen(false);
          setIsOrderTrackingOpen(true);
        }}
      />

      {/* 13. Real-Time Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isOrderTrackingOpen}
        onClose={() => setIsOrderTrackingOpen(false)}
        initialOrderNumber={trackingOrderNumber}
      />

      {/* Floating Scroll-To-Top Button */}
      <ScrollToTopButton />

      {/* Covert Admin Access Button: Hidden in the bottom-left corner, reveals only on hover */}
      <SecretAdminTrigger
        onOpenAdmin={() => {
          setIsAdminRoute(true);
          window.location.hash = '#admin';
        }}
      />

      {/* Footer */}
      <Footer
        onLogoClick={handleLogoClick}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <NotificationProvider>
        <SiteSettingsProvider>
          <MainAppContent />
        </SiteSettingsProvider>
      </NotificationProvider>
    </ToastProvider>
  );
}
