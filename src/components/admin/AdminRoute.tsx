import React, { useState, useEffect } from 'react';
import { AdminUser, firebaseAuthService } from '../../services/firebaseAuthService';
import { Category, Branch, Product } from '../../types';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  categories: Category[];
  branches: Branch[];
  products: Product[];
  onBackToStore: () => void;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({
  categories,
  branches,
  products,
  onBackToStore,
}) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Subscribe to Firebase Auth and check admin claim
  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAdminAuthStateChanged((user) => {
      if (user && user.isAdmin) {
        setAdminUser(user);
      } else {
        setAdminUser(null);
      }
      setCheckingAuth(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (user: AdminUser) => {
    setAdminUser(user);
  };

  const handleLogout = async () => {
    await firebaseAuthService.logoutAdmin();
    setAdminUser(null);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-neutral-300 font-sans" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-medium">جاري التحقق من صلاحيات المشرف...</p>
      </div>
    );
  }

  if (!adminUser || !adminUser.isAdmin) {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onBackToStore={onBackToStore}
      />
    );
  }

  return (
    <AdminDashboard
      adminUser={adminUser}
      categories={categories}
      branches={branches}
      initialProducts={products}
      onLogout={handleLogout}
      onBackToStore={onBackToStore}
    />
  );
};
