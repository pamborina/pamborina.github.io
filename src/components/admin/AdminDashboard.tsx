import React, { useState, useEffect } from 'react';
import { Product, Category, Branch } from '../../types';
import { AdminUser, firebaseAuthService } from '../../services/firebaseAuthService';
import { firebaseProductService } from '../../services/firebaseProductService';
import { firebaseCategoryService } from '../../services/firebaseCategoryService';
import { firebaseBranchService } from '../../services/firebaseBranchService';
import {
  LayoutDashboard,
  Utensils,
  Layers,
  Store,
  ShoppingBag,
  Settings,
  LogOut,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Menu,
  X,
  Plus,
  TrendingUp,
  History,
  UserCheck,
  MessageSquare,
  BookOpen,
  Sparkles,
  Truck,
  Bike,
  Users,
} from 'lucide-react';
import { AdminOverviewTab } from './tabs/AdminOverviewTab';
import { AdminProductsTab } from './tabs/AdminProductsTab';
import { AdminCategoriesTab } from './tabs/AdminCategoriesTab';
import { AdminBranchesTab } from './tabs/AdminBranchesTab';
import { AdminOrdersTab } from './tabs/AdminOrdersTab';
import { AdminDriversTab } from './tabs/AdminDriversTab';
import { AdminAnalyticsTab } from './tabs/AdminAnalyticsTab';
import { AdminSettingsTab } from './tabs/AdminSettingsTab';
import { AdminAccountTab } from './tabs/AdminAccountTab';
import { AdminAuditLogTab } from './tabs/AdminAuditLogTab';
import { AdminPaperMenuTab } from './tabs/AdminPaperMenuTab';
import { AdminOffersTab } from './tabs/AdminOffersTab';
import { AdminUsersTab } from './tabs/AdminUsersTab';
import { AdminProductEditModal } from './modals/AdminProductEditModal';
import { PaperMenuModal } from '../home/PaperMenuModal';
import { useRBAC, RoleBadge } from '../../context/RBACContext';
import { PermissionKey } from '../../types/rbac.types';

interface AdminDashboardProps {
  adminUser: AdminUser;
  categories: Category[];
  branches: Branch[];
  initialProducts: Product[];
  onLogout: () => void;
  onBackToStore: () => void;
}

