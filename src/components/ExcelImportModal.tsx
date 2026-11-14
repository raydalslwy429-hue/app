"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Building2,
  MapPin,
  Users,
  Shield,
  RefreshCw,
} from "lucide-react";
import {
  bulkImportDepartmentsAction,
  bulkImportSectionsAction,
  bulkImportUsersAction,
  bulkImportCategoriesAction,
  bulkImportTemplatesAction,
} from "@/app/actions/capa";
import { useRouter } from "next/navigation";
import { downloadExcelFile, generateExcelWorkbookXML } from "@/lib/excel-helper";

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type EntityType = "departments" | "sections" | "users" | "categories" | "templates";

const TEMPLATES: Record<
  EntityType,
  {
    title: string;
    icon: any;
    filename: string;
    headers: string[];
    sampleRow: string[];
    desc: string;
  }
> = {
  departments: {
    title: "هيكل الإدارات",
    icon: Building2,
    filename: "قالب_استيراد_الإدارات.xls",
    headers: ["كود_الإدارة", "اسم_الإدارة", "الحالة"],
    sampleRow: ["dept_catering", "إدارة التموين والضيافة", "active"],
    desc: "أدخل كود الإدارة (إنجليزي بدون مسافات مثل dept_catering) واسم الإدارة بالعربي.",
  },
  sections: {
    title: "الأقسام والمواقع",
    icon: MapPin,
    filename: "قالب_استيراد_الأقسام.xls",
    headers: ["كود_القسم", "اسم_القسم", "كود_الإدارة_التابع_لها", "الحالة"],
    sampleRow: ["loc_pastry", "قسم المعجنات والحلويات", "dept_production", "active"],
    desc: "أدخل كود القسم واسمه وكود الإدارة الأم التي يتبع لها.",
  },
  users: {
    title: "المستخدمين والموظفين",
    icon: Users,
    filename: "قالب_استيراد_المستخدمين.xls",
    headers: ["اسم_الموظف", "رمز_المرور_4_أرقام", "الدور_الوظيفي", "كود_الإدارة"],
    sampleRow: ["عمر سالم", "4321", "field_agent", "dept_operations"],
    desc: "الأدوار المتاحة: super_admin (مدير عام), admin (مدير إدارة), inspector (مفتش), field_agent (منفذ ميداني).",
  },
  categories: {
    title: "كتالوج حالات عدم المطابقة",
    icon: AlertTriangle,
    filename: "قالب_استيراد_المخالفات.xls",
    headers: ["كود_المخالفة", "اسم_المخالفة", "مستوى_الخطورة"],
    sampleRow: ["nc_storage", "سوء تخزين المواد الجافة", "medium"],
    desc: "مستويات الخطورة: low (منخفض), medium (متوسط), high (حرج/مرتفع).",
  },
  templates: {
    title: "استمارات التقارير والتفتيش",
    icon: FileText,
    filename: "قالب_استيراد_الاستمارات.xls",
    headers: ["كود_الاستمارة", "عنوان_الاستمارة", "الوصف", "الأدوار_المصرح_لها"],
    sampleRow: ["form_weekly_audit", "استمارة التدقيق الأسبوعي", "فحص شامل للمستودعات", "inspector"],
    desc: "الأدوار المصرح لها: all أو inspector أو admin أو field_agent.",
  },
};

