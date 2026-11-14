"use client";

import React, { useState, useEffect } from "react";
import { Cloud, HardDrive, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { getDatabaseModeAction, toggleDatabaseModeAction } from "@/app/actions/system_mode";
import { useRouter } from "next/navigation";

export default function SystemModeToggle({
  variant = "navbar",
  onModeChanged,
}: {
  variant?: "navbar" | "full";
  onModeChanged?: (mode: "local" | "cloud") => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"local" | "cloud" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load current mode on mount and listen to changes
  useEffect(() => {
    let mounted = true;
    getDatabaseModeAction().then((m) => {
      if (mounted) setMode(m);
    }).catch((err) => {
      if (mounted) {
        setToast({
          type: "error",
          message: err instanceof Error ? err.message : "تعذر قراءة وضع قاعدة البيانات المحفوظ",
        });
      }
    });

    const handleExternalChange = (e: any) => {
      if (e.detail?.mode && mounted) {
        setMode(e.detail.mode);
      }
    };

    window.addEventListener("marasim_db_mode_changed", handleExternalChange);
    return () => {
      mounted = false;
      window.removeEventListener("marasim_db_mode_changed", handleExternalChange);
    };
  }, []);

  const handleToggle = async () => {
    if (isLoading || mode === null) return;
    setIsLoading(true);
    setToast(null);

    const targetMode = mode === "local" ? "cloud" : "local";

    try {
      const res = await toggleDatabaseModeAction(targetMode);
      if (res.success) {
        setMode(res.mode);
        setToast({
          type: "success",
          message: res.message || "تمت عملية التفعيل بنجاح!",
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("marasim_db_mode_changed", { detail: { mode: res.mode } })
          );
        }
        if (onModeChanged) onModeChanged(res.mode);
        // Refresh page data smoothly
        router.refresh();
      } else {
        setToast({
          type: "error",
          message: res.error || "لم يتم التفعيل: تعذر التحويل للوضع المطلوب.",
        });
      }
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.message || "حدث خطأ غير متوقع أثناء تبديل وضع النظام",
      });
    } finally {
      setIsLoading(false);
      // Auto-hide toast after 6 seconds
      setTimeout(() => {
        setToast(null);
      }, 6000);
    }
  };

  const isCloud = mode === "cloud";
  const isModeReady = mode !== null;

  if (variant === "navbar") {
    return (
      <div className="relative">
        <button
          onClick={handleToggle}
          disabled={isLoading || !isModeReady}
          className={`px-3 py-1.5 rounded-2xl border transition-all flex items-center gap-2 cursor-pointer shadow-sm select-none ${
            isCloud
              ? "bg-emerald-950/80 border-emerald-500/50 hover:border-emerald-400 text-emerald-200"
              : "bg-[#2A1C16] border-[#D49A3D]/40 hover:border-[#D49A3D] text-[#FFC217]"
          } ${isLoading || !isModeReady ? "opacity-75 cursor-wait" : ""}`}
          title={isModeReady ? "انقر للتبديل بين الوضع السحابي والمحلي" : "جارٍ قراءة وضع قاعدة البيانات المحفوظ"}
        >
          {isLoading || !isModeReady ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#FFC217]" />
          ) : isCloud ? (
            <Cloud className="w-4 h-4 text-emerald-400 animate-pulse" />
          ) : (
            <HardDrive className="w-4 h-4 text-[#D49A3D]" />
          )}

          <div className="flex flex-col text-right leading-none">
            <span className="text-[11px] font-black tracking-tight">
              {!isModeReady ? "جارٍ قراءة الوضع..." : isLoading ? "جاري الفحص..." : isCloud ? "أونلاين (سحابي)" : "أوفلاين (محلي)"}
            </span>
            <span className="text-[9px] opacity-75 font-semibold mt-0.5">
              {!isModeReady ? "إعداد النظام" : isCloud ? "سحابة Turso نشطة" : "قاعدة البيانات local.db"}
            </span>
          </div>

          <span
            className={`w-2 h-2 rounded-full mr-1 shrink-0 ${
              isLoading || !isModeReady
                ? "bg-amber-400 animate-ping"
                : isCloud
                ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                : "bg-[#FFC217] shadow-[0_0_8px_#FFC217]"
            }`}
          />
        </button>

        {/* Floating Feedback Toast */}
        {toast && (
          <div
            className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 sm:w-80 p-3 rounded-2xl shadow-2xl border text-xs font-black z-50 animate-in fade-in slide-in-from-top-2 ${
              toast.type === "success"
                ? "bg-emerald-900 border-emerald-400 text-emerald-100"
                : "bg-[#682722] border-rose-400 text-rose-100"
            }`}
          >
            <div className="flex items-start gap-2">
              {toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full / Modal Variant
  return (
    <div className="bg-[#261A16] border-2 border-[#D49A3D]/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-2xl ${
              isCloud ? "bg-emerald-500/20 text-emerald-400" : "bg-[#D49A3D]/20 text-[#FFC217]"
            }`}
          >
            {!isModeReady ? <Loader2 className="w-6 h-6 animate-spin" /> : isCloud ? <Cloud className="w-6 h-6" /> : <HardDrive className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white">
                بيئة العمل وقاعدة البيانات النشطة:
              </h4>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  isModeReady && isCloud
                    ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                    : "bg-amber-950 text-amber-300 border-amber-500/40"
                }`}
              >
                {!isModeReady ? "جارٍ قراءة الوضع..." : isCloud ? "🟢 أونلاين (سحابة Turso)" : "💻 أوفلاين (قاعدة البيانات المحلية)"}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-semibold mt-1">
              {!isModeReady
                ? "يتم تحميل وضع قاعدة البيانات المحفوظ على هذا الجهاز."
                : isCloud
                ? "التطبيق يقرأ ويكتب مباشرة في سحابة Turso الحية. مناسب للعمل المشترك والمزامنة المباشرة."
                : "التطبيق يقرأ ويكتب محلياً على local.db في هذا الكمبيوتر. يمكنك العمل بدون إنترنت تماماً."}
            </p>
          </div>
        </div>

        {/* Toggle Switch Control */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            disabled={isLoading || !isModeReady}
            className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all ${
              isModeReady && isCloud
                ? "bg-gradient-to-r from-amber-600 to-[#D49A3D] text-[#1B1111] hover:brightness-110"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-110"
            } ${isLoading ? "opacity-60 cursor-wait" : ""}`}
          >
            {isLoading || !isModeReady ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isCloud ? (
              <HardDrive className="w-4 h-4" />
            ) : (
              <Cloud className="w-4 h-4" />
            )}
            <span>
              {!isModeReady
                ? "جارٍ تحميل الوضع..."
                : isLoading
                ? "جاري فحص الاتصال والتبديل..."
                : isCloud
                ? "التحويل للوضع المحلي (أوفلاين) 💻"
                : "التحويل للسحابة الحية (أونلاين) ☁️"}
            </span>
          </button>
        </div>
      </div>

      {/* Feedback Banner inside Full variant */}
      {toast && (
        <div
          className={`mt-4 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500 text-emerald-200"
              : "bg-[#682722]/90 border-rose-400 text-rose-100"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
