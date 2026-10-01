/**
 * NotificationContext
 * React Context defining types and state interface for the Smart Notification System.
 */

import { createContext } from 'react';
import { SmartNotification, NotificationEventLog } from '../types/notification.types';

export interface NotificationContextType {
  permissionStatus: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<NotificationPermission | 'unsupported'>;

  // Active Interactive Toasts / Popups
  activeToastNotif: SmartNotification | null;
  dismissToastNotif: () => void;

  // Scenario 5: Cart Exit Confirmation Dialog
  isCartExitDialogOpen: boolean;
  openCartExitDialog: () => void;
  confirmCartExitToCheckout: () => void;
  cancelCartExitToShopping: () => void;

  // Scenario 4: Product Dwell Help Prompt
  isProductHelpOpen: boolean;
  activeDwellProductId: string | null;
  confirmAddDwellProductToCart: () => void;
  dismissProductHelp: () => void;

  // Notification History & Unread Count
  notificationHistory: SmartNotification[];
  unreadCount: number;
  handleNotificationAction: (notif: SmartNotification) => void;
  markAllNotificationsRead: () => void;
  clearAllNotifications: () => void;
  getEventLogs: () => NotificationEventLog[];

  // Direct Triggers for App
  notifyProductAdded: (productNameAr: string, productId: string) => void;
  notifyCartItemRemoved: (remainingCount: number, removedNameAr?: string) => void;
  notifyProductModalOpen: (productId: string) => void;
  notifyProductModalClose: () => void;
  notifyOrderPlaced: (orderNumber: string) => void;
  notifyBranchChanged: (branchId: string, branchNameAr: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);
