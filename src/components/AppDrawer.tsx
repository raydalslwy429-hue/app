"use client";

import React from "react";
import {
  X,
  KeyRound,
  Building2,
  MapPin,
  Users,
  AlertTriangle,
  PlusCircle,
  Inbox,
  Clock,
  Search,
  CheckCircle2,
  Shield,
  FileSpreadsheet,
  Send,
  LogOut,
  Wrench,
  FileText,
  Radio,
  Sliders,
  Sparkles,
  Upload,
  AlertOctagon,
  RotateCcw,
} from "lucide-react";
import { UserSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/capa";

interface AppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession;
  userPermissions: { can_view: string; features: Record<string, string> };
  onOpenChangePin: () => void;
  onOpenOutbox: () => void;
  onOpenSyncModal?: () => void;
  onOpenResetModal?: () => void;
  onOpenImportModal?: () => void;
  onOpenDailyReport?: () => void;
  onOpenDailyArchive?: () => void;
  onSelectMenu?: (menuKey: string) => void;
  outboxCount: number;
  isOnline: boolean;
}

export default function AppDrawer({
  isOpen,
  onClose,
  user,
  userPermissions,
  onOpenChangePin,
  onOpenOutbox,
  onOpenSyncModal,
  onOpenResetModal,
  onOpenImportModal,
  onOpenDailyReport,
  onOpenDailyArchive,
  onSelectMenu,
  outboxCount,
  isOnline,
}: AppDrawerProps) {
  if (!isOpen) return null;

  const hasFeature = (key: string) => ["full", "exclusive", "dept_only"].includes(userPermissions.features[key]);
  const hasViewFeature = (key: string) => hasFeature(key) || userPermissions.features[key] === "view_only";

  const handleItemClick = (key: string) => {
    if (onSelectMenu) onSelectMenu(key);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel (Right Side for RTL) */}
      <div className="relative mr-auto w-full max-w-xs sm:max-w-sm bg-gradient-to-b from-[#1C1210] via-[#241714] to-[#1C1210] text-white h-full shadow-2xl flex flex-col z-10 border-l border-[#D49A3D]/30 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC217]/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Drawer Header */}
        <div className="p-5 border-b border-[#D49A3D]/20 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/95 rounded-xl p-1 shadow-md border border-[#D49A3D]/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo.png" alt="شعار المراسيم" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-white">النظام الإداري</h3>
                <span className="text-[9px] bg-[#682722] text-amber-100 font-bold px-1.5 py-0.5 rounded-full border border-amber-500/30">
                  مطاعم المراسيم
                </span>
              </div>
              <p className="text-[10px] text-[#D49A3D] font-bold">القائمة الرئيسية والتنقل</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card & Network Status */}
        <div className="p-4 mx-4 my-3 bg-black/40 rounded-2xl border border-[#D49A3D]/20 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-amber-100">{user.full_name}</p>
              <p className="text-[10px] text-amber-300/80 font-bold">{user.department_name}</p>
            </div>
            <div className="text-left">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-300 border-amber-500/30">
                {user.role === "super_admin"
                  ? "مدير عام النظام"
                  : user.role === "general_admin"
                  ? "المدير العام"
                  : user.role === "admin"
                  ? "مسؤول الإدارة"
                  : user.role === "inspector"
                  ? "مفتش الجودة"
                  : "منفذ ميداني"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`}
              ></span>
              <span className={isOnline ? "text-emerald-300 font-bold" : "text-rose-300 font-bold"}>
                {isOnline ? "متصل بالإنترنت" : "أوفلاين (بلا نت)"}
              </span>
            </div>
            <button
              hidden={!hasFeature("offline_outbox")}
              onClick={() => {
                onOpenOutbox();
                onClose();
              }}
              className="flex items-center gap-1 text-amber-300 hover:text-[#FFC217] font-black"
            >
              <Send className="w-3 h-3" />
              <span>جاهز للإرسال ({outboxCount})</span>
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Menu items */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 text-right">
          {/* Universal Section: PIN & Outbox */}
          <div className="text-[10px] font-black text-amber-400/80 px-2 py-1 uppercase tracking-wider">
            الحساب والمزامنة
          </div>

          <button
            hidden={!hasFeature("change_own_pin")}
            onClick={() => {
              onOpenChangePin();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <KeyRound className="w-4 h-4 text-[#D49A3D]" />
            <span>الخصوصية وتغيير كلمة السر</span>
          </button>

          <button
            hidden={!hasFeature("offline_outbox")}
            onClick={() => {
              onOpenOutbox();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>قائمة جاهز للإرسال (أوفلاين)</span>
            </div>
            {outboxCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-[#1B1111] text-[10px] font-black rounded-full">
                {outboxCount}
              </span>
            )}
          </button>

          <button
            hidden={!hasFeature("manage_sync")}
            onClick={() => {
              if (onOpenSyncModal) {
                onOpenSyncModal();
                onClose();
              } else {
                handleItemClick("manage_sync");
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Radio className="w-4 h-4 text-amber-300" />
            <span>مركز المزامنة ووضع النظام</span>
          </button>

          {/* Universal Section: Daily Reports */}
          <div className="text-[10px] font-black text-amber-400/80 px-2 py-1 uppercase tracking-wider">
            التقارير والعمل الميداني
          </div>

          <button
            hidden={!hasFeature("create_daily_report")}
            onClick={() => {
              if (onOpenDailyReport) onOpenDailyReport();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <FileText className="w-4 h-4 text-[#FFC217]" />
            <span>إنشاء تقرير يومي 📝</span>
          </button>

          <button
            hidden={!hasViewFeature("view_daily_archive")}
              onClick={() => {
                if (onOpenDailyArchive) onOpenDailyArchive();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Clock className="w-4 h-4 text-amber-200" />
              <span>
                {user.role === "super_admin" || user.role === "general_admin"
                  ? "أرشيف التقارير اليومية (المركزي)"
                  : "أرشيف تقارير إدارتي اليومية"}
              </span>
          </button>

          <div className="h-px bg-white/10 my-2"></div>

          {/* SUPER ADMIN & GENERAL ADMIN ITEMS */}
          {(user.role === "super_admin" || user.role === "general_admin") && (
            <>
              <div className="text-[10px] font-black text-amber-400/80 px-2 py-1 uppercase tracking-wider">
                إدارة وحوكمة المنظومة
              </div>

              <button
                hidden={!hasFeature("manage_structure")}
                onClick={() => handleItemClick("departments")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Building2 className="w-4 h-4 text-amber-300" />
                <span>هيكل الإدارات (إنشاء / تعديل / إيقاف)</span>
              </button>

              <button
                hidden={!hasFeature("manage_structure")}
                onClick={() => handleItemClick("sections")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <MapPin className="w-4 h-4 text-amber-300" />
                <span>الأقسام والمواقع (إنشاء / تعديل / إيقاف)</span>
              </button>

              <button
                hidden={!hasFeature("manage_users")}
                onClick={() => handleItemClick("users")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Users className="w-4 h-4 text-amber-300" />
                <span>المستخدمين والصلاحيات (إنشاء / تعديل / إيقاف)</span>
              </button>

              <button
                hidden={!hasFeature("manage_structure")}
                onClick={() => handleItemClick("categories")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <span>كتالوج حالات عدم المطابقة (إنشاء وتعديل)</span>
              </button>

              <button
                hidden={!hasFeature("manage_roles")}
                onClick={() => handleItemClick("roles")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Shield className="w-4 h-4 text-amber-300" />
                <span>الأدوار الوظيفية (إنشاء وتعديل)</span>
              </button>

              <div className="text-[10px] font-black text-amber-400/80 px-2 py-1 uppercase tracking-wider mt-3">
                إدارة ومتابعة الحالات
              </div>

              <button
                hidden={!hasFeature("inspect_create")}
                onClick={() => handleItemClick("create_case")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-500/10 transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-[#FFC217]" />
                <span>إنشاء حالة / بلاغ جديد</span>
              </button>

              <button
                hidden={!hasViewFeature("view_open_cases")}
                onClick={() => handleItemClick("open_cases")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Inbox className="w-4 h-4 text-amber-400" />
                <span>الحالات المفتوحة (بانتظار الفرز)</span>
              </button>

              <button
                hidden={!hasViewFeature("view_in_progress_cases")}
                onClick={() => handleItemClick("in_progress")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Clock className="w-4 h-4 text-blue-400" />
                <span>الحالات قيد التنفيذ الميداني</span>
              </button>

              <button
                hidden={!hasViewFeature("view_review_cases")}
                onClick={() => handleItemClick("needs_review")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Search className="w-4 h-4 text-[#682722] text-rose-300" />
                <span>الحالات التي تحتاج مراجعة واعتماد</span>
              </button>

              <button
                hidden={!hasViewFeature("view_closed_cases")}
                onClick={() => handleItemClick("closed_cases")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>الحالات المغلقة والمعتمدة</span>
              </button>

              <button
                hidden={!hasViewFeature("view_all_cases")}
                onClick={() => handleItemClick("all_cases")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-300" />
                <span>السجل العام للحالات</span>
              </button>

              <button
                hidden={!hasFeature("manage_forms")}
                onClick={() => handleItemClick("dynamic_forms")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-amber-200 hover:bg-amber-500/10 transition-colors border border-amber-500/20"
              >
                <Sparkles className="w-4 h-4 text-[#FFC217]" />
                <span>محرك الاستمارات والنماذج الذكية</span>
              </button>

              <div className="text-[10px] font-black text-amber-400/80 px-2 py-1 uppercase tracking-wider mt-3">
                التقارير والأرشفة
              </div>

              <button
                hidden={!hasFeature("export_excel")}
                onClick={() => handleItemClick("export_excel")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>تصدير التقارير التراكمية الشاملة إلى Excel</span>
              </button>

              <div className="text-[10px] font-black text-amber-400/80 px-2 py-1 uppercase tracking-wider mt-3">
                التهيئة والصيانة المتقدمة
              </div>

              <button
                hidden={!hasFeature("import_excel")}
                onClick={() => {
                  if (onOpenImportModal) onOpenImportModal();
                  else handleItemClick("import_excel");
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-300 hover:text-white hover:bg-amber-500/10 transition-colors"
              >
                <Upload className="w-4 h-4 text-[#FFC217]" />
                <span>تهيئة واستيراد البيانات عبر Excel</span>
              </button>

              {onOpenResetModal && user.role === "super_admin" && (
                <button
                  onClick={() => {
                    onOpenResetModal();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-500/20 transition-colors"
                >
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  <span>تصفير وإعادة ضبط قاعدة البيانات</span>
                </button>
              )}
            </>
          )}

          {/* DEPARTMENT ADMIN ITEMS */}
          {user.role === "admin" && (
            <>
              <div className="text-[10px] font-black text-amber-400/80 px-2 py-1 uppercase tracking-wider">
                إدارة مهام وحالات الإدارة ({user.department_name})
              </div>

              {hasFeature("manage_structure") && <button onClick={() => handleItemClick("departments")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"><Building2 className="w-4 h-4 text-amber-300" /><span>هيكل الإدارات والأقسام</span></button>}
              {hasFeature("manage_users") && <button onClick={() => handleItemClick("users")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"><Users className="w-4 h-4 text-amber-300" /><span>المستخدمين والصلاحيات</span></button>}
              {hasFeature("manage_roles") && <button onClick={() => handleItemClick("roles")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"><Shield className="w-4 h-4 text-amber-300" /><span>الأدوار ومصفوفة الصلاحيات</span></button>}
              {hasFeature("manage_forms") && <button onClick={() => handleItemClick("dynamic_forms")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"><Sparkles className="w-4 h-4 text-amber-300" /><span>إدارة النماذج والاستمارات</span></button>}
              {hasFeature("import_excel") && <button onClick={() => handleItemClick("import_excel")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-300 hover:text-white hover:bg-white/10 transition-colors"><Upload className="w-4 h-4 text-[#FFC217]" /><span>تهيئة واستيراد Excel</span></button>}

              <button
                hidden={!hasFeature("inspect_create")}
                onClick={() => handleItemClick("create_case")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-500/10 transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-[#FFC217]" />
                <span>إنشاء حالة جديدة في إدارتي</span>
              </button>

              <button
                hidden={!hasViewFeature("view_open_cases")}
                onClick={() => handleItemClick("open_cases")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Inbox className="w-4 h-4 text-amber-400" />
                <span>الحالات المفتوحة في إدارتي</span>
              </button>

              <button
                hidden={!hasViewFeature("view_in_progress_cases")}
                onClick={() => handleItemClick("in_progress")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Clock className="w-4 h-4 text-blue-400" />
                <span>الحالات قيد التنفيذ في إدارتي</span>
              </button>

              <button
                hidden={!hasViewFeature("view_review_cases")}
                onClick={() => handleItemClick("needs_review")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Search className="w-4 h-4 text-rose-300" />
                <span>مراجعة واعتماد ردود المنفذين</span>
              </button>

              <button
                hidden={!hasViewFeature("view_closed_cases")}
                onClick={() => handleItemClick("closed_cases")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>الحالات المغلقة في إدارتي</span>
              </button>

              <button
                hidden={!hasViewFeature("view_all_cases")}
                onClick={() => handleItemClick("all_cases")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-300" />
                <span>السجل العام للحالات</span>
              </button>

              <button
                hidden={!hasViewFeature("view_executor_directory")}
                onClick={() => handleItemClick("my_executors")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Users className="w-4 h-4 text-amber-300" />
                <span>منفذي إدارتي الميدانيين</span>
              </button>

              <button
                hidden={!hasFeature("export_excel")}
                onClick={() => handleItemClick("export_excel")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>تصدير تقارير إدارتي إلى Excel</span>
              </button>
            </>
          )}

          {/* INSPECTOR ITEMS */}
          {user.role === "inspector" && (
            <>
              <div className="text-[10px] font-black text-amber-400/80 px-2 py-1 uppercase tracking-wider">
                عمليات الرقابة والتفتيش
              </div>

              <button
                hidden={!hasFeature("inspect_create")}
                onClick={() => handleItemClick("new_inspection")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-500/10 transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-[#FFC217]" />
                <span>تسجيل حالة عدم مطابقة جديدة</span>
              </button>

              <button
                hidden={!hasFeature("inspect_create")}
                onClick={() => handleItemClick("dynamic_forms")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>الاستمارة الديناميكية للتفتيش</span>
              </button>

              <button
                hidden={!hasViewFeature("inspect_view_own")}
                onClick={() => handleItemClick("my_cases")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>سجل حالاتي المرصودة</span>
              </button>

              <button
                hidden={!hasViewFeature("inspect_view_own")}
                onClick={() => handleItemClick("track_cases")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>متابعة مسار معالجة حالاتي</span>
              </button>
            </>
          )}

          {/* FIELD AGENT ITEMS */}
          {user.role === "field_agent" && (
            <>
              <div className="text-[10px] font-black text-amber-400/80 px-2 py-1 uppercase tracking-wider">
                التنفيذ والمعالجة الميدانية
              </div>

              <button
                hidden={!hasViewFeature("field_execute")}
                onClick={() => handleItemClick("tasks_new")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Inbox className="w-4 h-4 text-amber-400" />
                <span>معالجة بلاغات جديدة</span>
              </button>

              <button
                hidden={!hasViewFeature("field_execute")}
                onClick={() => handleItemClick("tasks_returned")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-amber-300" />
                <span>معالجة بلاغات معادة للاستكمال</span>
              </button>

              <button
                hidden={!hasViewFeature("field_execute")}
                onClick={() => handleItemClick("tasks_submitted")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Clock className="w-4 h-4 text-blue-400" />
                <span>بلاغات بانتظار مراجعة الإدارة</span>
              </button>

              <button
                hidden={!hasViewFeature("field_feedback")}
                onClick={() => handleItemClick("tasks_closed")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>معتمدة ومغلقة (التغذية الراجعة الدائمة)</span>
              </button>

              <button
                hidden={!hasFeature("field_execute")}
                onClick={() => handleItemClick("dynamic_field")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-[#FFC217] hover:bg-amber-500/15 transition-colors border border-amber-500/30 mt-2"
              >
                <Sparkles className="w-4 h-4 text-[#FFC217]" />
                <span>استمارات التفتيش المنقحة المكلفة</span>
              </button>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#D49A3D]/20 bg-black/40 flex items-center justify-between">
          <form action={logoutAction} className="w-full">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#682722]/80 hover:bg-[#682722] text-amber-100 font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-2 border border-amber-500/30 shadow-sm"
            >
              <LogOut className="w-4 h-4 text-[#FFC217]" />
              <span>تسجيل الخروج من المنظومة</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
