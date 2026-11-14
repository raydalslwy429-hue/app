"use client";

import React, { useState } from "react";
import { AlertOctagon, KeyRound, Check, X, ShieldAlert, Trash2, RefreshCw } from "lucide-react";
import { resetDatabaseAction } from "@/app/actions/capa";
import { useRouter } from "next/navigation";

interface DatabaseResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DatabaseResetModal({ isOpen, onClose }: DatabaseResetModalProps) {
  const router = useRouter();
  const [adminPin, setAdminPin] = useState("");
  const [resetScope, setResetScope] = useState<"cases_only" | "full_reset">("cases_only");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (adminPin.length !== 4 || !/^\d{4}$/.test(adminPin)) {
      setError("يرجى إدخال رمز المرور الإداري المكون من 4 أرقام");
      return;
    }

    const confirmMsg =
      resetScope === "cases_only"
        ? "تحذير: هل أنت متأكد تماماً من تصفير كافة سجلات البلاغات والمعاملات وإعادة الترقيم إلى الصفر؟ لا يمكن التراجع عن هذه الخطوة!"
        : "تحذير شديد: هل أنت متأكد من تصفير النظام بالكامل وإعادة ضبط المصنع؟ سيتم مسح كافة البيانات ما عدا حساب المدير العام!";

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);

    try {
      const res = await resetDatabaseAction(adminPin, resetScope);
      if (res.success) {
        setSuccess(res.message || "تم تصفير قاعدة البيانات بنجاح");
        setTimeout(() => {
          setSuccess(null);
          setAdminPin("");
          onClose();
          router.refresh();
        }, 2000);
      } else {
        setError(res.error || "فشلت عملية التصفير");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1C1210] text-white w-full max-w-lg rounded-3xl border-2 border-rose-600/60 shadow-2xl p-6 sm:p-7 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-rose-500/20 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-600/30">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-rose-200">تصفير وإعادة ضبط قاعدة البيانات</h3>
              <p className="text-[11px] text-amber-300 font-bold">منطقة العمليات الحساسة (مدير النظام فقط)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3 relative z-10">
            <div className="w-14 h-14 bg-emerald-500/20 border-2 border-emerald-500 rounded-full mx-auto flex items-center justify-center text-emerald-400">
              <Check className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-emerald-300">{success}</h4>
            <p className="text-xs text-slate-300">جار تحديث المنظومة وإعادة التحميل...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5 relative z-10">
            {error && (
              <div className="p-3.5 bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs rounded-2xl flex items-center gap-2 font-bold">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-amber-200">اختر نطاق التصفير:</label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-2xl border border-white/10 bg-black/30 hover:border-amber-500/40 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="cases_only"
                    checked={resetScope === "cases_only"}
                    onChange={() => setResetScope("cases_only")}
                    className="mt-1 accent-amber-500"
                  />
                  <div>
                    <span className="text-xs font-black text-white block">
                      تصفير البلاغات والمعاملات فقط (موصى به)
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      يمسح كافة البلاغات والتكليفات وردود المنفذين وسجلات التدقيق، ويعيد ترقيم البلاغات من (#1)، مع الحفاظ على هيكل الإدارات والأقسام والمستخدمين.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-2xl border border-rose-900/60 bg-rose-950/20 hover:border-rose-500 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="full_reset"
                    checked={resetScope === "full_reset"}
                    onChange={() => setResetScope("full_reset")}
                    className="mt-1 accent-rose-500"
                  />
                  <div>
                    <span className="text-xs font-black text-rose-300 block">
                      تصفير شامل وضبط المصنع (Factory Reset)
                    </span>
                    <span className="text-[11px] text-rose-200/70 block mt-0.5">
                      يمسح المعاملات والمستخدمين بالكامل ويعيد النظام لحالته الأولية (مع الحفاظ على حساب المدير العام فقط).
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Admin PIN Confirmation Input */}
            <div>
              <label className="block text-xs font-black text-amber-200 mb-1.5 flex items-center justify-between">
                <span>أدخل رمز المرور الإداري (PIN) للتأكيد الصريح:</span>
                <span className="text-[10px] text-rose-400 font-mono">مطلوب للتحقق</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={4}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="••••"
                  className="w-full text-center tracking-[0.6em] text-2xl font-mono py-3 bg-black/50 border-2 border-rose-500/40 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                  required
                />
                <KeyRound className="w-5 h-5 text-rose-400 absolute right-4 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-black transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading || adminPin.length !== 4}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جار التصفير...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد التصفير النهائي</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
