import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SystemUser, PermissionKey, AppRole, ROLE_PRESETS } from '../types/rbac.types';
import { rbacService } from '../services/rbacService';
import { AdminUser, firebaseAuthService } from '../services/firebaseAuthService';

interface RBACContextType {
  currentUser: SystemUser | null;
  adminAuthUser: AdminUser | null;
  isLoading: boolean;
  isDeactivated: boolean;
  error: string | null;
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  hasAllPermissions: (permissions: PermissionKey[]) => boolean;
  isAdmin: boolean;
  role: AppRole;
  refreshProfile: () => Promise<void>;
}

const RBACContext = createContext<RBACContextType | null>(null);

export const RBACProvider: React.FC<{
  children: React.ReactNode;
  initialAdminUser?: AdminUser | null;
}> = ({ children, initialAdminUser }) => {
  const [adminAuthUser, setAdminAuthUser] = useState<AdminUser | null>(initialAdminUser || null);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeactivated, setIsDeactivated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (user: AdminUser | null) => {
    if (!user) {
      setCurrentUser(null);
      setIsLoading(false);
      setIsDeactivated(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch server profile with permissions
      const profile = await rbacService.fetchCurrentUserProfile();
      setCurrentUser(profile);
      setIsDeactivated(profile.isActive === false);
    } catch (err: any) {
      const errMsg = err?.message || '';
      console.warn('⚠️ [RBACProvider] Profile load note:', errMsg);

      if (errMsg.includes('USER_DEACTIVATED')) {
        setIsDeactivated(true);
        setError('تم تجميد هذا الحساب من قِبل إدارة النظام');
      } else if (user.isAdmin || user.email === 'admin@pamborina.com') {
        // Super Admin fallback in case network error occurred
        setCurrentUser({
          uid: user.uid,
          email: user.email || 'admin@pamborina.com',
          displayName: user.displayName || 'مدير النظام',
          role: 'admin',
          permissions: ['*'],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        setError(errMsg || 'تعذر التحقق من صلاحيات هذا المستخدم');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = firebaseAuthService.onAdminAuthStateChanged((user) => {
      setAdminAuthUser(user);
      loadProfile(user);
    });

    return () => {
      unsubscribe();
    };
  }, [loadProfile]);

  const hasPermission = useCallback(
    (permission: PermissionKey): boolean => {
      if (!currentUser) {
        // If adminAuthUser is super admin, grant
        return Boolean(adminAuthUser?.isAdmin);
      }
      return rbacService.hasPermission(currentUser, permission);
    },
    [currentUser, adminAuthUser]
  );

  const hasAnyPermission = useCallback(
    (permissions: PermissionKey[]): boolean => {
      if (!currentUser) {
        return Boolean(adminAuthUser?.isAdmin);
      }
      return rbacService.hasAnyPermission(currentUser, permissions);
    },
    [currentUser, adminAuthUser]
  );

  const hasAllPermissions = useCallback(
    (permissions: PermissionKey[]): boolean => {
      if (!currentUser) {
        return Boolean(adminAuthUser?.isAdmin);
      }
      return rbacService.hasAllPermissions(currentUser, permissions);
    },
    [currentUser, adminAuthUser]
  );

  const refreshProfile = async () => {
    await loadProfile(adminAuthUser);
  };

  const isAdmin = Boolean(currentUser?.role === 'admin' || adminAuthUser?.isAdmin);
  const role: AppRole = currentUser?.role || (isAdmin ? 'admin' : 'viewer');

  return (
    <RBACContext.Provider
      value={{
        currentUser,
        adminAuthUser,
        isLoading,
        isDeactivated,
        error,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
        role,
        refreshProfile,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
};

export const useRBAC = (): RBACContextType => {
  const context = useContext(RBACContext);
  if (!context) {
    return {
      currentUser: null,
      adminAuthUser: null,
      isLoading: false,
      isDeactivated: false,
      error: null,
      hasPermission: () => true,
      hasAnyPermission: () => true,
      hasAllPermissions: () => true,
      isAdmin: true,
      role: 'admin',
      refreshProfile: async () => {},
    };
  }
  return context;
};

/**
 * Visual permission gate component.
 * Renders children only if current user has the required permission.
 */
export const PermissionGuard: React.FC<{
  permission: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, children, fallback = null }) => {
  const { hasPermission } = useRBAC();
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};

/**
 * Visual Badge representing a user's role
 */
export const RoleBadge: React.FC<{ role: AppRole; className?: string }> = ({ role, className = '' }) => {
  const preset = ROLE_PRESETS[role] || ROLE_PRESETS.viewer;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${preset.colorClass} ${className}`}
    >
      {preset.labelAr}
    </span>
  );
};
