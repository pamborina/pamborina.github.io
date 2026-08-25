import React, { useState } from 'react';
import { firebaseAuthService, AdminUser } from '../../services/firebaseAuthService';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';

interface AdminLoginProps {
  onLoginSuccess: (user: AdminUser) => void;
  onBackToStore: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToStore }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Sanitize input to eliminate hidden characters, zero-width spaces, or accidental copy-paste artifacts
    const cleanEmail = email
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .trim()
      .toLowerCase();

    const cleanPassword = password
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/^\s+|\s+$/g, '');

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Authenticate with Firebase Email/Password
      const user = await firebaseAuthService.loginAdmin(cleanEmail, cleanPassword);

      // 2. Verify admin custom claim (admin === true)
      if (!user.isAdmin) {
        // Immediate sign out and access revocation
        await firebaseAuthService.logoutAdmin();
        setErrorMessage('هذا الحساب غير مصرح له بالدخول إلى لوحة التحكم (صلاحية Admin غير مفعّلة).');
        return;
      }

      // 3. Authorized Admin
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Login error:', err);
      const code = err?.code || '';
      const rawMsg = String(err?.message || '');
      if (code === 'auth/invalid-credential' || rawMsg.includes('invalid-credential') || rawMsg.includes('INVALID_LOGIN_CREDENTIALS')) {
        setErrorMessage('البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من كتابة البريد وكلمة المرور بدقة.');
      } else if (code === 'auth/user-not-found' || rawMsg.includes('user-not-found')) {
        setErrorMessage('حساب المشرف غير مسجل.');
      } else if (code === 'auth/wrong-password' || rawMsg.includes('wrong-password')) {
        setErrorMessage('كلمة المرور غير صحيحة.');
      } else if (code === 'auth/too-many-requests' || rawMsg.includes('too-many-requests')) {
        setErrorMessage('تم حظر المحاولات مؤقتاً لكثرة المحاولات الخاطئة. يرجى الانتظار دقيقة والمحاولة مجدداً.');
      } else {
        setErrorMessage(rawMsg || 'فشل تسجيل الدخول. يرجى التحقق من صحة البيانات.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-neutral-100 font-sans" dir="rtl">
      {/* Top Bar / Back to Store */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-6">
        <button
          onClick={onBackToStore}
          type="button"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-amber-400 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة إلى متجر بامبورينا
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            لوحة إدارة بامبورينا
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            بوابة الإدارة المركزية والتحكم في قائمة الطعام والفروع
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-neutral-800/80 backdrop-blur-md border border-neutral-700/60 rounded-2xl shadow-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-200 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                البريد الإلكتروني للإدارة
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-neutral-900/80 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm transition-all"
                  dir="ltr"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pr-10 pl-10 py-2.5 rounded-xl bg-neutral-900/80 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm transition-all"
                  dir="ltr"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400 hover:text-amber-400 transition-colors"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحقق من الصلاحيات...</span>
                  </>
                ) : (
                  <span>تسجيل الدخول للإدارة</span>
                )}
              </Button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-neutral-700/60 text-center">
            <p className="text-xs text-neutral-500 leading-relaxed">
              محمي بقواعد أمان النظام وتشفير خادم الأمان.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
