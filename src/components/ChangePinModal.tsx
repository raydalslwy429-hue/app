"use client";

import React, { useState } from "react";
import { KeyRound, Check, AlertCircle, X, Shield, Eye, EyeOff } from "lucide-react";
import { changePinAction } from "@/app/actions/capa";
import { addToOfflineQueue } from "@/lib/offline-client";

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserPin?: string;
}

export default function ChangePinModal({ isOpen, onClose, currentUserPin }: ChangePinModalProps) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPins, setShowPins] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentPin.length !== 4 || !/^\d{4}$/.test(currentPin)) {
      setError("رمز المرور الحالي يجب أن يتكون من 4 أرقام");
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError("رمز المرور الجديد يجب أن يتكون من 4 أرقام");
      return;
    }

    if (newPin === currentPin) {
      setError("الرمز الجديد مطابق للرمز الحالي، يرجى اختيار رمز جديد");
      return;
    }

    if (newPin !== confirmPin) {
      setError("تأكيد الرمز الجديد غير متطابق");
      return;
    }

    setLoading(true);

    try {
      if (!navigator.onLine) {
        // Queue change PIN offline
        addToOfflineQueue("CHANGE_PIN", "تحديث رمز المرور", { currentPin, newPin });
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1800);
        return;
      }

      const res = await changePinAction(currentPin, newPin);
      if (!res.success) {
        setError(res.error || "فشل تغيير رمز المرور");
      } else {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setCurrentPin("");
          setNewPin("");
          setConfirmPin("");
          onClose();
        }, 1600);
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1E1412] text-white w-full max-w-md rounded-3xl border-2 border-[#D49A3D]/40 shadow-2xl p-6 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#FFC217]/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D49A3D]/20 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#D49A3D] text-[#1B1111] rounded-2xl shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">تغيير رمز المرور الخاص بك</h3>
              <p className="text-[11px] text-[#D49A3D] font-bold">حماية الخصوصية والأمان</p>
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
            <h4 className="text-lg font-black text-emerald-300">تم تغيير الرمز بنجاح!</h4>
            <p className="text-xs text-slate-300">يمكنك الآن استخدام الرمز الجديد لتسجيل الدخول.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-amber-200 mb-1.5">
                رمز المرور الحالي (4 أرقام)
              </label>
              <input
                type={showPins ? "text" : "password"}
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] text-xl font-mono py-2.5 bg-black/40 border border-[#D49A3D]/40 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC217]"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-black text-amber-200 mb-1.5">
                رمز المرور الجديد (4 أرقام)
              </label>
              <input
                type={showPins ? "text" : "password"}
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] text-xl font-mono py-2.5 bg-black/40 border border-[#D49A3D]/40 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC217]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-amber-200 mb-1.5">
                تأكيد رمز المرور الجديد
              </label>
              <input
                type={showPins ? "text" : "password"}
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] text-xl font-mono py-2.5 bg-black/40 border border-[#D49A3D]/40 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC217]"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowPins(!showPins)}
                className="text-[11px] text-[#D49A3D] hover:text-white flex items-center gap-1 font-bold"
              >
                {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPins ? "إخفاء الأرقام" : "إظهار الأرقام"}</span>
              </button>
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-black transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#D49A3D] to-[#FFC217] hover:brightness-110 text-[#1B1111] font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loading ? "جار الحفظ..." : "حفظ الرمز الجديد"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
