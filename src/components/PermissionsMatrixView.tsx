"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Crown,
  UserCheck,
  Building2,
  Search,
  Wrench,
  Sliders,
  FileSpreadsheet,
  Printer,
  Trash2,
  Sparkles,
  Save,
  Check,
  HelpCircle,
  Layers,
  Settings,
  FolderTree,
  Eye,
  Send,
  Clock,
  RotateCcw,
} from "lucide-react";
import { updateRolePermissionsAction } from "@/app/actions/capa";

interface RoleOption {
  id: number;
  code: string;
  name: string;
  category?: string;
  role_type?: string;
  permissions_json?: string;
  description?: string;
  status?: string;
  allowed_departments?: string;
  allowed_sections?: string;
}

interface PermissionsMatrixViewProps {
  roles?: RoleOption[];
  permissionsMatrix?: Array<{
    role_code: string;
    role_name: string;
    permissions_json: string;
  }>;
  currentUser?: {
    id: number;
    full_name: string;
    role: string;
  };
  canManageRoles?: boolean;
}

// Full Permissions Hierarchy Definition
const PERMISSIONS_SCHEMA = [
  {
    categoryId: "inspection",
    categoryName: "عمليات التفتيش والرصد الميداني",
    categoryIcon: Search,
    color: "blue",
    items: [
      {
        key: "inspect_create",
        name: "تسجيل ورصد حالات عدم المطابقة",
        description: "رصد المخالفات من الميدان وإرفاق الملاحظات وتحديد الموقع الجغرافي",
        allowDeptOnly: true,
      },
      {
        key: "inspect_offline",
        name: "استخدام وضع الأوفلاين (بدون إنترنت)",
        description: "حفظ البلاغات في المسودات والمزامنة التلقائية عند توفر الشبكة",
        allowDeptOnly: false,
      },
      {
        key: "inspect_typeahead",
        name: "البحث اللحظي في بنك حالات عدم المطابقة (Typeahead)",
        description: "فلترة سريعة للحالات بمجرد كتابة أول حرفين في استمارة التفتيش",
        allowDeptOnly: false,
      },
    ],
  },
  {
    categoryId: "case_views",
    categoryName: "الاطلاع على قوائم الحالات والمنفذين",
    categoryIcon: Eye,
    color: "cyan",
    items: [
      { key: "view_open_cases", name: "عرض الحالات المفتوحة", description: "مشاهدة الحالات التي تنتظر الفرز دون منح صلاحية إسنادها تلقائياً", allowDeptOnly: true },
      { key: "view_in_progress_cases", name: "عرض الحالات قيد التنفيذ", description: "مشاهدة ومتابعة المهام الجارية دون منح صلاحية تعديلها تلقائياً", allowDeptOnly: true },
      { key: "view_review_cases", name: "عرض الحالات التي تنتظر المراجعة", description: "مشاهدة ردود المنفذين دون منح صلاحية اعتمادها تلقائياً", allowDeptOnly: true },
      { key: "view_closed_cases", name: "عرض الحالات المغلقة", description: "مشاهدة سجل الحالات المغلقة ضمن نطاق الإدارة أو النظام", allowDeptOnly: true },
      { key: "view_all_cases", name: "عرض سجل الحالات العام", description: "مشاهدة سجل الحالات العام ضمن نطاق الإدارة أو النظام", allowDeptOnly: true },
      { key: "view_executor_directory", name: "عرض قائمة المنفذين الميدانيين", description: "مشاهدة دليل المنفذين دون منح صلاحية إسناد الحالات إليهم تلقائياً", allowDeptOnly: true },
    ],
  },
  {
    categoryId: "triage",
    categoryName: "الفرز، الإسناد، والتوجيه الإداري",
    categoryIcon: Send,
    color: "amber",
    items: [
      {
        key: "triage_assign",
        name: "إسناد الحالات وتوجيه التكليفات",
        description: "فرز البلاغات المفتوحة وتكليف الأقسام أو الموظفين بالمعالجة الميدانية",
        allowDeptOnly: true,
      },
      {
        key: "triage_direct_user",
        name: "الإسناد المباشر بالاسم للموظف الميداني",
        description: "اختيار موظف بعينه بالاسم والمسمى الوظيفي وليس القسم فقط",
        allowDeptOnly: true,
      },
      {
        key: "triage_curated",
        name: "التنقية الإدارية للاستمارات (Curated Dispatch)",
        description: "حجب الأسئلة الحساسة عن الميدانيين وإعادة صياغة التوجيهات",
        allowDeptOnly: true,
      },
      {
        key: "additional_assignment",
        name: "إسناد منفذ إضافي أثناء التنفيذ",
        description: "إضافة منفذ جديد للمهمة الجارية مع إبقاء التكليفات السابقة",
        allowDeptOnly: true,
      },
      {
        key: "write_in_progress_note",
        name: "كتابة ملاحظة للمنفذين أثناء التنفيذ",
        description: "إرسال توجيه أو ملاحظة مباشرة إلى المنفذين المكلفين بالمهمة الجارية",
        allowDeptOnly: true,
      },
    ],
  },
  {
    categoryId: "field",
    categoryName: "التنفيذ والمعالجة الميدانية",
    categoryIcon: Wrench,
    color: "emerald",
    items: [
      {
        key: "field_execute",
        name: "تنفيذ المهام وتدوين الإجراءات المتخذة",
        description: "استلام التكليفات ورفع الإثبات والرد الميداني للمعالجة",
        allowDeptOnly: true,
      },
      {
        key: "field_feedback",
        name: "الاطلاع على التوجيهات الدائمة في الحالات المغلقة",
        description: "مرجع تعليمي مستمر للميداني لمنع تكرار الخطأ مستقبلاً",
        allowDeptOnly: false,
      },
    ],
  },
  {
    categoryId: "review",
    categoryName: "المراجعة، الاعتماد، والقرارات النهائية",
    categoryIcon: CheckCircle2,
    color: "rose",
    items: [
      {
        key: "review_approve",
        name: "اعتماد المعالجة الميدانية وإغلاق الحالة",
        description: "الموافقة على إجراء المنفذ وإغلاق الحالة نهائياً مع التوجيه",
        allowDeptOnly: true,
      },
      {
        key: "close_in_progress_case",
        name: "إغلاق المهمة وهي قيد التنفيذ",
        description: "السماح بإغلاق المهمة مباشرة قبل اكتمال دورة المراجعة المعتادة",
        allowDeptOnly: true,
      },
      {
        key: "review_round_bump",
        name: "رفض الإجراء وطلب استكمال (Round Bump)",
        description: "إعادة التكليف للميدان مع تسجيل أسباب الرفض وملاحظات الاستكمال",
        allowDeptOnly: true,
      },
      {
        key: "delete_cases",
        name: "حذف الحالات الخاطئة أو المكررة (Case Deletion)",
        description: "حذف متسلسل لكافة السجلات والتنفيذات وسجل التدقيق",
        allowDeptOnly: false,
      },
      {
        key: "inspect_secret_notes",
        name: "الاطلاع على هوية المفتش وملاحظاته السرية",
        description: "حماية الأثر الرقابي ومنع أي احتكاك وظيفي بين الكوادر",
        allowDeptOnly: true,
      },
    ],
  },
  {
    categoryId: "admin",
    categoryName: "الهيكل، المستخدمين، وضوابط الأمان العليا",
    categoryIcon: ShieldAlert,
    color: "purple",
    items: [
      {
        key: "manage_structure",
        name: "إدارة الهيكل (الإدارات والأقسام والمواقع)",
        description: "إنشاء وتعديل وحذف وتعطيل الإدارات والأقسام التشغيلية",
        allowDeptOnly: false,
      },
      {
        key: "manage_roles",
        name: "إنشاء وإدارة الأدوار الوظيفية المخصصة",
        description: "استحداث أدوار وتحديد الإدارات والأقسام المسموحة لها",
        allowDeptOnly: false,
      },
      {
        key: "manage_users",
        name: "إدارة كادر العمل والمستخدمين والرموز السرية (PIN)",
        description: "تعديل المسميات الوظيفية، الصلاحيات، وإعادة تعيين الـ PIN",
        allowDeptOnly: false,
      },
      {
        key: "manage_sync",
        name: "فتح نافذة المزامنة ووضع قاعدة البيانات",
        description: "التحكم في ظهور أدوات المزامنة وتبديل وضع النظام من الواجهة",
        allowDeptOnly: false,
      },
      {
        key: "import_excel",
        name: "استيراد وتهيئة البيانات من Excel",
        description: "استيراد جداول الإدارات والأقسام والمستخدمين والحالات من ملفات Excel",
        allowDeptOnly: false,
      },
      {
        key: "create_daily_report",
        name: "إنشاء التقارير اليومية",
        description: "السماح بفتح نموذج التقرير اليومي وإرساله",
        allowDeptOnly: false,
      },
      {
        key: "view_daily_archive",
        name: "مشاهدة وتصدير أرشيف التقارير اليومية",
        description: "السماح بالاطلاع على الأرشيف وتصديره إلى Excel",
        allowDeptOnly: true,
      },
      {
        key: "export_excel",
        name: "تصدير سجلات وتقارير الإكسل الشاملة",
        description: "ربط إكسل الحي أو تصدير الجداول الشاملة للبيانات",
        allowDeptOnly: true,
      },
      {
        key: "print_pdf",
        name: "طباعة وتصدير تقارير PDF الرسمية بهوية المراسيم",
        description: "توليد تقارير رسمية مروسة بالشعار ومعتمدة للطباعة و PDF",
        allowDeptOnly: true,
      },
      {
        key: "manage_forms",
        name: "بناء وتصميم الاستمارات والنماذج الذكية",
        description: "تصميم قوالب الأسئلة المتعددة المراحل وتحديد الأدوار المصرح لها",
        allowDeptOnly: false,
      },
    ],
  },
  {
    categoryId: "account_access",
    categoryName: "القوائم والحسابات الشخصية",
    categoryIcon: Eye,
    color: "slate",
    items: [
      {
        key: "change_own_pin",
        name: "تغيير رمز المرور الشخصي",
        description: "إظهار نافذة تغيير رمز الدخول الخاص بالمستخدم",
        allowDeptOnly: false,
      },
      {
        key: "offline_outbox",
        name: "قائمة البلاغات المحفوظة أوفلاين",
        description: "فتح قائمة العناصر المحلية المنتظرة للإرسال عند توفر الاتصال",
        allowDeptOnly: false,
      },
      {
        key: "inspect_view_own",
        name: "مشاهدة وتتبع الحالات المرصودة للمفتش",
        description: "إظهار سجل الحالات التي رصدها المفتش ومتابعة مراحلها",
        allowDeptOnly: false,
      },
    ],
  },
];

