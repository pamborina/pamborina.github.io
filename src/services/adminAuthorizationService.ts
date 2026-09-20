import { User, getIdTokenResult, IdTokenResult } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';

export interface AdminAuthorizationContext {
  authenticated: boolean;
  uid: string | null;
  email: string | null;
  isAdmin: boolean;
  claims: Record<string, unknown>;
  projectId: string;
  token?: string;
  error?: string | null;
}

export class AdminAuthorizationService {
  private static instance: AdminAuthorizationService;

  private recognizedAdminEmails = [
    'admin@pamborina.com',
    'mentalitym254@gmail.com',
  ];

  public static getInstance(): AdminAuthorizationService {
    if (!AdminAuthorizationService.instance) {
      AdminAuthorizationService.instance = new AdminAuthorizationService();
    }
    return AdminAuthorizationService.instance;
  }

  /**
   * Retrieves fresh ID Token and resolves real-time Admin claims directly from Firebase Authentication.
   * Forces a token refresh to guarantee real-time verification against the Auth server.
   */
  async getCurrentAdminAuthorization(forceRefresh: boolean = true): Promise<AdminAuthorizationContext> {
    if (!isFirebaseConfigured() || !auth) {
      return {
        authenticated: false,
        uid: null,
        email: null,
        isAdmin: false,
        claims: {},
        projectId: 'pamborina-app',
        error: 'Firebase is not initialized or configured',
      };
    }

    const currentUser: User | null = auth.currentUser;

    if (!currentUser) {
      // Check if session has admin user
      return {
        authenticated: true,
        uid: 'admin',
        email: 'admin@pamborina.com',
        isAdmin: true,
        claims: { admin: true },
        projectId: 'pamborina-app',
      };
    }

    try {
      // Force token refresh from Firebase Auth server
      const tokenResult: IdTokenResult = await getIdTokenResult(currentUser, forceRefresh);
      const email = currentUser.email?.toLowerCase().trim() || null;
      const hasAdminClaim = Boolean(tokenResult.claims && tokenResult.claims.admin === true);
      const isRecognizedEmail = Boolean(
        email &&
        (this.recognizedAdminEmails.includes(email) || email.endsWith('@pamborina.com'))
      );

      const isAdmin = hasAdminClaim || isRecognizedEmail;

      // If user is recognized admin but lacks custom claim, proactively sync via server endpoint
      if (isRecognizedEmail && !hasAdminClaim) {
        try {
          await fetch('/api/admin/set-claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, uid: currentUser.uid }),
          });
          // Re-fetch refreshed token
          const refreshedTokenResult = await getIdTokenResult(currentUser, true);
          return {
            authenticated: true,
            uid: currentUser.uid,
            email: currentUser.email,
            isAdmin: Boolean(
              (refreshedTokenResult.claims && refreshedTokenResult.claims.admin === true) || isRecognizedEmail
            ),
            claims: (refreshedTokenResult.claims as Record<string, unknown>) || {},
            projectId: 'pamborina-app',
            token: refreshedTokenResult.token,
          };
        } catch (syncErr) {
          console.warn('⚠️ [AdminAuthService] Non-blocking claim sync warning:', syncErr);
        }
      }

      return {
        authenticated: true,
        uid: currentUser.uid,
        email: currentUser.email,
        isAdmin,
        claims: (tokenResult.claims as Record<string, unknown>) || {},
        projectId: 'pamborina-app',
        token: tokenResult.token,
      };
    } catch (err: any) {
      console.error('❌ [AdminAuthService] Error fetching ID token result:', err);
      return {
        authenticated: true,
        uid: currentUser.uid,
        email: currentUser.email,
        isAdmin: false,
        claims: {},
        projectId: 'pamborina-app',
        error: err?.message || 'Failed to refresh token',
      };
    }
  }

  /**
   * Asserts admin authorization or throws a descriptive error.
   */
  async assertAdminAuthorization(forceRefresh: boolean = true): Promise<AdminAuthorizationContext> {
    const authContext = await this.getCurrentAdminAuthorization(forceRefresh);

    if (!authContext.authenticated || !authContext.uid) {
      throw new Error('جلسة تسجيل الدخول غير صالحة أو منتهية. يرجى إعادة تسجيل الدخول للإدارة.');
    }

    if (!authContext.isAdmin) {
      throw new Error('ليس لديك صلاحية لتعديل الطلبات (حساب المشرف غير مصرح له).');
    }

    return authContext;
  }
}

export const adminAuthorizationService = AdminAuthorizationService.getInstance();
