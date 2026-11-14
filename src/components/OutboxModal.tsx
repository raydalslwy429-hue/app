"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Wrench,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import {
  getOfflineQueue,
  subscribeToQueue,
  removeFromOfflineQueue,
  syncAllOfflineQueue,
  processSingleQueueItem,
  OfflineQueueItem,
} from "@/lib/offline-client";

interface OutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OutboxModal({ isOpen, onClose }: OutboxModalProps) {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setQueue(getOfflineQueue());
    setIsOnline(navigator.onLine);

    const unsubscribe = subscribeToQueue((newQueue) => {
      setQueue([...newQueue]);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOpen) return null;

  const handleSyncAll = async () => {
    if (!isOnline) {
      alert("الجهاز غير متصل بالإنترنت حالياً. يرجى الاتصال بالشبكة لترحيل البيانات.");
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: queue.length });

    try {
      const res = await syncAllOfflineQueue((curr, tot) => {
        setSyncProgress({ current: curr, total: tot });
      });

      if (res.successCount > 0) {
        window.dispatchEvent(
          new CustomEvent("marasim_notification", {
            detail: {
              type: "success",
              title: "تم ترحيل المعاملات",
              message: `تم إرسال (${res.successCount}) معاملة بنجاح إلى قاعدة البيانات.`,
            },
          })
        );
      }
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleSyncItem = async (item: OfflineQueueItem) => {
    if (!isOnline) {
      alert("الجهاز غير متصل بالإنترنت حالياً.");
      return;
    }

    const res = await processSingleQueueItem(item);
    if (res.success) {
      removeFromOfflineQueue(item.id);
    } else {
      alert(`فشل الإرسال: ${res.error || "خطأ غير معروف"}`);
    }
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذه المعاملة من قائمة الانتظار؟")) {
      removeFromOfflineQueue(id);
    }
  };

  const getIconForType = (type: OfflineQueueItem["type"]) => {
    switch (type) {
      case "INSPECTION":
        return <FileText className="w-5 h-5 text-amber-400" />;
      case "EXECUTION":
        return <Wrench className="w-5 h-5 text-blue-400" />;
      case "DECISION_APPROVE":
      case "DECISION_CLOSE":
      case "DECISION_REASSIGN":
        return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case "CHANGE_PIN":
        return <KeyRound className="w-5 h-5 text-purple-400" />;
      default:
        return <Send className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1E1412] text-white w-full max-w-lg rounded-3xl border-2 border-[#D49A3D]/40 shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D49A3D]/20 mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#D49A3D] text-[#1B1111] rounded-2xl shadow-md">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">قائمة جاهز للإرسال (Outbox)</h3>
                <span className="text-xs bg-[#682722] text-amber-100 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  {queue.length}
                </span>
              </div>
              <p className="text-[11px] text-[#D49A3D] font-bold">المعاملات المحفوظة محلياً بانتظار الترحيل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network status pill */}
        <div className="mb-4 flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-[#D49A3D]/20 text-xs">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-emerald-300">متصل بالإنترنت (الترحيل التلقائي نشط)</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="font-bold text-rose-300">غير متصل بالإنترنت (وضع أوفلاين)</span>
              </>
            )}
          </div>
          {queue.length > 0 && isOnline && (
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-gradient-to-r from-[#D49A3D] to-[#FFC217] hover:brightness-110 text-[#1B1111] font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "جار الترحيل..." : "إرسال الكل الآن"}</span>
            </button>
          )}
        </div>

        {/* Sync Progress Bar */}
        {syncProgress && (
          <div className="mb-4 bg-black/40 p-2.5 rounded-xl border border-amber-500/30">
            <div className="flex justify-between text-[11px] font-bold text-amber-200 mb-1">
              <span>جار إرسال المعاملات...</span>
              <span>
                {syncProgress.current} من {syncProgress.total}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-[#FFC217] h-full transition-all duration-300"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Queue Items List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-right">
          {queue.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mx-auto" />
              <p className="text-xs font-bold text-slate-300">صندوق الإرسال فارغ تماماً</p>
              <p className="text-[11px] text-slate-500">تم ترحيل كافة الاستمارات والمعاملات بنجاح إلى الخادم.</p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-black/30 border border-[#D49A3D]/25 rounded-2xl flex items-center justify-between gap-3 hover:border-[#D49A3D]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-xl border border-white/10">{getIconForType(item.type)}</div>
                  <div>
                    <h4 className="text-xs font-black text-white">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-amber-200/70 font-semibold">
                      <Clock className="w-3 h-3 text-[#FFC217]" />
                      <span>{item.timestamp}</span>
                      {item.status === "failed" && (
                        <span className="text-rose-400 font-black">• فشل الإرسال (انقر لإعادة المحاولة)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSyncItem(item)}
                    disabled={isSyncing || !isOnline}
                    className="p-2 text-amber-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-40"
                    title="إرسال الآن"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="حذف من القائمة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-[#D49A3D]/20 mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>نظام التخزين والمزامنة الذاتية أوفلاين (المراسيم)</span>
          <button onClick={onClose} className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
