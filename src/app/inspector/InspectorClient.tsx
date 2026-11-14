"use client";

import React, { useState } from "react";
import { FormTemplate } from "@/types/dynamic-forms";
import DynamicFormRenderer from "@/components/DynamicFormRenderer";
import InspectorForm from "./InspectorForm";
import { Layers, Zap, Clock, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";

interface InspectorClientProps {
  locations: Array<{ code: string; name: string }>;
  categories: Array<{ code: string; name: string; severity?: string }>;
  dynamicTemplates: FormTemplate[];
  recentCases: any[];
}

export default function InspectorClient({
  locations,
  categories,
  dynamicTemplates,
  recentCases,
}: InspectorClientProps) {
  const [activeFormMode, setActiveFormMode] = useState<"dynamic" | "classic">(
    dynamicTemplates.length > 0 ? "dynamic" : "classic"
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(
    dynamicTemplates[0]?.id || 1
  );

  const selectedTemplate =
    dynamicTemplates.find((t) => t.id === selectedTemplateId) || dynamicTemplates[0];

  React.useEffect(() => {
    const handleDrawerNavigate = (e: any) => {
      const key = e.detail?.key;
      if (!key) return;
      if (key === "dynamic_forms" || key === "dynamic_kobo") {
        setActiveFormMode("dynamic");
      } else if (key === "new_inspection") {
        setActiveFormMode("classic");
      } else if (key === "my_cases" || key === "track_cases") {
        document.getElementById("inspector-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    window.addEventListener("marasim_drawer_navigate", handleDrawerNavigate);
    return () => window.removeEventListener("marasim_drawer_navigate", handleDrawerNavigate);
  }, []);

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending_assignment: { label: "بانتظار فرز وتوجيه الإدارة", color: "bg-amber-100 text-amber-900 border-amber-300" },
    assigned: { label: "قيد التنفيذ الميداني", color: "bg-blue-100 text-blue-900 border-blue-300" },
    pending_review: { label: "جاهز لمراجعة الإدارة", color: "bg-[#682722]/10 text-[#682722] border-[#682722]/30" },
    closed: { label: "مغلق ومعتمد بنجاح", color: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Form Selector & Active Form */}
      <div className="lg:col-span-7 space-y-4">
        {/* Mode Selector Tab */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={() => setActiveFormMode("dynamic")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeFormMode === "dynamic"
                  ? "bg-[#1B1111] text-[#FFC217] shadow-md shadow-black/20"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>الاستمارة الديناميكية (متعددة المراحل)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFormMode("classic")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeFormMode === "classic"
                  ? "bg-[#682722] text-amber-100 shadow-md shadow-[#682722]/20"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>البلاغ السريع الفوري</span>
            </button>
          </div>
        </div>

        {/* Dynamic Form Engine */}
        {activeFormMode === "dynamic" ? (
          <div className="space-y-4">
            {dynamicTemplates.length > 1 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                <label className="text-xs font-black text-slate-800">اختر نوع الاستمارة الميدانية:</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  {dynamicTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedTemplate ? (
              <DynamicFormRenderer
                template={selectedTemplate}
                locations={locations}
                onSuccess={() => {
                  window.dispatchEvent(
                    new CustomEvent("marasim_notification", {
                      detail: {
                        type: "success",
                        title: "تم استلام الاستمارة بنجاح",
                        message: "تم حفظ الاستمارة وترحيلها بنجاح.",
                      },
                    })
                  );
                }}
              />
            ) : (
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
                لا توجد استمارات ديناميكية مفعلة حالياً. استخدم البلاغ السريع.
              </div>
            )}
          </div>
        ) : (
          /* Classic Quick Form */
          <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-[#D49A3D]/30 shadow-sm">
            <h3 className="text-base font-black text-[#1B1111] mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D49A3D]"></span>
              <span>تسجيل بلاغ تفتيش سريع وفوري</span>
            </h3>
            <InspectorForm departments={[]} locations={locations} categories={categories} />
          </div>
        )}
      </div>

      {/* Right Column: Recent Log */}
      <div id="inspector-history" className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4 scroll-mt-24">
        <h3 className="text-base font-black text-[#1B1111] pb-3 border-b border-slate-100 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#D49A3D]" />
            <span>سجل البلاغات الأخيرة ({recentCases.length})</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">ترقيم تسلسلي صريح</span>
        </h3>

        {recentCases.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-bold">
            لا توجد بلاغات مسجلة حتى الآن.
          </div>
        ) : (
          <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
            {recentCases.map((c: any) => {
              const st = statusLabels[c.status] || { label: c.status, color: "bg-slate-100 text-slate-800" };
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-[#D49A3D]/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 bg-[#1B1111] text-[#FFC217] rounded-lg text-xs font-mono font-black">
                      #{c.case_number}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-slate-900">{c.nc_name}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{c.description}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-200/60">
                    <span>{c.location_name}</span>
                    <span>
                      {c.obs_date} {c.obs_time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
