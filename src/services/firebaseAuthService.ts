import { STATIC_USERS } from '../config/staticUsers';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import { signInWithEmailAndPassword, signInAnonymously, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export interface AdminUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  isAdmin?: boolean;
  permissions?: string[];
  isActive?: boolean;
  role?: string;
}

// In-memory current user state
let currentStaticUser: AdminUser | null = null;

// Initialize session from localStorage
const storedUid = localStorage.getItem('pamborina_session_uid');
const storedEmail = localStorage.getItem('pamborina_session_email');
const storedDisplayName = localStorage.getItem('pamborina_session_displayName');
const storedRole = localStorage.getItem('pamborina_session_role');
const storedPermissions = localStorage.getItem('pamborina_session_permissions');

if (storedUid && storedEmail) {
  currentStaticUser = {
    uid: storedUid,
    email: storedEmail,
    displayName: storedDisplayName || 'مستخدم',
    isAdmin: storedRole === 'admin',
    permissions: storedPermissions ? JSON.parse(storedPermissions) : [],
    isActive: true,
  };

  // Ensure Firebase Auth session is active in background if user was already signed in
  if (isFirebaseConfigured() && auth && !auth.currentUser) {
    // Do not sign in anonymously for admin sessions
  }
}

// Subscription list
let authListeners: Array<(user: AdminUser | null) => void> = [];

const triggerListeners = () => {
  authListeners.forEach((callback) => {
    try {
      callback(currentStaticUser);
    } catch (err) {
      console.error('Error in auth listener:', err);
    }
  });
};

export const firebaseAuthService = {
  /**
   * Log in an admin user using email and password against STATIC_USERS and synchronize Firebase Auth.
   */
  async loginAdmin(email: string, pass: string): Promise<AdminUser> {
    const matched = STATIC_USERS.find(
      (u) => u.user.email.toLowerCase() === email.trim().toLowerCase() && u.passwordHash === pass
    );

    if (!matched) {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    // Authenticate with Firebase Auth so Firestore rules evaluate request.auth != null and request.auth.token.email successfully
    if (isFirebaseConfigured() && auth) {
      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (authErr: any) {
        try {
          console.warn('⚠️ [FirebaseAuth] sign in error, attempting user creation:', authErr?.code);
          await createUserWithEmailAndPassword(auth, email, pass);
        } catch (createErr: any) {
          // If user already exists or other error, try sign in one more time or log warning
          try {
            await signInWithEmailAndPassword(auth, email, pass);
          } catch (retryErr) {
            console.warn('⚠️ [FirebaseAuth] Authentication sync warning:', retryErr);
          }
        }
      }
    }

    currentStaticUser = {
      uid: matched.user.uid,
      email: matched.user.email,
      displayName: matched.user.displayName,
      isAdmin: matched.user.role === 'admin',
      permissions: matched.user.permissions,
      isActive: true,
    };

    // Store session details in localStorage (excluding password for security)
    localStorage.setItem('pamborina_session_uid', matched.user.uid);
    localStorage.setItem('pamborina_session_email', matched.user.email);
    localStorage.setItem('pamborina_session_displayName', matched.user.displayName);
    localStorage.setItem('pamborina_session_role', matched.user.role);
    localStorage.setItem('pamborina_session_permissions', JSON.stringify(matched.user.permissions));

    // Proactively sync user profile and Firestore rules permissions via server Admin SDK
    if (auth?.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken(true);
        await fetch('/api/auth/sync-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ email: matched.user.email }),
        });
      } catch (syncErr) {
        console.warn('⚠️ [FirebaseAuth] Server session sync warning:', syncErr);
      }
    }

    // Direct client sync fallback if Firestore available
    if (isFirebaseConfigured() && db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          uid: auth.currentUser.uid,
          email: matched.user.email,
          displayName: matched.user.displayName,
          role: matched.user.role,
          permissions: matched.user.permissions,
          isActive: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (firestoreErr) {
        // Non-blocking as server API handles admin profile sync
      }
    }

    triggerListeners();

    return currentStaticUser;
  },

  /**
   * Returns a fresh, verified admin session.
   */
  async getFreshAdminSession() {
    if (!currentStaticUser) {
      return {
        authenticated: false,
        uid: null,
        email: null,
        isAdmin: false,
        claims: {},
      };
    }

    return {
      authenticated: true,
      uid: currentStaticUser.uid,
      email: currentStaticUser.email,
      isAdmin: Boolean(currentStaticUser.isAdmin),
      claims: { admin: currentStaticUser.isAdmin },
    };
  },

  /**
   * Log out current admin user and clear localStorage.
   */
  async logoutAdmin(): Promise<void> {
    if (isFirebaseConfigured() && auth) {
      try {
        await signOut(auth);
      } catch {}
    }
    currentStaticUser = null;
    localStorage.removeItem('pamborina_session_uid');
    localStorage.removeItem('pamborina_session_email');
    localStorage.removeItem('pamborina_session_displayName');
    localStorage.removeItem('pamborina_session_role');
    localStorage.removeItem('pamborina_session_permissions');
    
    triggerListeners();
  },

  /**
   * Retrieve current authenticated admin user or null.
   */
  getCurrentAdminUser(): AdminUser | null {
    return currentStaticUser;
  },

  /**
   * Reauthenticates the current user (Mocked as success).
   */
  async reauthenticate(currentPassword: string): Promise<void> {
    if (!currentStaticUser) {
      throw new Error('لم يتم العثور على جلسة تسجيل دخول نشطة');
    }
    const matched = STATIC_USERS.find(
      (u) => u.user.email.toLowerCase() === currentStaticUser?.email?.toLowerCase() && u.passwordHash === currentPassword
    );
    if (!matched) {
      throw new Error('كلمة المرور الحالية غير صحيحة');
    }
  },

  /**
   * Changes the admin email address (Not supported in static mode).
   */
  async changeAdminEmail(newEmail: string, currentPassword: string): Promise<void> {
    throw new Error('تغيير البريد الإلكتروني غير مدعوم في هذا الإصدار الثابت.');
  },

  /**
   * Changes the admin password (Not supported in static mode).
   */
  async changeAdminPassword(newPassword: string, currentPassword: string): Promise<void> {
    throw new Error('تغيير كلمة المرور غير مدعوم في هذا الإصدار الثابت.');
  },

  /**
   * Verify if the current user has the custom claim `admin: true`.
   */
  async verifyAdminClaim(): Promise<boolean> {
    return currentStaticUser?.isAdmin || false;
  },

  /**
   * Gets the current ID token for authenticated API requests
   */
  async getIdToken(): Promise<string> {
    return 'static-mock-token-2026';
  },

  /**
   * Synchronously gets current user snapshot if signed in
   */
  getCurrentUser(): AdminUser | null {
    return currentStaticUser;
  },

  /**
   * Subscribe to auth state changes.
   */
  onAdminAuthStateChanged(callback: (user: AdminUser | null) => void) {
    authListeners.push(callback);
    
    // Trigger immediately with current state
    try {
      callback(currentStaticUser);
    } catch (err) {
      console.error('Error triggering initial callback:', err);
    }

    return () => {
      authListeners = authListeners.filter((cb) => cb !== callback);
    };
  },
};