export type AdminTabId =
  | 'overview'
  | 'products'
  | 'categories'
  | 'branches'
  | 'offers'
  | 'paper_menu'
  | 'orders'
  | 'drivers'
  | 'analytics'
  | 'settings'
  | 'users'
  | 'account'
  | 'audit';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  categories,
  branches,
  initialProducts,
  onLogout,
  onBackToStore,
}) => {
  // Navigation
  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategoryFilterForProducts, setSelectedCategoryFilterForProducts] = useState<string>('all');
  const [selectedAvailabilityFilterForProducts, setSelectedAvailabilityFilterForProducts] = useState<'all' | 'available' | 'unavailable' | 'featured'>('all');

  // Handle nav tab switching
  const handleNavClick = (tabId: AdminTabId) => {
    if (tabId === 'products') {
      setSelectedCategoryFilterForProducts('all');
      setSelectedAvailabilityFilterForProducts('all');
    }
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  // Navigation from Overview tab with filters
  const handleNavigateFromOverview = (
    tab: string,
    availabilityFilter?: 'all' | 'available' | 'unavailable' | 'featured'
  ) => {
    if (availabilityFilter) {
      setSelectedAvailabilityFilterForProducts(availabilityFilter);
    } else {
      setSelectedAvailabilityFilterForProducts('all');
    }
    setActiveTab(tab as AdminTabId);
  };

  // Live Products, Categories, Branches State
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [liveCategories, setLiveCategories] = useState<Category[]>(categories);
  const [liveBranches, setLiveBranches] = useState<Branch[]>(branches);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Sync Products, Categories, and Branches in Realtime from Firestore
  useEffect(() => {
    const unsubProducts = firebaseProductService.subscribeToProducts(
      (updatedProducts) => {
        if (updatedProducts && updatedProducts.length > 0) {
          setProducts(updatedProducts);
        }
      },
      (err) => {
        console.warn('Admin realtime products subscription notice:', err);
      }
    );

    const unsubCategories = firebaseCategoryService.subscribeToCategories(
      (updatedCategories) => {
        if (updatedCategories && updatedCategories.length > 0) {
          setLiveCategories(updatedCategories);
        }
      }
    );

    const unsubBranches = firebaseBranchService.subscribeToBranches(
      (updatedBranches) => {
        if (updatedBranches && updatedBranches.length > 0) {
          setLiveBranches(updatedBranches);
        }
      }
    );

    return () => {
      unsubProducts();
      unsubCategories();
      unsubBranches();
    };
  }, []);

  // Manual Refresh
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await firebaseProductService.getProductsFromFirestore();
      if (fresh && fresh.length > 0) {
        setProducts(fresh);
      }
    } catch (e) {
      console.warn('Manual refresh failed:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open Edit Modal for a specific product
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  // Open Add Product Modal
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsEditModalOpen(true);
  };

  // Callback when a product is saved (edited or created)
  const handleProductSaved = (savedProduct: Product) => {
    setProducts((prev) => {
      const index = prev.findIndex((p) => p.id === savedProduct.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = savedProduct;
        return next;
      }
      return [savedProduct, ...prev];
    });
  };

  // Callback when multiple products are updated in bulk
  const handleProductsBulkSaved = (updatedProducts: Product[]) => {
    if (!updatedProducts || updatedProducts.length === 0) return;
    const updatedMap = new Map(updatedProducts.map((p) => [p.id, p]));
    setProducts((prev) => {
      return prev.map((p) => {
        const match = updatedMap.get(p.id);
        return match ? match : p;
      });
    });
  };

  // Callback when a product is deleted
  const handleProductDeleted = (deletedId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== deletedId));
  };

  // RBAC System Hook
  const { currentUser, hasPermission, isAdmin, role } = useRBAC();

  // Navigation Items with RBAC Gate
  const [isPreviewPaperMenuOpen, setIsPreviewPaperMenuOpen] = useState(false);

  const allNavItems: {
    id: AdminTabId;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    permission?: PermissionKey;
    isAdminOnly?: boolean;
  }[] = [
    { id: 'overview', label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'orders', label: 'نظام الطلبات', icon: <ShoppingBag className="w-5 h-5" />, permission: 'orders.view' },
    { id: 'drivers', label: 'كباتن الدليفري', icon: <Bike className="w-5 h-5" />, badge: 'إحصائيات', permission: 'drivers.view' },
    { id: 'products', label: 'المنتجات والأسعار', icon: <Utensils className="w-5 h-5" />, permission: 'products.view' },
    { id: 'categories', label: 'الأقسام والتصنيفات', icon: <Layers className="w-5 h-5" />, permission: 'categories.view' },
    { id: 'branches', label: 'الفروع الرسمية', icon: <Store className="w-5 h-5" />, permission: 'branches.view' },
    { id: 'offers', label: 'خانة العروض والبانرات', icon: <Sparkles className="w-5 h-5" />, badge: 'تحكم حي', permission: 'offers.view' },
    { id: 'paper_menu', label: 'صور المنيو المطبوع', icon: <BookOpen className="w-5 h-5" />, badge: 'جديد', permission: 'paper_menu.view' },
    { id: 'analytics', label: 'التحليلات والتقارير', icon: <TrendingUp className="w-5 h-5" />, permission: 'analytics.view' },
    { id: 'settings', label: 'إعدادات الموقع', icon: <Settings className="w-5 h-5" />, permission: 'settings.view' },
    { id: 'users', label: 'المستخدمين والصلاحيات', icon: <Users className="w-5 h-5" />, badge: 'RBAC', permission: 'users.view' },
    { id: 'account', label: 'حسابي وبياناتي', icon: <UserCheck className="w-5 h-5" />, isAdminOnly: true },
    { id: 'audit', label: 'سجل التغييرات', icon: <History className="w-5 h-5" />, badge: 'Audit', permission: 'audit.view' },
  ];

  const navItems = allNavItems.filter((item) => {
    if (item.isAdminOnly) {
      return isAdmin;
    }
    if (item.permission) {
      return isAdmin || hasPermission(item.permission);
    }
    return true;
  });

  // If current active tab is unauthorized, fallback to first authorized tab
  useEffect(() => {
    const isCurrentTabAllowed = navItems.some((item) => item.id === activeTab);
    if (!isCurrentTabAllowed && navItems.length > 0) {
      setActiveTab(navItems[0].id);
    }
  }, [navItems, activeTab]);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col font-sans max-w-[100vw] overflow-x-hidden" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-30 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between safe-area-top">
        {/* Left (RTL Start): Logo & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -mr-1 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 lg:hidden transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer"
            aria-label="تبديل القائمة"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-white leading-tight">لوحة إدارة بامبورينا</h1>
              <span className="text-[9px] sm:text-[10px] text-amber-400/80 font-mono block">Pamborina Staff & Admin Portal</span>
            </div>
          </div>
        </div>

        {/* Right (RTL End): Actions & User */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* User Profile & Role Chip */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-neutral-800/90 border border-neutral-700/80 text-xs shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="flex flex-col text-right">
              <span className="font-bold text-white leading-none">
                {currentUser?.displayName || adminUser.displayName || 'المستخدم'}
              </span>
              <span className="font-mono text-[10px] text-neutral-400 leading-tight mt-0.5" dir="ltr">
                {currentUser?.email || adminUser.email}
              </span>
            </div>
            <RoleBadge role={role} />
          </div>

          {/* View Storefront Link */}
          <button
            onClick={onBackToStore}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors min-h-[38px] cursor-pointer"
            title="عرض المتجر"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">عرض المتجر</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30 transition-colors min-h-[38px] cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </button>
        </div>
      </header>

      {/* Main Layout (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-neutral-900 border-l border-neutral-800 p-4 shrink-0 space-y-1 overflow-y-auto">
          <div className="text-[11px] font-bold text-neutral-400 px-3 py-2 uppercase tracking-wider">
            القائمة الرئيسية
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-amber-400 font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-6 mt-auto border-t border-neutral-800/80 space-y-3">
            <div className="p-3.5 rounded-xl bg-neutral-800/60 border border-neutral-700/60 text-xs space-y-1">
              <span className="text-neutral-400 block text-[11px]">إجمالي الأصناف المتصلة:</span>
              <span className="text-white font-bold text-sm">{products.length} صنف في القائمة</span>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm lg:hidden transition-opacity flex justify-start"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="w-72 max-w-[85vw] h-full bg-neutral-900 border-r border-neutral-800 p-4 sm:p-5 flex flex-col shadow-2xl safe-area-bottom animate-in slide-in-from-right duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">قائمة الإدارة</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                  aria-label="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1 flex-1 overflow-y-auto pr-0.5">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
                          : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-amber-400 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 mt-auto border-t border-neutral-800 space-y-2">
                <button
                  onClick={onBackToStore}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-800 text-neutral-200 text-xs font-bold border border-neutral-700"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة للمتجر</span>
                </button>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/30"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-neutral-950">
          <div className="max-w-7xl mx-auto w-full">
            {activeTab === 'overview' && (
              <AdminOverviewTab
                products={products}
                categories={liveCategories}
                branches={liveBranches}
                onNavigateTab={handleNavigateFromOverview}
                onOpenAddProduct={handleOpenAdd}
                onRefreshData={handleRefreshData}
                isRefreshing={isRefreshing}
              />
            )}

            {activeTab === 'products' && (
              <AdminProductsTab
                products={products}
                categories={liveCategories}
                initialCategoryFilter={selectedCategoryFilterForProducts}
                initialAvailabilityFilter={selectedAvailabilityFilterForProducts}
                onClearCategoryFilter={() => setSelectedCategoryFilterForProducts('all')}
                onClearAvailabilityFilter={() => setSelectedAvailabilityFilterForProducts('all')}
                onOpenEditProduct={handleOpenEdit}
                onOpenAddProduct={handleOpenAdd}
                onProductUpdated={handleProductSaved}
                onProductsBulkUpdated={handleProductsBulkSaved}
                onProductDeleted={handleProductDeleted}
              />
            )}

            {activeTab === 'categories' && (
              <AdminCategoriesTab
                categories={liveCategories}
                products={products}
                onSelectCategory={(catId) => {
                  setSelectedCategoryFilterForProducts(catId);
                  setActiveTab('products');
                }}
              />
            )}

            {activeTab === 'branches' && (
              <AdminBranchesTab branches={liveBranches} />
            )}

            {activeTab === 'offers' && (
              <AdminOffersTab categories={liveCategories} />
            )}

            {activeTab === 'paper_menu' && (
              <AdminPaperMenuTab onPreviewCustomerMenu={() => setIsPreviewPaperMenuOpen(true)} />
            )}

            {activeTab === 'orders' && (
              <AdminOrdersTab />
            )}

            {activeTab === 'drivers' && (
              <AdminDriversTab />
            )}

            {activeTab === 'analytics' && (
              <AdminAnalyticsTab />
            )}

            {activeTab === 'settings' && (
              <AdminSettingsTab adminUser={adminUser} />
            )}

            {activeTab === 'users' && (
              <AdminUsersTab />
            )}

            {activeTab === 'account' && (
              isAdmin ? (
                <AdminAccountTab adminUser={adminUser} />
              ) : (
                <div className="p-8 bg-neutral-900 border border-rose-500/30 rounded-2xl text-center space-y-4 my-8 shadow-2xl" dir="rtl">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">غير مصرح بالوصول (403 Forbidden)</h3>
                  <p className="text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                    تبويب "حسابي وبياناتي" مخصص حصرياً لمدير النظام الرئيسي (Admin) ولا يحق للموظفين الوصول إليه.
                  </p>
                </div>
              )
            )}

            {activeTab === 'audit' && (
              <AdminAuditLogTab />
            )}

            {/* Admin Footer Credit */}
            <div className="border-t border-[#2A1E14] mt-12 pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8E8373] gap-3">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span>جميع الحقوق محفوظة © حلواني بامبورينا</span>
                <span className="text-[#3D2C1E] hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <span>تمت برمجة و تطوير الموقع من خلال</span>
                  <a
                    href="https://wa.me/201121778205"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#1C140E] hover:bg-[#2A1E14] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#F4E08B] hover:text-[#FFF1C5] font-bold text-[11px] shadow-sm transition-all duration-150 hover:scale-105 active:scale-95 group cursor-pointer"
                    title="تواصل مع المطور عبر الواتساب: 01121778205"
                  >
                    <MessageSquare className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="font-mono tracking-wider font-bold">Eslam_Arafa</span>
                  </a>
                </span>
              </div>
              <div className="text-[11px] text-[#716556]">
                لوحة التحكم الإدارية الموحدة
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Edit / Add Product Modal */}
      <AdminProductEditModal
        isOpen={isEditModalOpen}
        product={editingProduct}
        categories={liveCategories}
        onClose={() => setIsEditModalOpen(false)}
        onSaved={handleProductSaved}
      />

      {/* Paper Menu Live Preview Modal for Admin */}
      <PaperMenuModal
        isOpen={isPreviewPaperMenuOpen}
        onClose={() => setIsPreviewPaperMenuOpen(false)}
      />
    </div>
  );
};
