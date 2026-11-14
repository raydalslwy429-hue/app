"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FormTemplate,
  FormQuestion,
  FieldType,
} from "@/types/dynamic-forms";
import {
  ChevronRight,
  ChevronLeft,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Loader2,
  Trash2,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  saveFormDraft,
  getFormDraft,
  clearFormDraft,
  compressImageFile,
  getCurrentGPS,
  addToOfflineQueue,
} from "@/lib/offline-client";
import { submitFormResponseAction } from "@/app/actions/dynamic-forms";
import { useRouter } from "next/navigation";

interface DynamicFormRendererProps {
  template: FormTemplate;
  locations: Array<{ code: string; name: string }>;
  onSuccess?: (responseNumber: number) => void;
}

export default function DynamicFormRenderer({
  template,
  locations,
  onSuccess,
}: DynamicFormRendererProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [locationCode, setLocationCode] = useState(locations[0]?.code || "");
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [mediaData, setMediaData] = useState<Record<number, string>>({});
  const [gpsData, setGpsData] = useState<Record<number, { lat: number; lng: number }>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // Group questions by step
  const questions = template.questions || [];
  const maxStep = Math.max(1, ...questions.map((q) => q.step_number || 1));
  const currentStepQuestions = questions.filter((q) => (q.step_number || 1) === currentStep);

  // 1. Restore draft on mount from IndexedDB
  useEffect(() => {
    async function loadDraft() {
      const draft = await getFormDraft(template.id);
      if (draft && draft.answers && Object.keys(draft.answers).length > 0) {
        setAnswers(draft.answers);
        if (draft.location_code) setLocationCode(draft.location_code);
        if (draft.current_step && draft.current_step <= maxStep) {
          setCurrentStep(draft.current_step);
        }
        setDraftRestored(true);
        setTimeout(() => setDraftRestored(false), 4000);
      }
    }
    loadDraft();
  }, [template.id, maxStep]);

  // 2. Auto-save draft to IndexedDB when answers change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      saveFormDraft(template.id, answers, currentStep, locationCode);
    }
  }, [answers, currentStep, locationCode, template.id]);

  // 3. Conditional Logic Evaluator
  const isQuestionVisible = (q: FormQuestion): boolean => {
    if (!q.conditional_logic) return true;
    const { dependsOnCode, dependsOnId, equals, operator, value } = q.conditional_logic;

    // Find parent question
    const parentQ = questions.find(
      (item) => item.question_code === dependsOnCode || item.id === dependsOnId
    );
    if (!parentQ) return true;

    const parentAnswer = answers[parentQ.id];
    if (parentAnswer === undefined || parentAnswer === null || parentAnswer === "") {
      return false;
    }

    if (equals !== undefined) {
      return String(parentAnswer).trim() === String(equals).trim();
    }

    if (operator === "greater_than" && value !== undefined) {
      return Number(parentAnswer) > Number(value);
    }
    if (operator === "less_than" && value !== undefined) {
      return Number(parentAnswer) < Number(value);
    }
    if (operator === "contains" && value !== undefined) {
      return String(parentAnswer).includes(String(value));
    }
    if (operator === "is_not_empty") {
      return Boolean(parentAnswer);
    }

    return true;
  };

  // Handle answer change
  const handleAnswerChange = (qId: number, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: value,
    }));
  };

  // Handle Camera / Image Compression
  const handleImageCapture = async (qId: number, file: File) => {
    try {
      const base64 = await compressImageFile(file);
      setMediaData((prev) => ({ ...prev, [qId]: base64 }));
      handleAnswerChange(qId, "[مرفق صورة توثيقية]");
    } catch (e) {
      alert("تعذر ضغط أو معالجة الصورة الملتقطة");
    }
  };

  // Handle GPS Capture
  const handleCaptureGPS = async (qId: number) => {
    const coords = await getCurrentGPS();
    if (coords) {
      setGpsData((prev) => ({ ...prev, [qId]: coords }));
      handleAnswerChange(qId, `${coords.lat}, ${coords.lng}`);
    } else {
      alert("تعذر التقاط الموقع الجغرافي. تأكد من تفعيل خدمة الموقع (GPS) في جهازك.");
    }
  };

  // Step Validation
  const validateCurrentStep = (): boolean => {
    setErrorMsg(null);
    for (const q of currentStepQuestions) {
      if (q.is_required && isQuestionVisible(q)) {
        const val = answers[q.id];
        if (val === undefined || val === null || String(val).trim() === "") {
          setErrorMsg(`يرجى الإجابة على السؤال الإلزامي: "${q.question_text}"`);
          return false;
        }
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(maxStep, prev + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Submission (Offline first via Outbox Queue)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Prepare payload
    const formattedAnswers = questions
      .filter((q) => isQuestionVisible(q))
      .map((q) => ({
        question_id: q.id,
        answer_value: String(answers[q.id] || ""),
        media_data: mediaData[q.id] || undefined,
        gps_lat: gpsData[q.id]?.lat || undefined,
        gps_lng: gpsData[q.id]?.lng || undefined,
      }));

    const payload = {
      template_id: template.id,
      location_code: locationCode,
      answers: formattedAnswers,
    };

    // Attempt submit (works locally on local.db or cloud)
    try {
      const res = await submitFormResponseAction(payload);
      if (res.success) {
        await clearFormDraft(template.id);
        setSuccessMsg(`🎉 تم حفظ وترحيل الاستمارة بنجاح برقم (#${res.responseNumber})!`);
        setAnswers({});
        setMediaData({});
        setGpsData({});
        if (onSuccess && res.responseNumber) onSuccess(res.responseNumber);
      } else {
        const errText = res.error || "";
        if (errText.includes("الاتصال") || errText.includes("سحابية") || errText.includes("network") || errText.includes("fetch")) {
          const locName = locations.find((l) => l.code === locationCode)?.name || locationCode;
          addToOfflineQueue("DYNAMIC_FORM_RESPONSE", `${template.title} - ${locName}`, payload);
          await clearFormDraft(template.id);
          setSuccessMsg("📡 تم حفظ الاستمارة بنجاح في قائمة (جاهز للإرسال). سيتم ترحيلها تلقائياً بمجرد توفر الاتصال بالإنترنت!");
          setAnswers({});
          setMediaData({});
          setGpsData({});
        } else {
          setErrorMsg(errText || "فشل إرسال الاستمارة");
        }
      }
    } catch {
      // Network drop fallback to Outbox
      const locName = locations.find((l) => l.code === locationCode)?.name || locationCode;
      addToOfflineQueue(
        "DYNAMIC_FORM_RESPONSE",
        `${template.title} - ${locName}`,
        payload
      );
      await clearFormDraft(template.id);
      setSuccessMsg(
        "⚠️ تعذر الاتصال بالخادم الآن - تم حفظ الاستمارة تلقائياً في قائمة (جاهز للإرسال) للترحيل التلقائي."
      );
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = Math.round((currentStep / maxStep) * 100);

  return (
    <div className="bg-white rounded-3xl border-2 border-[#D49A3D]/40 p-5 sm:p-7 shadow-sm space-y-6">
      {/* Draft restored notification */}
      {draftRestored && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs rounded-xl flex items-center gap-2 font-bold animate-fadeIn">
          <Sparkles className="w-4 h-4 text-[#D49A3D]" />
          <span>تمت استعادة إجاباتك السابقة تلقائياً من الذاكرة المحلية (IndexedDB).</span>
        </div>
      )}

      {/* Progress Bar & Wizard Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-black">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-[#1B1111] text-[#FFC217] flex items-center justify-center text-xs">
              {currentStep}
            </span>
            <span className="text-slate-800">
              المرحلة {currentStep} من {maxStep}
            </span>
          </div>
          <span className="text-[#D49A3D] font-mono">{progressPercent}% مكتمل</span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-[#FFC217] h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Success / Error Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-black rounded-2xl flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-[#FAF3F3] border border-[#682722]/30 text-[#682722] text-xs font-black rounded-2xl flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1 Location Selector */}
        {currentStep === 1 && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <label className="block text-xs font-black text-slate-800 mb-1.5">
              📍 الموقع / القسم الخاضع للفحص <span className="text-[#682722]">*</span>
            </label>
            <select
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-[#D49A3D]/40 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
              required
            >
              {locations.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Dynamic Questions for this Step */}
        <div className="space-y-4">
          {currentStepQuestions.map((q) => {
            if (!isQuestionVisible(q)) return null;

            return (
              <div
                key={q.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 hover:border-[#D49A3D]/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <label className="block text-xs font-black text-slate-900 leading-relaxed">
                    {q.question_text}{" "}
                    {q.is_required ? <span className="text-rose-600 font-bold">*</span> : null}
                  </label>
                </div>

                {q.help_text && (
                  <p className="text-[11px] text-slate-400 font-semibold">{q.help_text}</p>
                )}

                {/* Field Type Switch */}
                {q.field_type === "textarea" ? (
                  <textarea
                    rows={3}
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="اكتب التوضيح بدقة..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
                  />
                ) : q.field_type === "select" ? (
                  <select
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="">-- اختر --</option>
                    {q.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : q.field_type === "radio" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options?.map((opt) => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAnswerChange(q.id, opt)}
                          className={`p-3 rounded-xl border text-right text-xs font-bold transition-all flex items-center justify-between ${
                            isSelected
                              ? "bg-[#1B1111] text-[#FFC217] border-[#FFC217] shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span>{opt}</span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border ${
                              isSelected
                                ? "bg-[#FFC217] border-[#FFC217]"
                                : "border-slate-300"
                            }`}
                          ></span>
                        </button>
                      );
                    })}
                  </div>
                ) : q.field_type === "image" ? (
                  <div className="space-y-2 pt-1">
                    {mediaData[q.id] ? (
                      <div className="relative inline-block border-2 border-amber-400 rounded-2xl overflow-hidden shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mediaData[q.id]}
                          alt="صورة ملتقطة"
                          className="h-36 w-auto object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setMediaData((prev) => {
                              const copy = { ...prev };
                              delete copy[q.id];
                              return copy;
                            });
                            handleAnswerChange(q.id, "");
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg shadow-md hover:bg-rose-700"
                          title="حذف الصورة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-[#D49A3D]/40 hover:border-amber-500 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all text-center">
                        <Camera className="w-6 h-6 text-[#D49A3D]" />
                        <span className="text-xs font-black text-slate-700">
                          التقاط صورة توثيقية بالكاميرا أو اختيار من المعرض
                        </span>
                        <span className="text-[10px] text-slate-400">
                          يتم ضغط الصورة تلقائياً لحفظها واسترجاعها بدون إنترنت
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageCapture(q.id, file);
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                ) : q.field_type === "gps" ? (
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {answers[q.id] || "لم يتم التقاط الإحداثيات بعد"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCaptureGPS(q.id)}
                      className="px-3 py-1.5 bg-slate-900 text-[#FFC217] rounded-xl text-xs font-bold hover:brightness-110 flex items-center gap-1 shadow-sm"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>التقاط GPS الآن</span>
                    </button>
                  </div>
                ) : q.field_type === "date" ? (
                  <input
                    type="date"
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  />
                ) : q.field_type === "number" ? (
                  <input
                    type="number"
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="أدخل القيمة الرقمية..."
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="اكتب الإجابة..."
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Wizard Navigation Controls */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              <span>الخطوة السابقة</span>
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < maxStep ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 bg-[#1B1111] hover:bg-[#2A1C16] text-[#FFC217] font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
            >
              <span>التالي (المرحلة {currentStep + 1})</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-3 bg-gradient-to-r from-amber-500 to-[#FFC217] hover:brightness-110 text-[#1B1111] font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جار الترحيل...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال الاستمارة والترحيل النهائي</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
