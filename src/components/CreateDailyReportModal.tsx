"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  MapPin,
  User,
  Tag,
  Clock,
  Sparkles,
  Inbox,
} from "lucide-react";
import { createDailyReportAction, getActiveLocationsAction } from "@/app/actions/daily_reports";

interface CreateDailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: number;
    full_name: string;
    role: string;
    department_name: string;
    department_code?: string;
  };
  locations?: Array<{ code: string; name: string }>;
  onSuccess?: () => void;
}

export default function CreateDailyReportModal({
  isOpen,
  onClose,
  currentUser,
  locations: initialLocations,
  onSuccess,
}: CreateDailyReportModalProps) {
  const [locations, setLocations] = useState<Array<{ code: string; name: string }>>(
    initialLocations || []
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [reporterName, setReporterName] = useState(currentUser.full_name);
  const [recipientTo, setRecipientTo] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch locations if not provided
  useEffect(() => {
    if (isOpen && locations.length === 0) {
      getActiveLocationsAction().then((locs) => {
        if (locs && locs.length > 0) {
          setLocations(locs);
        }
      });
    }
  }, [isOpen, locations.length]);

  // Sync reporter name when user changes
  useEffect(() => {
    if (currentUser?.full_name) {
      setReporterName(currentUser.full_name);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const quickRecipients = [
    "الإدارة العامة والحوكمة",
    "مدير عام المنظومة",
    "إدارة العمليات والتشغيل",
    "إدارة الجودة وسلامة الغذاء",
    "إدارة الموارد البشرية",
    "إدارة الصيانة والخدمات المساندة",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reporterName.trim()) {
      setErrorMsg("يرجى إدخال اسم مقدم التقرير");
      return;
    }
    if (!selectedLocation) {
      setErrorMsg("يرجى اختيار الموقع أو القسم");
      return;
    }
    if (!recipientTo.trim()) {
      setErrorMsg("يرجى تحديد الجهة أو الشخص الموجه له التقرير في حقل (إلى)");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("يرجى كتابة عنوان التقرير أو موضوعه");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("يرجى كتابة وصف ومحتوى التقرير");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("reporter_name", reporterName.trim());
    formData.append("location_code", selectedLocation);

    const locObj = locations.find((l) => l.code === selectedLocation);
    formData.append("location_name", locObj ? locObj.name : selectedLocation);

    formData.append("recipient_to", recipientTo.trim());
    formData.append("title", title.trim());
    formData.append("description", description.trim());

    try {
      const res = await createDailyReportAction(formData);
      if (res.success) {
        setSuccessMsg(res.message || "تم حفظ وإرسال التقرير اليومي بنجاح!");
        setTitle("");
        setDescription("");
        setRecipientTo("");
        setSelectedLocation("");
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
        }, 2200);
      } else {
        setErrorMsg(res.error || "فشل إرسال التقرير اليومي");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع أثناء إرسال التقرير");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#FAF7F4] text-slate-800 w-full max-w-2xl rounded-[2.5rem] border-2 border-[#D49A3D]/40 shadow-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#D49A3D]/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-[#1B1111] via-[#2A1C16] to-[#1B1111] text-[#FFC217] rounded-2xl shadow-md border border-[#D49A3D]/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#1B1111]">
                  إنشاء وتقديم تقرير يومي جديد
                </h3>
                <span className="text-[10px] bg-[#682722] text-amber-100 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  سجل التقارير
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                توثيق سير العمليات، الإنجازات اليومية، والملاحظات الميدانية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-600 text-white rounded-2xl text-xs font-black flex items-center gap-2.5 animate-in fade-in shadow-md">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3.5 bg-[#682722] text-white rounded-2xl text-xs font-black flex items-center gap-2.5 animate-in fade-in shadow-md">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-300" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 relative z-10 text-xs">
          {/* Row 1: Reporter Name & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-black text-[#1B1111] mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#D49A3D]" />
                <span>اسم مقدم التقرير <span className="text-[#682722]">*</span>:</span>
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="اسم الموظف أو المسؤول..."
                className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D49A3D]/40"
              />
              <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                الإدارة: {currentUser.department_name}
              </span>
            </div>

            {/* Location Selector */}
            <div>
              <label className="block text-xs font-black text-[#1B1111] mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#682722]" />
                <span>الموقع / القسم التشغيلي <span className="text-[#682722]">*</span>:</span>
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D49A3D]/40"
              >
                <option value="">-- اختر الموقع أو القسم --</option>
                {locations.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: "To" Field (Recipient Entity / Person) */}
          <div>
            <label className="block text-xs font-black text-[#1B1111] mb-1.5 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-blue-600 rotate-180" />
              <span>إلى (الجهة أو الشخص الموجه له التقرير) <span className="text-[#682722]">*</span>:</span>
            </label>
            <input
              type="text"
              value={recipientTo}
              onChange={(e) => setRecipientTo(e.target.value)}
              placeholder="اكتب اسم الإدارة أو المدير الموجه له التقرير..."
              className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D49A3D]/40"
            />
            
            {/* Quick Suggestions Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-slate-400">مقترحات سريعة:</span>
              {quickRecipients.map((rec, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRecipientTo(rec)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-950 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border border-slate-200"
                >
                  {rec}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Report Subject / Title */}
          <div>
            <label className="block text-xs font-black text-[#1B1111] mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#D49A3D]" />
              <span>عنوان التقرير أو الموضوع <span className="text-[#682722]">*</span>:</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تقرير سير العمليات الصباحية، تقرير جرد السلامة اليومي..."
              className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D49A3D]/40"
            />
          </div>

          {/* Row 4: Description / Content */}
          <div>
            <label className="block text-xs font-black text-[#1B1111] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>وصف ومحتوى التقرير اليومي <span className="text-[#682722]">*</span>:</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب هنا تفاصيل التقرير، ما تم إنجازه، الإجراءات المتبعة، الملاحظات الميدانية، وأي متطلبات أو معوقات..."
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D49A3D]/40 resize-none leading-relaxed"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-black text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              إلغاء وتراجع
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-[#D49A3D] via-[#E5A93C] to-[#B87B28] hover:brightness-105 text-[#1B1111] font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#1B1111]" />
              ) : (
                <Send className="w-4 h-4 text-[#1B1111] rotate-180" />
              )}
              <span>إرسال واعتماد التقرير اليومي 🚀</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
