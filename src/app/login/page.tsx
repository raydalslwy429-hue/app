"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions/capa";
import { KeyRound, User, Loader2, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [userNumber, setUserNumber] = useState("");
  const [pin, setPin] = useState("");
  const [activeField, setActiveField] = useState<"userNumber" | "pin">("userNumber");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (numToUse?: string, pinToUse?: string) => {
    const finalNum = numToUse || userNumber;
    const finalPin = pinToUse || pin;

    if (!finalNum.trim()) {
      setError("الرجاء إدخال رقم المستخدم");
      setActiveField("userNumber");
      return;
    }

    if (!finalPin.trim()) {
      setError("الرجاء إدخال كلمة المرور / رمز PIN");
      setActiveField("pin");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginAction(finalNum.trim(), finalPin.trim());
      if (res.success && res.redirectUrl) {
        router.push(res.redirectUrl);
      } else {
        setError(res.error || "بيانات الدخول غير صحيحة");
        setLoading(false);
      }
    } catch {
      setError("حدث خطأ أثناء الاتصال بالخادم");
      setLoading(false);
    }
  };

  const handleKeyPress = (digit: string) => {
    if (activeField === "userNumber") {
      setUserNumber((prev) => prev + digit);
    } else {
      if (pin.length < 4) {
        const nextPin = pin + digit;
        setPin(nextPin);
        if (nextPin.length === 4 && userNumber) {
          handleLogin(userNumber, nextPin);
        }
      }
    }
    setError(null);
  };

  const handleBackspace = () => {
    if (activeField === "userNumber") {
      setUserNumber((prev) => prev.slice(0, -1));
    } else {
      setPin((prev) => prev.slice(0, -1));
    }
    setError(null);
  };

  const handleClear = () => {
    if (activeField === "userNumber") {
      setUserNumber("");
    } else {
      setPin("");
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#1B1111] relative overflow-hidden flex flex-col justify-center items-center p-4">
      {/* Background glow and subtle architectural backdrop */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-center bg-cover" style={{ backgroundImage: "url('/brand/building-card.jpg')" }}></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#1B1111] via-[#1B1111]/90 to-[#1B1111]/70 pointer-events-none"></div>

      {/* Decorative glowing mashrabiya ambient light */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#FFC217]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#D49A3D]/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md bg-[#FAF7F4] rounded-[2.5rem] shadow-2xl p-6 sm:p-8 border-2 border-[#D49A3D]/40">
        
        {/* Brand Header with Logo */}
        <div className="text-center mb-5">
          <div className="inline-block bg-white p-3 rounded-3xl shadow-md border border-[#D49A3D]/30 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.png"
              alt="مطعم المراسيم almaRasim"
              className="h-14 w-auto object-contain mx-auto"
            />
          </div>
          
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-[11px] font-black bg-[#682722] text-amber-50 px-3 py-0.5 rounded-full">
              يحبها قلبك
            </span>
          </div>

          <h1 className="text-lg font-black text-[#1B1111] mt-2">
            منظومة حوكمة ورقابة الجودة (CAPA V2)
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            تسجيل الدخول برقم المستخدم وكلمة المرور
          </p>
        </div>

        {/* Input Fields (User Number + Password / PIN) */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#D49A3D]" />
                <span>رقم المستخدم (User #):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold">تسلسلي فريد</span>
            </label>
            <input
              type="text"
              value={userNumber}
              onFocus={() => setActiveField("userNumber")}
              onChange={(e) => {
                setUserNumber(e.target.value);
                setError(null);
              }}
              placeholder="أدخل رقم المستخدم"
              className={`w-full h-12 px-4 text-center font-black text-lg bg-white border-2 rounded-2xl transition-all focus:outline-none ${
                activeField === "userNumber"
                  ? "border-[#D49A3D] ring-2 ring-[#D49A3D]/30 shadow-md"
                  : "border-slate-200"
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#682722]" />
                <span>كلمة المرور / رمز PIN:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold">4 أرقام</span>
            </label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onFocus={() => setActiveField("pin")}
              onChange={(e) => {
                setPin(e.target.value);
                setError(null);
                if (e.target.value.length === 4 && userNumber) {
                  handleLogin(userNumber, e.target.value);
                }
              }}
              placeholder="••••"
              className={`w-full h-12 px-4 text-center font-black text-2xl tracking-[0.4em] bg-white border-2 rounded-2xl transition-all focus:outline-none ${
                activeField === "pin"
                  ? "border-[#682722] ring-2 ring-[#682722]/30 shadow-md"
                  : "border-slate-200"
              }`}
            />
          </div>

          {error && (
            <div className="p-2.5 text-xs font-black text-[#682722] bg-[#FAF3F3] border border-[#682722]/30 rounded-xl text-center animate-shake">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={() => handleLogin()}
          disabled={loading}
          className="w-full h-12 mb-4 bg-gradient-to-r from-[#682722] via-[#85322c] to-[#682722] hover:brightness-110 active:scale-[0.99] text-white font-black text-sm rounded-2xl shadow-lg shadow-[#682722]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#FFC217]" />
              <span>جاري التحقق وتسجيل الدخول...</span>
            </>
          ) : (
            <>
              <span>دخول النظام</span>
              <ArrowLeft className="w-4 h-4 text-[#FFC217]" />
            </>
          )}
        </button>

        {/* Tactile Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit.toString())}
              disabled={loading}
              className="h-11 rounded-xl bg-white hover:bg-amber-50 active:bg-amber-100 text-[#1B1111] font-black text-lg shadow-xs border border-slate-200 hover:border-[#D49A3D] transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all flex items-center justify-center cursor-pointer"
          >
            مسح
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress("0")}
            disabled={loading}
            className="h-11 rounded-xl bg-white hover:bg-amber-50 active:bg-amber-100 text-[#1B1111] font-black text-lg shadow-xs border border-slate-200 hover:border-[#D49A3D] transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={loading}
            className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all flex items-center justify-center cursor-pointer"
          >
            ← حذف
          </button>
        </div>

      </div>

      {/* Footer Branding */}
      <footer className="relative z-10 text-center mt-4 text-amber-100/60 text-xs font-semibold">
        <p>مطعم المراسيم © 2026 - نظام إدارة عدم المطابقة والإجراءات التصحيحية</p>
      </footer>
    </div>
  );
}
