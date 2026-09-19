export type PermissionKey =
  // Orders
  | 'orders.view'
  | 'orders.update_status'
  | 'orders.edit'
  | 'orders.create'
  | 'orders.assign_driver'
  | 'orders.print'
  | 'orders.delete'
  | 'orders.bulk_delete'
  | 'orders.reset'
  // Products & Menu
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'products.toggle_availability'
  | 'products.delete'
  // Categories
  | 'categories.view'
  | 'categories.manage'
  // Offers & Banners
  | 'offers.view'
  | 'offers.manage'
  // Paper Menu
  | 'paper_menu.view'
  | 'paper_menu.manage'
  // Delivery Drivers
  | 'drivers.view'
  | 'drivers.manage'
  | 'drivers.settle'
  // Branches
  | 'branches.view'
  | 'branches.manage'
  // Analytics & Reports
  | 'analytics.view'
  | 'reports.export'
  // Settings
  | 'settings.view'
  | 'settings.manage'
  // Users & Roles Management
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  // Audit Logs
  | 'audit.view'
  // Wildcard
  | '*';

export type AppRole =
  | 'admin'
  | 'manager'
  | 'cashier'
  | 'kitchen'
  | 'delivery_coordinator'
  | 'viewer'
  | 'custom'
  | 'employee';

export interface PermissionDefinition {
  key: PermissionKey;
  labelAr: string;
  descriptionAr: string;
  category: 'orders' | 'products' | 'drivers' | 'branches' | 'analytics' | 'settings' | 'users' | 'audit';
}

export interface SystemUser {
  uid: string;
  email: string;
  displayName: string;
  role: AppRole;
  permissions: PermissionKey[];
  isActive: boolean;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    uid: string;
    email: string;
  };
  lastLoginAt?: string;
}

export interface RolePreset {
  id: AppRole;
  labelAr: string;
  descriptionAr: string;
  colorClass: string;
  defaultPermissions: PermissionKey[];
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Orders
  {
    key: 'orders.view',
    labelAr: 'عرض الطلبات',
    descriptionAr: 'استعراض قائمة الطلبات وتفاصيل فواتير العملاء',
    category: 'orders',
  },
  {
    key: 'orders.update_status',
    labelAr: 'تحديث مراحل الطلب',
    descriptionAr: 'تغيير حالة الطلب (تأكيد، تجهيز، جاهز، تسليم، إلغاء)',
    category: 'orders',
  },
  {
    key: 'orders.edit',
    labelAr: 'تعديل تفاصيل الطلب',
    descriptionAr: 'تعديل ملاحظات الطلب والعنوان والمندوب المكلف',
    category: 'orders',
  },
  {
    key: 'orders.print',
    labelAr: 'طباعة الفواتير وبونات المطبخ',
    descriptionAr: 'طباعة ريسيت 58 مم وبونات تحضير المطبخ وتصدير الفواتير',
    category: 'orders',
  },
  {
    key: 'orders.delete',
    labelAr: 'حذف الطلب',
    descriptionAr: 'حذف طلب مفرد نهائياً من قاعدة البيانات',
    category: 'orders',
  },
  {
    key: 'orders.bulk_delete',
    labelAr: 'حذف مجمع للطلبات',
    descriptionAr: 'تحديد وحذف عدة طلبات دفعة واحدة',
    category: 'orders',
  },
  {
    key: 'orders.reset',
    labelAr: 'تصفير وأرشفة الطلبات',
    descriptionAr: 'تصفير شامل للطلبات وإعادة ضبط العدادات (إجراء طارئ)',
    category: 'orders',
  },

  // Products
  {
    key: 'products.view',
    labelAr: 'عرض قائمة المنتجات',
    descriptionAr: 'استعراض أصناف المنيو وتفاصيل الأسعار والأقسام',
    category: 'products',
  },
  {
    key: 'products.create',
    labelAr: 'إضافة صنف جديد',
    descriptionAr: 'إنشاء صنف جديد وإضافته إلى قائمة طعام بامبورينا',
    category: 'products',
  },
  {
    key: 'products.edit',
    labelAr: 'تعديل الأصناف والأسعار',
    descriptionAr: 'تعديل الاسم والوصف والأسعار والأحجام والإضافات',
    category: 'products',
  },
  {
    key: 'products.toggle_availability',
    labelAr: 'تفعيل / إيقاف توفر الصنف',
    descriptionAr: 'التحكم السريع في إتاحة الصنف للطلب بالمتجر',
    category: 'products',
  },
  {
    key: 'products.delete',
    labelAr: 'حذف منتج',
    descriptionAr: 'حذف صنف نهائياً من المنيو وقاعدة البيانات',
    category: 'products',
  },

