import React, { useState } from 'react';
import { AdminUser, firebaseAuthService } from '../../../services/firebaseAuthService';
import {
  UserCheck,
  ShieldCheck,
  Key,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Terminal,
  Copy,
  Check,
  Server,
  Code2,
} from 'lucide-react';
import { Button } from '../../ui/Button';

interface AdminAccountTabProps {
  adminUser: AdminUser | null;
  onEmailChanged?: (newEmail: string) => void;
}

export const AdminAccountTab: React.FC<AdminAccountTabProps> = ({
  adminUser,
  onEmailChanged,
}) => {
  // Change Email State
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Change Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordCurrentPassword, setPasswordCurrentPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Claim Status Check State
  const [isCheckingClaim, setIsCheckingClaim] = useState(false);
  const [claimStatusResult, setClaimStatusResult] = useState<any>(null);
  const [copiedResult, setCopiedResult] = useState(false);

  // Handle Copy JSON
  const handleCopyResult = () => {
    if (!claimStatusResult) return;
    try {
      navigator.clipboard.writeText(JSON.stringify(claimStatusResult, null, 2));
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted in iframe
    }
  };

  // Handle Change Email
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSuccess(null);
    setEmailError(null);

    if (!newEmail.trim() || !newEmail.includes('@')) {
      setEmailError('يرجى إدخال بريد إلكتروني صالح');
      return;
    }
    if (!emailCurrentPassword) {
      setEmailError('يرجى إدخال كلمة المرور الحالية لتأكيد الهوية');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      await firebaseAuthService.changeAdminEmail(newEmail, emailCurrentPassword);
      setEmailSuccess(`تم تغيير البريد الإلكتروني بنجاح إلى: ${newEmail.trim()}`);
      if (onEmailChanged) onEmailChanged(newEmail.trim());
      setNewEmail('');
      setEmailCurrentPassword('');
    } catch (err: any) {
      setEmailError(err?.message || 'فشل تغيير البريد الإلكتروني');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (!passwordCurrentPassword) {
      setPasswordError('يرجى إدخال كلمة المرور الحالية لتأكيد الهوية');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await firebaseAuthService.changeAdminPassword(newPassword, passwordCurrentPassword);
      setPasswordSuccess('تم تغيير كلمة المرور بنجاح!');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordCurrentPassword('');
    } catch (err: any) {
      setPasswordError(err?.message || 'فشل تغيير كلمة المرور');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Check custom claims on server
  const handleVerifyServerClaim = async () => {
    setIsCheckingClaim(true);
    try {
      const email = adminUser?.email || 'admin@pamborina.com';
      const res = await fetch(`/api/admin/check-claim?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setClaimStatusResult(data);
    } catch (err: any) {
      setClaimStatusResult({ success: false, error: err?.message || 'فشل فحص الخادم' });
    } finally {
      setIsCheckingClaim(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden" dir="rtl">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-amber-400 shrink-0" />
          <span>المستخدم / حساب الإدارة (Admin Account)</span>
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          إدارة بيانات الدخول، تغيير كلمة المرور والبريد الإلكتروني، والتحقق من صلاحيات Firebase Custom Claims.
        </p>
      </div>

      {/* Current Admin Overview */}
      <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 w-full overflow-hidden">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">حساب المشرف المسجل حالياً</h3>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mt-0.5 flex-wrap">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>صلاحية المسؤول مفعلة وموثقة (Admin Claim Active)</span>
              </span>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleVerifyServerClaim}
            disabled={isCheckingClaim}
            variant="outline"
            className="text-xs bg-neutral-900 border-neutral-700 text-neutral-300 hover:text-white shrink-0"
          >
            {isCheckingClaim ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 ml-1 text-amber-400" />
            )}
            <span>فحص الصلاحية في الخادم</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-700 overflow-hidden">
            <span className="text-neutral-400 block mb-1">البريد الإلكتروني:</span>
            <span className="font-mono text-white font-bold text-sm block break-all" dir="ltr">
              {adminUser?.email || 'admin@pamborina.com'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-700 overflow-hidden">
            <span className="text-neutral-400 block mb-1">معرف المستخدم السحابي (UID):</span>
            <span className="font-mono text-neutral-300 text-[11px] block break-all" dir="ltr">
              {adminUser?.uid || 'N/A'}
            </span>
          </div>
        </div>

        {/* Responsive Server Result Box */}
        {claimStatusResult && (
          <div className="p-4 rounded-2xl bg-neutral-950/90 border border-neutral-800 space-y-3 w-full max-w-full overflow-hidden shadow-inner">
            {/* Result Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-neutral-800/80 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Server className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-neutral-300 truncate">
                  استجابة فحص الخادم (Server Validation Result):
                </span>
              </div>

              <div className="flex items-center gap-2">
                {claimStatusResult.isAdmin || claimStatusResult.customClaims?.admin ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>مشرف موثق</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-300 font-bold">
                    <AlertCircle className="w-3 h-3" />
                    <span>استجابة واردة</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  title="نسخ الاستجابة"
                >
                  {copiedResult ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>نسخ</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Badges Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400">حالة المشرف:</span>
                <span className="font-mono font-bold text-emerald-400" dir="ltr">
                  {claimStatusResult.isAdmin !== undefined
                    ? String(claimStatusResult.isAdmin)
                    : claimStatusResult.customClaims?.admin
                    ? 'true'
                    : 'false'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800/80 flex items-center justify-between sm:col-span-2 overflow-hidden">
                <span className="text-neutral-400 shrink-0 ml-2">المعرف (UID):</span>
                <span className="font-mono text-neutral-300 text-[10px] truncate block" dir="ltr">
                  {claimStatusResult.uid || adminUser?.uid || 'N/A'}
                </span>
              </div>
            </div>

            {/* Code Body - Fully Responsive & LTR formatted */}
            <div className="relative rounded-xl bg-black/80 border border-neutral-800/80 p-3 overflow-hidden">
              <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1.5 pb-1 border-b border-neutral-800/60 font-mono">
                <span className="flex items-center gap-1 text-neutral-400">
                  <Code2 className="w-3 h-3 text-amber-400" />
                  JSON Payload
                </span>
                <span>application/json</span>
              </div>
              <pre
                className="font-mono text-[11px] sm:text-xs text-emerald-400 whitespace-pre-wrap break-all overflow-x-auto leading-relaxed select-all"
                dir="ltr"
                style={{ textAlign: 'left', direction: 'ltr' }}
              >
                {JSON.stringify(claimStatusResult, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Change Email & Change Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Email Form */}
        <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-700/60">
              <Mail className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">تغيير البريد الإلكتروني للمسؤول</h3>
            </div>

            {emailError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            {emailSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{emailSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                البريد الإلكتروني الجديد
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="newadmin@pamborina.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                كلمة المرور الحالية (لتأكيد العملية)
              </label>
              <input
                type="password"
                value={emailCurrentPassword}
                onChange={(e) => setEmailCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <Button
              type="submit"
              disabled={isUpdatingEmail}
              className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold py-2.5 rounded-xl"
            >
              {isUpdatingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  <span>جاري تحديث البريد الإلكتروني...</span>
                </>
              ) : (
                <span>حفظ البريد الإلكتروني الجديد</span>
              )}
            </Button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-700/60">
              <Lock className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">تغيير كلمة المرور</h3>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                كلمة المرور الحالية
              </label>
              <input
                type="password"
                value={passwordCurrentPassword}
                onChange={(e) => setPasswordCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                كلمة المرور الجديدة (6 أحرف على الأقل)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1.5 font-semibold">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <Button
              type="submit"
              disabled={isUpdatingPassword}
              className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold py-2.5 rounded-xl"
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  <span>جاري تحديث كلمة المرور...</span>
                </>
              ) : (
                <span>تحديث كلمة المرور</span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

