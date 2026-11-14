// scripts/generate-admin-manager.cjs
const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'app', 'admin', 'AdminManager.tsx');

// We will construct the complete file content
const code = `"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  Inbox,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  CheckCheck,
  XCircle,
  Clock,
  MapPin,
  Tag,
  User,
  ShieldCheck,
  Send,
  FileText,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  History,
  Sparkles,
  Building2,
  FolderTree,
  Users,
  KeyRound,
  Shield,
  Download,
  Printer,
  PlusCircle,
  Trash2,
  Edit3,
  Sliders,
  Calendar,
  Check,
  Eye,
  Settings,
  ArrowRight,
  Power,
  Lock,
  UserCheck,
  RotateCw,
  Loader2,
} from "lucide-react";
import {
  assignCaseAction,
  approveTaskAction,
  reassignTaskAction,
  closeCaseEntirelyAction,
  deleteCaseAction,
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
  toggleDepartmentStatusAction,
  createSectionAction,
  updateSectionAction,
  deleteSectionAction,
  toggleSectionStatusAction,
  createCustomRoleAction,
  updateCustomRoleAction,
  deleteCustomRoleAction,
  toggleCustomRoleStatusAction,
  createUserAction,
  updateUserAction,
  deleteUserAction,
  toggleUserStatusAction,
  toggleUserExcelAction,
  changeUserPinAction,
  changeMyPinAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  toggleCategoryStatusAction,
  createInspectionAction,
  resetDatabaseAction,
} from "@/app/actions/capa";
import OfficialPdfReportModal from "@/components/OfficialPdfReportModal";
import PermissionsMatrixView from "@/components/PermissionsMatrixView";
import FormBuilder from "./FormBuilder";

// Props types
interface AdminManagerProps {
  currentUser: any;
  userPermissions?: any;
  departments: any[];
  sections: any[];
  roles: any[];
  users: any[];
  fieldRoles: any[];
  categories: any[];
  locations: any[];
  pendingCases: any[];
  inProgressCases: any[];
  reviewItems: any[];
  closedCases: any[];
  allCases: any[];
  auditLogs: any[];
  permissionsMatrix?: any[];
}

export default function AdminManager({
  currentUser,
  userPermissions,
  departments,
  sections,
  roles,
  users,
  fieldRoles,
  categories,
  locations,
  pendingCases,
  inProgressCases,
  reviewItems,
  closedCases,
  allCases,
  auditLogs,
  permissionsMatrix = [],
}: AdminManagerProps) {
  const router = useRouter();

  // Navigation State
  const [activeMenu, setActiveMenu] = useState<string>("open_cases");
  const [configTab, setConfigTab] = useState<"depts" | "sections" | "roles" | "categories" | "matrix" | "reset">("depts");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Loading & Submitting Locks (Double-click prevention)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Database Reset State
  const [resetAdminPin, setResetAdminPin] = useState("");
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Role permissions granular states for role modal
  const [rolePermView, setRolePermView] = useState<"full" | "dept_only" | "none">("dept_only");
  const [rolePermAssign, setRolePermAssign] = useState<"full" | "dept_only" | "none">("dept_only");
  const [rolePermReview, setRolePermReview] = useState<"full" | "dept_only" | "none">("dept_only");
  const [rolePermClose, setRolePermClose] = useState<"full" | "dept_only" | "none">("dept_only");
  const [rolePermCreate, setRolePermCreate] = useState<"full" | "dept_only" | "none">("dept_only");

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isGeneralAdmin = currentUser?.role === "general_admin";
  const isSystemAdmin = isSuperAdmin || isGeneralAdmin;
  const canDeleteCases = isSuperAdmin || isGeneralAdmin;

  // Notification Banner
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showNotification = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
      showNotification("success", "تم تحديث كافة بيانات المنظومة بنجاح");
    }, 700);
  };

  // Listen to drawer navigation events from Navbar hamburger menu
  useEffect(() => {
    const handleDrawerNavigate = (e: any) => {
      const key = e.detail?.key;
      if (key) {
        const adminOnlyKeys = [
          "system_config", "departments", "sections", "roles", "categories", 
          "permissions_matrix", "users", "dynamic_forms", "reports", "audit", "change_pin"
        ];
        if (!isSystemAdmin && adminOnlyKeys.includes(key)) {
          setActiveMenu("open_cases");
          return;
        }

        if (key === "open_cases") setActiveMenu("open_cases");
        else if (key === "in_progress") setActiveMenu("in_progress_cases");
        else if (key === "needs_review") setActiveMenu("review_cases");
        else if (key === "closed_cases") setActiveMenu("closed_cases");
        else if (key === "departments") { setActiveMenu("system_config"); setConfigTab("depts"); }
        else if (key === "sections") { setActiveMenu("system_config"); setConfigTab("sections"); }
        else if (key === "roles") { setActiveMenu("system_config"); setConfigTab("roles"); }
        else if (key === "categories") { setActiveMenu("system_config"); setConfigTab("categories"); }
        else if (key === "permissions_matrix") { setActiveMenu("system_config"); setConfigTab("matrix"); }
        else setActiveMenu(key);
      }
    };
    window.addEventListener("marasim_drawer_navigate", handleDrawerNavigate);
    return () => window.removeEventListener("marasim_drawer_navigate", handleDrawerNavigate);
  }, [isSystemAdmin]);

  // Dispatch state (departments & specific users)
  const [dispatchSelections, setDispatchSelections] = useState<Record<number, string[]>>({});
  const [dispatchUserSelections, setDispatchUserSelections] = useState<Record<number, number[]>>({});
  const [dispatchInstructions, setDispatchInstructions] = useState<Record<number, string>>({});
  const [dispatchLoading, setDispatchLoading] = useState<Record<number, boolean>>({});

  // Review Modals
  const [activeReviewModal, setActiveReviewModal] = useState<{
    type: "reassign" | "close";
    item: any;
  } | null>(null);
  const [reassignDepts, setReassignDepts] = useState<string[]>([]);
  const [reassignNotes, setReassignNotes] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState<Record<string, boolean>>({});

  // Modals for CRUD
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);

  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<any | null>(null);

  // Custom Roles State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [roleFormName, setRoleFormName] = useState("");
  const [roleFormCategory, setRoleFormCategory] = useState<"admin" | "inspector" | "field_agent">("inspector");
  const [roleFormAllDepts, setRoleFormAllDepts] = useState(true);
  const [roleFormSelectedDepts, setRoleFormSelectedDepts] = useState<string[]>([]);
  const [roleFormAllSections, setRoleFormAllSections] = useState(true);
  const [roleFormSelectedSections, setRoleFormSelectedSections] = useState<string[]>([]);
  const [roleFormDesc, setRoleFormDesc] = useState("");

  // Categories (Non-conformity) State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [catFormName, setCatFormName] = useState("");
  const [catFormSeverity, setCatFormSeverity] = useState<"low" | "medium" | "high">("medium");
  const [catFormAllDepts, setCatFormAllDepts] = useState(true);
  const [catFormSelectedDepts, setCatFormSelectedDepts] = useState<string[]>([]);
  const [catFormAllSections, setCatFormAllSections] = useState(true);
  const [catFormSelectedSections, setCatFormSelectedSections] = useState<string[]>([]);
  const [catFormDesc, setCatFormDesc] = useState("");

  // User State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [changePinModalUser, setChangePinModalUser] = useState<any | null>(null);
  const [userFormName, setUserFormName] = useState("");
  const [userFormJobTitle, setUserFormJobTitle] = useState("");
  const [userFormCustomRoleId, setUserFormCustomRoleId] = useState<string>("none");
  const [userFormRole, setUserFormRole] = useState("field_agent");
  const [userFormDept, setUserFormDept] = useState("");
  const [userFormCanExcel, setUserFormCanExcel] = useState(false);

  // PDF Report Modal State
  const [showPdfModal, setShowPdfModal] = useState(false);

  // My PIN Change state
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");

  // Search in all cases
  const [caseSearchQuery, setCaseSearchQuery] = useState("");
  const [caseFilterStatus, setCaseFilterStatus] = useState("all");

  // Section Department Filter
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");

  // ==========================================
  // DISPATCH HANDLERS
  // ==========================================
  const toggleDeptForCase = (caseId: number, deptCode: string) => {
    setDispatchSelections((prev) => {
      const current = prev[caseId] || [];
      const updated = current.includes(deptCode)
        ? current.filter((c) => c !== deptCode)
        : [...current, deptCode];
      return { ...prev, [caseId]: updated };
    });
  };

  const toggleUserForCase = (caseId: number, userId: number) => {
    setDispatchUserSelections((prev) => {
      const current = prev[caseId] || [];
      const updated = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
      return { ...prev, [caseId]: updated };
    });
  };

  const handleDispatch = async (c: any) => {
    const selectedDepts = dispatchSelections[c.id] || [];
    const selectedUserIds = dispatchUserSelections[c.id] || [];
    const instructions = dispatchInstructions[c.id] || "";

    if (selectedDepts.length === 0 && selectedUserIds.length === 0) {
      showNotification("error", \`يرجى اختيار جهة مكلفة أو موظف واحد على الأقل للحالة #\${c.case_number}\`);
      return;
    }

    const targetUsersList = selectedUserIds.map((uid) => {
      const u = users.find((usr) => usr.id === uid);
      return {
        id: uid,
        name: u?.full_name || \`موظف #\${uid}\`,
        deptCode: u?.department_code || "dept",
      };
    });

    setDispatchLoading((prev) => ({ ...prev, [c.id]: true }));
    try {
      const res = await assignCaseAction(c.id, selectedDepts, instructions, targetUsersList);
      if (res.success) {
        showNotification("success", \`تم إسناد الحالة #\${c.case_number} بنجاح!\`);
      } else {
        showNotification("error", res.error || "حدث خطأ أثناء الإسناد");
      }
    } catch (e: any) {
      showNotification("error", e.message || "حدث خطأ غير متوقع");
    } finally {
      setDispatchLoading((prev) => ({ ...prev, [c.id]: false }));
    }
  };

  // Review Scenario 1
  const handleApprove = async (item: any) => {
    setReviewLoading((prev) => ({ ...prev, [item.assignment_id]: true }));
    try {
      const res = await approveTaskAction(item.assignment_id);
      if (res.success) {
        showNotification("success", \`تم اعتماد معالجة المهمة #\${item.case_number} بنجاح!\`);
      } else {
        showNotification("error", res.error || "فشل الاعتماد");
      }
    } catch (e: any) {
      showNotification("error", e.message || "حدث خطأ أثناء الاعتماد");
    } finally {
      setReviewLoading((prev) => ({ ...prev, [item.assignment_id]: false }));
    }
  };

  // Review Scenario 2
  const handleReassignSubmit = async () => {
    if (!activeReviewModal || !activeReviewModal.item) return;
    const item = activeReviewModal.item;
    try {
      const res = await reassignTaskAction(
        item.case_id,
        reassignDepts.length > 0 ? reassignDepts : [item.target_dept || item.assigned_to_dept || "dept"],
        reassignNotes
      );
      if (res.success) {
        showNotification("success", \`تمت إعادة إسناد الحالة #\${item.case_number} للجولة (\${item.round + 1})\`);
        setActiveReviewModal(null);
        setReassignNotes("");
        setReassignDepts([]);
      } else {
        showNotification("error", res.error || "فشل إعادة الإسناد");
      }
    } catch (e: any) {
      showNotification("error", e.message || "حدث خطأ");
    }
  };

  // Review Scenario 3
  const handleCloseSubmit = async () => {
    if (!activeReviewModal || !activeReviewModal.item) return;
    const item = activeReviewModal.item;
    try {
      const res = await closeCaseEntirelyAction(item.case_id, closeNotes);
      if (res.success) {
        showNotification("success", \`تم إغلاق الحالة #\${item.case_number} بشكل نهائي!\`);
        setActiveReviewModal(null);
        setCloseNotes("");
      } else {
        showNotification("error", res.error || "فشل إغلاق الحالة");
      }
    } catch (e: any) {
      showNotification("error", e.message || "حدث خطأ");
    }
  };

  const handleDeleteCase = async (caseId: number, caseNumber: number) => {
    if (confirm(\`هل أنت متأكد من الحذف النهائي للحالة #\${caseNumber}؟ لا يمكن التراجع عن هذا الإجراء!\`)) {
      try {
        const res = await deleteCaseAction(caseId);
        if (res.success) {
          showNotification("success", \`تم حذف الحالة #\${caseNumber} وجميع سجلاتها بنجاح\`);
        } else {
          showNotification("error", res.error || "فشل حذف الحالة");
        }
      } catch (e: any) {
        showNotification("error", e.message || "حدث خطأ أثناء الحذف");
      }
    }
  };

  // Handle Role Form Open
  const handleOpenAddRole = () => {
    setEditingRole(null);
    setRoleFormName("");
    setRoleFormCategory("inspector");
    setRoleFormAllDepts(false);
    setRoleFormSelectedDepts(departments.length > 0 ? [departments[0].code] : []);
    setRoleFormAllSections(true);
    setRoleFormSelectedSections([]);
    setRoleFormDesc("");
    setRolePermView("dept_only");
    setRolePermAssign("dept_only");
    setRolePermReview("dept_only");
    setRolePermClose("dept_only");
    setRolePermCreate("dept_only");
    setShowRoleModal(true);
  };

  const handleOpenEditRole = (roleItem: any) => {
    setEditingRole(roleItem);
    setRoleFormName(roleItem.name || "");
    setRoleFormCategory(roleItem.category || "inspector");
    const isAllD = !roleItem.allowed_departments || roleItem.allowed_departments === "all";
    setRoleFormAllDepts(isAllD);
    setRoleFormSelectedDepts(isAllD ? [] : (roleItem.allowed_departments || "").split(","));
    const isAllS = !roleItem.allowed_sections || roleItem.allowed_sections === "all";
    setRoleFormAllSections(isAllS);
    setRoleFormSelectedSections(isAllS ? [] : (roleItem.allowed_sections || "").split(","));
    setRoleFormDesc(roleItem.description || "");

    // Parse role permissions if available
    try {
      const p = JSON.parse(roleItem.permissions_json || "{}");
      setRolePermView(p.can_view || "dept_only");
      setRolePermAssign(p.can_assign || "dept_only");
      setRolePermReview(p.can_review || "dept_only");
      setRolePermClose(p.can_close || "dept_only");
      setRolePermCreate(p.can_create || "dept_only");
    } catch {
      setRolePermView("dept_only");
      setRolePermAssign("dept_only");
      setRolePermReview("dept_only");
      setRolePermClose("dept_only");
      setRolePermCreate("dept_only");
    }

    setShowRoleModal(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!roleFormName.trim()) {
      showNotification("error", "يرجى كتابة مسمى الدور الوظيفي");
      return;
    }

    setIsSubmitting(true);
    const permissionsObj: Record<string, string> = {
      can_view: rolePermView,
      can_assign: rolePermAssign,
      can_review: rolePermReview,
      can_close: rolePermClose,
      can_create: rolePermCreate,
    };

    const payload = {
      name: roleFormName.trim(),
      category: roleFormCategory,
      allowedDepartments: roleFormAllDepts ? ["all"] : roleFormSelectedDepts,
      allowedSections: roleFormAllSections ? ["all"] : roleFormSelectedSections,
      description: roleFormDesc.trim(),
      permissions: permissionsObj,
    };

    try {
      let res;
      if (editingRole) {
        res = await updateCustomRoleAction(editingRole.id, payload);
      } else {
        res = await createCustomRoleAction(payload);
      }

      if (res.success) {
        showNotification("success", editingRole ? "تم تعديل الدور الوظيفي بنجاح!" : "تم إنشاء الدور الوظيفي بنجاح!");
        setShowRoleModal(false);
        router.refresh();
      } else {
        showNotification("error", res.error || "فشل حفظ الدور");
      }
    } catch (err: any) {
      showNotification("error", err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Category Form Open
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatFormName("");
    setCatFormSeverity("medium");
    setCatFormAllDepts(true);
    setCatFormSelectedDepts([]);
    setCatFormAllSections(true);
    setCatFormSelectedSections([]);
    setCatFormDesc("");
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (catItem: any) => {
    setEditingCategory(catItem);
    setCatFormName(catItem.name || "");
    setCatFormSeverity(catItem.severity || "medium");
    const isAllD = !catItem.department_code || catItem.department_code === "all";
    setCatFormAllDepts(isAllD);
    setCatFormSelectedDepts(isAllD ? [] : (catItem.department_code || "").split(",").map((s: string) => s.trim()));
    const isAllS = !catItem.section_code || catItem.section_code === "all";
    setCatFormAllSections(isAllS);
    setCatFormSelectedSections(isAllS ? [] : (catItem.section_code || "").split(",").map((s: string) => s.trim()));
    setCatFormDesc(catItem.description || "");
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!catFormName.trim()) {
      showNotification("error", "يرجى إدخال اسم حالة عدم المطابقة");
      return;
    }

    setIsSubmitting(true);
    const deptsVal = catFormAllDepts || catFormSelectedDepts.length === 0 ? "all" : catFormSelectedDepts.join(",");
    const secsVal = catFormAllSections || catFormSelectedSections.length === 0 ? "all" : catFormSelectedSections.join(",");

    try {
      let res;
      if (editingCategory) {
        res = await updateCategoryAction(
          editingCategory.id,
          catFormName.trim(),
          catFormSeverity,
          deptsVal,
          secsVal,
          catFormDesc.trim()
        );
      } else {
        res = await createCategoryAction(
          catFormName.trim(),
          catFormSeverity,
          deptsVal,
          secsVal,
          catFormDesc.trim()
        );
      }

      if (res.success) {
        showNotification("success", editingCategory ? "تم تعديل حالة عدم المطابقة بنجاح!" : "تمت إضافة حالة عدم المطابقة بنجاح!");
        setShowCategoryModal(false);
        router.refresh();
      } else {
        showNotification("error", res.error || "فشل الحفظ");
      }
    } catch (err: any) {
      showNotification("error", err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit User Open
  const handleOpenEditUser = (u: any) => {
    setEditingUser(u);
    setUserFormName(u.full_name || "");
    setUserFormJobTitle(u.job_title || "");
    setUserFormCustomRoleId(u.custom_role_id ? String(u.custom_role_id) : "none");
    setUserFormRole(u.role || "field_agent");
    setUserFormDept(u.department_code || "");
    setUserFormCanExcel(u.can_export_excel === 1);
    setShowEditUserModal(true);
  };

  // Sections filtered by selected departments for category modal
  const modalSectionsFiltered = sections.filter((s) => {
    if (catFormAllDepts || catFormSelectedDepts.length === 0) return true;
    return catFormSelectedDepts.includes(s.department_code);
  });

  // Sections filtered strictly by selected departments for role modal
  const roleSectionsFiltered = sections.filter((s) => {
    if (roleFormAllDepts || roleFormSelectedDepts.length === 0) return true;
    return roleFormSelectedDepts.includes(s.department_code);
  });

  // Filter sections by department for sections view
  const filteredSections = sections.filter(
    (s) => selectedDeptFilter === "all" || s.department_code === selectedDeptFilter
  );

  // Expected Next User Number for sequential auto-assignment
  const nextUserNumber = users.reduce((max, u) => Math.max(max, u.user_number || u.id || 100), 100) + 1;

  // Handle Database Reset
  const handleResetDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!resetAdminPin || resetAdminPin.length !== 4) {
      showNotification("error", "يرجى إدخال رمز المرور الإداري المكون من 4 أرقام");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await resetDatabaseAction(resetAdminPin, "cases_only");
      if (res.success) {
        showNotification("success", res.message || "تم تصفير سجلات عدم المطابقة بنجاح والبدء بدورة عمل جديدة!");
        setShowResetConfirmModal(false);
        setResetAdminPin("");
        router.refresh();
      } else {
        showNotification("error", res.error || "فشل تصفير قاعدة البيانات: تأكد من رمز مرور مدير المنظومة");
      }
    } catch (err: any) {
      showNotification("error", err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation Items Structure
  const menuGroups = [
    {
      group: "العمليات وحالات عدم المطابقة (CAPA)",
      items: [
        { id: "create_case", label: "إنشاء حالة جديدة", icon: PlusCircle, badge: null, color: "text-amber-500" },
        { id: "open_cases", label: "الحالات المفتوحة (بانتظار الفرز)", icon: Inbox, badge: pendingCases.length, color: "text-amber-600" },
        { id: "in_progress_cases", label: "الحالات قيد التنفيذ الميداني", icon: Clock, badge: inProgressCases.length, color: "text-blue-600" },
        { id: "review_cases", label: "الحالات التي تحتاج مراجعة", icon: Search, badge: reviewItems.length, color: "text-purple-600" },
        { id: "closed_cases", label: "الحالات المغلقة", icon: CheckCircle2, badge: closedCases.length, color: "text-emerald-600" },
        { id: "all_cases", label: "السجل العام المركزي", icon: Layers, badge: allCases.length, color: "text-slate-600" },
      ],
    },
    ...(isSystemAdmin
      ? [
          {
            group: "التهيئة وإعدادات المنظومة",
            items: [
              { id: "system_config", label: "⚙️ قائمة التهيئة والإعدادات المركزية", icon: Settings, badge: null, color: "text-[#D49A3D]" },
              { id: "users", label: "كادر العمل والمستخدمين", icon: Users, badge: users.length, color: "text-[#682722]" },
              { id: "dynamic_forms", label: "محرك النماذج المتطورة", icon: Sparkles, badge: null, color: "text-[#D49A3D]" },
            ],
          },
          {
            group: "التقارير والرقابة والحساب",
            items: [
              { id: "reports", label: "التقارير وطباعة PDF", icon: Sliders, badge: null, color: "text-blue-600" },
              { id: "audit", label: "سجل التدقيق والرقابة", icon: History, badge: auditLogs.length, color: "text-slate-600" },
              { id: "change_pin", label: "تغيير رمز المرور الشخصي", icon: KeyRound, badge: null, color: "text-[#682722]" },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row relative min-h-[calc(100vh-5rem)]">
      
      {/* Toast Notification */}
      {message && (
        <div
          className={\`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-black shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 \${
            message.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-[#682722] text-amber-50"
          }\`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Official PDF Report Modal */}
      <OfficialPdfReportModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        cases={allCases}
        departments={departments}
        currentUser={currentUser}
      />

      {/* Mobile Topbar for Hamburger toggle */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl bg-slate-100 text-[#1B1111] hover:bg-slate-200"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="text-xs font-black text-[#1B1111]">
          لوحة تحكم المنظومة
        </div>
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center font-mono font-black text-xs">
          #{currentUser?.user_number || currentUser?.id || 101}
        </div>
      </div>

      {/* Modern Collapsible Sidebar */}
      <aside
        className={\`bg-white border-l border-slate-200/80 transition-all duration-300 flex flex-col justify-between z-20 \${
          sidebarOpen ? "w-full md:w-64" : "hidden md:flex md:w-20"
        }\`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Logo / Org Title */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-[#682722] flex items-center justify-center text-[#FFC217] font-black text-lg shadow-sm flex-shrink-0">
              م
            </div>
            <div className={\`overflow-hidden transition-all \${!sidebarOpen && "md:hidden"}\`}>
              <h2 className="font-black text-sm text-[#1B1111] leading-tight">إدارة المنظومة</h2>
              <p className="text-[10px] text-slate-400 font-bold">نظام CAPA وحوكمة الجودة</p>
            </div>
          </div>

          {/* Menus by Group */}
          <div className="space-y-6">
            {menuGroups.map((grp, idx) => (
              <div key={idx} className="space-y-1.5">
                <div
                  className={\`text-[10px] font-black text-slate-400 px-3 uppercase tracking-wider \${
                    !sidebarOpen && "md:hidden"
                  }\`}
                >
                  {grp.group}
                </div>
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "create_case") {
                          const inspectionBtn = document.getElementById("marasim-new-inspection-btn");
                          if (inspectionBtn) inspectionBtn.click();
                        } else {
                          setActiveMenu(item.id);
                        }
                      }}
                      className={\`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-right cursor-pointer \${
                        isActive
                          ? "bg-[#1B1111] text-[#FFC217] shadow-md shadow-[#1B1111]/15"
                          : "text-slate-600 hover:bg-[#FAF7F4] hover:text-[#1B1111]"
                      }\`}
                      title={item.label}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={\`w-4 h-4 flex-shrink-0 \${isActive ? "text-[#FFC217]" : item.color}\`} />
                        <span className={\`\${!sidebarOpen && "md:hidden"} truncate\`}>{item.label}</span>
                      </div>
                      {item.badge !== null && item.badge > 0 && (
                        <span
                          className={\`text-[10px] px-2 py-0.5 rounded-full font-black \${
                            isActive
                              ? "bg-[#FFC217] text-[#1B1111]"
                              : "bg-slate-100 text-slate-700"
                          } \${!sidebarOpen && "md:hidden"}\`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className={\`p-4 border-t border-slate-100 bg-[#FAF7F4]/60 \${!sidebarOpen && "md:hidden"}\`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#D49A3D] text-[#1B1111] flex items-center justify-center font-black text-sm shadow-sm">
              {currentUser?.full_name?.charAt(0) || "م"}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-black text-[#1B1111] truncate">{currentUser?.full_name}</div>
              <div className="text-[10px] font-bold text-[#682722] truncate">
                {currentUser?.role === "super_admin"
                  ? "مدير عام المنظومة (Super Admin)"
                  : currentUser?.role === "general_admin"
                  ? "المدير العام للنظام"
                  : currentUser?.department_name || "إدارة الإشراف والحوكمة"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full">

        {/* Top Control Bar with User Greeting, Sequential ID & Refresh Button */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#682722] text-[#FFC217] flex items-center justify-center font-black text-base shadow-sm">
              {currentUser?.full_name?.charAt(0) || "م"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-[#1B1111]">{currentUser?.full_name}</span>
                <span className="font-mono text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg shadow-2xs">
                  #{currentUser?.user_number || currentUser?.id || "101"}
                </span>
                {isSuperAdmin && (
                  <span className="text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-full">
                    مدير عام المنظومة
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-[#D49A3D]" />
                <span>{currentUser?.department_name || "كافة إدارات المنظومة"}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-semibold">{currentUser?.job_title || "مستخدم معتمد"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2.5 bg-[#FAF7F4] hover:bg-slate-100 text-[#1B1111] font-black text-xs rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              title="تحديث البيانات من السيرفر مباشرة"
            >
              <RotateCw className={\`w-4 h-4 text-[#D49A3D] \${isRefreshing ? "animate-spin" : ""}\`} />
              <span>{isRefreshing ? "جارٍ التحديث..." : "تحديث البيانات"}</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => {
                  setActiveMenu("system_config");
                  setConfigTab("reset");
                }}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs rounded-2xl border border-rose-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="تصفير وتطهير سجلات قاعدة البيانات"
              >
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span className="hidden sm:inline">تصفير السجلات</span>
              </button>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* ⚙️ CENTRAL SYSTEM CONFIGURATION HUB (قائمة التهيئة والإعدادات المركزية) */}
        {/* ============================================================== */}
        {isSystemAdmin && (activeMenu === "system_config" || activeMenu === "departments" || activeMenu === "sections" || activeMenu === "roles" || activeMenu === "categories" || activeMenu === "permissions_matrix") && (
          <div className="space-y-6">
            {/* Header & Sub-Tab Bar */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#D49A3D]">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1B1111]">
                      قائمة التهيئة والإعدادات المركزية للمنظومة
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      التحكم الشامل في الهيكل التنظيمي، الأقسام، الأدوار الوظيفية الموحدة، بنك حالات عدم المطابقة، مصفوفة الصلاحيات، وإدارة البيانات
                    </p>
                  </div>
                </div>
              </div>

              {/* Subtabs Bar */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfigTab("depts")}
                  className={\`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer \${
                    configTab === "depts"
                      ? "bg-[#682722] text-white shadow-xs"
                      : "bg-[#FAF7F4] text-slate-700 hover:bg-slate-200"
                  }\`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>الإدارات الرئيسية ({departments.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigTab("sections")}
                  className={\`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer \${
                    configTab === "sections"
                      ? "bg-[#682722] text-white shadow-xs"
                      : "bg-[#FAF7F4] text-slate-700 hover:bg-slate-200"
                  }\`}
                >
                  <FolderTree className="w-4 h-4" />
                  <span>الأقسام التشغيلية ({sections.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigTab("roles")}
                  className={\`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer \${
                    configTab === "roles"
                      ? "bg-purple-700 text-white shadow-xs"
                      : "bg-purple-50 text-purple-900 hover:bg-purple-100"
                  }\`}
                >
                  <Shield className="w-4 h-4" />
                  <span>الأدوار الوظيفية الموحدة ({roles.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigTab("categories")}
                  className={\`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer \${
                    configTab === "categories"
                      ? "bg-rose-700 text-white shadow-xs"
                      : "bg-rose-50 text-rose-900 hover:bg-rose-100"
                  }\`}
                >
                  <Tag className="w-4 h-4" />
                  <span>دليل حالات عدم المطابقة ({categories.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigTab("matrix")}
                  className={\`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer \${
                    configTab === "matrix"
                      ? "bg-blue-700 text-white shadow-xs"
                      : "bg-blue-50 text-blue-900 hover:bg-blue-100"
                  }\`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>مصفوفة توزيع الصلاحيات</span>
                </button>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setConfigTab("reset")}
                    className={\`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer \${
                      configTab === "reset"
                        ? "bg-rose-700 text-white shadow-xs"
                        : "bg-rose-50 text-rose-900 hover:bg-rose-100"
                    }\`}
                  >
                    <AlertOctagon className="w-4 h-4" />
                    <span>تصفير قاعدة البيانات ⚠️</span>
                  </button>
                )}
              </div>
            </div>

            {/* SUBTAB 1: DEPARTMENTS */}
            {configTab === "depts" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#D49A3D]" />
                      الإدارات التشغيلية ({departments.length})
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">إدارة الهيكل الإداري الرئيسي لمنظومة مطاعم المراسيم</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingDept(null);
                      setShowAddDeptModal(true);
                    }}
                    className="px-4 py-2 bg-[#D49A3D] hover:bg-[#E5A93C] text-[#1B1111] font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>إضافة إدارة جديدة</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {departments.map((dept) => (
                    <div key={dept.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-[#1B1111]">{dept.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              const res = await toggleDepartmentStatusAction(dept.id);
                              if (res.success) showNotification("success", "تم تغيير حالة الإدارة");
                              else showNotification("error", res.error || "فشل");
                            }}
                            className={\`p-1.5 rounded-lg \${dept.status === "disabled" ? "text-slate-400" : "text-emerald-600"}\`}
                            title="تبديل الحالة"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(\`هل أنت متأكد من حذف إدارة (\${dept.name})؟\`)) {
                                const res = await deleteDepartmentAction(dept.id);
                                if (res.success) showNotification("success", "تم حذف الإدارة بنجاح");
                                else showNotification("error", res.error || "فشل الحذف");
                              }
                            }}
                            className="text-slate-300 hover:text-rose-600 p-1.5"
                            title="حذف الإدارة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 font-mono font-bold">{dept.code}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBTAB 2: SECTIONS */}
            {configTab === "sections" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                      <FolderTree className="w-5 h-5 text-[#D49A3D]" />
                      الأقسام والمواقع التشغيلية ({sections.length})
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">إدارة الأقسام التابعة لكل إدارة والمواقع الميدانية للتفتيش</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingSection(null);
                      setShowAddSectionModal(true);
                    }}
                    className="px-4 py-2 bg-[#D49A3D] hover:bg-[#E5A93C] text-[#1B1111] font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>إضافة قسم جديد</span>
                  </button>
                </div>

                {/* Filter sections by Department */}
                <div className="flex flex-wrap gap-2 p-3 bg-white rounded-2xl border border-slate-200">
                  <span className="text-xs font-black text-slate-700 self-center ml-2">تصفية حسب الإدارة:</span>
                  <button
                    onClick={() => setSelectedDeptFilter("all")}
                    className={\`px-3 py-1 rounded-xl text-xs font-bold transition-all \${
                      selectedDeptFilter === "all" ? "bg-[#682722] text-white" : "bg-slate-100 text-slate-700"
                    }\`}
                  >
                    الكل ({sections.length})
                  </button>
                  {departments.map((d) => (
                    <button
                      key={d.code}
                      onClick={() => setSelectedDeptFilter(d.code)}
                      className={\`px-3 py-1 rounded-xl text-xs font-bold transition-all \${
                        selectedDeptFilter === d.code ? "bg-[#682722] text-white" : "bg-slate-100 text-slate-700"
                      }\`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {filteredSections.map((sec) => (
                    <div key={sec.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-[#1B1111]">{sec.name}</span>
                        <button
                          onClick={async () => {
                            if (confirm(\`هل أنت متأكد من حذف قسم (\${sec.name})؟\`)) {
                              const res = await deleteSectionAction(sec.id);
                              if (res.success) showNotification("success", "تم حذف القسم بنجاح");
                              else showNotification("error", res.error || "فشل الحذف");
                            }
                          }}
                          className="text-slate-300 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-500 font-bold">الإدارة: {sec.department_name || sec.department_code}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBTAB 3: UNIFIED ROLES */}
            {configTab === "roles" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      الأدوار الوظيفية الموحدة والصلاحيات ({roles.length})
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      تهيئة الأدوار الوظيفية ككيانات موحدة ومرنة، وتحديد الإدارات التابعة والأقسام وصلاحيات المتابعة والإسناد
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddRole}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>تهيئة دور وظيفي جديد</span>
                  </button>
                </div>

                {roles.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                    <Shield className="w-12 h-12 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-black text-slate-700">لم يتم إنشاء أدوار وظيفية موحدة حتى الآن</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      يمكنك تهيئة أدوار مثل: مفتش جودة الأغذية، فني صيانة تبريد، مشرف مطابخ، وتحديد نطاق عمل كل دور بدقة.
                    </p>
                    <button
                      onClick={handleOpenAddRole}
                      className="px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>تهيئة أول دور الآن</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roles.map((r) => {
                      const isInspector = r.category === "inspector" || r.role_type === "inspector";
                      const isField = r.category === "field_agent" || r.role_type === "field_agent";
                      const isDisabled = r.status === "disabled";

                      let parsedPerms: any = {};
                      try {
                        parsedPerms = JSON.parse(r.permissions_json || "{}");
                      } catch {}

                      return (
                        <div
                          key={r.id}
                          className={\`bg-white p-5 rounded-3xl border shadow-sm space-y-3 transition-all \${
                            isDisabled ? "opacity-60 border-slate-200 bg-slate-50/60" : "border-slate-200 hover:border-purple-300"
                          }\`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-[#1B1111]">{r.name}</span>
                              <span
                                className={\`px-2 py-0.5 rounded-full text-[10px] font-black border \${
                                  isInspector
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : isField
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-purple-50 text-purple-800 border-purple-200"
                                }\`}
                              >
                                {isInspector ? "رقابي / تفتيشي 🔍" : isField ? "تنفيذي ميداني 🛠️" : "إشرافي إداري 🏢"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditRole(r)}
                                className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                                title="تعديل الدور"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  const res = await toggleCustomRoleStatusAction(r.id);
                                  if (res.success) showNotification("success", "تم تغيير حالة الدور بنجاح");
                                  else showNotification("error", res.error || "فشل تغيير الحالة");
                                }}
                                className={\`p-1.5 rounded-lg transition-colors cursor-pointer \${
                                  isDisabled ? "text-slate-400 hover:text-emerald-600" : "text-emerald-600 hover:text-amber-600"
                                }\`}
                                title={isDisabled ? "تفعيل الدور" : "تعطيل الدور"}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(\`هل أنت متأكد من حذف الدور (\${r.name})؟\`)) {
                                    const res = await deleteCustomRoleAction(r.id);
                                    if (res.success) showNotification("success", "تم حذف الدور بنجاح");
                                    else showNotification("error", res.error || "فشل الحذف");
                                  }
                                }}
                                className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="حذف الدور"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="font-bold">الإدارات:</span>
                              <span className="font-semibold text-slate-700 truncate">
                                {!r.allowed_departments || r.allowed_departments === "all"
                                  ? "كافة الإدارات (عام)"
                                  : r.allowed_departments}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-slate-600">
                              <FolderTree className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="font-bold">الأقسام:</span>
                              <span className="font-semibold text-slate-700 truncate">
                                {!r.allowed_sections || r.allowed_sections === "all"
                                  ? "كافة الأقسام"
                                  : r.allowed_sections}
                              </span>
                            </div>

                            {/* Operational permissions badges */}
                            <div className="flex flex-wrap gap-1 pt-1">
                              {parsedPerms.can_view && (
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                                  اطلاع: {parsedPerms.can_view === 'full' ? 'كامل' : parsedPerms.can_view === 'dept_only' ? 'إدارته' : 'خاص'}
                                </span>
                              )}
                              {parsedPerms.can_assign && (
                                <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md font-bold">
                                  إسناد: {parsedPerms.can_assign === 'full' ? 'عام' : parsedPerms.can_assign === 'dept_only' ? 'إدارته' : 'ممنوع'}
                                </span>
                              )}
                              {parsedPerms.can_review && (
                                <span className="text-[10px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded-md font-bold">
                                  اعتماد: {parsedPerms.can_review === 'full' ? 'عام' : parsedPerms.can_review === 'dept_only' ? 'إدارته' : 'ممنوع'}
                                </span>
                              )}
                              {parsedPerms.can_close && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                                  إغلاق: {parsedPerms.can_close === 'full' ? 'عام' : parsedPerms.can_close === 'dept_only' ? 'إدارته' : 'ممنوع'}
                                </span>
                              )}
                            </div>
                          </div>

                          {r.description && (
                            <p className="text-xs text-slate-500 font-medium leading-relaxed bg-[#FAF7F4] p-2.5 rounded-xl border border-slate-100">
                              {r.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 4: CATEGORIES CATALOG */}
            {configTab === "categories" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                      <Tag className="w-5 h-5 text-rose-600" />
                      دليل وبنك حالات عدم المطابقة ({categories.length})
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      إدارة حالات عدم المطابقة المعتمدة وربط كل حالة بالإدارة والقسم المعني
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddCategory}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>إضافة حالة عدم مطابقة</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((c) => {
                    const isDisabled = c.status === "disabled";
                    const isHigh = c.severity === "high";
                    const isMed = c.severity === "medium";

                    return (
                      <div
                        key={c.id}
                        className={\`bg-white p-5 rounded-3xl border shadow-sm space-y-3 transition-all \${
                          isDisabled ? "opacity-60 border-slate-200 bg-slate-50/60" : "border-slate-200 hover:border-rose-300"
                        }\`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-[#1B1111]">{c.name}</span>
                            <span
                              className={\`px-2 py-0.5 rounded-full text-[10px] font-black border \${
                                isHigh
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : isMed
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-blue-50 text-blue-800 border-blue-200"
                              }\`}
                            >
                              {isHigh ? "حرج / عالي ⚠️" : isMed ? "متوسط ⚡" : "عادي ℹ️"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditCategory(c)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="تعديل الحالة"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                const res = await toggleCategoryStatusAction(c.id);
                                if (res.success) showNotification("success", "تم تغيير حالة بنك الحالات");
                                else showNotification("error", res.error || "فشل");
                              }}
                              className={\`p-1.5 rounded-lg transition-colors cursor-pointer \${
                                isDisabled ? "text-slate-400 hover:text-emerald-600" : "text-emerald-600 hover:text-amber-600"
                              }\`}
                              title={isDisabled ? "تفعيل الحالة" : "تعطيل الحالة"}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(\`هل أنت متأكد من حذف (\${c.name}) من دليل الحالات؟\`)) {
                                  const res = await deleteCategoryAction(c.id);
                                  if (res.success) showNotification("success", "تم حذف الحالة بنجاح");
                                  else showNotification("error", res.error || "فشل الحذف");
                                }
                              }}
                              className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="حذف الحالة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="font-bold">الإدارات:</span>
                            <span className="font-semibold text-slate-700 truncate">
                              {!c.department_code || c.department_code === "all" ? "كافة الإدارات" : c.department_code}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-600">
                            <FolderTree className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="font-bold">الأقسام:</span>
                            <span className="font-semibold text-slate-700 truncate">
                              {!c.section_code || c.section_code === "all" ? "كافة الأقسام" : c.section_code}
                            </span>
                          </div>
                        </div>

                        {c.description && (
                          <p className="text-xs text-slate-500 font-medium leading-relaxed bg-[#FAF7F4] p-2.5 rounded-xl border border-slate-100">
                            {c.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUBTAB 5: PERMISSIONS MATRIX */}
            {configTab === "matrix" && (
              <PermissionsMatrixView
                roles={roles}
                permissionsMatrix={permissionsMatrix}
                currentUser={currentUser}
              />
            )}

            {/* SUBTAB 6: RESET DATABASE */}
            {configTab === "reset" && isSuperAdmin && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-sm space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                    <AlertOctagon className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-black text-rose-900">
                      تصفير وتطهير سجلات حالات عدم المطابقة (Database Reset)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                      تتيح هذه الأداة لمدير المنظومة (Super Admin) مسح كافة حالات عدم المطابقة، التكليفات الميدانية، إجراءات المعالجة، وحركات المتابعة والتدقيق والبدء بدورة عمل جديدة تماماً.
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs font-bold text-amber-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-black text-amber-950">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>ضمانات الأمان والحفظ:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800 pr-1">
                    <li>لن يتم حذف أي مستخدم أو كادر وظيفي أو تغيير رموز PIN.</li>
                    <li>لن يتم المساس بالهيكل الإداري (الإدارات، الأقسام، والأدوار الوظيفية الموحدة).</li>
                    <li>لن يتم حذف دليل وتصنيفات حالات عدم المطابقة.</li>
                    <li>تقتصر العملية فقط على تنظيف الحالات والتكليفات الميدانية وسجلات التدقيق المرتبطة بها.</li>
                  </ul>
                </div>

                <form onSubmit={handleResetDatabase} className="max-w-md space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">
                      أدخل رمز مرور مدير المنظومة (Super Admin PIN) لتأكيد العملية *
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      pattern="\\d{4}"
                      required
                      value={resetAdminPin}
                      onChange={(e) => setResetAdminPin(e.target.value)}
                      placeholder="••••"
                      className="w-full h-11 px-4 text-center font-mono font-black text-base bg-[#FAF7F4] border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || resetAdminPin.length !== 4}
                    className="w-full h-12 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جارٍ تصفير السجلات...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>تأكيد تصفير سجلات الحالات الآن</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 📊 REPORTS VIEW (مدير النظام فقط)                               */}
        {/* ============================================================== */}
        {isSystemAdmin && activeMenu === "reports" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-600" />
                  مركز التقارير والرقابة والطباعة
                </h3>
                <p className="text-xs text-slate-500 font-semibold">استخراج التقارير الرسمية المصورة وطباعة محاضر الإغلاق</p>
              </div>
              <button
                onClick={() => setShowPdfModal(true)}
                className="px-5 py-2.5 bg-[#682722] hover:bg-[#7D2F28] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4 text-[#FFC217]" />
                <span>إصدار تقرير رسمي مصور (PDF)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-slate-400 font-bold">إجمالي الحالات المسجلة</span>
                <div className="text-2xl font-black text-[#1B1111]">{allCases.length}</div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-amber-600 font-bold">الحالات المفتوحة (فرز)</span>
                <div className="text-2xl font-black text-amber-700">{pendingCases.length}</div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-blue-600 font-bold">قيد التنفيذ بالميدان</span>
                <div className="text-2xl font-black text-blue-700">{inProgressCases.length}</div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-emerald-600 font-bold">الحالات المكتملة والمغلقة</span>
                <div className="text-2xl font-black text-emerald-700">{closedCases.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 🪄 DYNAMIC FORMS BUILDER (مدير النظام فقط)                     */}
        {/* ============================================================== */}
        {isSystemAdmin && activeMenu === "dynamic_forms" && (
          <div className="space-y-4">
            <FormBuilder />
          </div>
        )}

        {/* ============================================================== */}
        {/* 📥 OPEN CASES (بانتظار الفرز والتكليف)                           */}
        {/* ============================================================== */}
        {activeMenu === "open_cases" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-amber-600" />
                  الحالات المفتوحة بانتظار الفرز والتكليف ({pendingCases.length})
                </h3>
                <p className="text-xs text-slate-500 font-semibold">تحديد الجهات المكلفة أو الأشخاص وتوزيع المهام الميدانية</p>
              </div>
            </div>

            {pendingCases.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-black text-slate-700">لا توجد حالات بانتظار الفرز حالياً</h4>
                <p className="text-xs text-slate-400">كافة حالات عدم المطابقة تم فرزها وتكليفها للجهات المعنية.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingCases.map((c) => {
                  const isHigh = c.severity === "high";
                  const isMed = c.severity === "medium";
                  const isDispatched = c.assignments_count > 0;
                  const isLoading = dispatchLoading[c.id];

                  return (
                    <div
                      key={c.id}
                      className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 hover:border-amber-300 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                            #{c.case_number}
                          </span>
                          <span className="font-black text-sm text-[#1B1111]">{c.title || c.category_name}</span>
                          <span
                            className={\`px-2.5 py-0.5 rounded-full text-[10px] font-black border \${
                              isHigh
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : isMed
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                            }\`}
                          >
                            {isHigh ? "عالي الخطورة ⚠️" : isMed ? "متوسط ⚡" : "عادي ℹ️"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{c.created_at}</span>
                          {canDeleteCases && (
                            <button
                              onClick={() => handleDeleteCase(c.id, c.case_number)}
                              className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="حذف الحالة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Location & Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-slate-600 font-bold">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span>الإدارة: {c.department_name || c.department_code}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600 font-bold">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>القسم والموقع: {c.section_name || c.location || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600 font-bold">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>المفتش الراصد: {c.inspector_name || "النظام"}</span>
                          </div>
                        </div>

                        <div className="bg-[#FAF7F4] p-3 rounded-2xl border border-slate-100">
                          <span className="font-black text-[#1B1111] block mb-1">وصف عدم المطابقة:</span>
                          <p className="text-slate-600 leading-relaxed font-semibold">
                            {c.description || "لا يوجد وصف إضافي مسجل"}
                          </p>
                        </div>
                      </div>

                      {/* Dispatch Selector with permissions enforcement */}
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        {userPermissions?.can_assign === 'none' ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-bold text-amber-900">
                            ⚠️ ليس لديك صلاحية إسناد المهام أو التكليف. وظيفتك تقتصر على المتابعة أو الاطلاع.
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-black text-[#1B1111]">
                                اختر الجهة المكلفة أو الموظف المنفذ بالاسم:
                              </label>
                              {userPermissions?.can_assign === 'dept_only' && (
                                <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-full font-black">
                                  إسناد داخلي (ضمن إدارتك فقط)
                                </span>
                              )}
                            </div>

                            {/* By Department */}
                            <div className="flex flex-wrap gap-2">
                              {departments
                                .filter((dept) => userPermissions?.can_assign === 'full' || dept.code === currentUser?.department_code)
                                .map((dept) => {
                                  const isSelected = (dispatchSelections[c.id] || []).includes(dept.code);
                                  return (
                                    <button
                                      key={dept.code}
                                      type="button"
                                      onClick={() => toggleDeptForCase(c.id, dept.code)}
                                      className={\`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer \${
                                        isSelected
                                          ? "bg-[#682722] text-white shadow-sm"
                                          : "bg-[#FAF7F4] text-slate-700 hover:bg-slate-200"
                                      }\`}
                                    >
                                      {isSelected && <Check className="w-3.5 h-3.5" />}
                                      <span>{dept.name}</span>
                                    </button>
                                  );
                              })}
                            </div>

                            {/* By Specific User */}
                            {fieldRoles.filter((u) => userPermissions?.can_assign === 'full' || u.department_code === currentUser?.department_code).length > 0 && (
                              <div>
                                <span className="text-[11px] font-bold text-slate-400 block mb-1.5">أو إسناد مباشر بالاسم للموظف:</span>
                                <div className="flex flex-wrap gap-2">
                                  {fieldRoles
                                    .filter((u) => userPermissions?.can_assign === 'full' || u.department_code === currentUser?.department_code)
                                    .map((u) => {
                                      const isSelected = (dispatchUserSelections[c.id] || []).includes(u.id);
                                      return (
                                        <button
                                          key={u.id}
                                          type="button"
                                          onClick={() => toggleUserForCase(c.id, u.id)}
                                          className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer \${
                                            isSelected
                                              ? "bg-[#D49A3D] text-[#1B1111] shadow-sm font-black"
                                              : "bg-[#FAF7F4] text-slate-700 hover:bg-slate-200"
                                          }\`}
                                        >
                                          {isSelected && <Check className="w-3.5 h-3.5" />}
                                          <span>{u.full_name}</span>
                                          <span className="text-[10px] text-slate-400">({u.job_title || u.role})</span>
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {/* Dispatch Instructions & Action Button */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                              <input
                                type="text"
                                value={dispatchInstructions[c.id] || ""}
                                onChange={(e) =>
                                  setDispatchInstructions((prev) => ({ ...prev, [c.id]: e.target.value }))
                                }
                                placeholder="تعليمات وتوجيهات خاصة للمنفذ الميداني..."
                                className="flex-1 h-11 px-4 bg-[#FAF7F4] border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D49A3D]"
                              />
                              <button
                                type="button"
                                onClick={() => handleDispatch(c)}
                                disabled={isLoading}
                                className="h-11 px-6 bg-[#682722] hover:bg-[#7D2F28] disabled:opacity-50 text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                              >
                                {isLoading ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>جارٍ الإسناد...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4 text-[#FFC217]" />
                                    <span>تأكيد الإسناد والتكليف الميداني</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 🛠️ IN PROGRESS CASES (قيد التنفيذ بالميدان)                      */}
        {/* ============================================================== */}
        {activeMenu === "in_progress_cases" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  الحالات قيد التنفيذ الميداني ({inProgressCases.length})
                </h3>
                <p className="text-xs text-slate-500 font-semibold">متابعة التكليفات المسندة للفرق الميدانية بانتظار رفع المعالجة والإثبات</p>
              </div>
            </div>

            {inProgressCases.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                <Clock className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-black text-slate-700">لا توجد حالات قيد التنفيذ حالياً</h4>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inProgressCases.map((c) => (
                  <div key={c.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                        #{c.case_number}
                      </span>
                      <span className="text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                        جاري التنفيذ (جولة {c.current_round || 1})
                      </span>
                    </div>
                    <div className="font-black text-sm text-[#1B1111]">{c.title || c.category_name}</div>
                    <div className="text-xs text-slate-500 font-semibold">{c.description}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 pt-2 border-t">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{c.department_name} - {c.section_name || c.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 🔍 REVIEW CASES (بانتظار الاعتماد والمراجعة)                     */}
        {/* ============================================================== */}
        {activeMenu === "review_cases" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                  <Search className="w-5 h-5 text-purple-600" />
                  حالات تم تنفيذها وبانتظار اعتماد الإشراف ({reviewItems.length})
                </h3>
                <p className="text-xs text-slate-500 font-semibold">مراجعة تقارير الإنجاز والصور المرفقة للاعتماد أو الإعادة أو الإغلاق</p>
              </div>
            </div>

            {reviewItems.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                <CheckCheck className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-black text-slate-700">لا توجد حالات بانتظار الاعتماد حالياً</h4>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewItems.map((item) => {
                  const isLoading = reviewLoading[item.assignment_id];

                  return (
                    <div key={item.assignment_id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                            #{item.case_number}
                          </span>
                          <span className="font-black text-sm text-[#1B1111]">{item.title || item.category_name}</span>
                          <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-black">
                            تم التنفيذ (بانتظار الاعتماد)
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{item.submitted_at}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-2">
                          <div>
                            <span className="text-slate-400 font-bold block mb-0.5">المنفذ الميداني:</span>
                            <span className="font-black text-[#1B1111]">{item.assigned_to_user_name || item.assigned_to_dept}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block mb-0.5">تقرير وإجراء المعالجة:</span>
                            <p className="bg-[#FAF7F4] p-3 rounded-2xl border text-slate-700 font-semibold leading-relaxed">
                              {item.action_taken || "تم إنجاز المعالجة المطلوبة"}
                            </p>
                          </div>
                        </div>

                        {item.evidence_url && (
                          <div>
                            <span className="text-slate-400 font-bold block mb-1">صورة إثبات المعالجة:</span>
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-44 bg-slate-50 flex items-center justify-center">
                              <img src={item.evidence_url} alt="إثبات الإنجاز" className="object-contain max-h-full max-w-full" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Approval Actions */}
                      <div className="flex flex-wrap gap-2 pt-3 border-t justify-end">
                        {userPermissions?.can_review === 'none' ? (
                          <span className="text-xs font-bold text-slate-400 py-2">
                            (غير مصرح لك باعتماد أو إعادة توجيه المهام)
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(item)}
                              disabled={isLoading}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>اعتماد الإنجاز وإغلاق التكليف</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveReviewModal({ type: "reassign", item })}
                              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>رفض وإعادة للجولة ({item.round + 1})</span>
                            </button>
                            {userPermissions?.can_close !== 'none' && (
                              <button
                                type="button"
                                onClick={() => setActiveReviewModal({ type: "close", item })}
                                className="px-4 py-2.5 bg-[#1B1111] hover:bg-slate-800 text-[#FFC217] rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <AlertOctagon className="w-4 h-4" />
                                <span>إغلاق الحالة نهائياً</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ✅ CLOSED CASES (الحالات المغلقة)                               */}
        {/* ============================================================== */}
        {activeMenu === "closed_cases" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  أرشيف الحالات المغلقة والمكتملة ({closedCases.length})
                </h3>
                <p className="text-xs text-slate-500 font-semibold">سجل حالات عدم المطابقة التي تم إغلاقها واعتماد معالجتها بنجاح</p>
              </div>
            </div>

            {closedCases.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-black text-slate-700">لا توجد حالات مغلقة في السجل حالياً</h4>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {closedCases.map((c) => (
                  <div key={c.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                        #{c.case_number}
                      </span>
                      <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> مغلقة نهائياً
                      </span>
                    </div>
                    <div className="font-black text-sm text-[#1B1111]">{c.title || c.category_name}</div>
                    <div className="text-xs text-slate-500 font-semibold">{c.description}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 pt-2 border-t">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{c.department_name} - {c.section_name || c.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 📚 ALL CASES (السجل العام المركزي)                              */}
        {/* ============================================================== */}
        {activeMenu === "all_cases" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div>
                <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-slate-600" />
                  السجل العام المركزي لحالات عدم المطابقة ({allCases.length})
                </h3>
                <p className="text-xs text-slate-500 font-semibold">البحث والتصفية ومتابعة كافة الحالات المسجلة في المنظومة</p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                <input
                  type="text"
                  value={caseSearchQuery}
                  onChange={(e) => setCaseSearchQuery(e.target.value)}
                  placeholder="ابحث برقم الحالة، العنوان، الموقع، أو الإدارة..."
                  className="w-full h-10 pr-9 pl-4 bg-[#FAF7F4] border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D49A3D]"
                />
              </div>

              <select
                value={caseFilterStatus}
                onChange={(e) => setCaseFilterStatus(e.target.value)}
                className="h-10 px-3 bg-[#FAF7F4] border rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="all">كافة الحالات</option>
                <option value="open">مفتوحة (بانتظار الفرز)</option>
                <option value="in_progress">قيد التنفيذ الميداني</option>
                <option value="closed">مغلقة ومكتملة</option>
              </select>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF7F4] text-[#1B1111] font-black border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">رقم الحالة</th>
                      <th className="py-3 px-4">الحالة / التصنيف</th>
                      <th className="py-3 px-4">الإدارة والموقع</th>
                      <th className="py-3 px-4">مستوى الخطورة</th>
                      <th className="py-3 px-4">المرحلة</th>
                      <th className="py-3 px-4">التاريخ</th>
                      {canDeleteCases && <th className="py-3 px-4 text-center">حذف</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {allCases
                      .filter((c) => {
                        const matchesQuery =
                          !caseSearchQuery ||
                          String(c.case_number).includes(caseSearchQuery) ||
                          (c.title || "").includes(caseSearchQuery) ||
                          (c.department_name || "").includes(caseSearchQuery) ||
                          (c.location || "").includes(caseSearchQuery);
                        const matchesStatus =
                          caseFilterStatus === "all" ||
                          (caseFilterStatus === "open" && c.status === "open") ||
                          (caseFilterStatus === "in_progress" && (c.status === "assigned" || c.status === "in_progress")) ||
                          (caseFilterStatus === "closed" && c.status === "closed");
                        return matchesQuery && matchesStatus;
                      })
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-black font-mono">#{c.case_number}</td>
                          <td className="py-3 px-4 font-black text-[#1B1111]">{c.title || c.category_name}</td>
                          <td className="py-3 px-4">{c.department_name} - {c.section_name || c.location}</td>
                          <td className="py-3 px-4">
                            <span
                              className={\`px-2 py-0.5 rounded-full text-[10px] font-black \${
                                c.severity === "high"
                                  ? "bg-rose-50 text-rose-800"
                                  : c.severity === "medium"
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-blue-50 text-blue-800"
                              }\`}
                            >
                              {c.severity === "high" ? "حرج" : c.severity === "medium" ? "متوسط" : "عادي"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={\`px-2 py-0.5 rounded-full text-[10px] font-black \${
                                c.status === "closed"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : c.status === "open"
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-blue-50 text-blue-800"
                              }\`}
                            >
                              {c.status === "closed" ? "مغلقة" : c.status === "open" ? "مفتوحة" : "قيد التنفيذ"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{c.created_at}</td>
                          {canDeleteCases && (
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleDeleteCase(c.id, c.case_number)}
                                className="text-slate-300 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 👥 USERS VIEW (المستخدمين وكادر العمل - مدير النظام فقط)       */}
        {/* ============================================================== */}
        {isSystemAdmin && activeMenu === "users" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div>
                <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#682722]" />
                  إدارة كادر العمل والمستخدمين ({users.length})
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  تسجيل الدخول يتم برقم المستخدم ورمز PIN المكون من 4 أرقام
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setShowAddUserModal(true);
                }}
                className="px-4 py-2.5 bg-[#682722] hover:bg-[#7D2F28] text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة مستخدم جديد</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF7F4] text-[#1B1111] font-black border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">رقم المستخدم</th>
                      <th className="py-3 px-4">الاسم الكامل</th>
                      <th className="py-3 px-4">المسمى الوظيفي</th>
                      <th className="py-3 px-4">الدور الوظيفي الموحد</th>
                      <th className="py-3 px-4">الإدارة التابع لها</th>
                      <th className="py-3 px-4">رمز المرور (PIN)</th>
                      <th className="py-3 px-4 text-center">إكسل</th>
                      <th className="py-3 px-4 text-center">الحالة</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {users.map((u) => {
                      const isProtected = u.is_protected === 1;
                      const isDisabled = u.status === "disabled";

                      return (
                        <tr key={u.id} className={\`hover:bg-slate-50 \${isProtected ? "bg-amber-50/40" : ""}\`}>
                          <td className="py-3 px-4">
                            <span className="font-mono font-black text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-300">
                              #{u.user_number || u.id}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-black text-[#1B1111] flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>{u.full_name}</span>
                            {isProtected && (
                              <span className="text-[10px] bg-[#D49A3D] text-[#1B1111] px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                <Lock className="w-3 h-3" /> محمي
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-600">{u.job_title || "-"}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              {u.custom_role_name && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300">
                                  🛡️ {u.custom_role_name}
                                </span>
                              )}
                              <span className={\`px-2 py-0.5 rounded-full text-[10px] font-black \${
                                u.role === "super_admin"
                                  ? "bg-purple-100 text-purple-900 border border-purple-300"
                                  : u.role === "general_admin"
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : u.role === "admin"
                                  ? "bg-blue-100 text-blue-900 border border-blue-300"
                                  : u.role === "inspector"
                                  ? "bg-indigo-100 text-indigo-900 border border-indigo-300"
                                  : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              }\`}>
                                {u.role === "super_admin" ? "مدير عام المنظومة" : u.role === "general_admin" ? "المدير العام" : u.role === "admin" ? "إداري" : u.role === "inspector" ? "مفتش جودة" : "منفذ ميداني"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-700">{u.department_name}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                {u.pin_code}
                              </span>
                              {!isProtected && (
                                <button
                                  onClick={() => setChangePinModalUser(u)}
                                  className="text-slate-400 hover:text-slate-700 p-1"
                                  title="تغيير رمز المرور"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={async () => {
                                const res = await toggleUserExcelAction(u.id);
                                if (res.success) showNotification("success", "تم تعديل صلاحية الإكسل");
                                else showNotification("error", res.error || "فشل");
                              }}
                              className={\`p-1.5 rounded-lg \${u.can_export_excel === 1 ? "text-emerald-600 bg-emerald-50" : "text-slate-300"}\`}
                              title="تفعيل/تعطيل تصدير إكسل"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={\`px-2 py-0.5 rounded-full text-[10px] font-black \${
                                isDisabled ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-700"
                              }\`}
                            >
                              {isDisabled ? "معطل" : "نشط"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                title="تعديل المستخدم"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {!isProtected && (
                                <>
                                  <button
                                    onClick={async () => {
                                      const res = await toggleUserStatusAction(u.id);
                                      if (res.success) showNotification("success", "تم تغيير حالة الحساب");
                                      else showNotification("error", res.error || "فشل");
                                    }}
                                    className={\`p-1.5 rounded-lg transition-colors cursor-pointer \${
                                      isDisabled ? "text-slate-400 hover:text-emerald-600" : "text-emerald-600 hover:text-amber-600"
                                    }\`}
                                    title={isDisabled ? "تفعيل الحساب" : "تعطيل الحساب"}
                                  >
                                    <Power className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(\`هل أنت متأكد من حذف المستخدم (\${u.full_name})؟\`)) {
                                        const res = await deleteUserAction(u.id);
                                        if (res.success) showNotification("success", "تم حذف المستخدم بنجاح");
                                        else showNotification("error", res.error || "فشل الحذف");
                                      }
                                    }}
                                    className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="حذف المستخدم"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 🔐 CHANGE MY PIN (مدير النظام فقط)                             */}
        {/* ============================================================== */}
        {isSystemAdmin && activeMenu === "change_pin" && (
          <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2 border-b pb-3">
              <KeyRound className="w-5 h-5 text-[#682722]" />
              <span>تغيير رمز المرور الشخصي (PIN)</span>
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (newPinInput !== confirmPinInput) {
                  showNotification("error", "رمز المرور الجديد وتأكيده غير متطابقين");
                  return;
                }
                const res = await changeMyPinAction(currentPinInput, newPinInput);
                if (res.success) {
                  showNotification("success", "تم تغيير رمز المرور الخاص بك بنجاح!");
                  setCurrentPinInput("");
                  setNewPinInput("");
                  setConfirmPinInput("");
                } else {
                  showNotification("error", res.error || "فشل تغيير الرمز");
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-black text-slate-800 mb-1">رمز المرور الحالي (4 أرقام) *</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value)}
                  className="w-full h-11 px-3 bg-[#FAF7F4] border rounded-xl font-mono text-center text-base font-black"
                />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">رمز المرور الجديد (4 أرقام) *</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="w-full h-11 px-3 bg-[#FAF7F4] border rounded-xl font-mono text-center text-base font-black"
                />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">تأكيد الرمز الجديد *</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  className="w-full h-11 px-3 bg-[#FAF7F4] border rounded-xl font-mono text-center text-base font-black"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#682722] hover:bg-[#7D2F28] text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
              >
                تحديث رمز المرور
              </button>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* 📜 AUDIT LOGS (مدير النظام فقط)                               */}
        {/* ============================================================== */}
        {isSystemAdmin && activeMenu === "audit" && (
          <div className="space-y-4">
            <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
              <History className="w-5 h-5 text-slate-600" />
              سجل التدقيق والحوكمة الرقمية ({auditLogs.length})
            </h3>
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF7F4] text-[#1B1111] font-black border-b">
                    <tr>
                      <th className="py-3 px-4">رقم الحالة</th>
                      <th className="py-3 px-4">نوع الإجراء</th>
                      <th className="py-3 px-4">المسؤول</th>
                      <th className="py-3 px-4">التفاصيل</th>
                      <th className="py-3 px-4">التوقيت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-black font-mono">#{log.case_number}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-900">
                            {log.event_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">{log.actor_name}</td>
                        <td className="py-3 px-4 max-w-md">{log.details}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{log.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* 🛠️ MODALS WITH DOUBLE-CLICK LOCK & GRANULAR PERMISSIONS        */}
      {/* ============================================================== */}

      {/* MODAL: ADD / EDIT ROLE */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] max-w-xl w-full p-6 shadow-2xl space-y-4 border border-purple-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-black text-base text-[#1B1111] flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span>{editingRole ? "تعديل الدور الوظيفي الموحد" : "تهيئة دور وظيفي موحد جديد"}</span>
              </h4>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
              <div>
                <label className="block font-black text-slate-800 mb-1">مسمى الدور الوظيفي *</label>
                <input
                  type="text"
                  required
                  value={roleFormName}
                  onChange={(e) => setRoleFormName(e.target.value)}
                  placeholder="مثال: مدير صيانة التبريد، مشرف مطابخ، مفتش جودة الأغذية..."
                  className="w-full h-11 px-3 bg-[#FAF7F4] border rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">طبيعة الدور الأساسي *</label>
                <select
                  value={roleFormCategory}
                  onChange={(e: any) => setRoleFormCategory(e.target.value)}
                  className="w-full h-11 px-3 bg-[#FAF7F4] border rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="admin">إشرافي وإداري (فرز واعتماد وإسناد) 🏢</option>
                  <option value="inspector">رقابي وتفتيشي (رصد حالات عدم المطابقة) 🔍</option>
                  <option value="field_agent">تنفيذي ميداني (معالجة وتنفيذ مهام) 🛠️</option>
                </select>
              </div>

              {/* Allowed Departments Selection */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="font-black text-slate-800">الإدارة التابع لها الدور:</label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-purple-700">
                    <input
                      type="checkbox"
                      checked={roleFormAllDepts}
                      onChange={(e) => {
                        setRoleFormAllDepts(e.target.checked);
                        if (e.target.checked) setRoleFormSelectedDepts([]);
                      }}
                    />
                    <span>عام (يشمل كافة الإدارات)</span>
                  </label>
                </div>

                {!roleFormAllDepts && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 max-h-36 overflow-y-auto">
                    {departments.map((d) => {
                      const isChecked = roleFormSelectedDepts.includes(d.code);
                      return (
                        <label key={d.code} className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRoleFormSelectedDepts([...roleFormSelectedDepts, d.code]);
                              } else {
                                setRoleFormSelectedDepts(roleFormSelectedDepts.filter((c) => c !== d.code));
                              }
                            }}
                          />
                          <span>{d.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Allowed Sections Selection - Cascading strictly by selected department! */}
              <div className="space-y-2 p-3 bg-purple-50/50 rounded-2xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-black text-purple-950">الأقسام التشغيلية المصرح بها:</label>
                    <p className="text-[11px] text-purple-700 font-semibold">
                      {roleFormAllDepts
                        ? "تظهر أقسام كافة الإدارات"
                        : roleFormSelectedDepts.length > 0
                        ? \`أقسام الإدارات المحددة فقط (\${roleSectionsFiltered.length})\`
                        : "يرجى تحديد الإدارة أولاً لتظهر أقسامها"}
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (roleFormAllSections) {
                        setRoleFormAllSections(false);
                        setRoleFormSelectedSections([]);
                      } else {
                        setRoleFormAllSections(true);
                        setRoleFormSelectedSections(roleSectionsFiltered.map((s) => s.code));
                      }
                    }}
                    className="px-2.5 py-1 bg-purple-200 hover:bg-purple-300 text-purple-900 rounded-lg font-black text-[11px] transition-colors cursor-pointer"
                  >
                    {roleFormAllSections ? "إلغاء تحديد الكل" : "✓ تحديد جميع أقسام هذه الإدارة"}
                  </button>
                </div>

                {!roleFormAllSections && (
                  <div className="pt-2 border-t border-purple-200">
                    {roleSectionsFiltered.length === 0 ? (
                      <div className="text-center py-3 text-slate-400 font-bold text-xs">
                        لا توجد أقسام مسجلة للإدارة المحددة
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                        {roleSectionsFiltered.map((s) => {
                          const isChecked = roleFormSelectedSections.includes(s.code);
                          return (
                            <label key={s.code} className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRoleFormSelectedSections([...roleFormSelectedSections, s.code]);
                                  } else {
                                    setRoleFormSelectedSections(roleFormSelectedSections.filter((c) => c !== s.code));
                                  }
                                }}
                              />
                              <span>{s.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Operational Permissions Matrix */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="font-black text-slate-800 block">الصلاحيات والحركات التشغيلية المصرح بها لهذا الدور:</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  {/* View */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="font-black text-slate-900 block mb-1">صلاحية الاطلاع:</span>
                    <select
                      value={rolePermView}
                      onChange={(e: any) => setRolePermView(e.target.value)}
                      className="w-full p-1.5 bg-[#FAF7F4] border rounded-lg font-bold"
                    >
                      <option value="dept_only">نطاق إدارته وأقسامه فقط 🏢</option>
                      <option value="full">كامل المنظومة (كافة الإدارات) 🌐</option>
                      <option value="none">ما يسند إليه شخصياً فقط 👤</option>
                    </select>
                  </div>

                  {/* Assign */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="font-black text-slate-900 block mb-1">صلاحية التكليف والإسناد:</span>
                    <select
                      value={rolePermAssign}
                      onChange={(e: any) => setRolePermAssign(e.target.value)}
                      className="w-full p-1.5 bg-[#FAF7F4] border rounded-lg font-bold"
                    >
                      <option value="dept_only">إسناد داخلي ضمن إدارته فقط 🔒</option>
                      <option value="full">إسناد لأي إدارة في المنظومة 🚀</option>
                      <option value="none">غير مصرح بالإسناد ✕</option>
                    </select>
                  </div>

                  {/* Review */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="font-black text-slate-900 block mb-1">صلاحية المراجعة والاعتماد:</span>
                    <select
                      value={rolePermReview}
                      onChange={(e: any) => setRolePermReview(e.target.value)}
                      className="w-full p-1.5 bg-[#FAF7F4] border rounded-lg font-bold"
                    >
                      <option value="dept_only">مراجعة واعتماد إدارته فقط 🔒</option>
                      <option value="full">اعتماد مهام كافة الإدارات 🚀</option>
                      <option value="none">غير مصرح بالاعتماد ✕</option>
                    </select>
                  </div>

                  {/* Close */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="font-black text-slate-900 block mb-1">صلاحية الإغلاق النهائي:</span>
                    <select
                      value={rolePermClose}
                      onChange={(e: any) => setRolePermClose(e.target.value)}
                      className="w-full p-1.5 bg-[#FAF7F4] border rounded-lg font-bold"
                    >
                      <option value="dept_only">إغلاق حالات إدارته فقط 🔒</option>
                      <option value="full">إغلاق كافة حالات المنظومة 🚀</option>
                      <option value="none">غير مصرح بالإغلاق ✕</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">الوصف والاختصاصات</label>
                <textarea
                  rows={2}
                  value={roleFormDesc}
                  onChange={(e) => setRoleFormDesc(e.target.value)}
                  placeholder="وصف مهام هذا الدور وصلاحياته الميدانية..."
                  className="w-full p-2.5 bg-[#FAF7F4] border rounded-xl font-semibold resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowRoleModal(false)} className="px-4 py-2 rounded-xl text-slate-600 font-bold">إلغاء</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <span>{editingRole ? "تحديث الدور" : "حفظ الدور الجديد"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CATEGORY (حالات عدم المطابقة) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 shadow-2xl space-y-4 border border-rose-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-black text-base text-[#1B1111] flex items-center gap-2">
                <Tag className="w-5 h-5 text-rose-600" />
                <span>{editingCategory ? "تعديل حالة عدم المطابقة" : "إضافة حالة عدم مطابقة جديدة"}</span>
              </h4>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-black text-slate-800 mb-1">اسم حالة عدم المطابقة *</label>
                <input
                  type="text"
                  required
                  value={catFormName}
                  onChange={(e) => setCatFormName(e.target.value)}
                  placeholder="مثال: عدم ارتداء القفازات، سوء حفظ المواد الغذائية، تسرب مياه..."
                  className="w-full h-11 px-3 bg-[#FAF7F4] border rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">مستوى الخطورة *</label>
                <select
                  value={catFormSeverity}
                  onChange={(e: any) => setCatFormSeverity(e.target.value)}
                  className="w-full h-11 px-3 bg-[#FAF7F4] border rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  <option value="low">عادي (Low / Normal)</option>
                  <option value="medium">متوسط (Medium)</option>
                  <option value="high">حرج / عالي الخطورة (High Severity)</option>
                </select>
              </div>

              {/* Department Linking */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="font-black text-slate-800">الإدارات المرتبطة بالحالة:</label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-rose-700">
                    <input
                      type="checkbox"
                      checked={catFormAllDepts}
                      onChange={(e) => {
                        setCatFormAllDepts(e.target.checked);
                        if (e.target.checked) setCatFormSelectedDepts([]);
                      }}
                    />
                    <span>جميع الإدارات (عامة)</span>
                  </label>
                </div>

                {!catFormAllDepts && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 max-h-32 overflow-y-auto">
                    {departments.map((d) => {
                      const isChecked = catFormSelectedDepts.includes(d.code);
                      return (
                        <label key={d.code} className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCatFormSelectedDepts([...catFormSelectedDepts, d.code]);
                              } else {
                                setCatFormSelectedDepts(catFormSelectedDepts.filter((c) => c !== d.code));
                              }
                            }}
                          />
                          <span>{d.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section Linking (Cascading strictly by selected departments!) */}
              <div className="space-y-2 p-3 bg-rose-50/50 rounded-2xl border border-rose-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-black text-slate-800">الأقسام والمواقع المرتبطة بها:</label>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      {catFormAllDepts
                        ? "تظهر أقسام كافة الإدارات"
                        : \`أقسام الإدارات المحددة فقط (\${modalSectionsFiltered.length})\`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (catFormAllSections) {
                        setCatFormAllSections(false);
                        setCatFormSelectedSections([]);
                      } else {
                        setCatFormAllSections(true);
                        setCatFormSelectedSections(modalSectionsFiltered.map((s) => s.code));
                      }
                    }}
                    className="px-2.5 py-1 bg-rose-200 hover:bg-rose-300 text-rose-900 rounded-lg font-black text-[11px] transition-colors cursor-pointer"
                  >
                    {catFormAllSections ? "إلغاء تحديد الكل" : "✓ تحديد جميع أقسام الإدارات"}
                  </button>
                </div>

                {!catFormAllSections && (
                  <div className="pt-2 border-t border-rose-200">
                    {modalSectionsFiltered.length === 0 ? (
                      <div className="text-center py-2 text-slate-400 font-bold text-xs">
                        لا توجد أقسام مسجلة للإدارات المحددة
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                        {modalSectionsFiltered.map((s) => {
                          const isChecked = catFormSelectedSections.includes(s.code);
                          return (
                            <label key={s.code} className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCatFormSelectedSections([...catFormSelectedSections, s.code]);
                                  } else {
                                    setCatFormSelectedSections(catFormSelectedSections.filter((c) => c !== s.code));
                                  }
                                }}
                              />
                              <span>{s.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">الوصف والإرشادات</label>
                <textarea
                  rows={2}
                  value={catFormDesc}
                  onChange={(e) => setCatFormDesc(e.target.value)}
                  placeholder="وصف تفصيلي للحالة ومعايير التحقق منها في الميدان..."
                  className="w-full p-2.5 bg-[#FAF7F4] border rounded-xl font-semibold resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-slate-600 font-bold">إلغاء</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingCategory ? "تحديث الحالة" : "حفظ الحالة في البنك"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DEPARTMENT */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-black text-base text-[#1B1111] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#D49A3D]" />
                <span>إضافة إدارة تشغيلية جديدة</span>
              </h4>
              <button onClick={() => setShowAddDeptModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmitting) return;
                setIsSubmitting(true);
                try {
                  const form = e.currentTarget;
                  const name = (form.elements.namedItem("name") as HTMLInputElement).value;
                  const res = await createDepartmentAction(name);
                  if (res.success) {
                    showNotification("success", "تمت إضافة الإدارة بنجاح!");
                    setShowAddDeptModal(false);
                    router.refresh();
                  } else {
                    showNotification("error", res.error || "فشل الحفظ");
                  }
                } catch (err: any) {
                  showNotification("error", err.message || "حدث خطأ");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-black text-slate-800 mb-1">اسم الإدارة *</label>
                <input name="name" required placeholder="مثال: إدارة الإنتاج والمطابخ، إدارة الصيانة..." className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-bold" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddDeptModal(false)} className="px-4 py-2 text-slate-600 font-bold">إلغاء</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#D49A3D] text-[#1B1111] rounded-xl font-black shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>حفظ الإدارة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SECTION */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-black text-base text-[#1B1111] flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-[#D49A3D]" />
                <span>إضافة قسم جديد مرتبط بإدارة</span>
              </h4>
              <button onClick={() => setShowAddSectionModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmitting) return;
                setIsSubmitting(true);
                try {
                  const form = e.currentTarget;
                  const deptCode = (form.elements.namedItem("deptCode") as HTMLSelectElement).value;
                  const name = (form.elements.namedItem("name") as HTMLInputElement).value;
                  const res = await createSectionAction(deptCode, name);
                  if (res.success) {
                    showNotification("success", "تمت إضافة القسم بنجاح!");
                    setShowAddSectionModal(false);
                    router.refresh();
                  } else {
                    showNotification("error", res.error || "فشل الحفظ");
                  }
                } catch (err: any) {
                  showNotification("error", err.message || "حدث خطأ");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-black text-slate-800 mb-1">الإدارة التابع لها *</label>
                <select name="deptCode" required className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-bold">
                  <option value="">-- اختر الإدارة الأم --</option>
                  {departments.map((d) => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-black text-slate-800 mb-1">اسم القسم أو الموقع *</label>
                <input name="name" required placeholder="مثال: قسم تجهيز اللحوم، صالة 1، مستودع الجاف..." className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-bold" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddSectionModal(false)} className="px-4 py-2 text-slate-600 font-bold">إلغاء</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#D49A3D] text-[#1B1111] rounded-xl font-black shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>حفظ القسم</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD USER (الدور الموحد + رقم المستخدم التلقائي + بدون تقييد PIN) */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-black text-base text-[#1B1111] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#682722]" />
                <span>إضافة مستخدم جديد للنظام</span>
              </h4>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex items-center justify-between">
              <span className="text-xs font-black text-amber-950">رقم المستخدم التسلسلي المتوقع:</span>
              <span className="font-mono text-sm font-black bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-lg border border-amber-300">
                #{nextUserNumber}
              </span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmitting) return;
                setIsSubmitting(true);
                try {
                  const form = e.currentTarget;
                  const formData = new FormData(form);
                  const res = await createUserAction(formData);
                  if (res.success) {
                    showNotification("success", \`تمت إضافة المستخدم بنجاح! رقم المستخدم: #\${res.userNumber || "جديد"}\`);
                    setShowAddUserModal(false);
                    router.refresh();
                  } else {
                    showNotification("error", res.error || "فشل الحفظ");
                  }
                } catch (err: any) {
                  showNotification("error", err.message || "حدث خطأ");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-black text-slate-800 mb-1">الاسم الكامل *</label>
                <input name="full_name" required placeholder="اسم الموظف الثلاثي..." className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-bold" />
              </div>
              <div>
                <label className="block font-black text-slate-800 mb-1">المسمى الوظيفي</label>
                <input name="job_title" placeholder="مثال: شيف مقبلات، مسؤول صيانة التبريد..." className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-bold" />
              </div>
              <div>
                <label className="block font-black text-slate-800 mb-1">رمز المرور (PIN - 4 أرقام) *</label>
                <input name="pin_code" required maxLength={4} pattern="\\d{4}" placeholder="مثال: 5544" className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-mono font-black text-center text-sm" />
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">يمكن استخدام أي رمز مرور حتى لو كان مستخدماً من موظف آخر</span>
              </div>

              {/* UNIFIED JOB ROLE (الدور الوظيفي الموحد - نقرة واحدة) */}
              <div>
                <label className="block font-black text-slate-800 mb-1">الدور الوظيفي الموحد *</label>
                <select
                  name="custom_role_id"
                  required
                  className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-bold text-purple-900"
                  onChange={(e) => {
                    const val = e.target.value;
                    const form = e.target.form;
                    if (val && val !== "none") {
                      const selectedCrole = roles.find((r) => String(r.id) === val);
                      if (selectedCrole) {
                        const roleInput = form?.elements.namedItem("role") as HTMLInputElement;
                        if (roleInput) roleInput.value = selectedCrole.category || selectedCrole.role_type || "field_agent";
                        
                        // Auto set department if single department
                        if (selectedCrole.allowed_departments && selectedCrole.allowed_departments !== "all") {
                          const depts = selectedCrole.allowed_departments.split(",");
                          if (depts.length === 1) {
                            const deptSelect = form?.elements.namedItem("department_code") as HTMLSelectElement;
                            if (deptSelect) deptSelect.value = depts[0];
                          }
                        }
                      }
                    }
                  }}
                >
                  <option value="">-- اختر الدور الوظيفي الموحد --</option>
                  {roles.filter((r: any) => r.status !== "disabled").map((r: any) => (
                    <option key={r.id} value={r.id}>
                      🛡️ {r.name} ({r.category === "inspector" ? "رقابي/تفتيشي" : r.category === "admin" ? "إشرافي/إداري" : "تنفيذي ميداني"})
                    </option>
                  ))}
                </select>
                <input type="hidden" name="role" defaultValue="field_agent" />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">الإدارة التابع لها *</label>
                <select name="department_code" required className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-bold">
                  <option value="">-- اختر الإدارة --</option>
                  {departments.map((d) => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" name="can_export_excel" value="1" id="excel_perm" />
                <label htmlFor="excel_perm" className="font-bold text-slate-700 cursor-pointer">منح صلاحية تصدير تقارير الإكسل</label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 text-slate-600 font-bold">إلغاء</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#682722] hover:bg-[#7D2F28] disabled:opacity-50 text-white rounded-xl font-black shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <span>حفظ المستخدم</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER (الدور الموحد + بدون تقييد PIN) */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-black text-base text-[#1B1111] flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <span>تعديل بيانات المستخدم ({editingUser.full_name})</span>
              </h4>
              <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex items-center justify-between">
              <span className="text-xs font-black text-amber-950">رقم المستخدم المعتمد:</span>
              <span className="font-mono text-sm font-black bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-lg border border-amber-300">
                #{editingUser.user_number || editingUser.id}
              </span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmitting) return;
                setIsSubmitting(true);
                try {
                  const form = e.currentTarget;
                  const formData = new FormData(form);
                  const res = await updateUserAction(editingUser.id, formData);
                  if (res.success) {
                    showNotification("success", "تم تعديل بيانات المستخدم بنجاح!");
                    setShowEditUserModal(false);
                    router.refresh();
                  } else {
                    showNotification("error", res.error || "فشل تعديل المستخدم");
                  }
                } catch (err: any) {
                  showNotification("error", err.message || "حدث خطأ");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-black text-slate-800 mb-1">الاسم الكامل *</label>
                <input
                  name="full_name"
                  required
                  value={userFormName}
                  onChange={(e) => setUserFormName(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-black text-slate-800 mb-1">المسمى الوظيفي</label>
                <input
                  name="job_title"
                  value={userFormJobTitle}
                  onChange={(e) => setUserFormJobTitle(e.target.value)}
                  placeholder="مثال: شيف مقبلات، مسؤول صيانة التبريد..."
                  className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-bold"
                />
              </div>

              {/* UNIFIED JOB ROLE (الدور الوظيفي الموحد) */}
              <div>
                <label className="block font-black text-slate-800 mb-1">الدور الوظيفي الموحد *</label>
                <select
                  name="custom_role_id"
                  value={userFormCustomRoleId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserFormCustomRoleId(val);
                    if (val && val !== "none") {
                      const selectedCrole = roles.find((r) => String(r.id) === val);
                      if (selectedCrole) {
                        setUserFormRole(selectedCrole.category || selectedCrole.role_type || "field_agent");
                        if (selectedCrole.allowed_departments && selectedCrole.allowed_departments !== "all") {
                          const depts = selectedCrole.allowed_departments.split(",");
                          if (depts.length === 1) {
                            setUserFormDept(depts[0]);
                          }
                        }
                      }
                    }
                  }}
                  className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-bold text-purple-900"
                >
                  <option value="none">-- استخدام الدور التقني المباشر --</option>
                  {roles.filter((r: any) => r.status !== "disabled").map((r: any) => (
                    <option key={r.id} value={r.id}>
                      🛡️ {r.name} ({r.category === "inspector" ? "رقابي/تفتيشي" : r.category === "admin" ? "إشرافي/إداري" : "تنفيذي ميداني"})
                    </option>
                  ))}
                </select>
                <input type="hidden" name="role" value={userFormRole} />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">الإدارة التابع لها *</label>
                <select
                  name="department_code"
                  required
                  value={userFormDept}
                  onChange={(e) => setUserFormDept(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-bold"
                >
                  <option value="">-- اختر الإدارة --</option>
                  {departments.map((d) => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="can_export_excel"
                  value="1"
                  id="edit_excel_perm"
                  checked={userFormCanExcel}
                  onChange={(e) => setUserFormCanExcel(e.target.checked)}
                />
                <label htmlFor="edit_excel_perm" className="font-bold text-slate-700 cursor-pointer">منح صلاحية تصدير تقارير الإكسل</label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowEditUserModal(false)} className="px-4 py-2 text-slate-600 font-bold">إلغاء</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ التحديث...</span>
                    </>
                  ) : (
                    <span>تحديث المستخدم</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE PIN FOR USER */}
      {changePinModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="font-black text-sm text-[#1B1111]">تغيير رمز المرور لـ ({changePinModalUser.full_name})</h4>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmitting) return;
                setIsSubmitting(true);
                try {
                  const form = e.currentTarget;
                  const newPin = (form.elements.namedItem("new_pin") as HTMLInputElement).value;
                  const res = await changeUserPinAction(changePinModalUser.id, newPin);
                  if (res.success) {
                    showNotification("success", "تم تغيير رمز المرور بنجاح!");
                    setChangePinModalUser(null);
                    router.refresh();
                  } else {
                    showNotification("error", res.error || "فشل التغيير");
                  }
                } catch (err: any) {
                  showNotification("error", err.message || "حدث خطأ");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-black text-slate-800 mb-1">الرمز الجديد (4 أرقام) *</label>
                <input name="new_pin" required maxLength={4} pattern="\\d{4}" className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-mono font-black text-center" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setChangePinModalUser(null)} className="px-3 py-1.5 text-slate-600 font-bold">إلغاء</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-xl font-black cursor-pointer"
                >
                  {isSubmitting ? "جارٍ الحفظ..." : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW MODAL (REASSIGN / CLOSE) */}
      {activeReviewModal && activeReviewModal.type === "reassign" && (
        <div className="fixed inset-0 z-50 bg-[#1B1111]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F4] rounded-[2.5rem] max-w-lg w-full p-6 shadow-2xl space-y-4 border-2 border-[#D49A3D]/40">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-base font-black text-[#682722] flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                <span>رفض المعالجة وإعادة الإسناد (Round Bump)</span>
              </h4>
              <button onClick={() => setActiveReviewModal(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <div className="bg-[#FAF3F3] border border-[#682722]/30 p-3.5 rounded-2xl text-xs space-y-1 text-[#682722] font-semibold">
              <p className="font-black">⚠️ سيتم رفع جولة الحالة #{activeReviewModal.item.case_number} إلى الجولة ({activeReviewModal.item.round + 1}).</p>
              <p>ستعاد للمنفذ الميداني كـ &quot;مهمة معادة للاستكمال&quot; مع تسجيل الملاحظات.</p>
            </div>
            <div>
              <label className="block text-xs font-black text-[#1B1111] mb-1">أسباب الرفض وملاحظات الإعادة للميدان (إلزامي):</label>
              <textarea
                rows={3}
                value={reassignNotes}
                onChange={(e) => setReassignNotes(e.target.value)}
                placeholder="وضح للمنفذ سبب عدم كفاية الإجراء وما هو المطلوب منه بالضبط..."
                className="w-full text-xs font-semibold p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D49A3D]/30 resize-none bg-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={() => setActiveReviewModal(null)} className="px-4 py-2 text-xs font-bold text-slate-600">إلغاء</button>
              <button type="button" onClick={handleReassignSubmit} disabled={!reassignNotes.trim()} className="px-5 py-2.5 rounded-2xl bg-[#682722] text-white text-xs font-black disabled:opacity-50 cursor-pointer">
                تأكيد الرفض والإعادة للجولة ({activeReviewModal.item.round + 1})
              </button>
            </div>
          </div>
        </div>
      )}

      {activeReviewModal && activeReviewModal.type === "close" && (
        <div className="fixed inset-0 z-50 bg-[#1B1111]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F4] rounded-[2.5rem] max-w-lg w-full p-6 shadow-2xl space-y-4 border-2 border-[#D49A3D]/40">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-base font-black text-[#682722] flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-600" />
                <span>إغلاق الحالة نهائياً (Force Close)</span>
              </h4>
              <button onClick={() => setActiveReviewModal(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <div className="bg-[#FAF3F3] border border-[#682722]/30 p-3.5 rounded-2xl text-xs space-y-1 text-[#682722] font-semibold">
              <p className="font-black">🛑 سيتم إنهاء الحالة #{activeReviewModal.item.case_number} وإغلاقها بشكل كامل مع تسجيل التوجيه الإداري.</p>
            </div>
            <div>
              <label className="block text-xs font-black text-[#1B1111] mb-1">ملاحظات أو مبررات الإغلاق النهائي (التغذية الراجعة):</label>
              <textarea
                rows={3}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="التوجيه الإداري الدائم الذي سيظهر للمنفذ في الحالات المغلقة..."
                className="w-full text-xs font-semibold p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D49A3D]/30 resize-none bg-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={() => setActiveReviewModal(null)} className="px-4 py-2 text-xs font-bold text-slate-600">تراجع</button>
              <button type="button" onClick={handleCloseSubmit} className="px-5 py-2.5 rounded-2xl bg-[#1B1111] text-[#FFC217] text-xs font-black cursor-pointer">
                تأكيد الإغلاق النهائي للحالة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
`;

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully generated AdminManager.tsx! Length:', code.length);
