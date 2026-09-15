import { auth } from '../config/firebase';
import { PermissionKey, SystemUser, AppRole, ROLE_PRESETS } from '../types/rbac.types';

export const rbacService = {
  /**
   * Check if a given user object possesses a specific permission.
   * Super Admins (role === 'admin' or has '*') always have all permissions.
   */
  hasPermission(user: SystemUser | null | undefined, permission: PermissionKey): boolean {
    if (!user) return false;
    if (user.isActive === false) return false;
    if (user.role === 'admin') return true;
    if (!user.permissions || !Array.isArray(user.permissions)) return false;
    if (user.permissions.includes('*')) return true;
    if (user.permissions.includes(permission)) return true;

    // Domain wildcard check (e.g. 'orders.*' matches 'orders.view')
    const [domain] = permission.split('.');
    if (domain && user.permissions.includes(`${domain}.*` as PermissionKey)) {
      return true;
    }

    return false;
  },

  /**
   * Check if user possesses at least one of the given permissions.
   */
  hasAnyPermission(user: SystemUser | null | undefined, permissions: PermissionKey[]): boolean {
    if (!user) return false;
    return permissions.some((p) => this.hasPermission(user, p));
  },

  /**
   * Check if user possesses all of the given permissions.
   */
  hasAllPermissions(user: SystemUser | null | undefined, permissions: PermissionKey[]): boolean {
    if (!user) return false;
    return permissions.every((p) => this.hasPermission(user, p));
  },

  /**
   * Retrieve current authenticated user's ID token.
   */
  async getIdToken(forceRefresh = false): Promise<string> {
    if (!auth || !auth.currentUser) {
      throw new Error('لم يتم العثور على جلسة مستخدم نشطة');
    }
    return await auth.currentUser.getIdToken(forceRefresh);
  },

  /**
   * Fetch current user's profile and resolved permissions from server.
   */
  async fetchCurrentUserProfile(): Promise<SystemUser> {
    const token = await this.getIdToken(true);
    const res = await fetch('/api/admin/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'فشل استرجاع بيانات المستخدم والصلاحيات');
    }

    return data.user as SystemUser;
  },

  /**
   * Fetch all registered users in the system (Requires 'users.view' or Admin).
   */
  async fetchAllUsers(): Promise<SystemUser[]> {
    const token = await this.getIdToken();
    const res = await fetch('/api/admin/users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'فشل جلب قائمة المستخدمين');
    }

    return data.users as SystemUser[];
  },

  /**
   * Create a new user with role and granular permissions.
   */
  async createUser(payload: {
    email: string;
    password?: string;
    displayName: string;
    role: AppRole;
    permissions: PermissionKey[];
    branchId?: string;
  }): Promise<SystemUser> {
    const token = await this.getIdToken();
    const res = await fetch('/api/admin/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'فشل إنشاء حساب المستخدم');
    }

    return data.user as SystemUser;
  },

  /**
   * Update existing user's role, permissions, and details.
   */
  async updateUser(payload: {
    uid: string;
    displayName: string;
    role: AppRole;
    permissions: PermissionKey[];
    branchId?: string;
  }): Promise<SystemUser> {
    const token = await this.getIdToken();
    const res = await fetch('/api/admin/users/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'فشل تحديث بيانات المستخدم');
    }

    return data.user as SystemUser;
  },

  /**
   * Toggle user active status (activate / suspend).
   */
  async toggleUserStatus(uid: string, isActive: boolean): Promise<void> {
    const token = await this.getIdToken();
    const res = await fetch('/api/admin/users/toggle-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid, isActive }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'فشل تغيير حالة تفعيل المستخدم');
    }
  },

  /**
   * Reset user password by Admin.
   */
  async resetUserPassword(uid: string, newPassword: string): Promise<void> {
    const token = await this.getIdToken();
    const res = await fetch('/api/admin/users/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid, newPassword }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'فشل إعادة تعيين كلمة المرور');
    }
  },

  /**
   * Permanently delete user.
   */
  async deleteUser(uid: string): Promise<void> {
    const token = await this.getIdToken();
    const res = await fetch('/api/admin/users/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'فشل حذف حساب المستخدم');
    }
  },

  /**
   * Get default permissions for a role preset.
   */
  getDefaultPermissionsForRole(role: AppRole): PermissionKey[] {
    const preset = ROLE_PRESETS[role];
    return preset ? [...preset.defaultPermissions] : [];
  },
};
