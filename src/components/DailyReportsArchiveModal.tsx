"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  X,
  Search,
  Calendar,
  Clock,
  MapPin,
  User,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Eye,
  Download,
  Building2,
  ArrowUpDown,
} from "lucide-react";
import { getDailyReportsAction, exportDailyReportsToExcelAction } from "@/app/actions/daily_reports";
import { downloadExcelFile } from "@/lib/excel-helper";

interface DailyReportsArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateNew?: () => void;
  canCreateReport?: boolean;
  canExportReports?: boolean;
}

export default function DailyReportsArchiveModal({
  isOpen,
  onClose,
  onOpenCreateNew,
  canCreateReport = true,
  canExportReports = false,
}: DailyReportsArchiveModalProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Selected report for full view inspection modal
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setFeedback(null);
      getDailyReportsAction()
        .then((data) => setReports(data || []))
        .catch((err) => {
          setFeedback({ type: "error", message: err?.message || "فشل تحميل أرشيف التقارير" });
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Search filter
  const filteredReports = reports.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(r.report_number).includes(q) ||
      (r.internal_id && r.internal_id.toLowerCase().includes(q)) ||
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.reporter_name && r.reporter_name.toLowerCase().includes(q)) ||
      (r.reporter_dept && r.reporter_dept.toLowerCase().includes(q)) ||
      (r.location_name && r.location_name.toLowerCase().includes(q)) ||
      (r.recipient_to && r.recipient_to.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  // Handle Export to Excel
  const handleExportToExcel = async () => {
    setExporting(true);
    setFeedback(null);
    try {
      const res = await exportDailyReportsToExcelAction();
      if (res.success && res.xml) {
        downloadExcelFile(res.xml, res.filename || "marasim_daily_reports_archive.xls");
        setFeedback({
          type: "success",
          message: `🎉 تم بنجاح ترحيل وتصدير (${res.count}) تقريراً إلى ملف Excel وهو جاهز للعرض والتحليل!`,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "فشل ترحيل التقارير إلى إكسيل",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: `حدث خطأ أثناء التصدير: ${err?.message || "خطأ غير متوقع"}`,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#FAF7F4] text-slate-800 w-full max-w-6xl rounded-[2.5rem] border-2 border-[#D49A3D]/40 shadow-2xl p-5 sm:p-7 relative overflow-hidden flex flex-col max-h-[94vh]">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-200 mb-3 gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1B1111] text-[#FFC217] rounded-2xl shadow-md border border-[#D49A3D]/30 flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#1B1111]">
                  أرشيف وسجل التقارير اليومية
                </h3>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                  {reports.length} تقرير موثق
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                جدول بيانات متكامل لتوثيق وتحليل كافة التقارير اليومية المرفوعة بالمنظومة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canCreateReport && onOpenCreateNew && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCreateNew();
                }}
                className="px-4 py-2 bg-gradient-to-r from-[#D49A3D] to-[#B37E2C] text-[#1B1111] font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-all cursor-pointer"
              >
                <span>إنشاء تقرير يومي +</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              title="إغلاق الأرشيف"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-black flex items-center justify-between mb-3 border ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : "bg-rose-50 text-rose-900 border-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-3 flex-shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم التقرير، العنوان، اسم مقدم التقرير، الإدارة، الموقع، أو الجهة الموجه لها..."
            className="w-full h-10 pr-10 pl-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D49A3D]"
          />
        </div>

        {/* ============================================================== */}
        {/* 📋 PROFESSIONAL DATA TABLE: صف واحد لكل تقرير وأعمدة متكاملة     */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-[#D49A3D]" />
              <span className="font-bold text-xs">جاري تحميل سجل التقارير اليومية...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold p-6">
              {searchQuery ? "لا توجد نتائج مطابقة لبحثك في الأرشيف" : "لا توجد تقارير يومية مسجلة في هذا الأرشيف حتى الآن"}
            </div>
          ) : (
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-[#1B1111] text-[#FFC217] sticky top-0 z-10 shadow-xs select-none">
                <tr className="border-b border-[#D49A3D]/40 text-[11px] font-black tracking-wide">
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">الرقم التسلسلي</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">تاريخ ووقت الإرسال</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">مقدم التقرير</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">الإدارة / القسم</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">الموقع التشغيلي</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">الموجّه له (إلى)</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">موضوع وعنوان التقرير</th>
                  <th className="py-3 px-3.5 whitespace-nowrap min-w-[220px]">الوصف والتفاصيل</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">الحالة</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">معاينة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-amber-50/60 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-[#FAF7F4]"
                    }`}
                  >
                    {/* الرقم التسلسلي الفريد */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <span className="font-mono text-xs font-black bg-slate-100 text-[#1B1111] border border-slate-200 px-2.5 py-1 rounded-lg">
                        #{r.report_number}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.internal_id}</div>
                    </td>

                    {/* تاريخ ووقت الإرسال */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-[#D49A3D]" />
                        <span>{r.report_date}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{r.report_time}</span>
                      </div>
                    </td>

                    {/* مقدم التقرير */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-black text-slate-900">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{r.reporter_name}</span>
                      </div>
                      {r.reporter_role && (
                        <div className="text-[10px] text-slate-400 pr-5 font-semibold">
                          {r.reporter_role}
                        </div>
                      )}
                    </td>

                    {/* إدارة مقدم التقرير */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-semibold text-slate-700">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Building2 className="w-3.5 h-3.5 text-[#D49A3D] shrink-0" />
                        <span>{r.reporter_dept || "-"}</span>
                      </div>
                    </td>

                    {/* الموقع أو القسم التشغيلي */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-semibold text-slate-700">
                      <div className="flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-[#682722] shrink-0" />
                        <span>{r.location_name}</span>
                      </div>
                    </td>

                    {/* الموجّه له (إلى) */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="font-bold text-[#682722] bg-[#FAF3F3] px-2.5 py-1 rounded-xl border border-[#682722]/20 text-[11px] inline-flex items-center gap-1">
                        <Send className="w-3 h-3 rotate-180 shrink-0 text-[#682722]" />
                        <span>{r.recipient_to}</span>
                      </span>
                    </td>

                    {/* موضوع وعنوان التقرير */}
                    <td className="py-3 px-3.5 font-black text-slate-900 whitespace-nowrap">
                      {r.title}
                    </td>

                    {/* الوصف والتفاصيل */}
                    <td className="py-3 px-3.5 max-w-xs">
                      <p className="line-clamp-2 text-slate-600 font-medium leading-relaxed text-[11px]" title={r.description}>
                        {r.description}
                      </p>
                    </td>

                    {/* الحالة */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-black text-[10px] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>موثق ✅</span>
                      </span>
                    </td>

                    {/* معاينة كاملة */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedReport(r)}
                        className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="معاينة تفاصيل التقرير الكاملة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ============================================================== */}
        {/* 🟢 FOOTER BAR: في أسفل صفحة الأرشيف تحت الجدول + زر الترحيل      */}
        {/* ============================================================== */}
        <div className="pt-3.5 mt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
            <span>إجمالي التقارير المعروضة:</span>
            <strong className="text-[#1B1111] bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 font-mono">
              {filteredReports.length} من {reports.length}
            </strong>
          </div>

          {/* زر "الترحيل إلى إكسيل" المطلوب بالمتطلبات */}
          {canExportReports && <button
            type="button"
            onClick={handleExportToExcel}
            disabled={exporting || reports.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:opacity-95 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-700/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:bg-slate-300 disabled:opacity-50"
            title="ترحيل كافة بيانات الأرشيف إلى ملف إكسيل بصيغة جداول موحدة"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>جارٍ الترحيل والتصدير إلى إكسيل...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                <span>الترحيل إلى إكسيل</span>
              </>
            )}
          </button>}
        </div>

      </div>

      {/* ============================================================== */}
      {/* 🔍 MODAL: معاينة التقرير اليومي بالكامل                         */}
      {/* ============================================================== */}
      {selectedReport && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white text-slate-900 w-full max-w-xl rounded-3xl border border-amber-300 shadow-2xl p-6 relative space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black bg-slate-100 px-2 py-0.5 rounded-lg">
                  #{selectedReport.report_number}
                </span>
                <h4 className="font-black text-sm text-[#1B1111]">{selectedReport.title}</h4>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF7F4] p-3 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">مقدم التقرير:</span>
                <span className="font-black text-slate-800">{selectedReport.reporter_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">الإدارة المعنية:</span>
                <span className="font-black text-slate-800">{selectedReport.reporter_dept || "-"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">الموقع / القسم:</span>
                <span className="font-black text-slate-800">{selectedReport.location_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">الموجّه له (إلى):</span>
                <span className="font-black text-[#682722]">{selectedReport.recipient_to}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">تاريخ التقرير:</span>
                <span className="font-mono font-bold text-slate-700">{selectedReport.report_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">وقت الإرسال:</span>
                <span className="font-mono font-bold text-slate-700">{selectedReport.report_time}</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <span className="font-black text-slate-700 block">نص ومحتوى التقرير بالكامل:</span>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-semibold leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedReport.description}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
