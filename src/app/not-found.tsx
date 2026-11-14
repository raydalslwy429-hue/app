import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6" dir="rtl">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 text-center shadow-2xl backdrop-blur">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-bold">
          404
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">الصفحة غير موجودة</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          عذراً، الصفحة التي تحاول الوصول إليها غير متوفرة أو تم نقلها.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm shadow transition-all"
        >
          العودة لتسجيل الدخول
        </Link>
      </div>
    </div>
  );
}
