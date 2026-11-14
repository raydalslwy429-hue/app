'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl font-bold">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">خطأ في النظام</h2>
          <p className="text-sm text-slate-400 mb-6">
            حدث خطأ غير متوقع على مستوى النظام.
          </p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow transition-all"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
