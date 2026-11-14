"use client";

import { useState, useEffect } from "react";
import { submitExecutionAction } from "@/app/actions/capa";
import AssignedDynamicForms from "./AssignedDynamicForms";
import {
  Inbox,
  RotateCcw,
  MapPin,
  Tag,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldAlert,
  Sparkles,
  Bell,
} from "lucide-react";

interface AssignmentItem {
  asgRowId: number;
  asgId: string;
  caseId: number;
  caseNumber: number;
  round: number;
  assignedDept: string;
  deptName: string;
  adminInstructions: string;
  reassignNotes: string;
  asgStatus: string;
  isAccepted?: boolean;
  adminFeedback?: string;
  caseStatus?: string;
  locationName: string;
  ncName: string;
  description: string;
  rootCause: string;
  inspectorNotes?: string;
  inProgressNote?: string;
  actionTaken?: string;
  executorNotes?: string;
  obsDate: string;
  obsTime: string;
}

interface ClosedCaseItem {
  id: number;
  caseNumber: number;
  locationName: string;
  ncName: string;
  description: string;
  rootCause?: string;
  inspectorNotes?: string;
  actionTaken?: string;
  executorNotes?: string;
  closedAt: string;
  closedFeedback: string;
}

export default function FieldQueue({
  newAssignments,
  returnedAssignments,
  closedCases = [],
  canExecute = true,
}: {
  newAssignments: AssignmentItem[];
  returnedAssignments: AssignmentItem[];
  closedCases?: ClosedCaseItem[];
  canExecute?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"new" | "returned" | "submitted" | "closed" | "dynamic">(
    returnedAssignments.length > 0 ? "returned" : newAssignments.length > 0 ? "new" : "closed"
  );
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [formDataState, setFormDataState] = useState<Record<string, { action: string; notes: string }>>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Listen to drawer navigation events
  useEffect(() => {
    const handleDrawerNavigate = (e: any) => {
      const key = e.detail?.key;
      if (key === "tasks_new") setActiveTab("new");
      else if (key === "tasks_returned") setActiveTab("returned");
      else if (key === "tasks_submitted") setActiveTab("submitted");
      else if (key === "tasks_closed") setActiveTab("closed");
      else if (key === "dynamic_field") setActiveTab("dynamic");
    };
    window.addEventListener("marasim_drawer_navigate", handleDrawerNavigate);
    return () => window.removeEventListener("marasim_drawer_navigate", handleDrawerNavigate);
  }, []);

  const currentList = activeTab === "new"
    ? newAssignments
    : activeTab === "returned"
      ? returnedAssignments
      : [...newAssignments, ...returnedAssignments].filter((assignment) => assignment.asgStatus === "completed");

  const handleInputChange = (asgId: string, field: "action" | "notes", value: string) => {
    setFormDataState((prev) => ({
      ...prev,
      [asgId]: {
        action: field === "action" ? value : prev[asgId]?.action || "",
        notes: field === "notes" ? value : prev[asgId]?.notes || "",
      },
    }));
  };

  const handleExecute = async (asg: AssignmentItem) => {
    const data = formDataState[asg.asgId];
    if (!data?.action || data.action.trim() === "") {
      setErrorToast("يرجى كتابة الإجراء التصحيحي المتخذ ميدانياً قبل الإرسال");
      return;
    }

    setSubmittingId(asg.asgId);
    setErrorToast(null);

    try {
      const res = await submitExecutionAction(asg.caseId, asg.asgId, data.action, data.notes);
      if (res.success) {
        setSuccessToast(`🎉 تم إرسال الإجراء التصحيحي للبلاغ رقم (#${asg.caseNumber}) بنجاح وهو الآن قيد مراجعة واعتماد الإدارة.`);
        setTimeout(() => setSuccessToast(null), 5000);
      } else {
        setErrorToast(res.error || "فشل إرسال الإجراء");
      }
    } catch {
      setErrorToast("حدث خطأ في الاتصال بالخادم");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div>
      {/* Success / Error Toasts */}
      {successToast && (
        <div className="mb-4 p-4 bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-white/80 hover:text-white text-xs">✕</button>
        </div>
      )}

      {errorToast && (
        <div className="mb-4 p-4 bg-[#682722] text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-300" />
            <span>{errorToast}</span>
          </div>
          <button onClick={() => setErrorToast(null)} className="text-white/80 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Tabs Switcher styled with Al-Marasim palette */}
      <div className="flex items-center gap-2 p-1.5 bg-[#EFE8E1] rounded-2xl mb-6 w-full sm:w-auto sm:inline-flex border border-[#D49A3D]/20">
        <button
          onClick={() => setActiveTab("new")}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === "new"
              ? "bg-[#1B1111] text-[#FFC217] shadow-md"
              : "text-[#1B1111]/70 hover:text-[#1B1111] hover:bg-white/50"
          }`}
        >
          <Inbox className="w-4 h-4 text-[#D49A3D]" />
          <span>📥 معالجة بلاغات جديدة</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-[#1B1111] font-black border border-[#D49A3D]/40">
            {newAssignments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("submitted")}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === "submitted"
              ? "bg-blue-700 text-white shadow-md"
              : "text-blue-800 hover:bg-blue-50"
          }`}
        >
          <Clock className="w-4 h-4 text-blue-400" />
          <span>⏳ بانتظار مراجعة الإدارة</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-900 font-black border border-blue-200">
            {[...newAssignments, ...returnedAssignments].filter((assignment) => assignment.asgStatus === "completed").length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("returned")}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === "returned"
              ? "bg-[#682722] text-white shadow-md shadow-[#682722]/30"
              : "text-[#682722] hover:bg-[#682722]/10"
          }`}
        >
          <RotateCcw className="w-4 h-4 text-amber-300" />
          <span>🔄 معالجة بلاغات معادة للاستكمال</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-[#682722] font-black">
            {returnedAssignments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("closed")}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === "closed"
              ? "bg-emerald-800 text-white shadow-md shadow-emerald-900/30"
              : "text-emerald-800 hover:bg-emerald-50"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>✅ معتمدة ومغلقة (التغذية الراجعة)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-900 font-black border border-emerald-300">
            {closedCases.length}
          </span>
        </button>
      </div>

      {/* Closed Cases View with Feedback */}
      {activeTab === "dynamic" ? (
        <AssignedDynamicForms canExecute={canExecute} />
      ) : activeTab === "closed" ? (
        closedCases.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-slate-200 text-center shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-black text-slate-700">لا توجد حالات مغلقة في سجلك حتى الآن</h3>
            <p className="text-xs text-slate-400">عند اعتماد الإدارة لإجراءاتك وإغلاق الحالات، ستظهر توجيهات الإدارة هنا كمرجع دائم.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {closedCases.map((c) => (
              <div key={c.id} className="bg-white rounded-3xl border-2 border-emerald-200 p-5 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-black text-xs rounded-xl border border-emerald-300">
                      حالة مغلقة ومعتمدة #{c.caseNumber}
                    </span>
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#D49A3D]" />
                      {c.locationName}
                    </span>
                  </div>
                  {c.closedAt && (
                    <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      تاريخ الإغلاق: {c.closedAt}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-sm text-[#1B1111]">{c.ncName}</h4>
                  <div className="text-xs text-slate-600 font-medium leading-relaxed bg-[#FAF7F4] p-3 rounded-2xl border border-slate-100 space-y-1.5">
                    <div>
                      <strong className="text-[#1B1111] font-black">الوصف: </strong>
                      {c.description}
                    </div>
                    {c.rootCause && (
                      <div>
                        <strong className="text-[#682722] font-black">السبب المرصود: </strong>
                        {c.rootCause}
                      </div>
                    )}
                    {c.inspectorNotes && (
                      <div>
                        <strong className="text-blue-900 font-black">ملاحظات وتوصيات المفتش: </strong>
                        {c.inspectorNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Executor Field Response & Notes */}
                {(c.actionTaken || c.executorNotes) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {c.actionTaken && (
                      <div className="bg-[#FAF7F4] p-3 rounded-2xl border border-slate-200">
                        <span className="font-bold text-slate-500 block mb-0.5 text-[11px]">🛠️ الإجراء الذي قمت بتنفيذه:</span>
                        <p className="text-slate-800 font-bold">{c.actionTaken}</p>
                      </div>
                    )}
                    {c.executorNotes && (
                      <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200">
                        <span className="font-bold text-blue-900 block mb-0.5 text-[11px]">💬 ملاحظاتك التي أرفقتها:</span>
                        <p className="text-blue-950 font-bold">{c.executorNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Permanent Administrative Feedback Box (Read-Only) */}
                <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border-2 border-emerald-400 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-950 font-black text-xs">
                      <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>💡 التوجيه والملاحظات الإدارية الدائمة (تغذية راجعة):</span>
                    </div>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-black px-2 py-0.5 rounded-lg border border-emerald-300">
                      🔒 للقراءة فقط
                    </span>
                  </div>
                  <p className="text-xs text-emerald-950 font-bold leading-relaxed bg-white/80 p-3 rounded-xl border border-emerald-200">
                    {c.closedFeedback}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : currentList.length === 0 ? (
        <div className="bg-white p-12 rounded-[2rem] border border-[#D49A3D]/30 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#D49A3D] flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-[#1B1111] mb-1">
            {activeTab === "new"
              ? "لا توجد بلاغات جديدة بانتظار التنفيذ!"
              : activeTab === "returned"
                ? "لا توجد بلاغات معادة للاستكمال!"
                : "لا توجد بلاغات مرسلة بانتظار مراجعة الإدارة!"}
          </h3>
          <p className="text-xs text-slate-500 font-bold">كافة المهام الموكلة لقسمك منجزة ومحولة للإدارة بنجاح.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {currentList.map((asg) => {
            const currentData = formDataState[asg.asgId] || { action: "", notes: "" };
            const isSubmitting = submittingId === asg.asgId;

            return (
              <div
                key={asg.asgId}
                className="bg-white rounded-[2rem] border-2 border-[#D49A3D]/30 shadow-sm hover:border-[#D49A3D] transition-all overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-5 sm:p-6 bg-[#FAF7F4] border-b border-[#D49A3D]/20 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-[#1B1111] text-[#FFC217] font-black text-xs rounded-xl shadow-xs">
                      بلاغ رقم #{asg.caseNumber}
                    </span>
                    {asg.round > 1 && (
                      <span className="px-2.5 py-0.5 bg-[#FAF3F3] text-[#682722] font-black text-[11px] rounded-lg border border-[#682722]/30">
                        الجولة {asg.round} (معاد للاستكمال)
                      </span>
                    )}
                    {/* Status Badge */}
                    {asg.isAccepted || asg.asgStatus === "accepted" || asg.asgStatus === "approved" ? (
                      <span className="px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>الحالة: مقبولة ومعتمدة من الإدارة ✅ (بانتظار الإغلاق النهائي للبلاغ)</span>
                      </span>
                    ) : asg.asgStatus === "completed" ? (
                      <span className="px-3 py-1 bg-purple-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>الحالة: تم إرسال الرد ⏳ (قيد مراجعة واعتماد الإدارة)</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-500 text-[#1B1111] font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>الحالة: معلقة ⏳ (مطلوب اتخاذ الإجراء)</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-[#D49A3D]" />
                      <span>{asg.obsDate}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#D49A3D]" />
                      <span>{asg.obsTime}</span>
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 space-y-4">
                  
                  {/* Meta Tags */}
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5 bg-[#FAF7F4] border border-slate-200 px-3 py-1.5 rounded-xl">
                      <MapPin className="w-4 h-4 text-[#D49A3D]" />
                      <span>الموقع والقسم: {asg.locationName}</span>
                    </span>
                    <span className="flex items-center gap-1.5 bg-[#FAF3F3] text-[#682722] border border-[#682722]/20 px-3 py-1.5 rounded-xl">
                      <Tag className="w-4 h-4 text-[#682722]" />
                      <span>نوع عدم المطابقة: {asg.ncName}</span>
                    </span>
                  </div>

                  {/* Violation Details */}
                  <div className="p-4 bg-[#FAF7F4] rounded-2xl border border-slate-200/80 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-700">
                      <strong className="text-[#1B1111] font-black">وصف المخالفة المرصود: </strong>
                      {asg.description}
                    </div>
                    {asg.rootCause && (
                      <div className="text-xs font-semibold text-[#682722] bg-[#FAF3F3] p-2.5 rounded-xl border border-[#682722]/20">
                        <strong className="text-[#682722] font-black">السبب الجذري المرصود: </strong>
                        {asg.rootCause}
                      </div>
                    )}
                    {asg.inspectorNotes && (
                      <div className="text-xs font-semibold text-blue-950 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200">
                        <strong className="text-blue-900 font-black">ملاحظات وتوصيات المفتش: </strong>
                        {asg.inspectorNotes}
                      </div>
                    )}
                  </div>

                  {/* Live Urgent Admin Directive / Note (أثناء التنفيذ) */}
                  {asg.inProgressNote && (
                    <div className="p-4 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-500 rounded-2xl text-xs space-y-1.5 shadow-sm">
                      <div className="flex items-center gap-2 font-black text-[#682722]">
                        <Bell className="w-4 h-4 text-[#D49A3D] animate-bounce shrink-0" />
                        <span>🔔 تنبيه وملاحظة إدارية عاجلة (أثناء التنفيذ):</span>
                      </div>
                      <p className="text-slate-900 font-bold leading-relaxed pr-6 bg-white/80 p-2.5 rounded-xl border border-amber-200">
                        {asg.inProgressNote}
                      </p>
                    </div>
                  )}

                  {/* Admin Instructions */}
                  {asg.adminInstructions && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-950 font-bold">
                      <span className="text-[#995F1B]">🎯 توجيهات الإدارة العامة: </span>
                      {asg.adminInstructions}
                    </div>
                  )}

                  {/* RED ALERT: Rejection Notes (When Returned) */}
                  {asg.reassignNotes && (
                    <div className="p-4 bg-[#FAF3F3] border-2 border-[#682722] rounded-2xl text-xs text-[#682722] font-semibold space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-[#682722]">
                        <ShieldAlert className="w-4 h-4 text-[#682722]" />
                        <span>⚠️ تنبيه إعادة إسناد / ملاحظات الإدارة للاستكمال:</span>
                      </div>
                      <p className="pr-5 font-bold leading-relaxed">{asg.reassignNotes}</p>
                    </div>
                  )}

                  {/* CONDITIONAL BODY: Accepted vs Pending Review vs Action Inputs */}
                  {asg.isAccepted || asg.asgStatus === "accepted" || asg.asgStatus === "approved" ? (
                    <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400 rounded-2xl space-y-2.5">
                      <div className="flex items-center gap-2 text-emerald-900 font-black text-xs">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <span>تم قبول واعتماد معالجتك من قِبل إدارة القسم بنجاح ✅</span>
                      </div>

                      {(asg.actionTaken || asg.executorNotes) && (
                        <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                          {asg.actionTaken && (
                            <div>
                              <span className="font-bold text-slate-500 block text-[11px]">🛠️ الإجراء التصحيحي المعتمد:</span>
                              <p className="font-black text-slate-800">{asg.actionTaken}</p>
                            </div>
                          )}
                          {asg.executorNotes && (
                            <div>
                              <span className="font-bold text-blue-600 block text-[11px]">💬 ملاحظاتك المرفقة:</span>
                              <p className="font-bold text-blue-950 bg-blue-50/70 p-2 rounded-lg border border-blue-200">{asg.executorNotes}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {asg.adminFeedback && (
                        <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-bold">
                          <span className="text-emerald-800 font-black block mb-0.5">ملاحظات وتوجيه اعتماد الإدارة:</span>
                          {asg.adminFeedback}
                        </div>
                      )}
                      <p className="text-[11px] text-emerald-800 font-bold">
                        📌 الحالة أصبحت مقبولة لديك، وتبقى معلقة لدى بقية المنفذين المكلفين حتى يتم إغلاق البلاغ نهائياً من قبل الإدارة.
                      </p>
                    </div>
                  ) : asg.asgStatus === "completed" ? (
                    <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-purple-900 font-black text-xs">
                        <Clock className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        <span>تم إرسال ردك وإجراءك التصحيحي للإدارة بنجاح وهو قيد المراجعة والاعتماد ⏳</span>
                      </div>

                      {(asg.actionTaken || asg.executorNotes) && (
                        <div className="bg-white/90 p-3 rounded-xl border border-purple-200 text-xs space-y-2">
                          {asg.actionTaken && (
                            <div>
                              <span className="font-bold text-slate-500 block text-[11px]">🛠️ الإجراء التصحيحي الذي أرسلته:</span>
                              <p className="font-black text-slate-800">{asg.actionTaken}</p>
                            </div>
                          )}
                          {asg.executorNotes && (
                            <div>
                              <span className="font-bold text-blue-600 block text-[11px]">💬 ملاحظاتك المرفقة:</span>
                              <p className="font-bold text-blue-950 bg-blue-50/70 p-2 rounded-lg border border-blue-200">{asg.executorNotes}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-[11px] text-purple-800 font-bold">
                        📌 بمجرد اعتماد الإدارة لردك ستتحول حالتك إلى &quot;مقبولة&quot;، أو ستعاد إليك في حال طلبت الإدارة استكمال المهمة.
                      </p>
                    </div>
                  ) : !canExecute ? (
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                      هذه المهمة متاحة للاطلاع فقط، ولا تملك صلاحية تسجيل أو إرسال إجراء ميداني.
                    </div>
                  ) : (
                    <>
                      {/* Execution Inputs */}
                      <div className="pt-2 border-t border-slate-100 space-y-3">
                        <div>
                          <label className="block text-xs font-black text-[#1B1111] mb-1.5">
                            🛠️ الإجراء التصحيحي المتخذ ميدانياً <span className="text-[#682722]">*</span>
                          </label>
                          <textarea
                            rows={2}
                            value={currentData.action}
                            onChange={(e) => handleInputChange(asg.asgId, "action", e.target.value)}
                            placeholder="اكتب الإجراء الفعلي الذي قمت باتخاذه لمعالجة هذه الحالة بالميدان..."
                            className="w-full p-3 bg-[#FAF7F4] border border-[#D49A3D]/40 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#D49A3D]/30 focus:border-[#D49A3D] focus:outline-none resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-[#1B1111] mb-1.5">
                            💬 ملاحظات إضافية (اختياري)
                          </label>
                          <input
                            type="text"
                            value={currentData.notes}
                            onChange={(e) => handleInputChange(asg.asgId, "notes", e.target.value)}
                            placeholder="أي ملاحظات أخرى تود إرفاقها للإدارة..."
                            className="w-full h-11 px-3 bg-[#FAF7F4] border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#D49A3D]/30 focus:border-[#D49A3D] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Action Submit Button */}
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleExecute(asg)}
                          disabled={isSubmitting || !currentData.action?.trim()}
                          className="px-6 py-3 bg-gradient-to-r from-[#D49A3D] via-[#E5A93C] to-[#B87B28] hover:opacity-95 disabled:bg-slate-200 disabled:text-slate-400 text-[#1B1111] font-black text-xs rounded-xl shadow-md shadow-[#D49A3D]/30 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>جارٍ الاعتماد والإرسال...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 rotate-180" />
                              <span>إرسال الإجراء التصحيحي للإدارة</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