const DEFAULT_SYSTEM_ROLES = [
  { code: "super_admin", name: "مدير عام المنظومة (Super Admin)", isSystem: true, badge: "bg-purple-100 text-purple-900 border-purple-300" },
  { code: "general_admin", name: "المدير العام للنظام (General Admin)", isSystem: true, badge: "bg-amber-100 text-amber-900 border-amber-300" },
  { code: "admin", name: "مشرف / مدير إدارة (Admin)", isSystem: true, badge: "bg-blue-100 text-blue-900 border-blue-300" },
  { code: "inspector", name: "مفتش جودة ورقابة (Inspector)", isSystem: true, badge: "bg-indigo-100 text-indigo-900 border-indigo-300" },
  { code: "field_agent", name: "منفذ ميداني (Field Agent)", isSystem: true, badge: "bg-emerald-100 text-emerald-900 border-emerald-300" },
];

const INHERITED_SYSTEM_ROLE_PERMISSIONS: Record<string, Record<string, string>> = {
  admin: {
    can_view: "dept_only", can_create: "dept_only", can_assign: "dept_only", can_review: "dept_only", can_close: "dept_only", can_delete: "none",
    view_open_cases: "dept_only", view_in_progress_cases: "dept_only", view_review_cases: "dept_only", view_closed_cases: "dept_only", view_all_cases: "dept_only", view_executor_directory: "dept_only",
    inspect_create: "dept_only", triage_assign: "dept_only", triage_direct_user: "dept_only", triage_curated: "dept_only",
    additional_assignment: "dept_only", write_in_progress_note: "dept_only", review_approve: "dept_only", review_round_bump: "dept_only", close_in_progress_case: "dept_only",
    offline_outbox: "full", change_own_pin: "full",
  },
  inspector: {
    can_view: "dept_only", can_create: "full", inspect_create: "full", inspect_offline: "full", inspect_typeahead: "full", inspect_view_own: "full",
    offline_outbox: "full", change_own_pin: "full",
  },
  field_agent: { field_execute: "full", field_feedback: "full", offline_outbox: "full", change_own_pin: "full" },
};

