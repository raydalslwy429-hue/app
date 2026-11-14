"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Send, Sparkles } from "lucide-react";
import { getDynamicResponsesAction, submitDynamicResponseExecutionAction } from "@/app/actions/dynamic-forms";
import { FormResponse } from "@/types/dynamic-forms";

export default function AssignedDynamicForms({ canExecute }: { canExecute: boolean }) {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { action: string; notes: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadResponses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDynamicResponsesAction("assigned");
      setResponses(result.success ? result.responses : []);
      if (!result.success) setMessage({ type: "error", text: "تعذر تحميل الاستمارات المسندة لهذا الحساب." });
    } catch {
      setResponses([]);
      setMessage({ type: "error", text: "تعذر الاتصال لتحميل الاستمارات." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResponses();
  }, [loadResponses]);

  const submitResponse = async (responseId: number) => {
    const draft = drafts[responseId];
    if (!draft?.action?.trim()) {
      setMessage({ type: "error", text: "اكتب الإجراء الميداني قبل الإرسال." });
      return;
    }
    setSubmittingId(responseId);
    setMessage(null);
    try {
      const result = await submitDynamicResponseExecutionAction({
        responseId,
        actionTaken: draft.action,
        notes: draft.notes,
      });
      if (result.success) {
        setResponses((current) => current.filter((response) => response.id !== responseId));
        setDrafts((current) => {
          const next = { ...current };
          delete next[responseId];
          return next;
        });
        setMessage({ type: "success", text: "تم إرسال المعالجة إلى الإدارة للمراجعة." });
      } else {
        setMessage({ type: "error", text: result.error || "تعذر إرسال المعالجة." });
      }
    } catch {
      setMessage({ type: "error", text: "تعذر الاتصال لإرسال المعالجة." });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-base font-black text-[#1B1111] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#D49A3D]" /> الاستمارات الميدانية المسندة إليك
        </h3>
        <p className="text-xs text-slate-500 font-semibold mt-1">تظهر هنا الاستمارات التي أسندتها الإدارة إلى حسابك.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-10 text-center text-sm font-bold text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحميل الاستمارات...
        </div>
      ) : responses.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-sm font-bold text-slate-500">لا توجد استمارات مسندة إليك حالياً.</div>
      ) : responses.map((response) => {
        const draft = drafts[response.id] || { action: "", notes: "" };
        return (
          <article key={response.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-sm text-[#1B1111]">{response.template_title || "استمارة ميدانية"}</h4>
                <p className="text-[11px] text-slate-500 font-semibold mt-1">رقم الاستمارة #{response.response_number} · {response.location_name || response.department_name}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-black flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> بانتظار التنفيذ
              </span>
            </div>

            {response.curated_notes && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 font-bold">توجيه الإدارة: {response.curated_notes}</div>}

            <div className="space-y-2">
              {(response.answers || []).map((answer) => (
                <div key={answer.id || answer.question_id} className="p-3 rounded-xl bg-[#FAF7F4] border border-slate-100">
                  <p className="text-[11px] font-black text-slate-700 mb-1">{answer.admin_override_value || answer.question_text || answer.question_code || "السؤال"}</p>
                  <p className="text-xs font-semibold text-slate-800 whitespace-pre-wrap">{answer.answer_value || "—"}</p>
                </div>
              ))}
            </div>

            {canExecute ? (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <textarea
                  rows={3}
                  value={draft.action}
                  onChange={(event) => setDrafts((current) => ({ ...current, [response.id]: { ...draft, action: event.target.value } }))}
                  placeholder="اكتب الإجراء التصحيحي المتخذ ميدانياً..."
                  className="w-full p-3 bg-[#FAF7F4] border border-[#D49A3D]/40 rounded-xl text-xs font-semibold resize-y"
                />
                <input
                  value={draft.notes}
                  onChange={(event) => setDrafts((current) => ({ ...current, [response.id]: { ...draft, notes: event.target.value } }))}
                  placeholder="ملاحظات إضافية (اختياري)"
                  className="w-full h-10 px-3 bg-[#FAF7F4] border border-slate-200 rounded-xl text-xs font-semibold"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void submitResponse(response.id)}
                    disabled={submittingId === response.id || !draft.action.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#D49A3D] text-[#1B1111] text-xs font-black disabled:opacity-50 flex items-center gap-2"
                  >
                    {submittingId === response.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    إرسال إلى الإدارة
                  </button>
                </div>
              </div>
            ) : (
              <p className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">هذه الاستمارة متاحة للاطلاع فقط.</p>
            )}
          </article>
        );
      })}
    </section>
  );
}
