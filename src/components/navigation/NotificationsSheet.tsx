import React from 'react';
import { motion } from 'motion/react';
import { BottomSheet } from '../ui/BottomSheet';
import {
  Bell,
  CheckCheck,
  Trash2,
  Sparkles,
  ShoppingBag,
  Truck,
  CheckCircle2,
  MapPin,
  Clock,
  ChevronLeft,
} from 'lucide-react';
import { SmartNotification } from '../../types/notification.types';
import { useNotifications } from '../../hooks/useNotifications';
import { formatTimeAgoArabic } from '../../services/notification.utils';
import { useModalBackHandler } from '../../hooks/useModalBackHandler';

interface NotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotificationAction?: (actionType: string) => void;
}

export const NotificationsSheet: React.FC<NotificationsSheetProps> = ({
  isOpen,
  onClose,
  onSelectNotificationAction,
}) => {
  useModalBackHandler(isOpen, onClose, 'notifications');
  const {
    notificationHistory: notifications,
    unreadCount,
    markAllNotificationsRead,
    clearAllNotifications,
    handleNotificationAction,
  } = useNotifications();

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  const handleClearAll = () => {
    clearAllNotifications();
  };

  const handleNotificationClick = (item: SmartNotification) => {
    handleNotificationAction(item);
    if (onSelectNotificationAction) {
      onSelectNotificationAction(item.type);
    }
    onClose();
  };

  const getIcon = (type: SmartNotification['type']) => {
    switch (type) {
      case 'order_completed':
        return <Truck className="w-4 h-4 text-emerald-400" />;
      case 'cart_add':
      case 'abandoned_cart':
        return <ShoppingBag className="w-4 h-4 text-amber-400" />;
      case 'branch_remembered':
        return <MapPin className="w-4 h-4 text-sky-400" />;
      case 'product_dwell':
        return <Clock className="w-4 h-4 text-rose-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#D4AF37]" />;
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="مركز الإشعارات والتنبيهات الذكية"
      subtitle="تنبيهات مخصصة مبنية على حركاتك الفعلية بالسلة والمنتجات"
    >
      <div className="space-y-4 text-right dir-rtl">
        {/* Actions Bar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between pb-2 border-b border-[#2C1F16]">
            {unreadCount > 0 ? (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 text-xs text-[#F4E08B] hover:underline font-bold cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>تحديد الكل كُمقروء</span>
              </button>
            ) : (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>جميع الإشعارات مقروءة</span>
              </span>
            )}

            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 text-xs text-[#8E8373] hover:text-rose-400 transition-colors cursor-pointer mr-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح الإشعارات</span>
            </button>
          </div>
        )}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#1C120A] border border-[#3D2C1E] flex items-center justify-center text-[#8E8373]">
              <Bell className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#FFF1C5]">لا توجد إشعارات حالياً</h4>
              <p className="text-xs text-[#8E8373] max-w-xs leading-relaxed font-medium">
                تظهر الإشعارات الذكية عند إضافة منتجات للسلة، عدم اكتمال الطلب، أو وجود عروض مخصصة لك.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] sm:max-h-[420px] overflow-y-auto custom-scrollbar pr-2 pl-1 pb-4">
            {notifications.map((item, idx) => (
              <motion.div
                key={`${item.id}-${idx}`}
                whileHover={{ scale: 0.98 }}
                onClick={() => handleNotificationClick(item)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col gap-2 ${
                  !item.isRead
                    ? 'bg-[#1A120B] border-[#D4AF37]/60 shadow-[0_4px_15px_rgba(212,175,55,0.1)]'
                    : 'bg-[#140D09] border-[#2A1E16] opacity-80 hover:opacity-100 hover:border-[#D4AF37]/30'
                }`}
              >
                {!item.isRead && (
                  <span className="absolute top-4 left-4 w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse gold-glow-sm" />
                )}

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2D1F14] border border-[#3D2C1E] flex items-center justify-center shrink-0 text-[#D4AF37]">
                    {getIcon(item.type)}
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1 mt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#FFF1C5] font-heading leading-tight pt-0.5">
                        {item.titleAr}
                      </h4>
                      <span className="text-[10px] text-[#8E8373] shrink-0 font-medium">
                        {formatTimeAgoArabic(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-[#C8BFB0] opacity-90 leading-relaxed font-medium">
                      {item.descriptionAr}
                    </p>
                  </div>
                </div>

                {item.action ? (
                  <div className="pt-2 mt-1 border-t border-[#3D2C1E]/50 flex items-center justify-end">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37]/10 to-[#F4E08B]/10 border border-[#D4AF37]/30 text-xs font-bold text-[#F4E08B] hover:bg-[#D4AF37]/20 transition-all shadow-sm">
                      <span>{item.action.labelAr}</span>
                      <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  </div>
                ) : (item.type === 'abandoned_cart' || item.type === 'cart_add' || item.type === 'welcome_back') ? (
                  <div className="pt-2 mt-1 border-t border-[#3D2C1E]/50 flex items-center justify-end">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37]/10 to-[#F4E08B]/10 border border-[#D4AF37]/30 text-xs font-bold text-[#F4E08B] hover:bg-[#D4AF37]/20 transition-all shadow-sm">
                      <span>عرض السلة وإكمال الطلب</span>
                      <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  </div>
                ) : null}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
