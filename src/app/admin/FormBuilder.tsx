"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Layers,
  Sparkles,
  HelpCircle,
  Eye,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Camera,
  MapPin,
  Calendar,
  List,
  Type,
  Hash,
  Save,
  Sliders,
} from "lucide-react";
import { FormQuestion, FieldType } from "@/types/dynamic-forms";
import { createDynamicTemplateAction } from "@/app/actions/dynamic-forms";

const FIELD_TYPES: Array<{ type: FieldType; label: string; icon: any }> = [
  { type: "text", label: "نص قصير (Text)", icon: Type },
  { type: "textarea", label: "نص مفصل (Textarea)", icon: List },
  { type: "number", label: "رقمي / مقياس (Number)", icon: Hash },
  { type: "select", label: "قائمة منسدلة (Select)", icon: List },
  { type: "radio", label: "اختيار أحادي (Radio)", icon: CheckCircle2 },
  { type: "checkbox", label: "اختيارات متعددة (Checkbox)", icon: CheckCircle2 },
  { type: "image", label: "صورة / كاميرا (Photo)", icon: Camera },
  { type: "gps", label: "موقع جغرافي (GPS)", icon: MapPin },
  { type: "date", label: "تاريخ (Date)", icon: Calendar },
  { type: "time", label: "وقت (Time)", icon: Calendar },
];