export default function PermissionsMatrixView({
  roles = [],
  permissionsMatrix = [],
  currentUser,
  canManageRoles = false,
}: PermissionsMatrixViewProps) {
  const isSuperUser = currentUser?.role === "super_admin" || currentUser?.role === "general_admin" || canManageRoles;

  // Build combined roles list
  const allRoleOptions = [
    ...DEFAULT_SYSTEM_ROLES,
    ...roles.map((r) => ({
      code: r.code,
      name: r.name,
      isSystem: false,
      badge: "bg-purple-50 text-purple-800 border-purple-200",
      category: r.category || r.role_type,
      rawPermissions: r.permissions_json,
      allowedDepts: r.allowed_departments,
    })),
  ];

  // Active view tab: "editor" (role editor) or "matrix" (full table)
  const [viewMode, setViewMode] = useState<"editor" | "matrix">("editor");

  // Selected role for the editor
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>(
    roles.length > 0 ? roles[0].code : "admin"
  );

  // Store permissions state for each role in memory
  const [permissionsState, setPermissionsState] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {};

    // 1. Populate from permissionsMatrix (system roles)
    if (permissionsMatrix && permissionsMatrix.length > 0) {
      for (const item of permissionsMatrix) {
        try {
          initial[item.role_code] = JSON.parse(item.permissions_json || "{}");
        } catch {
          initial[item.role_code] = {};
        }
      }
    }

    // 2. Populate from custom roles
    for (const r of roles) {
      try {
        initial[r.code] = JSON.parse(r.permissions_json || "{}");
      } catch {
        initial[r.code] = {};
      }
    }

    // Defaults for super_admin if missing
    if (!initial.super_admin) {
      initial.super_admin = {
        inspect_create: "full",
        inspect_offline: "full",
        inspect_typeahead: "full",
        triage_assign: "full",
        triage_direct_user: "full",
        triage_curated: "full",
        field_execute: "view_only",
        field_feedback: "full",
        review_approve: "full",
        review_round_bump: "full",
        delete_cases: "exclusive",
        inspect_secret_notes: "full",
        manage_structure: "full",
        manage_roles: "full",
        manage_users: "full",
        manage_sync: "full",
        import_excel: "full",
        export_excel: "full",
        print_pdf: "full",
        manage_forms: "full",
        additional_assignment: "full",
        write_in_progress_note: "full",
        close_in_progress_case: "full",
        view_open_cases: "full",
        view_in_progress_cases: "full",
        view_review_cases: "full",
        view_closed_cases: "full",
        view_all_cases: "full",
        view_executor_directory: "full",
        create_daily_report: "full",
        view_daily_archive: "full",
        change_own_pin: "full",
        offline_outbox: "full",
        inspect_view_own: "full",
      };
    }

    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedRole = allRoleOptions.find((r) => r.code === selectedRoleCode) || allRoleOptions[0];
  const isUnlimitedRole = selectedRoleCode === "super_admin" || selectedRoleCode === "general_admin";
  const storedRolePerms = permissionsState[selectedRoleCode] || {};
  const getRolePermissionValue = (roleCode: string, permissionKey: string) => {
    if (roleCode === "super_admin" || roleCode === "general_admin") return "full";
    const stored = permissionsState[roleCode] || {};
    if (Object.prototype.hasOwnProperty.call(stored, permissionKey)) return stored[permissionKey];
    const roleOption = allRoleOptions.find((option) => option.code === roleCode);
    const baseRole = roleCode.startsWith("crole_") ? String((roleOption as any)?.category || "") : roleCode;
    return INHERITED_SYSTEM_ROLE_PERMISSIONS[baseRole]?.[permissionKey] || "none";
  };

  const handleSetPermissionExact = (permKey: string, level: string) => {
    if (!isSuperUser) {
      setNotification({ type: "error", text: "صلاحية تعديل المصفوفة محصورة بمدير عام المنظومة" });
      return;
    }

    if (isUnlimitedRole) {
      setNotification({ type: "error", text: "صلاحيات إدارة النظام العليا ثابتة وشاملة ولا يمكن تقييدها" });
      return;
    }

    setPermissionsState((prev) => ({
      ...prev,
      [selectedRoleCode]: {
        ...(prev[selectedRoleCode] || {}),
        [permKey]: level,
      },
    }));
    setSaveSuccess(false);
  };

  const handleClearPermission = (permKey: string) => {
    if (!isSuperUser || isUnlimitedRole) return;
    setPermissionsState((prev) => {
      const next = { ...prev, [selectedRoleCode]: { ...(prev[selectedRoleCode] || {}) } };
      delete next[selectedRoleCode][permKey];
      return next;
    });
    setSaveSuccess(false);
  };

  // Save changes to database
  const handleSaveChanges = async () => {
    if (!isSuperUser) return;
    setSaving(true);
    setNotification(null);

    try {
      const res = await updateRolePermissionsAction(selectedRoleCode, permissionsState[selectedRoleCode] || {});
      if (res.success) {
        setSaveSuccess(true);
        setNotification({
          type: "success",
          text: `تم حفظ وتحديث مصفوفة الصلاحيات للدور (${selectedRole.name}) بنجاح!`,
        });
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setNotification({ type: "error", text: res.error || "فشل حفظ التعديلات" });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "حدث خطأ غير متوقع" });
    } finally {
      setSaving(false);
    }
  };

  const renderBadge = (level: string) => {
    switch (level) {
      case "full":
      case "exclusive":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>شاملة ✅</span>
          </span>
        );
      case "dept_only":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>حسب القسم 🏢</span>
          </span>
        );
      case "view_only":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-blue-50 text-blue-900 border border-blue-300 shadow-2xs">
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>اطلاع فقط 👁️</span>
          </span>
        );
      case "none":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-300" />
            <span>محجوبة</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-[#1B1111] via-[#2D1A18] to-[#1B1111] text-white p-6 rounded-3xl border-2 border-[#D49A3D]/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFC217]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-[#D49A3D] text-[#1B1111] rounded-2xl shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">مصفوفة توزيع وضبط الصلاحيات التفاعلية</h3>
                <span className="text-[10px] bg-purple-900/80 text-purple-200 font-bold px-2 py-0.5 rounded-full border border-purple-400/30">
                  تحكم حي ومباشر
                </span>
              </div>
              <p className="text-xs font-semibold text-amber-200/90 mt-1">
                تحديد وضبط مستويات الوصول التشغيلية للأدوار الأساسية والأدوار الوظيفية المخصصة في منظومة المراسيم
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => setViewMode("editor")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === "editor"
                  ? "bg-[#D49A3D] text-[#1B1111] shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>محرر وضبط الدور</span>
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === "matrix"
                  ? "bg-[#D49A3D] text-[#1B1111] shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>جدول المقارنة الشامل</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl font-black text-xs flex items-center justify-between border shadow-sm ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : "bg-rose-50 text-rose-800 border-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 1: ROLE PERMISSION EDITOR                                */}
      {/* ============================================================== */}
      {viewMode === "editor" && (
        <div className="space-y-6">
          {/* Role Selection Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-purple-600" />
                اختر الدور الوظيفي للتحكم بصلاحياته:
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                الأدوار المخصصة تنشأ من قسم "الأدوار الوظيفية" وتظهر هنا فوراً للضبط
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
              {allRoleOptions.map((r) => {
                const isSelected = r.code === selectedRoleCode;
                return (
                  <button
                    key={r.code}
                    onClick={() => {
                      setSelectedRoleCode(r.code);
                      setSaveSuccess(false);
                    }}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border ${
                      isSelected
                        ? "bg-[#682722] text-white border-[#682722] shadow-md scale-102"
                        : "bg-[#FAF7F4] text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{r.name}</span>
                    {!r.isSystem && (
                      <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[9px] rounded-full font-bold">
                        مخصص
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Role Card & Save Button */}
          <div className="bg-white p-5 rounded-3xl border-2 border-purple-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#1B1111]">
                  تعديل صلاحيات: {selectedRole?.name}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${selectedRole?.badge}`}>
                  {selectedRole?.isSystem ? "دور أساسي بالنظام" : "دور وظيفي مخصص"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                انقر على مستويات الصلاحية أدناه لتفعيلها أو تقييدها بنطاق الإدارة والقسم أو حجبها بالكامل.
              </p>
            </div>

            {isSuperUser && !isUnlimitedRole && (
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-2xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جارٍ الحفظ...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>تم الحفظ بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ صلاحيات الدور فوراً</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Permissions Categories Grid */}
          <div className="space-y-6">
            {PERMISSIONS_SCHEMA.map((cat) => {
              const Icon = cat.categoryIcon;
              return (
                <div key={cat.categoryId} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-[#FAF7F4] p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 bg-white rounded-xl shadow-2xs text-[#682722] border border-slate-200">
                        <Icon className="w-4 h-4" />
                      </span>
                      <h4 className="font-black text-sm text-[#1B1111]">{cat.categoryName}</h4>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                      {cat.items.length} صلاحيات
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {cat.items.map((item) => {
                      const currentVal = getRolePermissionValue(selectedRoleCode, item.key);
                      const isInherited = !Object.prototype.hasOwnProperty.call(storedRolePerms, item.key);
                      const isSuper = isUnlimitedRole;

                      return (
                        <div
                          key={item.key}
                          className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1 max-w-xl">
                            <span className="font-black text-xs text-slate-900 block">
                              {item.name}
                            </span>
                            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                              {item.description}
                            </p>
                            {isInherited && !isSuper && (
                              <span className="inline-flex mt-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                                موروثة من الدور أو إعداد المستخدم
                              </span>
                            )}
                          </div>

                          {/* Control Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap self-end md:self-center">
                            {isSuper ? (
                              <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-purple-50 text-purple-900 border border-purple-200">
                                شاملة دائمة (Super Admin)
                              </span>
                            ) : (
                              <>
                                {isSuperUser && !isInherited && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearPermission(item.key)}
                                    className="px-2.5 py-1.5 rounded-xl text-[10px] font-black border border-slate-300 text-slate-600 hover:bg-slate-100"
                                    title="إزالة التحديد الخاص والعودة إلى إعداد الدور أو الحساب"
                                  >
                                    افتراضي
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleSetPermissionExact(item.key, "full")}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 border ${
                                    currentVal === "full" || currentVal === "exclusive"
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>شاملة</span>
                                </button>

                                {item.allowDeptOnly && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPermissionExact(item.key, "dept_only")}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 border ${
                                      currentVal === "dept_only"
                                        ? "bg-amber-500 text-[#1B1111] border-amber-500 shadow-xs"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-800"
                                    }`}
                                  >
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>حسب القسم</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleSetPermissionExact(item.key, "none")}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 border ${
                                    currentVal === "none"
                                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                      : "bg-white text-slate-400 border-slate-200 hover:bg-rose-50 hover:text-rose-600"
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>محجوبة</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: FULL COMPARISON MATRIX TABLE                          */}
      {/* ============================================================== */}
      {viewMode === "matrix" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-[#FAF7F4] border-b border-slate-200 flex items-center justify-between">
            <h4 className="font-black text-sm text-[#1B1111] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#682722]" />
              مصفوفة الصلاحيات المقارنة لكافة الأدوار
            </h4>
            <span className="text-xs font-bold text-slate-500">
              {allRoleOptions.length} دور مسجل في المنظومة
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F4] text-[#1B1111] font-black border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 min-w-[240px]">العملية / الصلاحية</th>
                  {allRoleOptions.map((r) => (
                    <th key={r.code} className="py-3 px-3 text-center min-w-[130px]">
                      <div className="space-y-0.5">
                        <span className="block font-black text-xs text-slate-800">{r.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold block">
                          {r.isSystem ? "أساسي" : "مخصص"}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {PERMISSIONS_SCHEMA.flatMap((cat) => [
                  <tr key={`cat-${cat.categoryId}`} className="bg-slate-100/70 font-black text-slate-900 text-xs">
                    <td colSpan={allRoleOptions.length + 1} className="py-2.5 px-4 text-[#682722]">
                      📂 {cat.categoryName}
                    </td>
                  </tr>,
                  ...cat.items.map((item) => (
                    <tr key={item.key} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-black text-slate-900 block">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium block">{item.description}</span>
                      </td>
                      {allRoleOptions.map((r) => {
                        const val = getRolePermissionValue(r.code, item.key);
                        return (
                          <td key={r.code} className="py-3 px-3 text-center">
                            {renderBadge(val)}
                          </td>
                        );
                      })}
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