  // Categories
  {
    key: 'categories.view',
    labelAr: 'عرض أقسام المنيو',
    descriptionAr: 'استعراض أقسام المنيو والتصنيفات',
    category: 'products',
  },
  {
    key: 'categories.manage',
    labelAr: 'إدارة أقسام المنيو',
    descriptionAr: 'إضافة وتعديل وترتيب وحذف أقسام المنيو الرئيسية',
    category: 'products',
  },

  // Offers & Paper Menu
  {
    key: 'offers.view',
    labelAr: 'عرض العروض والبانرات',
    descriptionAr: 'استعراض عروض المتجر وبانرات الصفحة الرئيسية',
    category: 'products',
  },
  {
    key: 'offers.manage',
    labelAr: 'إدارة العروض والبانرات',
    descriptionAr: 'إضافة وتعديل عروض الصفحة الرئيسية والخصومات المؤقتة',
    category: 'products',
  },
  {
    key: 'paper_menu.view',
    labelAr: 'استعراض المنيو الورقي',
    descriptionAr: 'استعراض صفحات المنيو الورقي الأصلي',
    category: 'products',
  },
  {
    key: 'paper_menu.manage',
    labelAr: 'إدارة المنيو الورقي المطبوع',
    descriptionAr: 'رفع وتعديل وترتيب صفحات المنيو الورقي الأصلي',
    category: 'products',
  },

  // Drivers
  {
    key: 'drivers.view',
    labelAr: 'عرض المناديب',
    descriptionAr: 'استعراض قائمة مناديب التوصيل وحالاتهم التشغيلية',
    category: 'drivers',
  },
  {
    key: 'drivers.manage',
    labelAr: 'إدارة مناديب التوصيل',
    descriptionAr: 'إضافة وتعديل وتجميد وحذف بيانات المناديب',
    category: 'drivers',
  },
  {
    key: 'drivers.settle',
    labelAr: 'تصفية حسابات المناديب',
    descriptionAr: 'تسجيل التصفية المالية وإدارة المستحقات المتبقية لمناديب التوصيل',
    category: 'drivers',
  },

  // Branches
  {
    key: 'branches.view',
    labelAr: 'عرض الفروع',
    descriptionAr: 'استعراض فروع بامبورينا ومواقعها وأرقامها',
    category: 'branches',
  },
  {
    key: 'branches.manage',
    labelAr: 'إدارة الفروع ورسوم التوصيل',
    descriptionAr: 'تعديل أوقات التشغيل وبيانات الفروع ورسوم الشحن',
    category: 'branches',
  },

  // Analytics
  {
    key: 'analytics.view',
    labelAr: 'عرض التقارير والإحصائيات',
    descriptionAr: 'مشاهدة إجمالي المبيعات، الطلبات، والأداء المالي',
    category: 'analytics',
  },
  {
    key: 'reports.export',
    labelAr: 'تصدير التقارير',
    descriptionAr: 'تصدير تقارير المبيعات بصيغ Excel وPDF وبونات الوردية',
    category: 'analytics',
  },

  // Settings
  {
    key: 'settings.view',
    labelAr: 'عرض الإعدادات العامة',
    descriptionAr: 'استعراض إعدادات المتجر وأرقام التواصل والقسائم',
    category: 'settings',
  },
  {
    key: 'settings.manage',
    labelAr: 'تعديل الإعدادات العامة',
    descriptionAr: 'التحكم في مواعيد المتجر، الإغلاق الطارئ، القسائم، وأرقام الواتساب',
    category: 'settings',
  },

  // Users Management
  {
    key: 'users.view',
    labelAr: 'استعراض المستخدمين والصلاحيات',
    descriptionAr: 'مشاهدة قائمة مستخدمي لوحة التحكم وأدوارهم',
    category: 'users',
  },
  {
    key: 'users.create',
    labelAr: 'إضافة مستخدم جديد',
    descriptionAr: 'إنشاء حساب مستخدم جديد وتحديد دوره وصلاحياته',
    category: 'users',
  },
  {
    key: 'users.edit',
    labelAr: 'تعديل المستخدمين والصلاحيات',
    descriptionAr: 'تعديل صلاحيات المستخدمين وتعيين كلمات المرور وتجميد الحسابات',
    category: 'users',
  },
  {
    key: 'users.delete',
    labelAr: 'حذف مستخدم',
    descriptionAr: 'حذف حساب المستخدم نهائياً من النظام',
    category: 'users',
  },

