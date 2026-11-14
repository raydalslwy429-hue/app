"use client";

import React, { useState, useRef } from "react";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  Database,
  FolderTree,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  FileCode,
  HardDrive,
  GitBranch,
  Download,
  Upload,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import {
  pushSystemDataAction,
  pullSystemDataAction,
  syncLocalDbAction,
  pushCodeToGithubAction,
  pullCodeFromGithubAction,
} from "@/app/actions/capa";
import SystemModeToggle from "@/components/SystemModeToggle";

interface DataSyncHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataSyncHubModal({ isOpen, onClose }: DataSyncHubModalProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const dbFileInputRef = useRef<HTMLInputElement>(null);
  const codeFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Actions Runner
  const handleAction = async (
    actionType: "push" | "pull" | "local" | "github" | "github_pull",
    title: string
  ) => {
    setLoadingAction(actionType);
    setFeedback(null);

    try {
      let res: { success: boolean; message?: string; error?: string };
      if (actionType === "push") {
        res = await pushSystemDataAction();
      } else if (actionType === "pull") {
        res = await pullSystemDataAction();
      } else if (actionType === "github") {
        res = await pushCodeToGithubAction();
      } else if (actionType === "github_pull") {
        res = await pullCodeFromGithubAction();
      } else {
        res = await syncLocalDbAction();
      }

      if (res.success) {
        setFeedback({ type: "success", message: res.message || `تم تنفيذ ${title} بنجاح!` });
      } else {
        setFeedback({ type: "error", message: res.error || `فشل تنفيذ ${title}` });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message?.includes("fetch")
          ? "⚠️ تعذر الاتصال بالإنترنت أو الخادم. يرجى التأكد من اتصال الإنترنت ثم إعادة المحاولة."
          : err.message || "حدث خطأ غير متوقع",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // 1. Export Local Database (.db file download)
  const handleExportDb = () => {
    setFeedback(null);
    const link = document.createElement("a");
    link.href = "/api/system/export-db";
    link.download = `marasim_local_db_${new Date().toISOString().slice(0, 10)}.db`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setFeedback({
      type: "success",
      message: "📥 بدأ تنزيل ملف قاعدة البيانات المحلية (local.db). يمكنك حفظه ونقله لأي جهاز للمتابعة!",
    });
  };

  // 2. Import Local Database (.db file upload)
  const handleImportDbFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingAction("import_db");
    setFeedback(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/system/import-db", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setFeedback({
          type: "success",
          message: data.message || "🎉 تم استيراد واسترجاع قاعدة البيانات المحلية بنجاح!",
        });
        // Trigger sync event
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("marasim_db_mode_changed", { detail: { mode: "local" } }));
        }
      } else {
        setFeedback({
          type: "error",
          message: data.error || "فشل استيراد قاعدة البيانات المحلية",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "حدث خطأ أثناء رفع ملف قاعدة البيانات",
      });
    } finally {
      setLoadingAction(null);
      if (dbFileInputRef.current) dbFileInputRef.current.value = "";
    }
  };

  // 3. Export Project Code (ZIP download)
  const handleExportCode = () => {
    setFeedback(null);
    const link = document.createElement("a");
    link.href = "/api/system/export-code";
    link.download = `marasim_project_code_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setFeedback({
      type: "success",
      message: "📦 بدأ تنزيل حزمة كود وملفات المشروع (ZIP). تحتوي على كافة الشاشات والتصاميم والقوالب لنقلها والمتابعة بأي مكان!",
    });
  };

  // 4. Import Project Code (ZIP upload)
  const handleImportCodeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingAction("import_code");
    setFeedback(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/system/import-code", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setFeedback({
          type: "success",
          message: data.message || "🎉 تم استيراد وتحديث ملفات المشروع والكود بالكامل!",
        });
      } else {
        setFeedback({
          type: "error",
          message: data.error || "فشل استيراد حزمة الكود",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "حدث خطأ أثناء رفع حزمة الكود",
      });
    } finally {
      setLoadingAction(null);
      if (codeFileInputRef.current) codeFileInputRef.current.value = "";
    }
  };

  const folders = [
    { name: "01_permissions", label: "الصلاحيات والأدوار والمصفوفة", files: "roles.json, permissions_matrix.json" },
    { name: "02_reports", label: "قوالب التقارير والـ KPIs الرسمية", files: "report_config.json" },
    { name: "03_departments", label: "الإدارات والفروع والأقسام", files: "departments.json, locations.json" },
    { name: "04_categories", label: "حالات عدم المطابقة وربطها", files: "categories.json" },
    { name: "05_users", label: "المستخدمين ورموز PIN المعتمدة", files: "users.json" },
    { name: "06_forms", label: "النماذج والاستمارات التفتيشية", files: "forms_templates.json" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Hidden File Inputs for Import */}
      <input
        type="file"
        ref={dbFileInputRef}
        onChange={handleImportDbFile}
        accept=".db,.sqlite"
        className="hidden"
      />
      <input
        type="file"
        ref={codeFileInputRef}
        onChange={handleImportCodeFile}
        accept=".zip"
        className="hidden"
      />

      <div className="bg-[#1C1210] text-white w-full max-w-4xl rounded-[2.5rem] border-2 border-[#D49A3D]/40 shadow-2xl p-5 sm:p-7 relative overflow-hidden flex flex-col max-h-[94vh]">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFC217]/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D49A3D]/20 mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-[#D49A3D] to-[#8C5D19] text-[#1B1111] rounded-2xl shadow-lg">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">مركز النقل والمزامنة الشاملة (System Hub)</h3>
                <span className="text-[10px] bg-[#682722] text-amber-100 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  مرونة المنزل والمكتب
                </span>
              </div>
              <p className="text-xs text-[#FFC217] font-bold">
                التبديل بين الأوفلاين والأونلاين، استيراد وتصدير الكود وقاعدة البيانات لمواصلة العمل بسلاسة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl mb-4 flex items-center gap-3 border animate-in fade-in ${
              feedback.type === "success"
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
                : "bg-rose-950/80 border-rose-500 text-rose-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <p className="text-xs font-bold leading-relaxed">{feedback.message}</p>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 relative z-10 text-xs">
          
          {/* ============================================================== */}
          {/* SECTION 1: INTERACTIVE RUNTIME MODE SWITCH (ONLINE / OFFLINE)  */}
          {/* ============================================================== */}
          <SystemModeToggle
            variant="full"
            onModeChanged={(m) => {
              setFeedback({
                type: "success",
                message: m === "cloud"
                  ? "🟢 النظام متصل الآن بقاعدة البيانات السحابية Turso (أونلاين)."
                  : "💻 النظام يعمل الآن على قاعدة البيانات المحلية local.db (أوفلاين)."
              });
            }}
          />

          {/* ============================================================== */}
          {/* SECTION 2: LOCAL DATABASE EXPORT & IMPORT (قاعدة البيانات)       */}
          {/* ============================================================== */}
          <div className="bg-[#261A16] border border-amber-500/30 p-4 sm:p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#FFC217]" />
                <h4 className="text-sm font-black text-white">
                  استيراد وتصدير قاعدة البيانات المحلية (local.db)
                </h4>
              </div>
              <span className="text-[10px] text-amber-200/80 font-mono">SQLite Standalone</span>
            </div>
            
            <p className="text-[11px] text-slate-300 leading-relaxed">
              يمكنك تصدير نسخة كاملة من قاعدة بياناتك الحالية وأخذها على فلاش ميموري، ثم استيرادها في جهاز المكتب أو المنزل لمواصلة العمل بنفس الحالات والبيانات بدقة.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Export DB Button */}
              <button
                type="button"
                onClick={handleExportDb}
                className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <ArrowDownToLine className="w-4 h-4 text-emerald-200" />
                <span>تصدير وتحميل قاعدة البيانات (local.db) 📥</span>
              </button>

              {/* Import DB Button */}
              <button
                type="button"
                disabled={loadingAction === "import_db"}
                onClick={() => dbFileInputRef.current?.click()}
                className="py-3 px-4 bg-gradient-to-r from-[#D49A3D] to-[#9E6E20] hover:brightness-110 text-[#1B1111] font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {loadingAction === "import_db" ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#1B1111]" />
                ) : (
                  <ArrowUpFromLine className="w-4 h-4 text-[#1B1111]" />
                )}
                <span>استيراد واسترجاع قاعدة البيانات (ملف .db) 📤</span>
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 3: PROJECT CODE & FILES EXPORT & IMPORT (ملفات الكود)  */}
          {/* ============================================================== */}
          <div className="bg-[#261A16] border border-purple-500/30 p-4 sm:p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-300" />
                <h4 className="text-sm font-black text-white">
                  استيراد وتصدير كود وشاشات المشروع (Project Code & Screens)
                </h4>
              </div>
              <span className="text-[10px] text-purple-300 font-mono">ZIP & GitHub Sync</span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              تصدير حزمة كود خفيفة تشمل كافة الشاشات والتصاميم والقوالب المحدثة للعمل عليها في أي مكان، أو استيراد حزمة كود وتطبيقها، أو المزامنة المباشرة مع مستودعك الخاص في GitHub.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Export Code ZIP */}
              <button
                type="button"
                onClick={handleExportCode}
                className="py-3 px-4 bg-gradient-to-r from-purple-700 to-indigo-800 hover:brightness-110 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Download className="w-4 h-4 text-purple-200" />
                <span>تصدير كود وملفات المشروع (حزمة ZIP) 📦</span>
              </button>

              {/* Import Code ZIP */}
              <button
                type="button"
                disabled={loadingAction === "import_code"}
                onClick={() => codeFileInputRef.current?.click()}
                className="py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-700 hover:brightness-110 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {loadingAction === "import_code" ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Upload className="w-4 h-4 text-white" />
                )}
                <span>استيراد وتحديث الكود (ملف ZIP) 📂</span>
              </button>
            </div>

            {/* GitHub Fast Sync Strip */}
            <div className="pt-2 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                <span>مزامنة GitHub السحابية (raydalslwy429-hue/System):</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={loadingAction !== null}
                  onClick={() => handleAction("github", "رفع وتحديث الكود إلى GitHub")}
                  className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-600 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loadingAction === "github" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <GitBranch className="w-3 h-3" />}
                  <span>رفع (Push)</span>
                </button>
                <button
                  disabled={loadingAction !== null}
                  onClick={() => handleAction("github_pull", "سحب وتحديث الكود من GitHub")}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-purple-200 border border-purple-400/30 font-bold rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loadingAction === "github_pull" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CloudDownload className="w-3 h-3" />}
                  <span>سحب (Pull)</span>
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 4: CLOUD & LOCAL DATA MIGRATION (مزامنة السحابة)        */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Push to Cloud */}
            <div className="bg-[#261A16] border border-[#D49A3D]/30 p-4 rounded-2xl flex flex-col justify-between hover:border-[#D49A3D] transition-all">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#D49A3D]/20 text-[#FFC217] flex items-center justify-center mb-2">
                  <CloudUpload className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-white mb-1">رفع شامل للسحابة الحية</h4>
                <p className="text-[10px] text-slate-300 leading-relaxed mb-3">
                  مزامنة مجلدات <code className="text-[#FFC217]">system_data</code> وكافة الحالات من الـ local إلى Turso.
                </p>
              </div>
              <button
                disabled={loadingAction !== null}
                onClick={() => handleAction("push", "الرفع إلى السحابة")}
                className="w-full py-2 px-3 bg-gradient-to-r from-[#D49A3D] to-[#B37E2C] hover:brightness-110 text-[#1B1111] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loadingAction === "push" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                <span>رفع للسحابة ☁️</span>
              </button>
            </div>

            {/* Pull from Cloud */}
            <div className="bg-[#261A16] border border-blue-500/30 p-4 rounded-2xl flex flex-col justify-between hover:border-blue-400 transition-all">
              <div>
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
                  <CloudDownload className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-white mb-1">سحب السحابة إلى الـ Local</h4>
                <p className="text-[10px] text-slate-300 leading-relaxed mb-3">
                  جلب أحدث نسخة من Turso وتحديث <code className="text-blue-300">local.db</code> والمجلدات المحلية.
                </p>
              </div>
              <button
                disabled={loadingAction !== null}
                onClick={() => handleAction("pull", "السحب من السحابة")}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loadingAction === "pull" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudDownload className="w-3.5 h-3.5" />}
                <span>سحب للـ Local 📥</span>
              </button>
            </div>

            {/* Sync to Local SQLite */}
            <div className="bg-[#261A16] border border-emerald-500/30 p-4 rounded-2xl flex flex-col justify-between hover:border-emerald-400 transition-all">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                  <HardDrive className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-white mb-1">بناء الـ DB المحلي</h4>
                <p className="text-[10px] text-slate-300 leading-relaxed mb-3">
                  إعادة بناء ملف <code className="text-emerald-300">local.db</code> من ملفات الـ JSON في المشروع.
                </p>
              </div>
              <button
                disabled={loadingAction !== null}
                onClick={() => handleAction("local", "بناء قاعدة البيانات المحلية")}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loadingAction === "local" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                <span>تحديث محلي 💾</span>
              </button>
            </div>
          </div>

          {/* Folders Structure Showcase */}
          <div className="bg-[#261A16]/80 border border-white/10 rounded-2xl p-4">
            <h4 className="text-xs font-black text-[#FFC217] mb-2.5 flex items-center gap-2">
              <FolderTree className="w-4 h-4" />
              <span>مجلدات البيانات المهيكلة في المشروع (system_data/)</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {folders.map((f, idx) => (
                <div key={idx} className="bg-black/40 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
                  <FileCode className="w-3.5 h-3.5 text-[#D49A3D] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-mono font-bold text-amber-200 text-[11px]">{f.name}/</span>
                    <p className="text-[10px] text-slate-200 mt-0.5">{f.label}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">{f.files}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
