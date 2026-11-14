"use client";

import React, { useState } from "react";
import {
  FormResponse,
  FormAnswer,
  CuratedFieldDispatch,
} from "@/types/dynamic-forms";
import {
  Eye,
  EyeOff,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  User,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  Camera,
  Layers,
} from "lucide-react";
import { curateAndAssignResponseAction } from "@/app/actions/dynamic-forms";
import { addToOfflineQueue } from "@/lib/offline-client";

interface CuratedDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: FormResponse | null;
  fieldAgents: Array<{
    id: number;
    full_name: string;
    role: string;
    department_code: string;
    department_name: string;
  }>;
  onSuccess?: () => void;
}

export default function CuratedDispatchModal({
  isOpen,
  onClose,
  response,
  fieldAgents,
  onSuccess,
}: CuratedDispatchModalProps) {
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [instructions, setInstructions] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<number>(fieldAgents[0]?.id || 0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !response) return null;

  const answers = response.answers || [];

  const toggleVisibility = (questionId: number) => {
    setHiddenIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  const handleOverrideChange = (questionId: number, text: string) => {
    setOverrides((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) {
      setErrorMsg("يرجى اختيار المنفذ الميداني المكلف");
      return;
    }

    if (!instructions.trim()) {
      setErrorMsg("يرجى كتابة التوجيه الإداري الصريح للمنفذ");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const targetAgent = fieldAgents.find((a) => a.id === selectedAgentId);
    const targetRole = targetAgent?.department_name || "منفذ ميداني";

    const payload: CuratedFieldDispatch = {
      response_id: response.id,
      target_agent_id: selectedAgentId,
      target_role: targetRole,
      admin_instructions: instructions,
      hidden_question_ids: hiddenIds,
      field_overrides: overrides,
    };

    // If offline
    if (typeof window !== "undefined" && !navigator.onLine) {
      addToOfflineQueue("CURATED_ASSIGNMENT", `تنقية وإسناد استمارة #${response.response_number}`, payload);
      alert("📡 تم حفظ التكليف المنقح في (جاهز للإرسال). سيتم ترحيله فور توفر الاتصال بالإنترنت!");
      onClose();
      if (onSuccess) onSuccess();
      setLoading(false);
      return;
    }

    try {
      const res = await curateAndAssignResponseAction(payload);
      if (res.success) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.error || "فشل إسناد الاستمارة");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1C1210] text-white w-full max-w-3xl rounded-3xl border-2 border-[#D49A3D]/40 shadow-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFC217]/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D49A3D]/20 mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#682722] text-amber-100 rounded-2xl shadow-lg border border-amber-500/30">
              <ShieldCheck className="w-6 h-6 text-[#FFC217]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  تحرير وتنقية إسناد الاستمارة (#{response.response_number})
                </h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  فلتر الإدارة
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                تصفية الحقول، إعادة صياغة الملاحظات، وإصدار التكليف الميداني المعتمد.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-xl bg-white/5 hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview banner */}
        <div className="p-3.5 bg-black/40 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs mb-4">
          <div className="flex items-center gap-3 text-slate-300">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#D49A3D]" />
              {response.location_name}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-400" />
              المفتش: {response.user_name}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {response.created_at}
            </span>
          </div>

          <span className="text-[11px] text-[#FFC217] font-bold">
            عدد الحقول المخفية: {hiddenIds.length} من {answers.length}
          </span>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs rounded-xl flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Questions Curation Area */}
        <form onSubmit={handleDispatchSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 relative z-10 text-right">
          <div className="space-y-3">
            <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>مراجعة بنود الاستمارة وتحديد ما يظهر للمنفذ:</span>
            </h4>

            {answers.map((ans, idx) => {
              const isHidden = hiddenIds.includes(ans.question_id);
              const overrideVal = overrides[ans.question_id] || "";

              return (
                <div
                  key={ans.question_id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isHidden
                      ? "bg-black/20 border-white/5 opacity-50"
                      : "bg-black/40 border-[#D49A3D]/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-[10px] font-mono text-slate-400">بند {idx + 1}:</span>
                      <h5 className="text-xs font-black text-white mt-0.5">{ans.question_text}</h5>

                      {/* Inspector Original Answer */}
                      <div className="mt-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
                        <span className="text-[10px] text-amber-300 font-bold block">
                          إجابة ورصد المفتش الأصلي:
                        </span>
                        <p className="text-slate-200 font-semibold">{ans.answer_value || "(لا توجد إجابة)"}</p>

                        {ans.media_data && (
                          <div className="pt-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ans.media_data}
                              alt="صورة المفتش"
                              className="h-28 w-auto rounded-xl border border-white/20 object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visibility Toggle Button */}
                    <button
                      type="button"
                      onClick={() => toggleVisibility(ans.question_id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                        isHidden
                          ? "bg-rose-950/40 text-rose-300 border border-rose-500/40"
                          : "bg-emerald-950/40 text-emerald-300 border border-emerald-500/40"
                      }`}
                      title={isHidden ? "انقر لإظهار هذا البند للمنفذ" : "انقر لإخفاء هذا البند عن المنفذ"}
                    >
                      {isHidden ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                          <span>مخفي عن المنفذ</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ظاهر للمنفذ</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Clarification / Override Input */}
                  {!isHidden && (
                    <div className="pt-1">
                      <label className="block text-[11px] font-black text-amber-200 mb-1 flex items-center gap-1">
                        <Edit3 className="w-3 h-3 text-[#FFC217]" />
                        <span>إعادة صياغة أو توضيح الإدارة لهذا البند (اختياري):</span>
                      </label>
                      <input
                        type="text"
                        value={overrideVal}
                        onChange={(e) => handleOverrideChange(ans.question_id, e.target.value)}
                        placeholder="اتركه فارغاً لاعتماد نص المفتش كما هو، أو اكتب الصياغة المعتمدة..."
                        className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#FFC217]"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Assignment Controls */}
          <div className="p-4 bg-black/50 rounded-2xl border border-[#D49A3D]/30 space-y-3">
            <h4 className="text-xs font-black text-[#FFC217]">بيانات التكليف الميداني:</h4>

            <div>
              <label className="block text-xs font-black text-amber-200 mb-1.5">
                اختر المنفذ الميداني التابع للإدارة *
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                className="w-full h-11 px-3 bg-[#2A1C16] border border-[#D49A3D]/40 rounded-xl text-xs font-bold text-white focus:outline-none"
                required
              >
                {fieldAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.full_name} ({agent.department_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-amber-200 mb-1.5">
                التوجيه والتعليمات الإدارية الصريحة للمنفذ *
              </label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="اكتب التوجيه الفوري المطلوب من المنفذ تنفيذه ميدانياً..."
                className="w-full p-3 bg-black/40 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-bold"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-[#FFC217] hover:brightness-110 text-[#1B1111] font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? "جار إرسال التكليف..." : "اعتماد التنقية وتكليف المنفذ"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