export default function FormBuilder({
  onFormCreated,
  departments = [],
  roles = [],
  users = [],
}: {
  onFormCreated?: (templateId: number) => void;
  departments?: any[];
  roles?: any[];
  users?: any[];
}) {
  const [formTitle, setFormTitle] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [allowedRoles, setAllowedRoles] = useState("all");
  const [allowedUsersAll, setAllowedUsersAll] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [stepsCount, setStepsCount] = useState(3);
  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder");

  const [questions, setQuestions] = useState<FormQuestion[]>([
    {
      id: 1,
      template_id: 0,
      question_code: "q_1",
      question_text: "الموقع أو القسم الخاضع للفحص",
      field_type: "select",
      is_required: true,
      options: ["قسم اللحوم", "قسم المشويات", "قسم الخضار", "المطبخ المركزي"],
      step_number: 1,
      order_index: 1,
      help_text: "حدد القسم بدقة",
    },
    {
      id: 2,
      template_id: 0,
      question_code: "q_2",
      question_text: "هل توجد مخالفة في النظافة والتعقيم؟",
      field_type: "radio",
      is_required: true,
      options: ["مطابق", "غير مطابق - توجد مخالفة"],
      step_number: 2,
      order_index: 2,
    },
    {
      id: 3,
      template_id: 0,
      question_code: "q_3",
      question_text: "صورة توثيقية للمخالفة من الكاميرا",
      field_type: "image",
      is_required: false,
      conditional_logic: {
        dependsOnCode: "q_2",
        equals: "غير مطابق - توجد مخالفة",
      },
      step_number: 2,
      order_index: 3,
      help_text: "التقط صورة واضحة لحالة عدم المطابقة",
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const addQuestion = (stepNum: number) => {
    const newId = Date.now();
    const newCode = `q_${newId}`;
    const newQ: FormQuestion = {
      id: newId,
      template_id: 0,
      question_code: newCode,
      question_text: "سؤال جديد",
      field_type: "text",
      is_required: false,
      step_number: stepNum,
      order_index: questions.length + 1,
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: number, patch: Partial<FormQuestion>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === questions.length - 1)
    )
      return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const newArr = [...questions];
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    setQuestions(newArr);
  };

  const handleSaveForm = async () => {
    if (!formTitle.trim()) {
      setMessage({ type: "error", text: "يرجى كتابة عنوان للاستمارة" });
      return;
    }

    const codeToUse = formCode.trim() || `form_${Date.now()}`;

    setSaving(true);
    setMessage(null);

    try {
      const res = await createDynamicTemplateAction({
        code: codeToUse,
        title: formTitle,
        description: formDesc,
        allowed_roles: allowedRoles,
        allowed_users_json: allowedUsersAll || selectedUserIds.length === 0 ? "all" : JSON.stringify(selectedUserIds),
        questions: questions.map((q, idx) => ({
          question_code: q.question_code || `q_${idx + 1}`,
          question_text: q.question_text,
          field_type: q.field_type,
          is_required: Boolean(q.is_required),
          options: q.options,
          conditional_logic: q.conditional_logic,
          step_number: q.step_number || 1,
          order_index: idx + 1,
          help_text: q.help_text,
        })),
      });

      if (res.success && res.templateId) {
        setMessage({
          type: "success",
          text: `🎉 تم حفظ وتفعيل الاستمارة الديناميكية (${formTitle}) بنجاح!`,
        });
        if (onFormCreated) onFormCreated(res.templateId);
      } else {
        setMessage({ type: "error", text: res.error || "فشل حفظ الاستمارة" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "حدث خطأ غير متوقع" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-[#1B1111]">منشئ الاستمارات الذكية الديناميكي</h3>
            <span className="text-[10px] font-black bg-[#682722] text-amber-100 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              محرك النماذج المتطورة
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            صمم استمارات التفتيش والرصد الميداني متعدّدة المراحل مع المنطق الشرطي وتحديد الأدوار والمستخدمين المصرح لهم.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("builder")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "builder"
                ? "bg-[#1B1111] text-[#FFC217]"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            محرر الحقول
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === "preview"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>معاينة حية</span>
          </button>

          <button
            type="button"
            onClick={handleSaveForm}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-[#FFC217] hover:brightness-105 text-[#1B1111] font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "جار الحفظ..." : "حفظ ونشر الاستمارة"}</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-black border animate-fadeIn ${
            message.type === "success"
              ? "bg-[#16291E] text-emerald-100 border-emerald-500/40"
              : "bg-[#2D1416] text-rose-100 border-rose-500/40"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      {/* Basic Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div>
          <label className="block text-xs font-black text-slate-800 mb-1.5">عنوان الاستمارة *</label>
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="مثال: فحص النظافة وسلامة الغذاء اليومي..."
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-800 mb-1.5">كود المعرف (slug)</label>
          <input
            type="text"
            value={formCode}
            onChange={(e) => setFormCode(e.target.value)}
            placeholder="مثال: daily_hygiene_audit"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-800 mb-1.5">الأدوار المسموح لها بالتعبئة</label>
          <select
            value={allowedRoles}
            onChange={(e) => setAllowedRoles(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
          >
            <option value="all">كافة الأدوار (مفتشين ومنفذين وإداريين)</option>
            <option value="inspector">مفتشي الجودة فقط</option>
            <option value="field_agent">المنفذين الميدانيين فقط</option>
            <option value="admin">مديري الإدارات والإشراف فقط</option>
            {roles && roles.length > 0 && (
              <optgroup label="الأدوار الوظيفية المخصصة المنشأة">
                {roles.filter((r: any) => r.status !== "disabled").map((r: any) => (
                  <option key={r.code} value={r.code}>
                    🛡️ {r.name} ({r.category === "inspector" ? "مفتش" : r.category === "admin" ? "إداري" : "ميداني"})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="sm:col-span-3 space-y-2 p-3 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-800">تحديد المستخدمين المصرح لهم (حصر الوصول):</label>
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-[#682722]">
              <input
                type="checkbox"
                checked={allowedUsersAll}
                onChange={(e) => {
                  setAllowedUsersAll(e.target.checked);
                  if (e.target.checked) setSelectedUserIds([]);
                }}
              />
              <span>متاح لكافة موظفي الدور المحدد (الافتراضي)</span>
            </label>
          </div>

          {!allowedUsersAll && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 max-h-36 overflow-y-auto">
              {users.map((u: any) => {
                const isChecked = selectedUserIds.includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 p-2 rounded-xl">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds([...selectedUserIds, u.id]);
                        } else {
                          setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                        }
                      }}
                    />
                    <div className="truncate">
                      <span className="font-bold block truncate">{u.full_name}</span>
                      <span className="text-[10px] text-slate-400 block">{u.department_name}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="sm:col-span-3">
          <label className="block text-xs font-black text-slate-800 mb-1.5">وصف الاستمارة والهدف منها</label>
          <input
            type="text"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="النموذج القياسي المعتمد لمراقبة وتوثيق معايير الجودة..."
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
          />
        </div>
      </div>

      {/* Step Tabs Navigation */}
      {activeTab === "builder" ? (
        <div className="space-y-6">
          {Array.from({ length: stepsCount }).map((_, stepIdx) => {
            const stepNum = stepIdx + 1;
            const stepQuestions = questions.filter((q) => q.step_number === stepNum);

            return (
              <div
                key={stepNum}
                className="border-2 border-slate-200/80 rounded-3xl p-5 bg-white space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-[#1B1111] text-[#FFC217] flex items-center justify-center font-black text-xs">
                      {stepNum}
                    </span>
                    <h4 className="text-sm font-black text-slate-900">
                      المرحلة / الخطوة {stepNum} ({stepQuestions.length} أسئلة)
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => addQuestion(stepNum)}
                    className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة سؤال لهذه الخطوة</span>
                  </button>
                </div>

                {stepQuestions.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    لا توجد أسئلة في هذه المرحلة بعد. انقر على &quot;إضافة سؤال&quot; للبدء.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stepQuestions.map((q, idx) => {
                      const globalIdx = questions.findIndex((x) => x.id === q.id);

                      return (
                        <div
                          key={q.id}
                          className="p-4 rounded-2xl border border-slate-200 hover:border-amber-400/80 bg-slate-50/50 transition-all space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                              <span className="text-xs font-mono font-bold text-slate-400">
                                #{idx + 1}
                              </span>
                              <input
                                type="text"
                                value={q.question_text}
                                onChange={(e) =>
                                  updateQuestion(q.id, { question_text: e.target.value })
                                }
                                placeholder="نص السؤال..."
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Field Type Selector */}
                              <select
                                value={q.field_type}
                                onChange={(e) =>
                                  updateQuestion(q.id, { field_type: e.target.value as any })
                                }
                                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                              >
                                {FIELD_TYPES.map((ft) => (
                                  <option key={ft.type} value={ft.type}>
                                    {ft.label}
                                  </option>
                                ))}
                              </select>

                              {/* Required Toggle */}
                              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer bg-white px-2 py-1.5 rounded-xl border border-slate-200">
                                <input
                                  type="checkbox"
                                  checked={Boolean(q.is_required)}
                                  onChange={(e) =>
                                    updateQuestion(q.id, { is_required: e.target.checked })
                                  }
                                  className="accent-amber-500"
                                />
                                <span>إلزامي</span>
                              </label>

                              {/* Move buttons */}
                              <button
                                type="button"
                                onClick={() => moveQuestion(globalIdx, "up")}
                                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveQuestion(globalIdx, "down")}
                                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => removeQuestion(q.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Options editor if select/radio/checkbox */}
                          {["select", "radio", "checkbox"].includes(q.field_type) && (
                            <div className="pt-2 border-t border-slate-200/60">
                              <label className="block text-[11px] font-black text-slate-700 mb-1">
                                خيارات الإجابة (مفصولة بفواصل):
                              </label>
                              <input
                                type="text"
                                value={q.options ? q.options.join(", ") : ""}
                                onChange={(e) => {
                                  const opts = e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean);
                                  updateQuestion(q.id, { options: opts });
                                }}
                                placeholder="مطابق, غير مطابق, لا ينطبق..."
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                              />
                            </div>
                          )}

                          {/* Conditional Logic Builder */}
                          <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-[11px] font-black text-amber-800 flex items-center gap-1">
                              <Sliders className="w-3 h-3" />
                              <span>المنطق الشرطي:</span>
                            </span>

                            <label className="flex items-center gap-1 text-[11px] text-slate-600">
                              <span>أظهر هذا الحقل فقط إذا كان</span>
                              <select
                                value={q.conditional_logic?.dependsOnCode || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val) {
                                    updateQuestion(q.id, { conditional_logic: null });
                                  } else {
                                    updateQuestion(q.id, {
                                      conditional_logic: {
                                        dependsOnCode: val,
                                        equals: q.conditional_logic?.equals || "",
                                      },
                                    });
                                  }
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                              >
                                <option value="">-- بدون شرط (يظهر دائماً) --</option>
                                {questions
                                  .filter((other) => other.id !== q.id)
                                  .map((other) => (
                                    <option
                                      key={other.id}
                                      value={other.question_code || `q_${other.id}`}
                                    >
                                      {other.question_text}
                                    </option>
                                  ))}
                              </select>
                            </label>

                            {q.conditional_logic?.dependsOnCode && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span>يساوي</span>
                                <input
                                  type="text"
                                  value={q.conditional_logic.equals || ""}
                                  onChange={(e) => {
                                    updateQuestion(q.id, {
                                      conditional_logic: {
                                        ...q.conditional_logic,
                                        equals: e.target.value,
                                      },
                                    });
                                  }}
                                  placeholder="القيمة المشروطة (مثال: غير مطابق)..."
                                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setStepsCount(stepsCount + 1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة خطوة جديدة (الخطوة {stepsCount + 1})</span>
            </button>
          </div>
        </div>
      ) : (
        /* Live Preview Mode */
        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h4 className="text-base font-black text-[#1B1111]">{formTitle || "معاينة الاستمارة"}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{formDesc}</p>
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-black text-slate-900">
                  {i + 1}. {q.question_text}{" "}
                  {q.is_required && <span className="text-rose-600">*</span>}
                </label>
                {q.help_text && <p className="text-[11px] text-slate-400">{q.help_text}</p>}

                {q.field_type === "textarea" ? (
                  <textarea
                    rows={2}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    placeholder="نص مفصل..."
                    disabled
                  />
                ) : q.field_type === "select" ? (
                  <select
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    disabled
                  >
                    <option>-- اختر --</option>
                    {q.options?.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                ) : q.field_type === "radio" ? (
                  <div className="flex gap-4">
                    {q.options?.map((opt) => (
                      <label key={opt} className="flex items-center gap-1 text-xs text-slate-700">
                        <input type="radio" disabled />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : q.field_type === "image" ? (
                  <div className="border border-dashed border-slate-300 p-4 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Camera className="w-5 h-5 text-slate-400" />
                    <span>حقل الكاميرا والتقاط الصور</span>
                  </div>
                ) : q.field_type === "gps" ? (
                  <div className="border border-slate-200 p-3 rounded-xl text-xs text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span>إحداثيات الموقع (GPS Coordinates)</span>
                    </span>
                    <button className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold" disabled>
                      التقاط الموقع
                    </button>
                  </div>
                ) : (
                  <input
                    type={q.field_type === "number" ? "number" : "text"}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    placeholder="إدخال..."
                    disabled
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
