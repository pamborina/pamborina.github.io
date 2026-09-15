import React, { useState, useEffect } from 'react';
import { AdminUser, firebaseAuthService } from '../../services/firebaseAuthService';
import { Category, Branch, Product } from '../../types';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { RBACProvider, useRBAC } from '../../context/RBACContext';
import { Loader2, ShieldAlert, LogOut, ArrowRight } from 'lucide-react';

interface AdminRouteProps {
  categories: Category[];
  branches: Branch[];
  products: Product[];
  onBackToStore: () => void;
}

const AuthenticatedAdminContainer: React.FC<AdminRouteProps & {
  adminUser: AdminUser;
  onLogout: () => Promise<void>;
}> = ({
  categories,
  branches,
  products,
  onBackToStore,
  adminUser,
  onLogout,
}) => {
  const { currentUser, isLoading, isDeactivated, error } = useRBAC();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-300 font-sans" dir="rtl">
        <Loader2 className="w-9 h-9 animate-spin text-amber-500 mb-4" />
        <p className="text-sm font-semibold text-neutral-200">جاري التحقق من صلاحيات الحساب ومستوى الوصول...</p>
        <span className="text-xs text-neutral-500 mt-1">بوابة إدارة بامبورينا الموحدة</span>
      </div>
    );
  }

  if (isDeactivated) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 text-neutral-100 font-sans" dir="rtl">
        <div className="max-w-md w-full bg-neutral-900 border border-rose-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center mb-4">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">تم تجميد هذا الحساب</h2>
          <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
            تم إيقاف صلاحية الدخول لهذا الحساب مؤقتاً بواسطة المشرف العام. يرجى التواصل مع إدارة النظام لتفعيل الحساب.
          </p>
          <div className="space-y-3">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all shadow-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج والعودة</span>
            </button>
            <button
              onClick={onBackToStore}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرجوع للمتجر</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !currentUser) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 text-neutral-100 font-sans" dir="rtl">
        <div className="max-w-md w-full bg-neutral-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-4">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">غير مصرح بالدخول</h2>
          <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
            {error || 'هذا الحساب غير مسجل ضمن المستخدمين المصرح لهم بالدخول إلى لوحة التحكم.'}
          </p>
          <div className="space-y-3">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm transition-all shadow-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل خروج والتبديل لحساب آخر</span>
            </button>
            <button
              onClick={onBackToStore}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرجوع للمتجر</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminDashboard
      adminUser={adminUser}
      categories={categories}
      branches={branches}
      initialProducts={products}
      onLogout={onLogout}
      onBackToStore={onBackToStore}
    />
  );
};

export const AdminRoute: React.FC<AdminRouteProps> = ({
  categories,
  branches,
  products,
  onBackToStore,
}) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAdminAuthStateChanged((user) => {
      setAdminUser(user);
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
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-300 font-sans" dir="rtl">
        <Loader2 className="w-9 h-9 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-medium">جاري التحقق من هوية المشرف...</p>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onBackToStore={onBackToStore}
      />
    );
  }

  return (
    <RBACProvider initialAdminUser={adminUser}>
      <AuthenticatedAdminContainer
        categories={categories}
        branches={branches}
        products={products}
        onBackToStore={onBackToStore}
        adminUser={adminUser}
        onLogout={handleLogout}
      />
    </RBACProvider>
  );
};
