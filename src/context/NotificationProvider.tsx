/**
 * NotificationProvider
 * Wraps the app and renders smart notification UI elements:
 * - Actionable Toast with button ("عرض السلة")
 * - Cart Exit Confirmation Dialog ("لديك منتجات لم يتم طلبها بعد")
 * - Product Assistance Help Prompt ("هل تحتاج مساعدة؟")
 * - Browser Notification Permission Request Banner
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  X,
  Bell,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Info,
  ChevronLeft,
} from 'lucide-react';
import { NotificationContext } from './NotificationContext';
import { SmartNotification, NotificationEventLog } from '../types/notification.types';
import { notificationService } from '../services/NotificationService';
import { notificationStorage } from '../services/notification.storage';

interface NotificationProviderProps {
  children: React.ReactNode;
  onOpenCart?: () => void;
  onOpenProduct?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  onProceedCheckout?: () => void;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  onOpenCart,
  onOpenProduct,
  onAddToCart,
  onProceedCheckout,
}) => {
  const [permissionStatus, setPermissionStatus] = useState<
    NotificationPermission | 'unsupported'
  >(notificationService.getPermissionStatus());

  const [activeToastNotif, setActiveToastNotif] = useState<SmartNotification | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<SmartNotification[]>(
    notificationService.getHistory()
  );

  // Scenario 5: Cart Exit Dialog State
  const [isCartExitDialogOpen, setIsCartExitDialogOpen] = useState<boolean>(false);

  // Scenario 4: Product Dwell Assistance State
  const [isProductHelpOpen, setIsProductHelpOpen] = useState<boolean>(false);
  const [activeDwellProductId, setActiveDwellProductId] = useState<string | null>(null);

  // Auto-dismiss toast timer
  useEffect(() => {
    if (!activeToastNotif) return;
    const timer = setTimeout(() => {
      setActiveToastNotif(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToastNotif]);

  // Register router callbacks and subscribe to notification events
  useEffect(() => {
    notificationService.initialize({
      onOpenCart: () => {
        if (onOpenCart) onOpenCart();
      },
      onOpenProduct: (pId) => {
        if (onOpenProduct) onOpenProduct(pId);
      },
      onAddToCart: (pId) => {
        if (onAddToCart) onAddToCart(pId);
      },
      onProceedCheckout: () => {
        if (onProceedCheckout) onProceedCheckout();
      },
    });

    const unsubscribe = notificationService.subscribe((notif) => {
      // Refresh history state
      setNotificationHistory(notificationService.getHistory());

      if (!notif) return;

      if (notif.type === 'product_dwell') {
        setIsProductHelpOpen(true);
        setActiveDwellProductId(notif.action?.productId || null);
      } else {
        setActiveToastNotif(notif);
      }
    });

    return () => unsubscribe();
  }, [onOpenCart, onOpenProduct, onAddToCart, onProceedCheckout]);

  // Permission Request Handler
  const requestPermission = useCallback(async () => {
    const perm = await notificationService.requestPermission();
    setPermissionStatus(perm);
    return perm;
  }, []);

  const dismissToastNotif = useCallback(() => {
    if (activeToastNotif) {
      notificationService.handleNotificationIgnored(activeToastNotif.id);
    }
    setActiveToastNotif(null);
  }, [activeToastNotif]);

  // Cart Exit Confirmation Handlers
  const openCartExitDialog = useCallback(() => {
    setIsCartExitDialogOpen(true);
  }, []);

  const confirmCartExitToCheckout = useCallback(() => {
    setIsCartExitDialogOpen(false);
    if (onProceedCheckout) {
      onProceedCheckout();
    } else if (onOpenCart) {
      onOpenCart();
    }
  }, [onProceedCheckout, onOpenCart]);

  const cancelCartExitToShopping = useCallback(() => {
    setIsCartExitDialogOpen(false);
  }, []);

  // Product Dwell Assistance Handlers
  const confirmAddDwellProductToCart = useCallback(() => {
    if (activeDwellProductId && onAddToCart) {
      onAddToCart(activeDwellProductId);
    }
    setIsProductHelpOpen(false);
    setActiveDwellProductId(null);
  }, [activeDwellProductId, onAddToCart]);

  const dismissProductHelp = useCallback(() => {
    setIsProductHelpOpen(false);
    setActiveDwellProductId(null);
  }, []);

  // Notification History Handlers
  const handleNotificationAction = useCallback((notif: SmartNotification) => {
    notificationService.handleNotificationClick(notif);
    setActiveToastNotif(null);
    setNotificationHistory(notificationService.getHistory());
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    notificationService.markAllRead();
    setNotificationHistory(notificationService.getHistory());
  }, []);

  const clearAllNotifications = useCallback(() => {
    notificationService.clearAllHistory();
    setNotificationHistory([]);
  }, []);

  const getEventLogs = useCallback((): NotificationEventLog[] => {
    return notificationService.getEventLogs();
  }, []);

  // Direct Triggers
  const notifyProductAdded = useCallback((productNameAr: string, productId: string) => {
    notificationService.handleProductAddedToCart(productNameAr, productId);
  }, []);

  const notifyCartItemRemoved = useCallback((remainingCount: number, removedNameAr?: string) => {
    notificationService.handleCartItemRemoved(remainingCount, removedNameAr);
  }, []);

  const notifyProductModalOpen = useCallback((productId: string) => {
    notificationService.handleProductModalOpened(productId);
  }, []);

  const notifyProductModalClose = useCallback(() => {
    notificationService.handleProductModalClosed();
  }, []);

  const notifyOrderPlaced = useCallback((orderNumber: string) => {
    notificationService.handleOrderCompleted(orderNumber);
  }, []);

  const notifyBranchChanged = useCallback((branchId: string, branchNameAr: string) => {
    notificationService.handleBranchSelected(branchId, branchNameAr);
  }, []);

  const unreadCount = notificationHistory.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        permissionStatus,
        requestPermission,
        activeToastNotif,
        dismissToastNotif,
        isCartExitDialogOpen,
        openCartExitDialog,
        confirmCartExitToCheckout,
        cancelCartExitToShopping,
        isProductHelpOpen,
        activeDwellProductId,
        confirmAddDwellProductToCart,
        dismissProductHelp,
        notificationHistory,
        unreadCount,
        handleNotificationAction,
        markAllNotificationsRead,
        clearAllNotifications,
        getEventLogs,
        notifyProductAdded,
        notifyCartItemRemoved,
        notifyProductModalOpen,
        notifyProductModalClose,
        notifyOrderPlaced,
        notifyBranchChanged,
      }}
    >
      {children}

      {/* 1. Actionable Toast Container (Scenario 1, 2, 3, 6) */}
      <AnimatePresence>
        {activeToastNotif && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-24 sm:bottom-6 left-1/2 sm:left-6 -translate-x-1/2 sm:translate-x-0 z-[100] w-[92%] sm:w-auto sm:max-w-sm sm:min-w-[320px] dir-rtl pointer-events-auto"
          >
            <div className="relative overflow-hidden rounded-2xl bg-[#1A120B]/95 border border-[#D4AF37]/80 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl text-[#FFF1C5] gold-glow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-[#2D1F14] border border-[#3D2C1E] flex items-center justify-center shrink-0 text-[#D4AF37]">
                    {activeToastNotif.icon ? <span className="text-xl">{activeToastNotif.icon}</span> : <Sparkles className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 space-y-1 mt-0.5">
                    <h4 className="text-sm font-black font-heading leading-tight text-[#FFF1C5]">
                      {activeToastNotif.titleAr}
                    </h4>
                    {activeToastNotif.descriptionAr && (
                      <p className="text-xs text-[#C8BFB0] opacity-90 leading-relaxed font-medium">
                        {activeToastNotif.descriptionAr}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={dismissToastNotif}
                  className="text-current opacity-60 hover:opacity-100 hover:bg-white/10 transition-all p-1.5 rounded-lg cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Button if specified */}
              {activeToastNotif.action && (
                <div className="pt-2 mt-1 border-t border-[#3D2C1E]/60 flex items-center justify-end gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNotificationAction(activeToastNotif)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-xs shadow-lg hover:brightness-110 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{activeToastNotif.action.labelAr}</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Scenario 5: Cart Exit Dialog Modal */}
      <AnimatePresence>
        {isCartExitDialogOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md dir-rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm rounded-3xl bg-[#1A120B]/95 border border-[#D4AF37]/50 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl text-[#FFF1C5] text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#2D1F14] border border-[#D4AF37]/80 mx-auto flex items-center justify-center text-[#D4AF37] shadow-lg gold-glow-sm">
                <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black font-heading text-[#FFF1C5]">
                  لديك منتجات لم يتم طلبها بعد! 🛒
                </h3>
                <p className="text-xs text-[#C8BFB0] leading-relaxed font-medium">
                  أصنافك المفضلة ما زالت داخل السلة. هل ترغب في إكمال الطلب الآن أم متابعة التصفح؟
                </p>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={confirmCartExitToCheckout}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-sm shadow-lg hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 text-black stroke-[2.5]" />
                  <span>إكمال الطلب</span>
                </button>

                <button
                  type="button"
                  onClick={cancelCartExitToShopping}
                  className="w-full py-3 rounded-2xl bg-[#2D1F14] border border-[#3D2C1E] text-xs font-bold text-[#C8BFB0] hover:text-[#FFF1C5] hover:border-[#D4AF37]/50 hover:bg-[#3D2C1E] transition-all cursor-pointer"
                >
                  المتابعة واستكشاف الأصناف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Scenario 4: Product Dwell Assistance Prompt */}
      <AnimatePresence>
        {isProductHelpOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-24 sm:bottom-6 left-1/2 sm:left-6 -translate-x-1/2 sm:translate-x-0 z-[100] w-[92%] sm:w-auto sm:max-w-sm sm:min-w-[320px] dir-rtl pointer-events-auto"
          >
            <div className="relative overflow-hidden rounded-2xl bg-[#1A120B]/95 border border-amber-500/60 p-4 shadow-[0_10px_35px_rgba(217,119,6,0.15)] backdrop-blur-xl text-[#FFF1C5] flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <HelpCircle className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="flex-1 space-y-1 mt-0.5">
                    <h4 className="text-sm font-black font-heading leading-tight text-[#FFF1C5]">
                      هل تحتاج مساعدة؟ 💡
                    </h4>
                    <p className="text-xs text-[#C8BFB0] opacity-90 leading-relaxed font-medium">
                      يمكنك إضافة المنتج الآن وسنجهز طلبك بالسمن البلدي فوراً.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={dismissProductHelp}
                  className="text-current opacity-60 hover:opacity-100 hover:bg-white/10 transition-all p-1.5 rounded-lg cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-2 mt-1 border-t border-amber-900/30 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={dismissProductHelp}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#C8BFB0] hover:text-[#FFF1C5] hover:bg-white/5 transition-all cursor-pointer"
                >
                  إغلاق
                </button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={confirmAddDwellProductToCart}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-neutral-950 font-black text-xs shadow-lg hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-neutral-950" />
                  <span>إضافة للسلة</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Optional Native Browser Permission Request Banner */}
      {permissionStatus === 'default' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] w-[92%] sm:max-w-md dir-rtl"
        >
          <div className="p-3.5 rounded-2xl bg-[#1A120B]/95 border border-[#D4AF37]/60 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-xs text-[#FFF1C5]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2D1F14] border border-[#3D2C1E] flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <span className="font-medium leading-tight">فعل الإشعارات لمتابعة طلباتك والعروض الحصرية! 🔔</span>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={requestPermission}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black font-black text-[11px] shrink-0 shadow-lg hover:brightness-110 transition-all cursor-pointer"
            >
              تفعيل الآن
            </motion.button>
          </div>
        </motion.div>
      )}
    </NotificationContext.Provider>
  );
};
