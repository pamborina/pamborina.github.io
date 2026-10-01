import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Shield,
  Key,
  Lock,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Check,
  X,
  Clock,
  Mail,
  User,
  Power,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SystemUser,
  PermissionKey,
  AppRole,
  ROLE_PRESETS,
  PERMISSION_DEFINITIONS,
  PERMISSION_CATEGORIES,
} from '../../../types/rbac.types';
import { rbacService } from '../../../services/rbacService';
import { useRBAC, RoleBadge } from '../../../context/RBACContext';
import { useToast } from '../../ui/Toast';
import { PasswordInput } from '../../ui/PasswordInput';

export const AdminUsersTab: React.FC = () => {
  const { currentUser, hasPermission, isAdmin } = useRBAC();
  const { showToast } = useToast();

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<SystemUser | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState<string>('');
  const [confirmNewPasswordValue, setConfirmNewPasswordValue] = useState<string>('');
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form state for Create / Edit
  const [formDisplayName, setFormDisplayName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formConfirmPassword, setFormConfirmPassword] = useState<string>('');
  const [formRole, setFormRole] = useState<AppRole>('cashier');
  const [formPermissions, setFormPermissions] = useState<PermissionKey[]>([]);
  const [formBranchId, setFormBranchId] = useState<string>('');
  const [expandedCategory, setExpandedCategory] = useState<string>('orders');

  const canCreate = false;
  const canEdit = false;
  const canDelete = false;

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await rbacService.fetchAllUsers();
      setUsers(list);
    } catch (err: any) {
      showToast(err?.message || 'فشل تحميل قائمة المستخدمين', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !searchTerm.trim() ||
        u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive !== false) ||
        (statusFilter === 'suspended' && u.isActive === false);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive !== false).length;
    const suspended = total - active;
    const adminsCount = users.filter((u) => u.role === 'admin').length;
    return { total, active, suspended, adminsCount };
  }, [users]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormDisplayName('');
    setFormEmail('');
    setFormPassword('');
    setFormConfirmPassword('');
    setFormRole('cashier');
    setFormPermissions(rbacService.getDefaultPermissionsForRole('cashier'));
    setFormBranchId('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: SystemUser) => {
    setEditingUser(user);
    setFormDisplayName(user.displayName);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormPermissions(user.permissions || []);
    setFormBranchId(user.branchId || '');
  };

  // Handle Preset Selection in Form
  const handleRolePresetChange = (newRole: AppRole) => {
    setFormRole(newRole);
    const defaults = rbacService.getDefaultPermissionsForRole(newRole);
    setFormPermissions(defaults);
  };

  // Toggle single permission checkbox
  const handleTogglePermission = (key: PermissionKey) => {
    if (formRole === 'admin') return; // Admins automatically possess all
    setFormPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  // Toggle all permissions for a specific category
  const handleToggleCategoryAll = (category: string, selectAll: boolean) => {
    if (formRole === 'admin') return;
    const categoryKeys = PERMISSION_DEFINITIONS.filter((p) => p.category === category).map(
      (p) => p.key
    );

    if (selectAll) {
      setFormPermissions((prev) => Array.from(new Set([...prev, ...categoryKeys])));
    } else {
      setFormPermissions((prev) => prev.filter((k) => !categoryKeys.includes(k)));
    }
  };

  // Submit Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDisplayName.trim() || !formEmail.trim()) {
      showToast('يرجى ملء كافة الحقول الإلزامية', 'warning');
      return;
    }
    if (!formPassword || formPassword.length < 6) {
      showToast('يجب ألا تقل كلمة المرور عن 6 أحرف', 'warning');
      return;
    }
    if (formPassword !== formConfirmPassword) {
      showToast('كلمتا المرور غير متطابقتين', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await rbacService.createUser({
        displayName: formDisplayName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword,
        role: formRole,
        permissions: formRole === 'admin' ? ['*'] : formPermissions,
        branchId: formBranchId,
      });

      showToast(`تم إنشاء حساب المستخدم "${formDisplayName}" بنجاح`, 'success');
      setIsCreateModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      showToast(err?.message || 'فشل إنشاء الحساب', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!formDisplayName.trim()) {
      showToast('اسم المستخدم مطلوب', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await rbacService.updateUser({
        uid: editingUser.uid,
        displayName: formDisplayName.trim(),
        role: formRole,
        permissions: formRole === 'admin' ? ['*'] : formPermissions,
        branchId: formBranchId,
      });

      showToast(`تم تحديث صلاحيات "${formDisplayName}" بنجاح`, 'success');
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      showToast(err?.message || 'فشل تحديث البيانات', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle user active status
  const handleToggleStatus = async (user: SystemUser) => {
    if (!canEdit) return;
    const newStatus = !user.isActive;
    try {
      await rbacService.toggleUserStatus(user.uid, newStatus);
      showToast(
        newStatus ? `تم تفعيل حساب "${user.displayName}"` : `تم تجميد حساب "${user.displayName}"`,
        newStatus ? 'success' : 'warning'
      );
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, isActive: newStatus } : u))
      );
    } catch (err: any) {
      showToast(err?.message || 'فشل تغيير حالة الحساب', 'error');
    }
  };

  // Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPasswordValue || newPasswordValue.length < 6) {
      showToast('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل', 'warning');
      return;
    }
    if (newPasswordValue !== confirmNewPasswordValue) {
      showToast('كلمتا المرور غير متطابقتين', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await rbacService.resetUserPassword(resetPasswordUser.uid, newPasswordValue);
      showToast(`تم تعيين كلمة المرور الجديدة للمستخدم "${resetPasswordUser.displayName}" بنجاح`, 'success');
      setResetPasswordUser(null);
      setNewPasswordValue('');
      setConfirmNewPasswordValue('');
    } catch (err: any) {
      showToast(err?.message || 'فشل إعادة تعيين كلمة المرور', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete User Submit
  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    try {
      await rbacService.deleteUser(deletingUser.uid);
      showToast(`تم حذف حساب "${deletingUser.displayName}" نهائياً من النظام`, 'success');
      setUsers((prev) => prev.filter((u) => u.uid !== deletingUser.uid));
      setDeletingUser(null);
    } catch (err: any) {
      showToast(err?.message || 'فشل حذف الحساب', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans" dir="rtl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/80 p-5 rounded-2xl border border-neutral-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>إدارة المستخدمين والصلاحيات (RBAC)</span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {stats.total} حساب
              </span>
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              تحكم كامل في طاقم العمل، أدوار الفروع، والصلاحيات التفصيلية لكل مستخدم
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {canCreate && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مستخدم جديد</span>
            </button>
          )}
        </div>
      </div>



      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-xs text-neutral-400 block mb-1">إجمالي المستخدمين</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">{stats.total}</span>
            <Users className="w-4 h-4 text-neutral-500" />
          </div>
        </div>
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-xs text-neutral-400 block mb-1">الحسابات النشطة</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400 font-mono">{stats.active}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-xs text-neutral-400 block mb-1">الحسابات المجمدة</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-400 font-mono">{stats.suspended}</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
        </div>
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-xs text-neutral-400 block mb-1">مديرو النظام (Admins)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-400 font-mono">{stats.adminsCount}</span>
            <Shield className="w-4 h-4 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            className="w-full pl-3 pr-10 py-2 rounded-lg bg-neutral-950 border border-neutral-700/80 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700/80 text-neutral-200 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">كل الأدوار</option>
            <option value="admin">مدير النظام (Admin)</option>
            <option value="manager">مدير تشغيل (Manager)</option>
            <option value="cashier">كاشير (Cashier)</option>
            <option value="kitchen">شيف مطبخ (Kitchen)</option>
            <option value="delivery_coordinator">منسق توصيل</option>
            <option value="viewer">مستعرض (Viewer)</option>
            <option value="custom">مخصص (Custom)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700/80 text-neutral-200 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">كل الحالات</option>
            <option value="active">مفعّل فقط</option>
            <option value="suspended">مجمّد فقط</option>
          </select>
        </div>
      </div>

      {/* Users List Table */}
      <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-neutral-400 text-xs flex flex-col items-center justify-center">
            <RefreshCw className="w-7 h-7 animate-spin text-amber-500 mb-2" />
            <span>جاري تحميل طاقم العمل والصلاحيات...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            <Users className="w-10 h-10 text-neutral-600 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-neutral-300">لا توجد حسابات تطابق معايير البحث</p>
            <p className="text-[11px] text-neutral-500 mt-1">جرّب تغيير كلمات البحث أو المرشحات المطبقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-[11px] font-bold text-neutral-400 bg-neutral-950/50">
                  <th className="py-3.5 px-4">المستخدم</th>
                  <th className="py-3.5 px-4">الدور الوظيفي</th>
                  <th className="py-3.5 px-4">الصلاحيات الممنوحة</th>
                  <th className="py-3.5 px-4 text-center">الحالة</th>
                  <th className="py-3.5 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-xs">
                {filteredUsers.map((u) => {
                  const isCurrent = currentUser?.uid === u.uid;
                  const isSuperDefault = u.email === 'admin@pamborina.com';
                  const isActive = u.isActive !== false;
                  const permCount = u.role === 'admin' ? 'كاملة (*)' : `${u.permissions?.length || 0} صلاحية`;

                  return (
                    <tr
                      key={u.uid}
                      className="hover:bg-neutral-800/30 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs uppercase">
                            {u.displayName.charAt(0) || u.email.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{u.displayName}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  أنت
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-neutral-500" />
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <RoleBadge role={u.role} />
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {permCount}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={!canEdit || isSuperDefault || isCurrent}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                          } ${(!canEdit || isSuperDefault || isCurrent) ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={isActive ? 'انقر للتجميد' : 'انقر للتفعيل'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                          <span>{isActive ? 'نشط' : 'مجمّد'}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
                              title="تعديل الصلاحيات"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canEdit && (
                            <button
                              onClick={() => {
                                setResetPasswordUser(u);
                                setNewPasswordValue('');
                                setConfirmNewPasswordValue('');
                              }}
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 border border-neutral-700 transition-colors"
                              title="إعادة تعيين كلمة المرور"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && !isSuperDefault && !isCurrent && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                              title="حذف الحساب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create User */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 sm:p-6 my-auto text-neutral-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">إضافة مستخدم جديد للنظام</h3>
                  <p className="text-[11px] text-neutral-400">حدد بيانات الدخول والدور الوظيفي والصلاحيات</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    اسم الموظف / المستخدم <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="مثال: أحمد مصطفى - كاشير الفردوس"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    البريد الإلكتروني <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="name@pamborina.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <PasswordInput
                    label="كلمة المرور الابتدائية"
                    required
                    minLength={6}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="6 أحرف على الأقل..."
                    autoComplete="new-password"
                    variant="default"
                  />
                </div>

                <div>
                  <PasswordInput
                    label="تأكيد كلمة المرور"
                    required
                    minLength={6}
                    value={formConfirmPassword}
                    onChange={(e) => setFormConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور..."
                    autoComplete="new-password"
                    variant="default"
                  />
                </div>
              </div>

              {/* Role Preset Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  الدور الوظيفي النموذجي (Role Preset)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(ROLE_PRESETS) as AppRole[]).map((rKey) => {
                    const preset = ROLE_PRESETS[rKey];
                    const isSelected = formRole === rKey;
                    return (
                      <button
                        key={rKey}
                        type="button"
                        onClick={() => handleRolePresetChange(rKey)}
                        className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-xs font-bold block">{preset.labelAr}</span>
                        <span className="text-[10px] text-neutral-400 mt-1 line-clamp-1">
                          {preset.descriptionAr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Permissions Accordion */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-neutral-300">
                    مصفوفة الصلاحيات التفصيلية
                  </label>
                  <span className="text-[11px] text-amber-400 font-mono">
                    {formRole === 'admin' ? 'كامل الصلاحيات (*)' : `${formPermissions.length} صلاحية مفعلة`}
                  </span>
                </div>

                <div className="border border-neutral-800 rounded-xl divide-y divide-neutral-800/80 max-h-64 overflow-y-auto bg-neutral-950/40 p-1">
                  {PERMISSION_CATEGORIES.map((cat) => {
                    const catPerms = PERMISSION_DEFINITIONS.filter((p) => p.category === cat.id);
                    const isExpanded = expandedCategory === cat.id;
                    const activeInCat = catPerms.filter(
                      (p) => formRole === 'admin' || formPermissions.includes(p.key)
                    ).length;

                    return (
                      <div key={cat.id} className="p-2">
                        <div
                          className="flex items-center justify-between cursor-pointer py-1"
                          onClick={() => setExpandedCategory(isExpanded ? '' : cat.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-200">{cat.labelAr}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                              {activeInCat} / {catPerms.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {formRole !== 'admin' && (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCategoryAll(cat.id, true)}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                                >
                                  تحديد الكل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCategoryAll(cat.id, false)}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
                                >
                                  إلغاء
                                </button>
                              </div>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-neutral-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-neutral-400" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-neutral-800/60">
                            {catPerms.map((p) => {
                              const checked = formRole === 'admin' || formPermissions.includes(p.key);
                              return (
                                <label
                                  key={p.key}
                                  className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors ${
                                    checked
                                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                      : 'bg-neutral-900 border-neutral-800/60 text-neutral-400'
                                  } ${formRole === 'admin' ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={formRole === 'admin'}
                                    checked={checked}
                                    onChange={() => handleTogglePermission(p.key)}
                                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-500 bg-neutral-950 border-neutral-700"
                                  />
                                  <div className="text-[11px] leading-tight">
                                    <span className="font-bold block text-white">{p.labelAr}</span>
                                    <span className="text-[10px] text-neutral-400 mt-0.5 block">
                                      {p.descriptionAr}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>إنشاء حساب المستخدم</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User & Permissions */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 sm:p-6 my-auto text-neutral-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">تعديل صلاحيات: {editingUser.displayName}</h3>
                  <p className="text-[11px] text-neutral-400 font-mono">{editingUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  اسم المستخدم / الموظف
                </label>
                <input
                  type="text"
                  required
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Role Preset Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  الدور الوظيفي (Role Preset)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(ROLE_PRESETS) as AppRole[]).map((rKey) => {
                    const preset = ROLE_PRESETS[rKey];
                    const isSelected = formRole === rKey;
                    return (
                      <button
                        key={rKey}
                        type="button"
                        onClick={() => handleRolePresetChange(rKey)}
                        className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-xs font-bold block">{preset.labelAr}</span>
                        <span className="text-[10px] text-neutral-400 mt-1 line-clamp-1">
                          {preset.descriptionAr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Permissions Accordion */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-neutral-300">
                    مصفوفة الصلاحيات
                  </label>
                  <span className="text-[11px] text-amber-400 font-mono">
                    {formRole === 'admin' ? 'كامل الصلاحيات (*)' : `${formPermissions.length} صلاحية مفعلة`}
                  </span>
                </div>

                <div className="border border-neutral-800 rounded-xl divide-y divide-neutral-800/80 max-h-64 overflow-y-auto bg-neutral-950/40 p-1">
                  {PERMISSION_CATEGORIES.map((cat) => {
                    const catPerms = PERMISSION_DEFINITIONS.filter((p) => p.category === cat.id);
                    const isExpanded = expandedCategory === cat.id;
                    const activeInCat = catPerms.filter(
                      (p) => formRole === 'admin' || formPermissions.includes(p.key)
                    ).length;

                    return (
                      <div key={cat.id} className="p-2">
                        <div
                          className="flex items-center justify-between cursor-pointer py-1"
                          onClick={() => setExpandedCategory(isExpanded ? '' : cat.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-200">{cat.labelAr}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                              {activeInCat} / {catPerms.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {formRole !== 'admin' && (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCategoryAll(cat.id, true)}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                                >
                                  تحديد الكل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCategoryAll(cat.id, false)}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
                                >
                                  إلغاء
                                </button>
                              </div>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-neutral-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-neutral-400" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-neutral-800/60">
                            {catPerms.map((p) => {
                              const checked = formRole === 'admin' || formPermissions.includes(p.key);
                              return (
                                <label
                                  key={p.key}
                                  className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors ${
                                    checked
                                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                      : 'bg-neutral-900 border-neutral-800/60 text-neutral-400'
                                  } ${formRole === 'admin' ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={formRole === 'admin'}
                                    checked={checked}
                                    onChange={() => handleTogglePermission(p.key)}
                                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-500 bg-neutral-950 border-neutral-700"
                                  />
                                  <div className="text-[11px] leading-tight">
                                    <span className="font-bold block text-white">{p.labelAr}</span>
                                    <span className="text-[10px] text-neutral-400 mt-0.5 block">
                                      {p.descriptionAr}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري التحديث...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetPasswordUser && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setResetPasswordUser(null)}
        >
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-neutral-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">إعادة تعيين كلمة المرور</h3>
              </div>
              <button
                onClick={() => setResetPasswordUser(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-4">
              تعيين كلمة مرور جديدة للمستخدم <span className="text-amber-300 font-bold">"{resetPasswordUser.displayName}"</span> ({resetPasswordUser.email}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <PasswordInput
                label="كلمة المرور الجديدة (6 أحرف كحد أدنى)"
                required
                minLength={6}
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة..."
                autoComplete="new-password"
                variant="default"
              />

              <PasswordInput
                label="تأكيد كلمة المرور الجديدة"
                required
                minLength={6}
                value={confirmNewPasswordValue}
                onChange={(e) => setConfirmNewPasswordValue(e.target.value)}
                placeholder="أعد إدخال كلمة المرور للتأكيد..."
                autoComplete="new-password"
                variant="default"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordUser(null);
                    setNewPasswordValue('');
                    setConfirmNewPasswordValue('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all cursor-pointer"
                >
                  {isSubmitting ? 'جاري التعيين...' : 'تأكيد التعيين'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingUser && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setDeletingUser(null)}
        >
          <div
            className="w-full max-w-md bg-neutral-900 border border-rose-500/30 rounded-2xl shadow-2xl p-5 sm:p-6 text-neutral-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center text-white mb-2">
              تأكيد حذف حساب المستخدم
            </h3>
            <p className="text-xs text-neutral-400 text-center mb-6 leading-relaxed">
              هل أنت متأكد من حذف الحساب <span className="text-white font-bold">"{deletingUser.displayName}"</span> ({deletingUser.email}) نهائياً من النظام؟ لن يتمكن الموظف من تسجيل الدخول مجدداً.
            </p>

            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all"
              >
                {isSubmitting ? 'جاري الحذف...' : 'نعم، حذف الحساب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
