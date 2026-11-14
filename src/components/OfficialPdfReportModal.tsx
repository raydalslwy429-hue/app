"use client";

import React, { useState, useMemo } from "react";
import { Printer, X, Filter, FileText, CheckCircle2, Clock, AlertTriangle, Layers, Calendar, Building2 } from "lucide-react";

interface OfficialPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: any[];
  departments: any[];
  currentUser: any;
}

export default function OfficialPdfReportModal({
  isOpen,
  onClose,
  cases,
  departments,
  currentUser,
}: OfficialPdfReportModalProps) {
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchDept = deptFilter === "all" || c.department_code === deptFilter || (c.department_name && c.department_name.includes(deptFilter));
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchDateFrom = !dateFrom || (c.obs_date && c.obs_date >= dateFrom);
      const matchDateTo = !dateTo || (c.obs_date && c.obs_date <= dateTo);
      return matchDept && matchStatus && matchDateFrom && matchDateTo;
    });
  }, [cases, deptFilter, statusFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = filteredCases.length;
    const closed = filteredCases.filter((c) => c.status === "closed").length;
    const inProgress = filteredCases.filter((c) => c.status === "assigned" || c.status === "pending_review").length;
    const open = filteredCases.filter((c) => c.status === "pending_assignment").length;
    const rate = total > 0 ? Math.round((closed / total) * 100) : 0;
    return { total, closed, inProgress, open, rate };
  }, [filteredCases]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getStatusArabic = (status: string) => {
    switch (status) {
      case "pending_assignment":
        return "بانتظار الفرز";
      case "assigned":
        return "قيد التنفيذ";
      case "pending_review":
        return "بانتظار المراجعة";
      case "closed":
        return "معتمد ومغلق";
      default:
        return status;
    }
  };

  const todayStr = new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeStr = new Date().toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-start items-center p-2 sm:p-4 overflow-y-auto">
      
      {/* Screen Control Toolbar (Hidden in Print) */}
      <div className="w-full max-w-5xl bg-[#1B1111] text-white p-4 rounded-3xl border border-[#D49A3D]/40 shadow-2xl mb-4 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#D49A3D] text-[#1B1111] rounded-xl shadow-md">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">معاينة وطباعة تقرير PDF الرسمي</h3>
            <p className="text-[11px] text-[#D49A3D] font-bold">النظام الإداري لمطاعم المراسيم - تصدير رسمي بجودة عالية</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-[#2A1C16] border border-[#D49A3D]/40 text-amber-100 rounded-xl px-2.5 py-1.5 font-bold focus:outline-none"
          >
            <option value="all">جميع الإدارات</option>
            {departments.map((d) => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#2A1C16] border border-[#D49A3D]/40 text-amber-100 rounded-xl px-2.5 py-1.5 font-bold focus:outline-none"
          >
            <option value="all">كافة الحالات</option>
            <option value="pending_assignment">بانتظار الفرز</option>
            <option value="assigned">قيد التنفيذ</option>
            <option value="pending_review">بانتظار المراجعة</option>
            <option value="closed">معتمد ومغلق</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="من تاريخ"
            className="bg-[#2A1C16] border border-[#D49A3D]/40 text-amber-100 rounded-xl px-2 py-1 text-xs font-bold"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="إلى تاريخ"
            className="bg-[#2A1C16] border border-[#D49A3D]/40 text-amber-100 rounded-xl px-2 py-1 text-xs font-bold"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-gradient-to-r from-[#D49A3D] to-[#E5A93C] hover:opacity-90 text-[#1B1111] font-black rounded-xl text-xs shadow-lg flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة / حفظ PDF</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
            title="إغلاق المعاينة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 📄 THE PRINTABLE REPORT DOCUMENT (Styled for PDF & Print) */}
      {/* ========================================================== */}
      <div
        id="printable-report"
        className="w-full max-w-5xl bg-white text-slate-900 p-8 sm:p-12 rounded-3xl shadow-2xl border border-slate-300 font-sans print:p-0 print:border-none print:shadow-none print:max-w-none print:rounded-none"
        dir="rtl"
      >
        {/* Report Official Header */}
        <div className="border-b-2 border-[#1B1111] pb-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            
            {/* Right: Restaurant Brand */}
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo.png"
                alt="شعار مطعم المراسيم"
                className="h-16 w-auto object-contain"
              />
              <div>
                <h1 className="text-xl font-black text-[#1B1111] tracking-tight">مطعم المراسيم <span className="text-xs font-serif text-[#D49A3D]">almaRasim</span></h1>
                <p className="text-xs font-bold text-[#682722]">يحبها قلبك • إدارة حوكمة ورقابة الجودة</p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">النظام الإداري الموحد لإدارة حالات عدم المطابقة (CAPA)</p>
              </div>
            </div>

            {/* Left: Metadata Box */}
            <div className="text-left bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs font-bold space-y-1">
              <div className="text-[#682722] font-black">رقم التقرير: <span className="font-mono font-black text-slate-900">REP-{Date.now().toString().slice(-6)}</span></div>
              <div className="text-slate-600">تاريخ الإصدار: <span className="text-slate-900 font-bold">{todayStr}</span></div>
              <div className="text-slate-600">وقت الإصدار: <span className="text-slate-900 font-bold">{timeStr}</span></div>
              <div className="text-slate-600">المشرف العام: <span className="text-[#1B1111] font-black">{currentUser?.full_name || "م. رائد الصلوي"}</span></div>
            </div>

          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-center">
            <h2 className="text-base font-black text-[#1B1111] tracking-wide">
              تقرير حالات عدم المطابقة التشغيلية والإجراءات التصحيحية
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              الفترة: {dateFrom ? `من ${dateFrom}` : "البداية"} {dateTo ? `إلى ${dateTo}` : "حتى الآن"} • الإدارة: {deptFilter === "all" ? "كافة الإدارات" : deptFilter}
            </p>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-5 gap-3 mb-6 text-center">
          <div className="bg-[#FAF7F4] p-3 rounded-2xl border border-slate-200">
            <div className="text-[11px] font-black text-slate-600">إجمالي الحالات</div>
            <div className="text-xl font-black text-[#1B1111] mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200">
            <div className="text-[11px] font-black text-amber-800">بانتظار الفرز</div>
            <div className="text-xl font-black text-amber-900 mt-0.5">{stats.open}</div>
          </div>
          <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200">
            <div className="text-[11px] font-black text-blue-800">قيد التنفيذ الميداني</div>
            <div className="text-xl font-black text-blue-900 mt-0.5">{stats.inProgress}</div>
          </div>
          <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200">
            <div className="text-[11px] font-black text-emerald-800">معتمدة ومغلقة</div>
            <div className="text-xl font-black text-emerald-900 mt-0.5">{stats.closed}</div>
          </div>
          <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200">
            <div className="text-[11px] font-black text-purple-800">نسبة الإنجاز</div>
            <div className="text-xl font-black text-purple-900 mt-0.5">{stats.rate}%</div>
          </div>
        </div>

        {/* Official Data Table */}
        <div className="overflow-hidden border border-slate-300 rounded-2xl mb-8">
          <table className="w-full text-right text-[11px] border-collapse">
            <thead className="bg-[#1B1111] text-white font-black">
              <tr>
                <th className="py-2.5 px-3 border-l border-white/20">رقم الحالة</th>
                <th className="py-2.5 px-3 border-l border-white/20">التاريخ والوقت</th>
                <th className="py-2.5 px-3 border-l border-white/20">الموقع / القسم</th>
                <th className="py-2.5 px-3 border-l border-white/20">حالة عدم المطابقة</th>
                <th className="py-2.5 px-3 border-l border-white/20">وصف الحالة</th>
                <th className="py-2.5 px-3 border-l border-white/20">المفتش الراصد</th>
                <th className="py-2.5 px-3 border-l border-white/20">الجهة المكلفة</th>
                <th className="py-2.5 px-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                    لا توجد حالات تطابق الفلاتر المحددة
                  </td>
                </tr>
              ) : (
                filteredCases.map((c, idx) => (
                  <tr key={c.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="py-2 px-3 border-l border-slate-200 font-black font-mono text-[#682722]">
                      #{c.case_number}
                    </td>
                    <td className="py-2 px-3 border-l border-slate-200 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {c.obs_date} {c.obs_time}
                    </td>
                    <td className="py-2 px-3 border-l border-slate-200 font-bold text-slate-900">
                      {c.location_name}
                    </td>
                    <td className="py-2 px-3 border-l border-slate-200 font-black text-[#1B1111]">
                      {c.nc_name}
                    </td>
                    <td className="py-2 px-3 border-l border-slate-200 max-w-xs leading-relaxed text-slate-700">
                      {c.description}
                    </td>
                    <td className="py-2 px-3 border-l border-slate-200 text-slate-600">
                      {c.inspector_name}
                    </td>
                    <td className="py-2 px-3 border-l border-slate-200 text-slate-700 font-bold">
                      {c.assignments_summary || c.assigned_roles || "لم تسند بعد"}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        c.status === "closed"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : c.status === "assigned"
                          ? "bg-blue-50 text-blue-800 border-blue-300"
                          : c.status === "pending_review"
                          ? "bg-purple-50 text-purple-800 border-purple-300"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      }`}>
                        {getStatusArabic(c.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Official Sign-off & Verification Footer */}
        <div className="pt-6 border-t-2 border-[#1B1111] grid grid-cols-3 gap-6 text-center text-xs">
          <div className="space-y-8">
            <p className="font-black text-slate-800">إعداد مفتش الجودة والرقابة</p>
            <div className="border-b border-dashed border-slate-400 w-36 mx-auto"></div>
            <p className="text-[10px] text-slate-400 font-bold">التوقيع / الختم</p>
          </div>

          <div className="space-y-8">
            <p className="font-black text-slate-800">مراجعة رئيس القسم / مشرف الإدارة</p>
            <div className="border-b border-dashed border-slate-400 w-36 mx-auto"></div>
            <p className="text-[10px] text-slate-400 font-bold">التوقيع / الختم</p>
          </div>

          <div className="space-y-8">
            <p className="font-black text-slate-800">اعتماد مدير عام المنظومة</p>
            <div className="border-b border-dashed border-slate-400 w-36 mx-auto"></div>
            <p className="text-[10px] text-[#682722] font-black">م. رائد الصلوي</p>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-8 text-center text-[9px] text-slate-400 font-semibold border-t pt-2">
          هذا التقرير وثيقة رقابية رسمية صادرة آلياً من النظام الإداري لمطاعم المراسيم ومحمية بسجلات التدقيق الرقمية (Audit Logs).
        </div>

      </div>

      {/* Print Styles Injection */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report,
          #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>

    </div>
  );
}
