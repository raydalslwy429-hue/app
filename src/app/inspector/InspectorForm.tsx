"use client";

import { useState, useMemo, useEffect } from "react";
import { createInspectionAction } from "@/app/actions/capa";
import { addToOfflineQueue } from "@/lib/offline-client";
import { Send, Loader2, CheckCircle2, AlertTriangle, Search, X, Check, Building2, MapPin, Tag, WifiOff } from "lucide-react";

interface DeptOption {
  code: string;
  name: string;
}

interface LocationOption {
  code: string;
  name: string;
  department_code?: string;
}

interface CategoryOption {
  code: string;
  name: string;
  severity?: string;
  department_code?: string;
  section_code?: string;
}

export default function InspectorForm({
  departments,
  locations,
  categories,
}: {
  departments: DeptOption[];
  locations: LocationOption[];
  categories: CategoryOption[];
}) {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cascading Selection State
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>("");

  // Search & Typeahead for Categories
  const [catSearchQuery, setCatSearchQuery] = useState("");
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

  // Client UUID for Idempotency
  const [clientUuid, setClientUuid] = useState("");

  useEffect(() => {
    // Generate unique UUID for this form instance
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      setClientUuid(crypto.randomUUID());
    } else {
      setClientUuid(`UUID-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    }
  }, [successMsg]);

  // Filter sections based on selected department
  const filteredSections = useMemo(() => {
    if (!selectedDept || selectedDept === "all") return locations;
    return locations.filter((loc) => loc.department_code === selectedDept);
  }, [locations, selectedDept]);

  // Filter categories based on department and section
  const availableCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchDept =
        !selectedDept ||
        selectedDept === "all" ||
        cat.department_code === "all" ||
        !cat.department_code ||
        cat.department_code === selectedDept ||
        cat.department_code.split(",").map((d: string) => d.trim()).includes(selectedDept);

      const matchSec =
        !selectedSection ||
        selectedSection === "all" ||
        cat.section_code === "all" ||
        !cat.section_code ||
        cat.section_code === selectedSection ||
        cat.section_code.split(",").map((s: string) => s.trim()).includes(selectedSection);

      return matchDept && matchSec;
    });
  }, [categories, selectedDept, selectedSection]);

  // Filtered by user search
  const filteredCategories = useMemo(() => {
    if (!catSearchQuery.trim()) return availableCategories;
    const q = catSearchQuery.toLowerCase();
    return availableCategories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [availableCategories, catSearchQuery]);

  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c.code === selectedCategoryCode);
  }, [categories, selectedCategoryCode]);

  const handleDeptChange = (deptCode: string) => {
    setSelectedDept(deptCode);
    setSelectedSection("");
    // If selected category is no longer valid, reset it
    setSelectedCategoryCode("");
  };

  const handleSectionChange = (secCode: string) => {
    setSelectedSection(secCode);
    setSelectedCategoryCode("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSection) {
      setErrorMsg("يرجى اختيار القسم أو الموقع التشغيلي");
      return;
    }
    if (!selectedCategoryCode) {
      setErrorMsg("يرجى اختيار نوع حالة عدم المطابقة");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(e.currentTarget);
    formData.set("location_code", selectedSection);
    formData.set("nc_code", selectedCategoryCode);
    formData.set("client_uuid", clientUuid);

    const formElement = e.currentTarget;

    const queueOfflineCase = () => {
      const payload: any = {
        client_uuid: clientUuid,
        location_code: selectedSection,
        nc_code: selectedCategoryCode,
        description: String(formData.get("description") || "").trim(),
        root_cause: String(formData.get("root_cause") || "").trim(),
        inspector_notes: String(formData.get("inspector_notes") || "").trim(),
      };

      const caseTitle = selectedCategoryObj?.name || selectedCategoryCode;
      addToOfflineQueue("INSPECTION", `رصد حالة: ${caseTitle}`, payload);

      setSuccessMsg("📶 تم حفظ حالة عدم المطابقة محلياً في صندوق الصادر (أوفلاين بدون نت) وسيتم ترحيلها تلقائياً عند توفر الاتصال!");
      formElement.reset();
      setSelectedDept("");
      setSelectedSection("");
      setSelectedCategoryCode("");
      setCatSearchQuery("");
      setClientUuid(`insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    };

    try {
      const res = await createInspectionAction(formData);
      if (res.success) {
        setSuccessMsg(`🎉 تم حفظ حالة عدم المطابقة برقم (#${res.caseNumber}) بنجاح وترحيلها لحظياً للإدارة!`);
        formElement.reset();
        setSelectedDept("");
        setSelectedSection("");
        setSelectedCategoryCode("");
        setCatSearchQuery("");
        setClientUuid(`insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
      } else {
        const errText = res.error || "";
        // Network / Turso reachability failure fallback
        if (errText.includes("الاتصال") || errText.includes("سحابية") || errText.includes("network") || errText.includes("fetch") || errText.includes("fetch failed")) {
          queueOfflineCase();
        } else {
          setErrorMsg(errText || "حدث خطأ أثناء التسجيل");
        }
      }
    } catch {
      // In catch block (connection dropped or timeout): fallback to offline queue automatically!
      queueOfflineCase();
    } finally {
      setLoading(false);
    }
  };

  const severityBadge = (sev?: string) => {
    switch (sev) {
      case "high":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">حرج / عالي</span>;
      case "medium":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">متوسط</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-300">عادي</span>;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="client_uuid" value={clientUuid} />
      
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-black rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-[#FAF3F3] border border-[#682722]/30 text-[#682722] text-xs font-black rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Cascading Department Selection */}
      <div>
        <label className="block text-xs font-black text-[#1B1111] mb-1.5 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-[#D49A3D]" />
          <span>1. الإدارة المسؤولة</span>
          <span className="text-slate-400 font-normal text-[11px]">(لتصفية الأقسام وحالات عدم المطابقة)</span>
        </label>
        <select
          value={selectedDept}
          onChange={(e) => handleDeptChange(e.target.value)}
          className="w-full h-11 px-3 bg-[#FAF7F4] border border-[#D49A3D]/40 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#D49A3D]/30 focus:border-[#D49A3D] focus:outline-none"
        >
          <option value="">-- جميع الإدارات --</option>
          {departments.map((dept) => (
            <option key={dept.code} value={dept.code}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Cascading Section / Location Selection */}
      <div>
        <label className="block text-xs font-black text-[#1B1111] mb-1.5 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-[#D49A3D]" />
          <span>2. الموقع أو القسم التشغيلي</span>
          <span className="text-[#682722] font-black">*</span>
        </label>
        <select
          value={selectedSection}
          onChange={(e) => handleSectionChange(e.target.value)}
          required
          className="w-full h-11 px-3 bg-[#FAF7F4] border border-[#D49A3D]/40 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#D49A3D]/30 focus:border-[#D49A3D] focus:outline-none"
        >
          <option value="">-- اختر القسم التشغيلي --</option>
          {filteredSections.map((loc) => (
            <option key={loc.code} value={loc.code}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 3: Cascading & Searchable Category Selection (Typeahead) */}
      <div className="relative">
        <label className="block text-xs font-black text-[#1B1111] mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-[#682722]" />
            <span>3. نوع وحالة عدم المطابقة المرصودة</span>
            <span className="text-[#682722] font-black">*</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">
            ({availableCategories.length} حالة متاحة)
          </span>
        </label>

        {/* Selected Pill Display */}
        {selectedCategoryObj ? (
          <div className="p-3 bg-amber-50/80 border-2 border-[#D49A3D] rounded-2xl flex items-center justify-between shadow-sm mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D49A3D]"></span>
              <span className="font-black text-xs text-[#1B1111]">{selectedCategoryObj.name}</span>
              {severityBadge(selectedCategoryObj.severity)}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryCode("");
                setIsCatDropdownOpen(true);
              }}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
              title="تغيير الحالة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                value={catSearchQuery}
                onFocus={() => setIsCatDropdownOpen(true)}
                onChange={(e) => {
                  setCatSearchQuery(e.target.value);
                  setIsCatDropdownOpen(true);
                }}
                placeholder="ابحث بكتابة حرفين من اسم الحالة (مثال: جو، لحوم، نظا...)"
                className="w-full h-11 pl-10 pr-4 bg-[#FAF7F4] border border-[#D49A3D]/40 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#D49A3D]/30 focus:border-[#D49A3D] focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>

            {/* Dropdown List */}
            {isCatDropdownOpen && (
              <div className="absolute z-30 mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                {filteredCategories.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-bold">
                    لا توجد حالة مطابقة للبحث أو لهذا القسم
                  </div>
                ) : (
                  filteredCategories.map((cat) => (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryCode(cat.code);
                        setIsCatDropdownOpen(false);
                        setCatSearchQuery("");
                      }}
                      className="w-full text-right p-3 hover:bg-amber-50/80 transition-colors flex items-center justify-between text-xs font-black text-slate-800"
                    >
                      <span>{cat.name}</span>
                      <div className="flex items-center gap-2">
                        {severityBadge(cat.severity)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-black text-[#1B1111] mb-1.5">
          📝 وصف حالة عدم المطابقة التفصيلي <span className="text-[#682722]">*</span>
        </label>
        <textarea
          name="description"
          required
          rows={3}
          placeholder="اكتب وصفاً دقيقاً ومحدداً لما تم رصده في الميدان..."
          className="w-full p-3 bg-[#FAF7F4] border border-[#D49A3D]/40 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#D49A3D]/30 focus:border-[#D49A3D] focus:outline-none resize-none"
        />
      </div>

      {/* Root Cause */}
      <div>
        <label className="block text-xs font-black text-[#1B1111] mb-1.5">
          🔍 السبب الجذري المرصود أو المحتمل
        </label>
        <textarea
          name="root_cause"
          rows={2}
          placeholder="ما هو السبب المباشر لوقوع هذه الحالة حسب تقديرك؟"
          className="w-full p-3 bg-[#FAF7F4] border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#D49A3D]/30 focus:border-[#D49A3D] focus:outline-none resize-none"
        />
      </div>

      {/* Inspector Notes */}
      <div>
        <label className="block text-xs font-black text-[#1B1111] mb-1.5">
          💬 ملاحظات وتوجيه فوري للمفتش (اختياري)
        </label>
        <input
          name="inspector_notes"
          type="text"
          placeholder="أي إجراء عاجل تم اتخاذه على أرض الواقع..."
          className="w-full h-11 px-3 bg-[#FAF7F4] border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#D49A3D]/30 focus:border-[#D49A3D] focus:outline-none"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 bg-gradient-to-r from-[#D49A3D] via-[#E5A93C] to-[#B87B28] hover:opacity-95 disabled:bg-slate-300 text-[#1B1111] font-black rounded-xl shadow-md shadow-[#D49A3D]/30 transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>جارٍ الحفظ والترحيل للإدارة...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4 rotate-180" />
            <span>إرسال وترحيل الحالة للإدارة فوراً</span>
          </>
        )}
      </button>

    </form>
  );
}
