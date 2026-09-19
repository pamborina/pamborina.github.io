import { SystemUser, ROLE_PRESETS } from '../types/rbac.types';

export interface StaticUserDefinition {
  user: SystemUser;
  passwordHash: string; // The plain password since it's required as static hardcoded in code
}

export const STATIC_USERS: StaticUserDefinition[] = [
  {
    user: {
      uid: 'static-admin-uid-2026',
      email: 'admin@pamborina.com',
      displayName: 'مدير النظام الرئيسي',
      role: 'admin',
      permissions: ROLE_PRESETS.admin.defaultPermissions,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    passwordHash: 'PamborinaAdmin2026@HOOK'
  },
  {
    user: {
      uid: 'static-employee-uid-2026',
      email: 'mo250@gmail.com',
      displayName: 'الموظف المسئول (تشغيل الطلبات والتسويات)',
      role: 'employee',
      permissions: [
        'orders.view',
        'orders.create',
        'orders.edit',
        'orders.update_status',
        'orders.delete',
        'orders.bulk_delete',
        'orders.print',
        'orders.assign_driver',
        'drivers.view',
        'drivers.manage',
        'drivers.settle',
        'reports.export',
        'audit.view',
      ],
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    passwordHash: '123456er'
  }
];
