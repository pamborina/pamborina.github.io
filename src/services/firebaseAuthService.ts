import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getIdTokenResult,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
  AuthError,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { auditLogService } from './auditLogService';

export interface AdminUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  isAdmin?: boolean;
}

export const firebaseAuthService = {
  /**
   * Log in an admin user using email and password.
   * Note: Client-side check of claims is only a UX convenience.
   * Actual authorization is strictly enforced on Firestore/Storage via Security Rules.
   */
  async loginAdmin(email: string, pass: string): Promise<AdminUser> {
    if (!isFirebaseConfigured() || !auth) {
      throw new Error('Firebase Authentication is not configured or initialized');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      
      // Check token custom claims (force refresh to ensure latest claims)
      const tokenResult = await getIdTokenResult(user, true);
      const isRecognizedEmail = user.email?.toLowerCase() === 'admin@pamborina.com' || user.email?.toLowerCase() === 'mentalitym254@gmail.com';
      let isAdmin = Boolean((tokenResult.claims && tokenResult.claims.admin === true) || isRecognizedEmail);

      // If user is recognized admin but lacks custom claim, request server assignment
      if (isRecognizedEmail && !(tokenResult.claims && tokenResult.claims.admin === true)) {
        try {
          await fetch('/api/admin/set-claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
          });
          // Refresh token after claim assignment
          await getIdTokenResult(user, true);
        } catch {
          // non-blocking
        }
      }

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        isAdmin,
      };
    } catch (err: any) {
      const authErr = err as AuthError;
      console.warn('⚠️ [Firebase Auth] Login failed:', authErr.code, authErr.message);
      throw new Error(authErr.message || 'فشل تسجيل الدخول. يرجى التأكد من البريد الإلكتروني وكلمة المرور.');
    }
  },

  /**
   * Returns a fresh, verified admin session with fresh ID token result.
   */
  async getFreshAdminSession(): Promise<{
    authenticated: boolean;
    uid: string | null;
    email: string | null;
    isAdmin: boolean;
    claims: Record<string, unknown>;
  }> {
    if (!isFirebaseConfigured() || !auth || !auth.currentUser) {
      return {
        authenticated: false,
        uid: null,
        email: null,
        isAdmin: false,
        claims: {},
      };
    }

    try {
      const user = auth.currentUser;
      const tokenResult = await getIdTokenResult(user, true);
      const isRecognizedEmail =
        user.email?.toLowerCase() === 'admin@pamborina.com' ||
        user.email?.toLowerCase() === 'mentalitym254@gmail.com' ||
        user.email?.toLowerCase().endsWith('@pamborina.com');

      const isAdmin = Boolean(
        (tokenResult.claims && tokenResult.claims.admin === true) || isRecognizedEmail
      );

      return {
        authenticated: true,
        uid: user.uid,
        email: user.email ?? null,
        isAdmin,
        claims: (tokenResult.claims as Record<string, unknown>) || {},
      };
    } catch (err) {
      console.warn('⚠️ [FirebaseAuthService] Failed to get fresh admin session:', err);
      return {
        authenticated: true,
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        isAdmin: false,
        claims: {},
      };
    }
  },

  /**
   * Log out current admin user.
   */
  async logoutAdmin(): Promise<void> {
    if (!isFirebaseConfigured() || !auth) {
      return;
    }
    await signOut(auth);
  },

  /**
   * Retrieve current authenticated admin user or null.
   */
  getCurrentAdminUser(): AdminUser | null {
    if (!isFirebaseConfigured() || !auth || !auth.currentUser) {
      return null;
    }
    const u = auth.currentUser;
    return {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
    };
  },

  /**
   * Reauthenticates the current admin user with their current password.
   */
  async reauthenticate(currentPassword: string): Promise<void> {
    if (!auth?.currentUser || !auth.currentUser.email) {
      throw new Error('لم يتم العثور على جلسة تسجيل دخول نشطة');
    }

    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
  },

  /**
   * Changes the admin email address using Firebase Authentication.
   */
  async changeAdminEmail(newEmail: string, currentPassword: string): Promise<void> {
    if (!auth?.currentUser) {
      throw new Error('لم يتم العثور على مستخدم مسجل');
    }

    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('يرجى إدخال بريد إلكتروني صالح');
    }

    try {
      // First reauthenticate with current password to satisfy security requirement
      await this.reauthenticate(currentPassword);

      const oldEmail = auth.currentUser.email || '';
      await updateEmail(auth.currentUser, cleanEmail);

      // Refresh token
      await getIdTokenResult(auth.currentUser, true);

      // Re-assign admin claim if server endpoint is reachable
      try {
        await fetch('/api/admin/set-claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
      } catch {
        // non-blocking
      }

      await auditLogService.logAdminAction({
        action: 'change_credentials',
        targetType: 'account',
        targetId: auth.currentUser.uid,
        summaryAr: `تم تغيير البريد الإلكتروني للمسؤول من (${oldEmail}) إلى (${cleanEmail})`,
      });

      console.log(`✅ [Firebase Auth] Admin email updated to: ${cleanEmail}`);
    } catch (err: any) {
      console.error('❌ [Firebase Auth] Failed to update email:', err);
      if (err?.code === 'auth/requires-recent-login' || err?.code === 'auth/wrong-password') {
        throw new Error('كلمة المرور الحالية غير صحيحة أو يلزم إعادة تسجيل الدخول');
      }
      throw new Error(err?.message || 'فشل تحديث البريد الإلكتروني');
    }
  },

  /**
   * Changes the admin password using Firebase Authentication.
   */
  async changeAdminPassword(newPassword: string, currentPassword: string): Promise<void> {
    if (!auth?.currentUser) {
      throw new Error('لم يتم العثور على مستخدم مسجل');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل');
    }

    try {
      // Reauthenticate with current password
      await this.reauthenticate(currentPassword);

      await updatePassword(auth.currentUser, newPassword);

      await auditLogService.logAdminAction({
        action: 'change_credentials',
        targetType: 'account',
        targetId: auth.currentUser.uid,
        summaryAr: 'تم تغيير كلمة مرور حساب المسؤول بنجاح',
      });

      console.log('✅ [Firebase Auth] Admin password updated successfully.');
    } catch (err: any) {
      console.error('❌ [Firebase Auth] Failed to update password:', err);
      if (err?.code === 'auth/requires-recent-login' || err?.code === 'auth/wrong-password') {
        throw new Error('كلمة المرور الحالية غير صحيحة');
      }
      throw new Error(err?.message || 'فشل تحديث كلمة المرور');
    }
  },

  /**
   * Verify if the current user has the custom claim `admin: true`.
   * Forces a token refresh to guarantee real-time claim validation.
   */
  async verifyAdminClaim(forceRefresh = true): Promise<boolean> {
    if (!isFirebaseConfigured() || !auth || !auth.currentUser) {
      return false;
    }
    try {
      const tokenResult = await getIdTokenResult(auth.currentUser, forceRefresh);
      return Boolean(tokenResult.claims && tokenResult.claims.admin === true);
    } catch (err) {
      console.warn('⚠️ [Firebase Auth] Failed to verify custom claims:', err);
      return false;
    }
  },

  /**
   * Subscribe to auth state changes and verify admin claims.
   */
  onAdminAuthStateChanged(callback: (user: AdminUser | null) => void) {
    if (!isFirebaseConfigured() || !auth) {
      callback(null);
      return () => {};
    }

    return onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const tokenResult = await getIdTokenResult(user, true);
          const isRecognizedEmail = user.email?.toLowerCase() === 'admin@pamborina.com' || user.email?.toLowerCase() === 'mentalitym254@gmail.com';
          const isAdmin = Boolean((tokenResult.claims && tokenResult.claims.admin === true) || isRecognizedEmail);
          callback({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            isAdmin,
          });
        } catch {
          const isRecognizedEmail = user.email?.toLowerCase() === 'admin@pamborina.com' || user.email?.toLowerCase() === 'mentalitym254@gmail.com';
          callback({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            isAdmin: isRecognizedEmail,
          });
        }
      } else {
        callback(null);
      }
    });
  },
};
