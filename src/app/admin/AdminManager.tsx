"use client";

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
  Cloud,
  Check,
  Eye,
  Settings,
  ArrowRight,
  Power,
  Lock,
  UserCheck,
  RotateCw,
  Loader2,
  GitBranch,
  UserPlus,
  MessageSquare,
  Bell,
  FileSpreadsheet,
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
  assignAdditionalUsersAction,
  addInProgressNoteAction,
  exportCasesAuditTrailToExcelAction,
} from "@/app/actions/capa";
import { downloadExcelFile } from "@/lib/excel-helper";
import OfficialPdfReportModal from "@/components/OfficialPdfReportModal";
import PermissionsMatrixView from "@/components/PermissionsMatrixView";
import DataSyncHubModal from "@/components/DataSyncHubModal";
import CreateDailyReportModal from "@/components/CreateDailyReportModal";
import DailyReportsArchiveModal from "@/components/DailyReportsArchiveModal";
import { toggleUserDailyReportAction, toggleUserDailyArchivePermissionAction } from "@/app/actions/daily_reports";
import InspectorForm from "../inspector/InspectorForm";
import FormBuilder from "./FormBuilder";
import ExcelImportModal from "@/components/ExcelImportModal";

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
  const [configTab, setConfigTab] = useState<"depts" | "sections" | "roles" | "categories" | "matrix" | "data" | "reset">("depts");
  const [showExcelImport, setShowExcelImport] = useState(false);
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
  const hasFeature = (key: string) => userPermissions?.features?.[key] === "full";
  const hasFeatureAccess = (key: string) => ["full", "exclusive", "dept_only", "view_only"].includes(userPermissions?.features?.[key]);
  const hasActionFeature = (key: string) => ["full", "exclusive", "dept_only"].includes(userPermissions?.features?.[key]);
  const canManageStructure = isSuperAdmin || isGeneralAdmin || hasFeature("manage_structure");
  const canManageRoles = isSuperAdmin || isGeneralAdmin || hasFeature("manage_roles");
  const canManageUsers = isSuperAdmin || isGeneralAdmin || hasFeature("manage_users");
  const canManageForms = isSuperAdmin || isGeneralAdmin || hasFeature("manage_forms");
  const canReadReports = isSuperAdmin || isGeneralAdmin || hasFeature("export_excel") || hasFeature("print_pdf");
  const canManageSync = isSuperAdmin || isGeneralAdmin || hasFeature("manage_sync");
  const canImportExcel = isSuperAdmin || isGeneralAdmin || hasFeature("import_excel");
  const isSystemAdmin = isSuperAdmin || isGeneralAdmin || ["manage_structure", "manage_roles", "manage_users", "manage_forms", "print_pdf", "export_excel", "manage_sync", "import_excel"].some(hasFeature);
  const canDeleteCases = isSuperAdmin || isGeneralAdmin || ["full", "exclusive"].includes(userPermissions?.features?.delete_cases);
  const canCreateDailyReport = hasActionFeature("create_daily_report");

  // Daily Reports Modal States
  const [showDailyReportModal, setShowDailyReportModal] = useState<boolean>(false);
  const [showDailyArchiveModal, setShowDailyArchiveModal] = useState<boolean>(false);

  // In-Progress Case Actions States (3 Options: Additional Assign, Write Note, Close Directly)
  const [activeAssignAdditionalModal, setActiveAssignAdditionalModal] = useState<any | null>(null);
  const [additionalSelectedUserIds, setAdditionalSelectedUserIds] = useState<number[]>([]);
  const [additionalInstructions, setAdditionalInstructions] = useState<string>("");

  const [activeWriteNoteModal, setActiveWriteNoteModal] = useState<any | null>(null);
  const [inProgressNoteText, setInProgressNoteText] = useState<string>("");

  const [activeCloseInProgressModal, setActiveCloseInProgressModal] = useState<any | null>(null);
  const [closeInProgressNotes, setCloseInProgressNotes] = useState<string>("");

  // Excel Export State & Runner
  const [exportingExcel, setExportingExcel] = useState(false);

  const handleExportCasesExcel = async () => {
    setExportingExcel(true);
    try {
      const res = await exportCasesAuditTrailToExcelAction();
      if (res.success && res.xml) {
        downloadExcelFile(res.xml, res.filename || "marasim_capa_audit_trail.xls");
        showNotification("success", `🎉 تم بنجاح تصدير السجل التراكمي الشامل لـ (${res.count}) حالة متضمنة (${res.totalScenarios}) سيناريوهات ومراحل إلى Excel!`);
      } else {
        showNotification("error", res.error || "فشل تصدير ملف الإكسيل");
      }
    } catch (err: any) {
      showNotification("error", `حدث خطأ أثناء التصدير: ${err?.message || "خطأ غير متوقع"}`);
    } finally {
      setExportingExcel(false);
    }
  };

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
        if (key === "export_excel") {
          if (hasFeatureAccess("export_excel")) handleExportCasesExcel();
          return;
        }
        if (key === "import_excel") {
          if (canImportExcel) setShowExcelImport(true);
          return;
        }
        if (key === "manage_sync") {
          if (canManageSync) setShowDataSyncModal(true);
          return;
        }

        const requiredPermission: Record<string, boolean> = {
          system_config: canManageStructure || canManageRoles || canManageUsers,
          departments: canManageStructure,
          sections: canManageStructure,
          categories: canManageStructure,
          roles: canManageRoles,
          permissions_matrix: canManageRoles,
          users: canManageUsers,
          dynamic_forms: canManageForms,
          reports: canReadReports,
          audit: canManageStructure || canManageRoles || canManageUsers,
          change_pin: isSystemAdmin,
          import_excel: canImportExcel,
          manage_sync: canManageSync,
          create_case: hasActionFeature("inspect_create"),
          open_cases: hasFeatureAccess("view_open_cases"),
          in_progress: hasFeatureAccess("view_in_progress_cases"),
          needs_review: hasFeatureAccess("view_review_cases"),
          closed_cases: hasFeatureAccess("view_closed_cases"),
          all_cases: hasFeatureAccess("view_all_cases"),
          my_executors: hasFeatureAccess("view_executor_directory"),
        };
        if (key in requiredPermission && !requiredPermission[key]) {
          return;
        }

        if (key === "open_cases") setActiveMenu("open_cases");
        else if (key === "in_progress") setActiveMenu("in_progress_cases");
        else if (key === "needs_review") setActiveMenu("review_cases");
        else if (key === "closed_cases") setActiveMenu("closed_cases");
        else if (key === "all_cases") setActiveMenu("all_cases");
        else if (key === "my_executors") setActiveMenu("my_executors");
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
  }, [isSystemAdmin, canManageStructure, canManageRoles, canManageUsers, canManageForms, canReadReports, canImportExcel, canManageSync, userPermissions]);

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
  const [reassignUserIds, setReassignUserIds] = useState<number[]>([]);
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
  const [userFormCanArchive, setUserFormCanArchive] = useState(false);

  // PDF Report Modal State
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Data Sync Hub Modal State
  const [showDataSyncModal, setShowDataSyncModal] = useState(false);

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
      showNotification("error", `يرجى اختيار جهة مكلفة أو موظف واحد على الأقل للحالة #${c.case_number}`);
      return;
    }

    const targetUsersList = selectedUserIds.map((uid) => {
      const u = fieldRoles.find((usr: any) => usr.id === uid) || users.find((usr: any) => usr.id === uid);
      return {
        id: uid,
        name: u?.full_name || `موظف #${uid}`,
        deptCode: u?.department_code || c.department_code || currentUser?.department_code || "dept",
      };
    });

    setDispatchLoading((prev) => ({ ...prev, [c.id]: true }));
    try {
      const res = await assignCaseAction(c.id, selectedDepts, instructions, targetUsersList);
      if (res.success) {
        showNotification("success", `تم إسناد الحالة #${c.case_number} بنجاح!`);
      } else {
        showNotification("error", res.error || "حدث خطأ أثناء الإسناد");
      }
    } catch (e: any) {
      showNotification("error", e.message || "حدث خطأ غير متوقع");
    } finally {
      setDispatchLoading((prev) => ({ ...prev, [c.id]: false }));
    }
  };

  // Review Scenario 1: Approve Task Response (الحالة مقبولة للمنفذ وتبقى معلقة لدى البقية)
  const handleApprove = async (item: any) => {
    setReviewLoading((prev) => ({ ...prev, [item.assignment_id]: true }));
    try {
      const res = await approveTaskAction(item.assignment_id);
      if (res.success) {
        showNotification("success", `تم قبول رد المنفذ (${item.executor_name || item.assigned_to_user_name}) بنجاح! الحالة أصبحت مقبولة لديه ومعلقة لدى الآخرين حتى الإغلاق.`);
      } else {
        showNotification("error", res.error || "فشل الاعتماد");
      }
    } catch (e: any) {
      showNotification("error", e.message || "حدث خطأ أثناء الاعتماد");
    } finally {
      setReviewLoading((prev) => ({ ...prev, [item.assignment_id]: false }));
    }
  };

  // Review Scenario 2: Continue / Reassign Task (استكمال المهمة مع اختيار المنفذين والملاحظات)
  const handleReassignSubmit = async () => {
    if (!activeReviewModal || !activeReviewModal.item) return;
    const item = activeReviewModal.item;

    if (reassignUserIds.length === 0 && reassignDepts.length === 0) {
      showNotification("error", "يرجى اختيار منفذ واحد على الأقل لاستكمال المهمة");
      return;
    }

    if (!reassignNotes.trim()) {
      showNotification("error", "يرجى كتابة توجيهات وملاحظات استكمال المهمة");
      return;
    }

    const targetUsersList = reassignUserIds.map((uid) => {
      const u = fieldRoles.find((f: any) => f.id === uid) || users.find((usr: any) => usr.id === uid);
      return {
        id: uid,
        name: u?.full_name || `موظف #${uid}`,
        deptCode: u?.department_code || item.department_code || currentUser?.department_code || "dept",
      };
    });

    try {
      const res = await reassignTaskAction(
        item.case_id,
        reassignDepts,
        reassignNotes.trim(),
        targetUsersList
      );
      if (res.success) {
        showNotification("success", `تم إسناد استكمال المهمة للحالة #${item.case_number} للجولة (${item.round + 1}) بنجاح!`);
        setActiveReviewModal(null);
        setReassignNotes("");
        setReassignDepts([]);
        setReassignUserIds([]);
      } else {
        showNotification("error", res.error || "فشل إعادة الإسناد");
      }
    } catch (e: any) {
      showNotification("error", e.message || "حدث خطأ أثناء إعادة الإسناد");
    }
  };

  // Review Scenario 3: Final Case Closure (إغلاق الحالة بشكل نهائي مع كتابة ملاحظات إدارية إلزامية)
  const handleCloseSubmit = async () => {
    if (!activeReviewModal || !activeReviewModal.item) return;
    const item = activeReviewModal.item;

    if (!closeNotes.trim()) {
      showNotification("error", "كتابة الملاحظات والتوجيهات الإدارية إلزامي لإغلاق الحالة نهائياً كتغذية راجعة للمنفذين");
      return;
    }

    try {
      const res = await closeCaseEntirelyAction(item.case_id, closeNotes.trim());
      if (res.success) {
        showNotification("success", `تم إغلاق الحالة #${item.case_number} بشكل نهائي واعتماد التغذية الراجعة!`);
        setActiveReviewModal(null);
        setCloseNotes("");
      } else {
        showNotification("error", res.error || "فشل إغلاق الحالة");
      }
    } catch (e: any) {
      showNotification("error", e.message || "حدث خطأ أثناء إغلاق الحالة");
    }
  };

  const handleDeleteCase = async (caseId: number, caseNumber: number) => {
    if (confirm(`هل أنت متأكد من الحذف النهائي للحالة #${caseNumber}؟ لا يمكن التراجع عن هذا الإجراء!`)) {
      try {
        const res = await deleteCaseAction(caseId);
        if (res.success) {
          showNotification("success", `تم حذف الحالة #${caseNumber} وجميع سجلاتها بنجاح`);
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
    setUserFormCanArchive(u.can_view_daily_archive === 1);
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
        ...(hasActionFeature("inspect_create") ? [{ id: "create_case", label: "إنشاء حالة جديدة", icon: PlusCircle, badge: null, color: "text-amber-500" }] : []),
        ...(canCreateDailyReport
          ? [{ id: "create_daily_report", label: "إنشاء تقرير يومي", icon: FileText, badge: null, color: "text-[#D49A3D]" }]
          : []),
        ...(hasFeatureAccess("view_daily_archive") ? [{ id: "daily_reports_archive", label: "أرشيف التقارير اليومية", icon: History, badge: null, color: "text-[#D49A3D]" }] : []),
        ...(hasFeatureAccess("view_open_cases") ? [{ id: "open_cases", label: "الحالات المفتوحة (بانتظار الفرز)", icon: Inbox, badge: pendingCases.length, color: "text-amber-600" }] : []),
        ...(hasFeatureAccess("view_in_progress_cases") ? [{ id: "in_progress_cases", label: "الحالات قيد التنفيذ الميداني", icon: Clock, badge: inProgressCases.length, color: "text-blue-600" }] : []),
        ...(hasFeatureAccess("view_review_cases") ? [{ id: "review_cases", label: "الحالات التي تحتاج مراجعة", icon: Search, badge: reviewItems.length, color: "text-purple-600" }] : []),
        ...(hasFeatureAccess("view_closed_cases") ? [{ id: "closed_cases", label: "الحالات المغلقة", icon: CheckCircle2, badge: closedCases.length, color: "text-emerald-600" }] : []),
        ...(hasFeatureAccess("view_all_cases") ? [{ id: "all_cases", label: "السجل العام المركزي", icon: Layers, badge: allCases.length, color: "text-slate-600" }] : []),
        ...(hasFeatureAccess("view_executor_directory") ? [{ id: "my_executors", label: "منفذو إدارتي الميدانيون", icon: Users, badge: fieldRoles.length, color: "text-amber-600" }] : []),
      ],
    },
    ...(isSystemAdmin
      ? [
          {
            group: "التهيئة وإعدادات المنظومة",
            items: [
              ...(canManageStructure || canManageRoles || canManageUsers ? [{ id: "system_config", label: "⚙️ قائمة التهيئة والإعدادات المركزية", icon: Settings, badge: null, color: "text-[#D49A3D]" }] : []),
              ...(canManageUsers ? [{ id: "users", label: "كادر العمل والمستخدمين", icon: Users, badge: users.length, color: "text-[#682722]" }] : []),
              ...(canManageForms ? [{ id: "dynamic_forms", label: "محرك النماذج المتطورة", icon: Sparkles, badge: null, color: "text-[#D49A3D]" }] : []),
            ],
          },
          {
            group: "التقارير والرقابة والحساب",
            items: [
              ...(canReadReports ? [{ id: "reports", label: "التقارير وطباعة PDF", icon: Sliders, badge: null, color: "text-blue-600" }] : []),
              ...(canManageStructure || canManageRoles || canManageUsers ? [{ id: "audit", label: "سجل التدقيق والرقابة", icon: History, badge: auditLogs.length, color: "text-slate-600" }] : []),
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
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-black shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${
            message.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-[#682722] text-amber-50"
          }`}
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

      {/* Data Sync Hub Modal */}
      <DataSyncHubModal
        isOpen={showDataSyncModal}
        onClose={() => setShowDataSyncModal(false)}
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
        className={`bg-white border-l border-slate-200/80 transition-all duration-300 flex flex-col justify-between z-20 ${
          sidebarOpen ? "w-full md:w-64" : "hidden md:flex md:w-20"
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Logo / Org Title */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-[#682722] flex items-center justify-center text-[#FFC217] font-black text-lg shadow-sm flex-shrink-0">
              م
            </div>
            <div className={`overflow-hidden transition-all ${!sidebarOpen && "md:hidden"}`}>
              <h2 className="font-black text-sm text-[#1B1111] leading-tight">إدارة المنظومة</h2>
              <p className="text-[10px] text-slate-400 font-bold">نظام CAPA وحوكمة الجودة</p>
            </div>
          </div>

          {/* Menus by Group */}
          <div className="space-y-6">
            {menuGroups.map((grp, idx) => (
              <div key={idx} className="space-y-1.5">
                <div
                  className={`text-[10px] font-black text-slate-400 px-3 uppercase tracking-wider ${
                    !sidebarOpen && "md:hidden"
                  }`}
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
                        if (item.id === "create_daily_report") {
                          setShowDailyReportModal(true);
                        } else if (item.id === "daily_reports_archive") {
                          setShowDailyArchiveModal(true);
                        } else {
                          setActiveMenu(item.id);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-right cursor-pointer ${
                        isActive
                          ? "bg-[#1B1111] text-[#FFC217] shadow-md shadow-[#1B1111]/15"
                          : "text-slate-600 hover:bg-[#FAF7F4] hover:text-[#1B1111]"
                      }`}
                      title={item.label}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-[#FFC217]" : item.color}`} />
                        <span className={`${!sidebarOpen && "md:hidden"} truncate`}>{item.label}</span>
                      </div>
                      {item.badge !== null && item.badge > 0 && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                            isActive
                              ? "bg-[#FFC217] text-[#1B1111]"
                              : "bg-slate-100 text-slate-700"
                          } ${!sidebarOpen && "md:hidden"}`}
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
        <div className={`p-4 border-t border-slate-100 bg-[#FAF7F4]/60 ${!sidebarOpen && "md:hidden"}`}>
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
              <RotateCw className={`w-4 h-4 text-[#D49A3D] ${isRefreshing ? "animate-spin" : ""}`} />
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
                  disabled={!canManageStructure}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    configTab === "depts"
                      ? "bg-[#682722] text-white shadow-xs"
                      : "bg-[#FAF7F4] text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>الإدارات الرئيسية ({departments.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigTab("sections")}
                  disabled={!canManageStructure}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    configTab === "sections"
                      ? "bg-[#682722] text-white shadow-xs"
                      : "bg-[#FAF7F4] text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FolderTree className="w-4 h-4" />
                  <span>الأقسام التشغيلية ({sections.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigTab("roles")}
                  disabled={!canManageRoles}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    configTab === "roles"
                      ? "bg-purple-700 text-white shadow-xs"
                      : "bg-purple-50 text-purple-900 hover:bg-purple-100"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>الأدوار الوظيفية الموحدة ({roles.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigTab("categories")}
                  disabled={!canManageStructure}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    configTab === "categories"
                      ? "bg-rose-700 text-white shadow-xs"
                      : "bg-rose-50 text-rose-900 hover:bg-rose-100"
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>دليل حالات عدم المطابقة ({categories.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigTab("matrix")}
                  disabled={!canManageRoles}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    configTab === "matrix"
                      ? "bg-blue-700 text-white shadow-xs"
                      : "bg-blue-50 text-blue-900 hover:bg-blue-100"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>مصفوفة توزيع الصلاحيات</span>
                </button>

                {(canManageStructure || canManageUsers || canImportExcel || hasFeature("export_excel")) && <button
                  type="button"
                  onClick={() => setConfigTab("data")}
                  disabled={!canManageStructure && !canManageUsers && !canImportExcel && !hasFeature("export_excel")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${configTab === "data" ? "bg-[#682722] text-white shadow-xs" : "bg-[#FAF7F4] text-slate-700 hover:bg-slate-200"}`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>استيراد وتصدير البيانات</span>
                </button>}

              {canManageSync && <button
                  type="button"
                  onClick={() => setShowDataSyncModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-xs"
                  title="إدارة المجلدات المحلية والمزامنة مع السحابة"
                >
                  <Cloud className="w-4 h-4 text-[#FFC217]" />
                  <span>مركز المزامنة السحابية ☁️</span>
                </button>}

                {canCreateDailyReport && (
                  <button
                    type="button"
                    onClick={() => setShowDailyReportModal(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer bg-gradient-to-r from-[#D49A3D] to-[#9E6E20] hover:brightness-110 text-[#1B1111] shadow-xs"
                    title="إنشاء وتقديم تقرير يومي جديد"
                  >
                    <FileText className="w-4 h-4 text-[#1B1111]" />
                    <span>إنشاء تقرير يومي 📝</span>
                  </button>
                )}

                {canManageSync && <button
                  type="button"
                  onClick={() => setShowDataSyncModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white shadow-xs"
                  title="تحديث ورفع كود البرمجة والشاشات إلى مستودع GitHub"
                >
                  <GitBranch className="w-4 h-4 text-purple-200" />
                  <span>تحديث الكود (GitHub) 🐙</span>
                </button>}

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setConfigTab("reset")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                      configTab === "reset"
                        ? "bg-rose-700 text-white shadow-xs"
                        : "bg-rose-50 text-rose-900 hover:bg-rose-100"
                    }`}
                  >
                    <AlertOctagon className="w-4 h-4" />
                    <span>تصفير قاعدة البيانات ⚠️</span>
                  </button>
                )}
              </div>
            </div>

            {/* SUBTAB 1: DEPARTMENTS */}
            {configTab === "depts" && canManageStructure && (
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
                            className={`p-1.5 rounded-lg ${dept.status === "disabled" ? "text-slate-400" : "text-emerald-600"}`}
                            title="تبديل الحالة"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`هل أنت متأكد من حذف إدارة (${dept.name})؟`)) {
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
            {configTab === "sections" && canManageStructure && (
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
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      selectedDeptFilter === "all" ? "bg-[#682722] text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    الكل ({sections.length})
                  </button>
                  {departments.map((d) => (
                    <button
                      key={d.code}
                      onClick={() => setSelectedDeptFilter(d.code)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        selectedDeptFilter === d.code ? "bg-[#682722] text-white" : "bg-slate-100 text-slate-700"
                      }`}
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
                            if (confirm(`هل أنت متأكد من حذف قسم (${sec.name})؟`)) {
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
            {configTab === "roles" && canManageRoles && (
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
                          className={`bg-white p-5 rounded-3xl border shadow-sm space-y-3 transition-all ${
                            isDisabled ? "opacity-60 border-slate-200 bg-slate-50/60" : "border-slate-200 hover:border-purple-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-[#1B1111]">{r.name}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                  isInspector
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : isField
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-purple-50 text-purple-800 border-purple-200"
                                }`}
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
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isDisabled ? "text-slate-400 hover:text-emerald-600" : "text-emerald-600 hover:text-amber-600"
                                }`}
                                title={isDisabled ? "تفعيل الدور" : "تعطيل الدور"}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`هل أنت متأكد من حذف الدور (${r.name})؟`)) {
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
            {configTab === "categories" && canManageStructure && (
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
                        className={`bg-white p-5 rounded-3xl border shadow-sm space-y-3 transition-all ${
                          isDisabled ? "opacity-60 border-slate-200 bg-slate-50/60" : "border-slate-200 hover:border-rose-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-[#1B1111]">{c.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                isHigh
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : isMed
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-blue-50 text-blue-800 border-blue-200"
                              }`}
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
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDisabled ? "text-slate-400 hover:text-emerald-600" : "text-emerald-600 hover:text-amber-600"
                              }`}
                              title={isDisabled ? "تفعيل الحالة" : "تعطيل الحالة"}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`هل أنت متأكد من حذف (${c.name}) من دليل الحالات؟`)) {
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
            {configTab === "matrix" && canManageRoles && (
              <PermissionsMatrixView
                roles={roles}
                permissionsMatrix={permissionsMatrix}
                currentUser={currentUser}
                canManageRoles={isSuperAdmin || isGeneralAdmin || hasFeature("manage_roles")}
              />
            )}

            {configTab === "data" && (canImportExcel || hasFeature("export_excel")) && (
              <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5" dir="rtl">
                <div>
                  <h4 className="text-base font-black text-[#1B1111]">تهيئة ونسخ البيانات المحلية</h4>
                  <p className="mt-1 text-xs text-slate-500">استيراد ملفات Excel للهيكل والمستخدمين والتصنيفات، أو تنزيل نسخة من جداول قاعدة البيانات المحلية.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {canImportExcel && <button type="button" onClick={() => setShowExcelImport(true)} className="px-5 py-3 rounded-2xl bg-[#682722] hover:bg-[#7D3029] text-white text-sm font-black flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" /> تهيئة من ملفات Excel
                  </button>}
                  {(isSuperAdmin || isGeneralAdmin || hasFeature("export_excel")) && <a href="/api/system/export-all-local" className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black flex items-center gap-2">
                    <Download className="w-4 h-4" /> تصدير كل الجداول المحلية إلى Excel
                  </a>}
                </div>
                <p className="text-[11px] text-slate-500">ملف التصدير يجمع جداول قاعدة البيانات في مصنف Excel واحد، ويمكن حفظه كنسخة احتياطية قبل التطوير.</p>
              </section>
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
                      pattern="\d{4}"
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCasesExcel}
                  disabled={exportingExcel}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:bg-slate-300"
                >
                  {exportingExcel ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                  )}
                  <span>تصدير السجل التراكمي (Excel)</span>
                </button>
                <button
                  onClick={() => setShowPdfModal(true)}
                  className="px-5 py-2.5 bg-[#682722] hover:bg-[#7D2F28] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4 text-[#FFC217]" />
                  <span>إصدار تقرير رسمي مصور (PDF)</span>
                </button>
              </div>
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

            {/* Detailed Excel Export Banner */}
            <div className="p-6 rounded-3xl bg-white border border-emerald-200/80 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-[#1B1111]">
                      السجل التراكمي الشامل ومسارات الحالات (Excel Audit Trail)
                    </h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      هيكلة أفقية احترافية: صف واحد لكل حالة + تمدد منظم لجميع السيناريوهات والمراحل + توثيق الإغلاق والتعقيب النهائي
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportCasesExcel}
                  disabled={exportingExcel}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:bg-slate-300"
                >
                  {exportingExcel ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>جارٍ التوليد والتصدير...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-emerald-100" />
                      <span>تحميل ملف الإكسيل التراكمي (.xls)</span>
                    </>
                  )}
                </button>
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
        {/* ➕ CREATE NEW CASE (إنشاء حالة جديدة من الإدارة)                 */}
        {/* ============================================================== */}
        {activeMenu === "create_case" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-l from-[#1B1111] via-[#2A1C16] to-[#1B1111] text-white p-6 rounded-3xl border-2 border-[#D49A3D]/40 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC217]/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="p-3 bg-[#D49A3D] text-[#1B1111] rounded-2xl shadow-md">
                    <PlusCircle className="w-7 h-7" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-white">تسجيل حالة عدم مطابقة جديدة</h2>
                      <span className="text-[10px] bg-[#682722] text-amber-100 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                        إدارة النظام
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-amber-200/80 mt-1">
                      رصد وتوثيق حالات عدم المطابقة مباشرة من لوحة المدير وتوجيهها لحظياً لجدول البلاغات
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-[#1B1111]/80 border border-[#D49A3D]/30 px-4 py-2 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-300">المُسجل الحالي:</span>
                    <p className="text-xs font-black text-[#FFC217]">{currentUser?.full_name || "الإدارة"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
              <InspectorForm
                departments={departments}
                locations={locations}
                categories={categories}
              />
            </div>
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
              <button
                onClick={() => setActiveMenu("create_case")}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إنشاء حالة جديدة +</span>
              </button>
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
                          <span className="font-black text-sm text-[#1B1111]">{c.nc_name || c.title || c.category_name || "حالة عدم مطابقة"}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              isHigh
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : isMed
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                            }`}
                          >
                            {isHigh ? "عالي الخطورة ⚠️" : isMed ? "متوسط ⚡" : "عادي ℹ️"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{c.obs_date || c.created_at} {c.obs_time || ""}</span>
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

                      {/* Location & Inspector Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-xs bg-[#FAF7F4] p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-700 font-bold">
                          <Building2 className="w-4 h-4 text-[#D49A3D]" />
                          <span>الإدارة: <strong className="text-[#1B1111]">{c.department_name || c.department_code}</strong></span>
                        </div>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-2 text-slate-700 font-bold">
                          <MapPin className="w-4 h-4 text-[#682722]" />
                          <span>القسم والموقع: <strong className="text-[#1B1111]">{c.location_name || c.section_name || c.location || "-"}</strong></span>
                        </div>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-2 text-slate-700 font-bold">
                          <User className="w-4 h-4 text-slate-500" />
                          <span>المفتش الراصد: <strong className="text-[#1B1111]">{c.inspector_name || "النظام"}</strong></span>
                        </div>
                      </div>

                      {/* 3 Detail Cards: Description, Root Cause, Inspector Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                          <span className="font-black text-[#1B1111] flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-[#D49A3D]" />
                            <span>وصف عدم المطابقة:</span>
                          </span>
                          <p className="text-slate-700 leading-relaxed font-semibold bg-[#FAF7F4] p-2 rounded-xl border border-slate-100">
                            {c.description || "لا يوجد وصف إضافي مسجل"}
                          </p>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
                          <span className="font-black text-[#682722] flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#682722]" />
                            <span>السبب الجذري المرصود:</span>
                          </span>
                          <p className="text-[#682722] leading-relaxed font-bold bg-[#FAF3F3] p-2 rounded-xl border border-[#682722]/20">
                            {c.root_cause || "لم يُسجل سبب محدد"}
                          </p>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 shadow-2xs space-y-1">
                          <span className="font-black text-blue-950 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>ملاحظات وتوصيات المفتش:</span>
                          </span>
                          <p className="text-blue-950 leading-relaxed font-semibold bg-blue-50/70 p-2 rounded-xl border border-blue-100">
                            {c.inspector_notes || "لا توجد ملاحظات إضافية"}
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
                            {(() => {
                              const targetDeptCode = c.department_code || currentUser?.department_code;
                              const deptExecutors = fieldRoles.filter(
                                (u) => (userPermissions?.can_assign === "full" || u.department_code === targetDeptCode) &&
                                       (u.department_code === targetDeptCode || userPermissions?.can_assign === "full")
                              );
                              const selectedUserIds = dispatchUserSelections[c.id] || [];
                              const isAllSelected = deptExecutors.length > 0 && deptExecutors.every((u) => selectedUserIds.includes(u.id));

                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <label className="block text-xs font-black text-[#1B1111] flex items-center gap-1.5">
                                      <Users className="w-4 h-4 text-[#D49A3D]" />
                                      <span>منفذو إدارة ({c.department_name || targetDeptCode}) — اختر منفذاً أو أكثر:</span>
                                    </label>
                                    {deptExecutors.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isAllSelected) {
                                            setDispatchUserSelections((prev) => ({ ...prev, [c.id]: [] }));
                                          } else {
                                            setDispatchUserSelections((prev) => ({
                                              ...prev,
                                              [c.id]: deptExecutors.map((u) => u.id),
                                            }));
                                          }
                                        }}
                                        className="text-[11px] font-bold text-[#682722] hover:underline cursor-pointer"
                                      >
                                        {isAllSelected ? "إلغاء تحديد الكل" : "تحديد جميع منفذي الإدارة"}
                                      </button>
                                    )}
                                  </div>

                                  {/* Multi-Select Executors Grid */}
                                  <div className="flex flex-wrap gap-2 p-2.5 bg-[#FAF7F4] rounded-2xl border border-slate-200">
                                    {deptExecutors.length === 0 ? (
                                      <span className="text-xs text-slate-400 p-2">لا يوجد منفذين مسجلين لهذه الإدارة حالياً</span>
                                    ) : (
                                      deptExecutors.map((u) => {
                                        const isSelected = selectedUserIds.includes(u.id);
                                        return (
                                          <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => toggleUserForCase(c.id, u.id)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                              isSelected
                                                ? "bg-[#D49A3D] text-[#1B1111] border-[#1B1111] shadow-sm font-black"
                                                : "bg-white text-slate-700 border-slate-200 hover:border-[#D49A3D]"
                                            }`}
                                          >
                                            <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black border ${isSelected ? "bg-[#1B1111] text-[#FFC217] border-[#1B1111]" : "border-slate-300"}`}>
                                              {isSelected ? "✓" : ""}
                                            </span>
                                            <span>{u.full_name}</span>
                                            {u.user_number && (
                                              <span className="text-[10px] font-mono opacity-70">#{u.user_number}</span>
                                            )}
                                            {u.job_title && (
                                              <span className="text-[10px] opacity-70">({u.job_title})</span>
                                            )}
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                                    <span>
                                      تم تحديد: <strong className="text-[#682722]">{selectedUserIds.length}</strong> منفذ/منفذين
                                    </span>
                                    {userPermissions?.can_assign === "dept_only" && (
                                      <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-full font-black">
                                        إسناد داخلي (ضمن إدارتك فقط)
                                      </span>
                                    )}
                                  </div>

                                  {/* For Super Admin / General Admin: Option to also assign by department */}
                                  {userPermissions?.can_assign === "full" && (
                                    <div className="pt-2 border-t border-slate-100">
                                      <span className="text-[11px] font-bold text-slate-400 block mb-1.5">أو إسناد شامل لكامل الإدارة:</span>
                                      <div className="flex flex-wrap gap-2">
                                        {departments.map((dept) => {
                                          const isSelected = (dispatchSelections[c.id] || []).includes(dept.code);
                                          return (
                                            <button
                                              key={dept.code}
                                              type="button"
                                              onClick={() => toggleDeptForCase(c.id, dept.code)}
                                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                                isSelected
                                                  ? "bg-[#682722] text-white shadow-sm"
                                                  : "bg-[#FAF7F4] text-slate-700 hover:bg-slate-200"
                                              }`}
                                            >
                                              {isSelected && <Check className="w-3.5 h-3.5" />}
                                              <span>{dept.name}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

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
                    <div className="font-black text-sm text-[#1B1111]">{c.nc_name || c.title || c.category_name || "حالة عدم مطابقة"}</div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs pt-2 border-t text-slate-700">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Building2 className="w-3.5 h-3.5 text-[#D49A3D]" />
                        <span>{c.department_name}</span>
                      </div>
                      <span className="text-slate-300">|</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-[#682722]" />
                        <span>القسم والموقع: {c.location_name || c.section_name || c.location || "-"}</span>
                      </div>
                      <span className="text-slate-300">|</span>
                      <div className="flex items-center gap-1.5 font-bold text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>المفتش: {c.inspector_name || "النظام"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs pt-1">
                      <div className="bg-[#FAF7F4] p-2.5 rounded-xl border border-slate-100">
                        <span className="font-black text-[#1B1111] block mb-0.5 text-[11px]">وصف المخالفة:</span>
                        <p className="text-slate-600 font-semibold">{c.description || "-"}</p>
                      </div>
                      <div className="bg-[#FAF3F3] p-2.5 rounded-xl border border-[#682722]/20">
                        <span className="font-black text-[#682722] block mb-0.5 text-[11px]">السبب المرصود:</span>
                        <p className="text-[#682722] font-semibold">{c.root_cause || "لم يُحدد"}</p>
                      </div>
                      <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                        <span className="font-black text-blue-900 block mb-0.5 text-[11px]">ملاحظات المفتش:</span>
                        <p className="text-blue-900 font-semibold">{c.inspector_notes || "لا توجد"}</p>
                      </div>
                    </div>

                    {c.assignments_summary && (
                      <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-amber-900 font-bold flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>المنفذون المكلفون: {c.assignments_summary}</span>
                      </div>
                    )}

                    {/* Live In-Progress Note Banner */}
                    {c.in_progress_note && (
                      <div className="p-3 bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-amber-500/10 rounded-2xl border border-amber-300 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-black text-[#682722]">
                          <Bell className="w-3.5 h-3.5 text-[#D49A3D] animate-bounce shrink-0" />
                          <span>توجيه وملاحظة الإدارة الحالية للمنفذين:</span>
                        </div>
                        <p className="text-slate-800 font-bold bg-white/90 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                          {c.in_progress_note}
                        </p>
                      </div>
                    )}

                    {/* 3 CONTROL BUTTONS FOR IN-PROGRESS CASE */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-slate-400">خيارات التحكم بالحالة:</span>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {/* خيار 1: إسناد لشخص إضافي */}
                        {hasActionFeature("additional_assignment") && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAssignAdditionalModal(c);
                            setAdditionalSelectedUserIds([]);
                            setAdditionalInstructions("");
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="إسناد الحالة لشخص آخر أو أكثر دون أن تختفي من المنفذين السابقين"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                          <span>إسناد لشخص إضافي</span>
                        </button>
                        )}

                        {/* خيار 2: كتابة ملاحظة أو تنبيه */}
                        {hasActionFeature("write_in_progress_note") && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveWriteNoteModal(c);
                            setInProgressNoteText(c.in_progress_note || "");
                          }}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-950 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="كتابة ملاحظة أو تنبيه يظهر مباشرة للمنفذين المعلقة عندهم المهمة"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                          <span>كتابة ملاحظة للمنفذين</span>
                        </button>
                        )}

                        {/* خيار 3: إغلاق المهمة بالكامل */}
                        {hasActionFeature("close_in_progress_case") && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCloseInProgressModal(c);
                            setCloseInProgressNotes("");
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-[#682722] hover:text-rose-900 border border-[#682722]/30 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="إغلاق المهمة بالكامل وإنهائها في أي وقت وهي لا تزال قيد التنفيذ"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#682722]" />
                          <span>إغلاق المهمة</span>
                        </button>
                        )}
                      </div>
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
                          <span className="font-black text-sm text-[#1B1111]">{item.nc_name || item.title || item.category_name || "حالة عدم مطابقة"}</span>
                          <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-black">
                            تم التنفيذ (بانتظار الاعتماد)
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{item.submitted_at}</span>
                      </div>

                      {/* Location & Department bar */}
                      <div className="flex flex-wrap items-center gap-4 text-xs bg-[#FAF7F4] p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-[#D49A3D]" />
                          <span>{item.department_name}</span>
                        </div>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-[#682722]" />
                          <span>القسم والموقع: {item.location_name || item.location || "-"}</span>
                        </div>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-1.5 font-bold text-slate-500">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>المفتش الراصد: {item.inspector_name || "النظام"}</span>
                        </div>
                      </div>

                      {/* Case details: Description, Root Cause, Inspector Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="bg-[#FAF7F4] p-3 rounded-2xl border border-slate-200">
                          <span className="font-black text-[#1B1111] block mb-1">وصف المخالفة:</span>
                          <p className="text-slate-700 font-semibold">{item.case_desc || item.description || "-"}</p>
                        </div>
                        <div className="bg-[#FAF3F3] p-3 rounded-2xl border border-[#682722]/20">
                          <span className="font-black text-[#682722] block mb-1">السبب المرصود:</span>
                          <p className="text-[#682722] font-semibold">{item.case_cause || item.root_cause || "لم يُحدد"}</p>
                        </div>
                        <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200">
                          <span className="font-black text-blue-900 block mb-1">ملاحظات المفتش:</span>
                          <p className="text-blue-900 font-semibold">{item.case_inspector_notes || item.inspector_notes || "لا توجد ملاحظات"}</p>
                        </div>
                      </div>

                      {/* Executor Field Response & Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-bold">المنفذ الميداني المكلف:</span>
                            <span className="font-black text-[#1B1111] bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                              {item.assigned_to_user_name || item.executor_name || item.assigned_to_dept}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold block mb-1">🛠️ تقرير وإجراء المعالجة المتخذ ميدانياً:</span>
                            <p className="bg-[#FAF7F4] p-3 rounded-2xl border border-slate-200 text-slate-800 font-semibold leading-relaxed">
                              {item.action_taken || "تم إنجاز المعالجة المطلوبة"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* بند ملاحظات المنفذ الميداني */}
                          <div>
                            <span className="text-blue-900 font-bold block mb-1 flex items-center gap-1.5">
                              <MessageSquare className="w-4 h-4 text-blue-600" />
                              <span>💬 بند ملاحظات المنفذ الميداني:</span>
                            </span>
                            <div className="bg-blue-50/80 p-3 rounded-2xl border border-blue-200 text-blue-950 font-semibold leading-relaxed min-h-[58px]">
                              {item.exec_notes || item.notes ? (
                                <span className="font-bold">{item.exec_notes || item.notes}</span>
                              ) : (
                                <span className="text-slate-400 font-normal italic">لا توجد ملاحظات إضافية مسجلة من قِبل المنفذ</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {item.evidence_url && (
                        <div className="text-xs pt-1">
                          <span className="text-slate-400 font-bold block mb-1">صورة إثبات المعالجة:</span>
                          <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-44 bg-slate-50 flex items-center justify-center">
                            <img src={item.evidence_url} alt="إثبات الإنجاز" className="object-contain max-h-full max-w-full" />
                          </div>
                        </div>
                      )}

                      {/* Approval Actions */}
                      <div className="flex flex-wrap gap-2 pt-3 border-t justify-end">
                        {!hasActionFeature("review_approve") && !hasActionFeature("review_round_bump") && userPermissions?.can_close === 'none' ? (
                          <span className="text-xs font-bold text-slate-400 py-2">
                            (غير مصرح لك باعتماد أو إعادة توجيه المهام)
                          </span>
                        ) : (
                          <>
                            {hasActionFeature("review_approve") && <button
                              type="button"
                              onClick={() => handleApprove(item)}
                              disabled={isLoading}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                              title="اعتماد رد المنفذ (تصبح مقبولة لديه وتبقى معلقة لدى الآخرين)"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>اعتماد الرد</span>
                            </button>}
                            {hasActionFeature("review_round_bump") && <button
                              type="button"
                              onClick={() => {
                                setReassignNotes("");
                                setReassignUserIds([]);
                                setReassignDepts([]);
                                setActiveReviewModal({ type: "reassign", item });
                              }}
                              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                              title="تكليف منفذين لاستكمال المهمة مع توجيه إداري"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>استكمال المهمة</span>
                            </button>}
                            {userPermissions?.can_close !== 'none' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCloseNotes("");
                                  setActiveReviewModal({ type: "close", item });
                                }}
                                className="px-4 py-2.5 bg-[#1B1111] hover:bg-slate-800 text-[#FFC217] rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                                title="إغلاق الحالة نهائياً لجميع المنفذين مع ملاحظات إدارية إلزامية"
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
                    <div className="font-black text-sm text-[#1B1111]">{c.nc_name || c.title || c.category_name || "حالة عدم مطابقة"}</div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs pt-2 border-t text-slate-700">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Building2 className="w-3.5 h-3.5 text-[#D49A3D]" />
                        <span>{c.department_name}</span>
                      </div>
                      <span className="text-slate-300">|</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-[#682722]" />
                        <span>القسم والموقع: {c.location_name || c.section_name || c.location || "-"}</span>
                      </div>
                      <span className="text-slate-300">|</span>
                      <div className="flex items-center gap-1.5 font-bold text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>المفتش: {c.inspector_name || "النظام"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs pt-1">
                      <div className="bg-[#FAF7F4] p-2.5 rounded-xl border border-slate-100">
                        <span className="font-black text-[#1B1111] block mb-0.5 text-[11px]">وصف المخالفة:</span>
                        <p className="text-slate-600 font-semibold">{c.description || "-"}</p>
                      </div>
                      <div className="bg-[#FAF3F3] p-2.5 rounded-xl border border-[#682722]/20">
                        <span className="font-black text-[#682722] block mb-0.5 text-[11px]">السبب المرصود:</span>
                        <p className="text-[#682722] font-semibold">{c.root_cause || "لم يُحدد"}</p>
                      </div>
                      <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                        <span className="font-black text-blue-900 block mb-0.5 text-[11px]">ملاحظات المفتش:</span>
                        <p className="text-blue-900 font-semibold">{c.inspector_notes || "لا توجد"}</p>
                      </div>
                    </div>

                    {(c.action_taken || c.executor_notes) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {c.action_taken && (
                          <div className="bg-[#FAF7F4] p-2.5 rounded-xl border border-slate-200">
                            <span className="font-black text-slate-700 block mb-0.5 text-[11px]">🛠️ إجراء المعالجة المنفذ:</span>
                            <p className="text-slate-800 font-semibold">{c.action_taken}</p>
                          </div>
                        )}
                        {c.executor_notes && (
                          <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200">
                            <span className="font-black text-blue-900 block mb-0.5 text-[11px]">💬 ملاحظات المنفذ الميداني:</span>
                            <p className="text-blue-950 font-semibold">{c.executor_notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {c.closed_feedback && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-bold space-y-1">
                        <span className="text-emerald-800 font-black block">💡 التوجيه والملاحظات الإدارية الدائمة عند الإغلاق:</span>
                        <p className="text-emerald-900 font-semibold leading-relaxed">{c.closed_feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeMenu === "my_executors" && hasFeatureAccess("view_executor_directory") && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D49A3D]" />
                منفذو الإدارة الميدانيون ({fieldRoles.length})
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">دليل الاطلاع على المنفذين المتاحين ضمن نطاق صلاحيتك.</p>
            </div>
            {fieldRoles.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-sm font-bold text-slate-500">لا يوجد منفذون ميدانيون ضمن النطاق.</div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF7F4] text-slate-600">
                    <tr><th className="p-3">الاسم</th><th className="p-3">الإدارة</th><th className="p-3">المسمى الوظيفي</th><th className="p-3">رقم المستخدم</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fieldRoles.map((executor) => (
                      <tr key={executor.id}>
                        <td className="p-3 font-black text-slate-800">{executor.full_name}</td>
                        <td className="p-3">{executor.department_name}</td>
                        <td className="p-3">{executor.job_title || "منفذ ميداني"}</td>
                        <td className="p-3 font-mono">{executor.user_number || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

              {/* Excel Export Button */}
              {hasFeature("export_excel") && <button
                type="button"
                onClick={handleExportCasesExcel}
                disabled={exportingExcel}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:bg-slate-300"
                title="تصدير السجل الكامل لكل حالة مع جميع السيناريوهات والمراحل إلى ملف Excel"
              >
                {exportingExcel ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                )}
                <span>تصدير السجل التراكمي (Excel)</span>
              </button>}
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
                      <th className="py-3 px-4">نوع حالة عدم المطابقة</th>
                      <th className="py-3 px-4">الإدارة والقسم</th>
                      <th className="py-3 px-4">السبب المرصود والملاحظات</th>
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
                          (c.nc_name || "").includes(caseSearchQuery) ||
                          (c.title || "").includes(caseSearchQuery) ||
                          (c.department_name || "").includes(caseSearchQuery) ||
                          (c.location_name || "").includes(caseSearchQuery) ||
                          (c.location || "").includes(caseSearchQuery) ||
                          (c.root_cause || "").includes(caseSearchQuery) ||
                          (c.inspector_notes || "").includes(caseSearchQuery) ||
                          (c.description || "").includes(caseSearchQuery);
                        const matchesStatus =
                          caseFilterStatus === "all" ||
                          (caseFilterStatus === "open" && (c.status === "open" || c.status === "pending_assignment")) ||
                          (caseFilterStatus === "in_progress" && (c.status === "assigned" || c.status === "in_progress" || c.status === "pending_review")) ||
                          (caseFilterStatus === "closed" && c.status === "closed");
                        return matchesQuery && matchesStatus;
                      })
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-black font-mono">#{c.case_number}</td>
                          <td className="py-3 px-4 font-black text-[#1B1111]">
                            <div>{c.nc_name || c.title || c.category_name}</div>
                            {c.description && <div className="text-[11px] text-slate-500 font-normal line-clamp-1">{c.description}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <div>{c.department_name}</div>
                            <div className="text-[11px] text-slate-500 font-normal">{c.location_name || c.section_name || c.location || "-"}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[11px] space-y-0.5">
                              {c.root_cause && <div className="text-[#682722] font-bold">السبب: {c.root_cause}</div>}
                              {c.inspector_notes && <div className="text-blue-900 font-medium">الملاحظات: {c.inspector_notes}</div>}
                              {!c.root_cause && !c.inspector_notes && <span className="text-slate-400">-</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                c.severity === "high"
                                  ? "bg-rose-50 text-rose-800"
                                  : c.severity === "medium"
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-blue-50 text-blue-800"
                              }`}
                            >
                              {c.severity === "high" ? "حرج" : c.severity === "medium" ? "متوسط" : "عادي"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                c.status === "closed"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : c.status === "open" || c.status === "pending_assignment"
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-blue-50 text-blue-800"
                              }`}
                            >
                              {c.status === "closed" ? "مغلقة" : c.status === "open" || c.status === "pending_assignment" ? "مفتوحة" : "قيد التنفيذ"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{c.obs_date || c.created_at}</td>
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
                      <th className="py-3 px-4 text-center">التقرير اليومي</th>
                      <th className="py-3 px-4 text-center">أرشيف التقارير</th>
                      <th className="py-3 px-4 text-center">الحالة</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {users.map((u) => {
                      const isProtected = u.is_protected === 1;
                      const isDisabled = u.status === "disabled";

                      return (
                        <tr key={u.id} className={`hover:bg-slate-50 ${isProtected ? "bg-amber-50/40" : ""}`}>
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
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                u.role === "super_admin"
                                  ? "bg-purple-100 text-purple-900 border border-purple-300"
                                  : u.role === "general_admin"
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : u.role === "admin"
                                  ? "bg-blue-100 text-blue-900 border border-blue-300"
                                  : u.role === "inspector"
                                  ? "bg-indigo-100 text-indigo-900 border border-indigo-300"
                                  : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              }`}>
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
                              className={`p-1.5 rounded-lg ${u.can_export_excel === 1 ? "text-emerald-600 bg-emerald-50" : "text-slate-300"}`}
                              title="تفعيل/تعطيل تصدير إكسل"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={async () => {
                                const res = await toggleUserDailyReportAction(u.id);
                                if (res.success) {
                                  showNotification("success", res.message || "تم تعديل صلاحية التقرير اليومي بنجاح");
                                  router.refresh();
                                } else {
                                  showNotification("error", res.error || "فشل تعديل الصلاحية");
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                u.can_create_daily_report !== 0
                                  ? "text-amber-600 bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-300"
                                  : "text-slate-300 hover:text-slate-500 bg-slate-50"
                              }`}
                              title={
                                u.can_create_daily_report !== 0
                                  ? "صلاحية إنشاء تقرير يومي: مفعّلة (انقر للتعطيل)"
                                  : "صلاحية إنشاء تقرير يومي: معطّلة (انقر للتفعيل)"
                              }
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={async () => {
                                const res = await toggleUserDailyArchivePermissionAction(u.id);
                                if (res.success) {
                                  showNotification("success", res.message || "تم تعديل صلاحية أرشيف التقارير بنجاح");
                                  router.refresh();
                                } else {
                                  showNotification("error", res.error || "فشل تعديل الصلاحية");
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                u.can_view_daily_archive === 1
                                  ? "text-blue-600 bg-blue-50 hover:bg-blue-100 ring-1 ring-blue-300"
                                  : "text-slate-300 hover:text-slate-500 bg-slate-50"
                              }`}
                              title={
                                u.can_view_daily_archive === 1
                                  ? "صلاحية الاطلاع على أرشيف التقارير: مفعّلة (انقر للتعطيل)"
                                  : "صلاحية الاطلاع على أرشيف التقارير: معطّلة (انقر للتفعيل)"
                              }
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isDisabled ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-700"
                              }`}
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
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      isDisabled ? "text-slate-400 hover:text-emerald-600" : "text-emerald-600 hover:text-amber-600"
                                    }`}
                                    title={isDisabled ? "تفعيل الحساب" : "تعطيل الحساب"}
                                  >
                                    <Power className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`هل أنت متأكد من حذف المستخدم (${u.full_name})؟`)) {
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
                        ? `أقسام الإدارات المحددة فقط (${roleSectionsFiltered.length})`
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
                        : `أقسام الإدارات المحددة فقط (${modalSectionsFiltered.length})`}
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
                    showNotification("success", `تمت إضافة المستخدم بنجاح! رقم المستخدم: #${res.userNumber || "جديد"}`);
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
                <input name="pin_code" required maxLength={4} pattern="\d{4}" placeholder="مثال: 5544" className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-mono font-black text-center text-sm" />
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

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" name="can_view_daily_archive" value="1" id="archive_perm" />
                <label htmlFor="archive_perm" className="font-bold text-slate-700 cursor-pointer">منح صلاحية الاطلاع على أرشيف التقارير (لإدارته)</label>
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

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="can_view_daily_archive"
                  value="1"
                  id="edit_archive_perm"
                  checked={userFormCanArchive}
                  onChange={(e) => setUserFormCanArchive(e.target.checked)}
                />
                <label htmlFor="edit_archive_perm" className="font-bold text-slate-700 cursor-pointer">منح صلاحية الاطلاع على أرشيف التقارير (لإدارته)</label>
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
                <input name="new_pin" required maxLength={4} pattern="\d{4}" className="w-full h-10 px-3 bg-[#FAF7F4] border rounded-xl font-mono font-black text-center" />
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
                <span>استكمال المهمة وإعادة التكليف (الجولة {activeReviewModal.item.round + 1})</span>
              </h4>
              <button onClick={() => setActiveReviewModal(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            
            <div className="bg-[#FAF3F3] border border-[#682722]/30 p-3.5 rounded-2xl text-xs space-y-1 text-[#682722] font-semibold">
              <p className="font-black">⚠️ سيتم رفع جولة الحالة #{activeReviewModal.item.case_number} إلى الجولة ({activeReviewModal.item.round + 1}).</p>
              <p>ستعاد للمنفذين المحددين كـ &quot;مهمة معادة للاستكمال&quot; مع تسجيل التوجيهات الإدارية.</p>
            </div>

            {/* Department Executors Selector */}
            {(() => {
              const deptCode = activeReviewModal.item.department_code || currentUser?.department_code;
              const deptExecutors = fieldRoles.filter(
                (u) => (userPermissions?.can_assign === "full" || u.department_code === deptCode) &&
                       (u.department_code === deptCode || userPermissions?.can_assign === "full")
              );
              const isAllSelected = deptExecutors.length > 0 && deptExecutors.every((u) => reassignUserIds.includes(u.id));

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-[#1B1111] flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#D49A3D]" />
                      <span>اختر المنفذين المكلفين باستكمال المهمة (واحد أو أكثر) <span className="text-[#682722]">*</span>:</span>
                    </label>
                    {deptExecutors.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isAllSelected) {
                            setReassignUserIds([]);
                          } else {
                            setReassignUserIds(deptExecutors.map((u) => u.id));
                          }
                        }}
                        className="text-[11px] font-bold text-[#682722] hover:underline cursor-pointer"
                      >
                        {isAllSelected ? "إلغاء تحديد الكل" : "تحديد جميع منفذي الإدارة"}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-white rounded-2xl border border-slate-200">
                    {deptExecutors.length === 0 ? (
                      <span className="text-xs text-slate-400 p-2">لا يوجد منفذين مسجلين لهذه الإدارة</span>
                    ) : (
                      deptExecutors.map((u) => {
                        const isSelected = reassignUserIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setReassignUserIds((prev) =>
                                isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                              );
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                              isSelected
                                ? "bg-[#D49A3D] text-[#1B1111] border-[#1B1111] shadow-sm font-black"
                                : "bg-[#FAF7F4] text-slate-700 border-slate-200 hover:border-[#D49A3D]"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black border ${isSelected ? "bg-[#1B1111] text-[#FFC217] border-[#1B1111]" : "border-slate-300"}`}>
                              {isSelected ? "✓" : ""}
                            </span>
                            <span>{u.full_name}</span>
                            {u.user_number && (
                              <span className="text-[10px] font-mono opacity-70">#{u.user_number}</span>
                            )}
                            {u.job_title && (
                              <span className="text-[10px] opacity-70">({u.job_title})</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold">
                    تم اختيار: <strong className="text-[#682722]">{reassignUserIds.length}</strong> منفذ/منفذين
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-black text-[#1B1111] mb-1">
                توجيهات وملاحظات استكمال المهمة للمنفذين (إلزامي) <span className="text-[#682722]">*</span>:
              </label>
              <textarea
                rows={3}
                value={reassignNotes}
                onChange={(e) => setReassignNotes(e.target.value)}
                placeholder="وضح للمنفذين بدقة سبب عدم كفاية الإجراء وما هو المطلوب استكماله بالميدان..."
                className="w-full text-xs font-semibold p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D49A3D]/30 resize-none bg-white"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={() => setActiveReviewModal(null)} className="px-4 py-2 text-xs font-bold text-slate-600">إلغاء</button>
              <button
                type="button"
                onClick={handleReassignSubmit}
                disabled={reassignUserIds.length === 0 || !reassignNotes.trim()}
                className="px-5 py-2.5 rounded-2xl bg-[#682722] text-white text-xs font-black disabled:opacity-50 cursor-pointer shadow-md"
              >
                تأكيد إسناد استكمال المهمة ({reassignUserIds.length})
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
                <span>إغلاق الحالة بشكل نهائي (Final Closure)</span>
              </h4>
              <button onClick={() => setActiveReviewModal(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <div className="bg-[#FAF3F3] border border-[#682722]/30 p-3.5 rounded-2xl text-xs space-y-1 text-[#682722] font-semibold">
              <p className="font-black">🛑 سيتم إنهاء الحالة #{activeReviewModal.item.case_number} وإغلاقها بشكل كامل لجميع المنفذين.</p>
              <p>الملاحظات الإدارية التي ستكتبها ستظهر لجميع المنفذين كتغذية راجعة للقراءة فقط لمنع تكرار المخالفة.</p>
            </div>
            <div>
              <label className="block text-xs font-black text-[#1B1111] mb-1">
                الملاحظات والتوجيهات الإدارية الدائمة (إلزامي - ستظهر كتغذية راجعة للمنفذين) <span className="text-[#682722]">*</span>:
              </label>
              <textarea
                rows={3}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="التوجيه الإداري الدائم وملاحظات منع تكرار المخالفة التي ستظهر للمنفذين في أرشيف الحالات المغلقة..."
                className="w-full text-xs font-semibold p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D49A3D]/30 resize-none bg-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={() => setActiveReviewModal(null)} className="px-4 py-2 text-xs font-bold text-slate-600">تراجع</button>
              <button
                type="button"
                onClick={handleCloseSubmit}
                disabled={!closeNotes.trim()}
                className="px-5 py-2.5 rounded-2xl bg-[#1B1111] text-[#FFC217] text-xs font-black disabled:opacity-50 cursor-pointer shadow-md"
              >
                تأكيد الإغلاق النهائي واعتماد التغذية الراجعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👥 MODAL 1: ASSIGN ADDITIONAL PERSONS (إسناد لشخص إضافي) */}
      {activeAssignAdditionalModal && (() => {
        const c = activeAssignAdditionalModal;
        const alreadyAssignedIds = (c.assigned_user_ids || "")
          .split(",")
          .map((idStr: string) => Number(idStr.trim()))
          .filter((n: number) => !isNaN(n) && n > 0);

        // Filter fieldRoles: prioritize agents of the same department or all
        const deptAgents = fieldRoles.filter((u) => u.department_code === c.department_code);
        const candidates = deptAgents.length > 0 ? deptAgents : fieldRoles;

        const handleAdditionalAssignSubmit = async () => {
          if (additionalSelectedUserIds.length === 0) {
            showNotification("error", "يرجى اختيار شخص إضافي واحد على الأقل للإسناد");
            return;
          }
          setIsSubmitting(true);
          try {
            const selectedObjects = candidates
              .filter((u) => additionalSelectedUserIds.includes(u.id))
              .map((u) => ({
                id: u.id,
                name: u.full_name || u.name,
                deptCode: u.department_code,
              }));

            const res = await assignAdditionalUsersAction(c.id, selectedObjects, additionalInstructions);
            if (res.success) {
              showNotification("success", res.message || "تم إسناد المهمة للمنفذين الإضافيين بنجاح");
              setActiveAssignAdditionalModal(null);
              setAdditionalSelectedUserIds([]);
              setAdditionalInstructions("");
              router.refresh();
            } else {
              showNotification("error", res.error || "فشل إسناد المهمة");
            }
          } catch (err: any) {
            showNotification("error", err.message || "حدث خطأ غير متوقع");
          } finally {
            setIsSubmitting(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 bg-[#1B1111]/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#FAF7F4] rounded-[2.5rem] max-w-lg w-full p-6 shadow-2xl space-y-4 border-2 border-blue-400">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h4 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <span>إسناد لشخص إضافي - بلاغ #{c.case_number}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveAssignAdditionalModal(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-2xl text-xs space-y-1 text-blue-950 font-semibold">
                <p className="font-black">ℹ️ التكليف الإضافي يحافظ على التكليفات السابقة:</p>
                <p>لن يتم استبعاد أي منفذ كُلف سابقاً، وستظهر المهمة للشخص المضاف فوراً في قائمة المهام لديه.</p>
                {c.assignments_summary && (
                  <p className="pt-1 text-[11px] text-slate-600">
                    <strong>المنفذون الحاليون:</strong> {c.assignments_summary}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-[#1B1111] mb-1.5">
                  اختر منفذاً إضافياً أو أكثر من ({c.department_name || "الإدارة"}):
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-white rounded-2xl border border-slate-200">
                  {candidates.map((u) => {
                    const isAlreadyAssigned = alreadyAssignedIds.includes(u.id);
                    const isSelected = additionalSelectedUserIds.includes(u.id);

                    return (
                      <label
                        key={u.id}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isAlreadyAssigned
                            ? "bg-slate-100/80 text-slate-400 cursor-not-allowed opacity-75"
                            : isSelected
                            ? "bg-blue-50 text-blue-900 border border-blue-300"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={isAlreadyAssigned}
                            checked={isSelected}
                            onChange={(e) => {
                              if (isAlreadyAssigned) return;
                              if (e.target.checked) {
                                setAdditionalSelectedUserIds([...additionalSelectedUserIds, u.id]);
                              } else {
                                setAdditionalSelectedUserIds(
                                  additionalSelectedUserIds.filter((id) => id !== u.id)
                                );
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <span>{u.full_name || u.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">#{u.user_number || u.id}</span>
                        </div>

                        {isAlreadyAssigned ? (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-black">
                            مسند إليه مسبقاً ✅
                          </span>
                        ) : u.job_title ? (
                          <span className="text-[10px] text-slate-500">{u.job_title}</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#1B1111] mb-1">
                  توجيهات أو ملاحظات خاصة للمنفذين الجدد (اختياري):
                </label>
                <textarea
                  rows={2}
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="اكتب أي تعليمات إضافية للمكلفين الجدد لمساعدتهم في المعالجة السريعة..."
                  className="w-full text-xs font-semibold p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setActiveAssignAdditionalModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAdditionalAssignSubmit}
                  disabled={isSubmitting || additionalSelectedUserIds.length === 0}
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black disabled:opacity-50 cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>تأكيد الإسناد الإضافي ({additionalSelectedUserIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 📝 MODAL 2: WRITE NOTE / ALERT TO IN-PROGRESS EXECUTORS (كتابة ملاحظة) */}
      {activeWriteNoteModal && (() => {
        const c = activeWriteNoteModal;

        const handleWriteNoteSubmit = async () => {
          if (!inProgressNoteText.trim()) {
            showNotification("error", "يرجى كتابة نص الملاحظة أو التنبيه للمنفذين");
            return;
          }
          setIsSubmitting(true);
          try {
            const res = await addInProgressNoteAction(c.id, inProgressNoteText);
            if (res.success) {
              showNotification("success", res.message || "تم إرسال الملاحظة والتنبيه للمنفذين بنجاح");
              setActiveWriteNoteModal(null);
              setInProgressNoteText("");
              router.refresh();
            } else {
              showNotification("error", res.error || "فشل إرسال الملاحظة");
            }
          } catch (err: any) {
            showNotification("error", err.message || "حدث خطأ أثناء إرسال الملاحظة");
          } finally {
            setIsSubmitting(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 bg-[#1B1111]/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#FAF7F4] rounded-[2.5rem] max-w-lg w-full p-6 shadow-2xl space-y-4 border-2 border-amber-400">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h4 className="text-base font-black text-[#1B1111] flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                  <span>كتابة ملاحظة أو تنبيه للمنفذين - بلاغ #{c.case_number}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveWriteNoteModal(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs space-y-1 text-amber-950 font-semibold">
                <p className="font-black flex items-center gap-1.5 text-amber-900">
                  <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>ظهور مباشر وفوري:</span>
                </p>
                <p>الملاحظة التي ستكتبها ستظهر كشريط تنبيه عاجل وبارز مباشرة لكل المنفذين المكلفين في لوحة المهام الميدانية لديهم.</p>
              </div>

              <div>
                <label className="block text-xs font-black text-[#1B1111] mb-1">
                  نص الملاحظة أو التوجيه الإداري العاجل (إلزامي) <span className="text-[#682722]">*</span>:
                </label>
                <textarea
                  rows={4}
                  value={inProgressNoteText}
                  onChange={(e) => setInProgressNoteText(e.target.value)}
                  placeholder="اكتب الملاحظة أو التنبيه هنا، مثل: يرجى سرعة استبدال لوحة التقطيع فوراً قبل نهاية الوردية..."
                  className="w-full text-xs font-semibold p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setActiveWriteNoteModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleWriteNoteSubmit}
                  disabled={isSubmitting || !inProgressNoteText.trim()}
                  className="px-5 py-2.5 rounded-2xl bg-[#D49A3D] hover:bg-[#B88228] text-[#1B1111] text-xs font-black disabled:opacity-50 cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>إرسال التنبيه فوراً للمنفذين</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🛑 MODAL 3: CLOSE TASK DIRECTLY IN-PROGRESS (إغلاق المهمة وهي قيد التنفيذ) */}
      {activeCloseInProgressModal && (() => {
        const c = activeCloseInProgressModal;

        const handleCloseInProgressSubmit = async () => {
          if (!closeInProgressNotes.trim()) {
            showNotification("error", "يرجى كتابة سبب أو ملاحظات الإغلاق النهائي كتغذية راجعة للمنفذين");
            return;
          }
          setIsSubmitting(true);
          try {
            const res = await closeCaseEntirelyAction(c.id, closeInProgressNotes);
            if (res.success) {
              showNotification("success", "تم إغلاق المهمة بالكامل بنجاح ونقلها إلى الحالات المغلقة");
              setActiveCloseInProgressModal(null);
              setCloseInProgressNotes("");
              router.refresh();
            } else {
              showNotification("error", res.error || "فشل إغلاق الحالة");
            }
          } catch (err: any) {
            showNotification("error", err.message || "حدث خطأ غير متوقع");
          } finally {
            setIsSubmitting(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 bg-[#1B1111]/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#FAF7F4] rounded-[2.5rem] max-w-lg w-full p-6 shadow-2xl space-y-4 border-2 border-rose-500">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h4 className="text-base font-black text-[#682722] flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  <span>إغلاق المهمة بالكامل وهي قيد التنفيذ - بلاغ #{c.case_number}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveCloseInProgressModal(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-[#FAF3F3] border border-[#682722]/30 p-3.5 rounded-2xl text-xs space-y-1.5 text-[#682722] font-semibold">
                <p className="font-black text-rose-900">🛑 إنهاء نهائي وفوري للحالة:</p>
                <p>سيتم إغلاق البلاغ بالكامل الآن ونقله إلى سجل الحالات المغلقة وإغلاق تكليفات المنفذين فوراً دون انتظار رفع الإجراءات الميدانية.</p>
                <p>ملاحظاتك المسجلة هنا ستظهر للمنفذين كتغذية راجعة إدارية لمنع تكرار المخالفة.</p>
              </div>

              <div>
                <label className="block text-xs font-black text-[#1B1111] mb-1">
                  سبب وملاحظات الإغلاق النهائي (إلزامي - ستظهر كتغذية راجعة) <span className="text-[#682722]">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={closeInProgressNotes}
                  onChange={(e) => setCloseInProgressNotes(e.target.value)}
                  placeholder="مثال: تم إنهاء المشكلة والتوجيه الشفهي للمنفذ / تم حل المخالفة بالتعاون مع الإدارة العامة..."
                  className="w-full text-xs font-semibold p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#682722] resize-none bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setActiveCloseInProgressModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleCloseInProgressSubmit}
                  disabled={isSubmitting || !closeInProgressNotes.trim()}
                  className="px-5 py-2.5 rounded-2xl bg-[#682722] hover:bg-[#7D2F28] text-white text-xs font-black disabled:opacity-50 cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>تأكيد الإغلاق النهائي وإنهاء المهمة</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create Daily Report Modal */}
      <CreateDailyReportModal
        isOpen={showDailyReportModal}
        onClose={() => setShowDailyReportModal(false)}
        currentUser={{
          id: Number(currentUser.id),
          full_name: currentUser.full_name,
          role: currentUser.role,
          department_name: currentUser.department_name,
          department_code: currentUser.department_code,
        }}
        locations={locations.map((l) => ({ code: l.code, name: l.name }))}
        onSuccess={() => {
          setShowDailyReportModal(false);
          setShowDailyArchiveModal(true);
          showNotification("success", "تم إرسال التقرير اليومي بنجاح وإدراجه في الأرشيف");
        }}
      />

      {/* Daily Reports Archive Modal */}
      <DailyReportsArchiveModal
        isOpen={showDailyArchiveModal}
        onClose={() => setShowDailyArchiveModal(false)}
        onOpenCreateNew={() => {
          setShowDailyArchiveModal(false);
          setShowDailyReportModal(true);
        }}
        canCreateReport={canCreateDailyReport}
        canExportReports={hasActionFeature("export_excel")}
      />
      <ExcelImportModal isOpen={showExcelImport} onClose={() => setShowExcelImport(false)} />

    </div>
  );
}
