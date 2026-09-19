import { PermissionKey, SystemUser, AppRole, ROLE_PRESETS } from '../types/rbac.types';
import { STATIC_USERS } from '../config/staticUsers';

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
  async getIdToken(): Promise<string> {
    return 'static-mock-token-2026';
  },

  /**
   * Fetch current user's profile and resolved permissions.
   * Read completely from STATIC_USERS via local session details.
   */
  async fetchCurrentUserProfile(): Promise<SystemUser> {
    const storedEmail = localStorage.getItem('pamborina_session_email');
    if (!storedEmail) {
      throw new Error('لم يتم العثور على جلسة مستخدم نشطة');
    }
    const matched = STATIC_USERS.find(
      (s) => s.user.email.toLowerCase() === storedEmail.toLowerCase()
    );
    if (!matched) {
      throw new Error('جلسة المستخدم غير صالحة');
    }
    return matched.user;
  },

  /**
   * Fetch all registered users in the system (Read from static list).
   */
  async fetchAllUsers(): Promise<SystemUser[]> {
    return STATIC_USERS.map((s) => s.user);
  },

  /**
   * Create user is disabled since users are static.
   */
  async createUser(payload: {
    email: string;
    password?: string;
    displayName: string;
    role: AppRole;
    permissions: PermissionKey[];
    branchId?: string;
  }): Promise<SystemUser> {
    throw new Error('إضافة مستخدمين جدد معطلة في هذا الإصدار الثابت المدمج بالكود.');
  },

  /**
   * Update user is disabled.
   */
  async updateUser(payload: {
    uid: string;
    displayName: string;
    role: AppRole;
    permissions: PermissionKey[];
    branchId?: string;
  }): Promise<SystemUser> {
    throw new Error('تعديل الحسابات معطل في هذا الإصدار الثابت المدمج بالكود.');
  },

  /**
   * Toggle user active status is disabled.
   */
  async toggleUserStatus(uid: string, isActive: boolean): Promise<void> {
    throw new Error('تعديل حالة الحسابات معطل في هذا الإصدار الثابت المدمج بالكود.');
  },

  /**
   * Reset user password is disabled.
   */
  async resetUserPassword(uid: string, newPassword: string): Promise<void> {
    throw new Error('إعادة تعيين كلمات المرور معطلة في هذا الإصدار الثابت المدمج بالكود.');
  },

  /**
   * Delete user is disabled.
   */
  async deleteUser(uid: string): Promise<void> {
    throw new Error('حذف الحسابات معطل في هذا الإصدار الثابت المدمج بالكود.');
  },

  /**
   * Get default permissions for a role preset.
   */
  getDefaultPermissionsForRole(role: AppRole): PermissionKey[] {
    const preset = ROLE_PRESETS[role];
    return preset ? [...preset.defaultPermissions] : [];
  },
};