export default function ExcelImportModal({ isOpen, onClose }: ExcelImportModalProps) {
  const router = useRouter();
  const [selectedEntity, setSelectedEntity] = useState<EntityType>("departments");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Download an Excel workbook template with the expected headers and a sample row.
  const handleDownloadTemplate = (entity: EntityType) => {
    const tmpl = TEMPLATES[entity];
    const columns = tmpl.headers.map((header, index) => ({ header, key: `c${index}` }));
    const rows = [Object.fromEntries(tmpl.sampleRow.map((value, index) => [`c${index}`, value]))];
    const xml = generateExcelWorkbookXML({ title: tmpl.title, sheets: [{ name: tmpl.title, columns, rows }] });
    downloadExcelFile(xml, tmpl.filename);
  };

  // Read the Excel SpreadsheetML workbook format used by the downloadable templates.
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xls")) {
      setError("يرجى اختيار ملف Excel بصيغة .xls. ملفات CSV وXLSX غير مدعومة.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || "");
        const doc = new DOMParser().parseFromString(text, "application/xml");
        if (doc.querySelector("parsererror")) throw new Error("ملف Excel غير صالح أو تالف");
        const worksheet = doc.getElementsByTagNameNS("*", "Worksheet")[0];
        const table = worksheet?.getElementsByTagNameNS("*", "Table")[0];
        const lines = table ? Array.from(table.getElementsByTagNameNS("*", "Row")) : [];
        if (lines.length < 2) {
          setError("الملف فارغ أو لا يحتوي على صفوف بيانات بعد رأس الأعمدة");
          return;
        }

        const readRow = (row: Element) => Array.from(row.getElementsByTagNameNS("*", "Cell")).map((cell) => {
          const index = Number(cell.getAttributeNS("urn:schemas-microsoft-com:office:spreadsheet", "Index"));
          const value = cell.getElementsByTagNameNS("*", "Data")[0]?.textContent?.trim() || "";
          return { index, value };
        }).reduce<string[]>((values, cell) => {
          if (cell.index > 0) while (values.length < cell.index - 1) values.push("");
          values.push(cell.value);
          return values;
        }, []);
        const headers = readRow(lines[0]);
        setParsedHeaders(headers);

        const rows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = readRow(lines[i]);
          if (values.length > 0 && values.some((v) => v !== "")) {
            const rowObj: Record<string, string> = {};
            headers.forEach((h, idx) => {
              rowObj[h] = values[idx] || "";
            });
            rows.push(rowObj);
          }
        }

        setParsedRows(rows);
      } catch (err: any) {
        setError(`فشل قراءة الملف: ${err.message}`);
      }
    };

    reader.readAsText(file, "UTF-8");
  };

  // Execute bulk import
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      setError("لا توجد بيانات للاستيراد");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let res: { success: boolean; count?: number; error?: string };

      if (selectedEntity === "departments") {
        const formatted = parsedRows.map((r) => ({
          code: r["كود_الإدارة"] || r["code"] || Object.values(r)[0],
          name: r["اسم_الإدارة"] || r["name"] || Object.values(r)[1],
          status: r["الحالة"] || r["status"] || "active",
        }));
        res = await bulkImportDepartmentsAction(formatted as any);
      } else if (selectedEntity === "sections") {
        const formatted = parsedRows.map((r) => ({
          code: r["كود_القسم"] || r["code"] || Object.values(r)[0],
          name: r["اسم_القسم"] || r["name"] || Object.values(r)[1],
          department_code: r["كود_الإدارة_التابع_لها"] || r["department_code"] || Object.values(r)[2],
          status: r["الحالة"] || r["status"] || "active",
        }));
        res = await bulkImportSectionsAction(formatted as any);
      } else if (selectedEntity === "users") {
        const formatted = parsedRows.map((r) => ({
          full_name: r["اسم_الموظف"] || r["full_name"] || Object.values(r)[0],
          pin_code: r["رمز_المرور_4_أرقام"] || r["pin_code"] || Object.values(r)[1],
          role: r["الدور_الوظيفي"] || r["role"] || Object.values(r)[2],
          department_code: r["كود_الإدارة"] || r["department_code"] || Object.values(r)[3],
        }));
        res = await bulkImportUsersAction(formatted as any);
      } else if (selectedEntity === "categories") {
        const formatted = parsedRows.map((r) => ({
          code: r["كود_المخالفة"] || r["code"] || Object.values(r)[0],
          name: r["اسم_المخالفة"] || r["name"] || Object.values(r)[1],
          severity: r["مستوى_الخطورة"] || r["severity"] || Object.values(r)[2],
        }));
        res = await bulkImportCategoriesAction(formatted as any);
      } else {
        const formatted = parsedRows.map((r) => ({
          code: r["كود_الاستمارة"] || r["code"] || Object.values(r)[0],
          title: r["عنوان_الاستمارة"] || r["title"] || Object.values(r)[1],
          description: r["الوصف"] || r["description"] || Object.values(r)[2],
          allowed_roles: r["الأدوار_المصرح_لها"] || r["allowed_roles"] || Object.values(r)[3],
        }));
        res = await bulkImportTemplatesAction(formatted as any);
      }

      if (res.success) {
        setSuccess(`تم استيراد وتحديث ${res.count} سجل في قاعدة البيانات المحلية بنجاح.`);
        setTimeout(() => {
          setSuccess(null);
          setParsedRows([]);
          setFileName("");
          onClose();
          router.refresh();
        }, 2200);
      } else {
        setError(res.error || "فشل الاستيراد");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  const currentTemplate = TEMPLATES[selectedEntity];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1C1210] text-white w-full max-w-2xl rounded-3xl border-2 border-[#D49A3D]/40 shadow-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFC217]/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D49A3D]/20 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#D49A3D] text-[#1B1111] rounded-2xl shadow-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">تهيئة واستيراد البيانات عبر إكسل (Excel Import)</h3>
              <p className="text-[11px] text-[#FFC217] font-bold">تصدير مسميات الأعمدة والاستيراد الجماعي الذكي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 relative z-10 text-right">
          {/* Entity Selector Tabs */}
          <div>
            <label className="block text-xs font-black text-amber-200 mb-2">
              اختر نوع البيانات المراد تهيئتها أو استيرادها:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(TEMPLATES) as EntityType[]).map((key) => {
                const item = TEMPLATES[key];
                const Icon = item.icon;
                const isSelected = selectedEntity === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedEntity(key);
                      setParsedRows([]);
                      setFileName("");
                      setError(null);
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? "bg-gradient-to-b from-[#D49A3D] to-[#B37B24] text-[#1B1111] border-[#FFC217] font-black shadow-md"
                        : "bg-black/30 border-white/10 text-slate-300 hover:border-amber-400/40 text-xs font-bold"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] leading-tight">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 1: Download Template */}
          <div className="p-4 rounded-2xl bg-black/40 border border-[#D49A3D]/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#FFC217] text-[#1B1111] flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>تحميل ملف النموذج المعتمد بمسميات الأعمدة المطلوبة</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">{currentTemplate.desc}</p>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadTemplate(selectedEntity)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
              <span>تحميل قالب Excel ({currentTemplate.title})</span>
              </button>
            </div>

            {/* Required Columns Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-amber-300 font-bold">الأعمدة المطلوبة:</span>
              {currentTemplate.headers.map((h) => (
                <span
                  key={h}
                  className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-mono text-amber-100"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Step 2: Upload File */}
          <div className="p-4 rounded-2xl bg-black/40 border border-[#D49A3D]/30 space-y-3">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#FFC217] text-[#1B1111] flex items-center justify-center text-[10px]">
                2
              </span>
                  <span>رفع ملف Excel المعبأ (.xls) للاستيراد المحلي</span>
            </h4>

            <label className="border-2 border-dashed border-[#D49A3D]/40 hover:border-[#FFC217] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-black/20 hover:bg-black/30 transition-all text-center">
              <Upload className="w-8 h-8 text-[#FFC217]" />
              <div>
                <span className="text-xs font-black text-white block">
                  {fileName ? `الملف المحدد: ${fileName}` : "انقر هنا لاختيار ملف إكسل أو اسحبه هنا"}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  مصنف Excel بصيغة .xls مع دعم الأوراق العربية
                </span>
              </div>
              <input type="file" accept=".xls,application/vnd.ms-excel,application/xml,text/xml" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs rounded-xl flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs rounded-xl flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Preview Parsed Rows */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-amber-200">
                <span>معاينة البيانات قبل الحفظ ({parsedRows.length} صف):</span>
                <span className="text-emerald-400 text-[11px]">جاهز للحفظ محلياً</span>
              </div>

              <div className="overflow-x-auto max-h-48 border border-white/10 rounded-2xl bg-black/50">
                <table className="min-w-full divide-y divide-white/10 text-[11px] text-right">
                  <thead className="bg-[#1B1111] text-amber-300 font-black sticky top-0">
                    <tr>
                      {parsedHeaders.map((h) => (
                        <th key={h} className="px-3 py-2 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-semibold text-slate-300">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        {parsedHeaders.map((h) => (
                          <td key={h} className="px-3 py-1.5 whitespace-nowrap">
                            {r[h] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Submit */}
        <div className="pt-4 border-t border-[#D49A3D]/20 mt-4 flex items-center justify-between relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-bold transition-colors"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={loading || parsedRows.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-[#D49A3D] to-[#FFC217] hover:brightness-110 text-[#1B1111] font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-40"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جار الاستيراد والحفظ...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>تأكيد الاستيراد والحفظ إلى قاعدة البيانات ({parsedRows.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