  // Audit
  {
    key: 'audit.view',
    labelAr: 'سجل التحركات والأمان (Audit Log)',
    descriptionAr: 'متابعة وتدقيق جميع العمليات الإدارية الحساسة',
    category: 'audit',
  },
];

export const ROLE_PRESETS: Record<AppRole, RolePreset> = {
  admin: {
    id: 'admin',
    labelAr: 'مدير النظام (كامل الصلاحيات)',
    descriptionAr: 'تحكم مطلق في كافة أقسام النظام والطلبات والمستخدمين والإعدادات',
    colorClass: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
    defaultPermissions: ['*'],
  },
  manager: {
    id: 'manager',
    labelAr: 'مدير فرع / تشغيل',
    descriptionAr: 'إدارة الطلبات، المنيو، الأسعار، المناديب، الفروع، والتقارير المالية',
    colorClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    defaultPermissions: [
      'orders.view',
      'orders.update_status',
      'orders.edit',
      'orders.print',
      'orders.delete',
      'products.view',
      'products.create',
      'products.edit',
      'products.toggle_availability',
      'categories.manage',
      'offers.manage',
      'paper_menu.manage',
      'drivers.view',
      'drivers.manage',
      'branches.view',
      'branches.manage',
      'analytics.view',
      'reports.export',
      'settings.view',
      'audit.view',
    ],
  },
  cashier: {
    id: 'cashier',
    labelAr: 'كاشير / نقطة بيع (POS)',
    descriptionAr: 'استقبال الطلبات، تغيير حالات الطلب، وطباعة بونات الفواتير والمطبخ',
    colorClass: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
    defaultPermissions: [
      'orders.view',
      'orders.update_status',
      'orders.print',
      'products.view',
      'products.toggle_availability',
      'drivers.view',
    ],
  },
  kitchen: {
    id: 'kitchen',
    labelAr: 'شيف / شاشة المطبخ (KDS)',
    descriptionAr: 'عرض الطلبات الجارية وتحديث حالة التجهيز وطباعة بونات التحضير',
    colorClass: 'bg-purple-500/15 text-purple-400 border-purple-500/40',
    defaultPermissions: [
      'orders.view',
      'orders.update_status',
      'orders.print',
    ],
  },
  delivery_coordinator: {
    id: 'delivery_coordinator',
    labelAr: 'منسق التوصيل والديليفري',
    descriptionAr: 'متابعة الطلبات الجاهزة، إسناد وتوجيه المناديب، وتحديث حالة التسليم',
    colorClass: 'bg-teal-500/15 text-teal-400 border-teal-500/40',
    defaultPermissions: [
      'orders.view',
      'orders.update_status',
      'orders.print',
      'drivers.view',
      'drivers.manage',
      'drivers.settle',
    ],
  },
  viewer: {
    id: 'viewer',
    labelAr: 'مستعرض / مراقب جودة (قراءة فقط)',
    descriptionAr: 'اطلاع فقط على الطلبات والمنتجات والتقارير وسجل العمليات دون تعديل',
    colorClass: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/40',
    defaultPermissions: [
      'orders.view',
      'products.view',
      'drivers.view',
      'branches.view',
      'analytics.view',
      'audit.view',
    ],
  },
  custom: {
    id: 'custom',
    labelAr: 'مخصص (صلاحيات يدوية)',
    descriptionAr: 'مجموعة صلاحيات محددة يدوياً بواسطة مدير النظام',
    colorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    defaultPermissions: [
      'orders.view',
      'products.view',
    ],
  },
  employee: {
    id: 'employee',
    labelAr: 'مسئول تشغيل الطلبات والمناديب والتسويات',
    descriptionAr: 'التحكم الكامل بنظام تشغيل الطلبات، إسناد المناديب، إدارة كباتن التوصيل، والتسويات المالية',
    colorClass: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
    defaultPermissions: [
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
  },
};

export const PERMISSION_CATEGORIES: Array<{
  id: 'orders' | 'products' | 'drivers' | 'branches' | 'analytics' | 'settings' | 'users' | 'audit';
  labelAr: string;
}> = [
  { id: 'orders', labelAr: 'إدارة وتجهيز الطلبات' },
  { id: 'products', labelAr: 'المنيو والأصناف والعروض' },
  { id: 'drivers', labelAr: 'مناديب التوصيل' },
  { id: 'branches', labelAr: 'الفروع ومناطق الخدمة' },
  { id: 'analytics', labelAr: 'التقارير والمؤشرات المالية' },
  { id: 'settings', labelAr: 'إعدادات النظام والمتجر' },
  { id: 'users', labelAr: 'المستخدمين والصلاحيات' },
  { id: 'audit', labelAr: 'الأمان وسجل التحركات' },
];
