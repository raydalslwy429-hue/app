"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, Wifi, WifiOff, X } from "lucide-react";

export interface AppNotification {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
}

export default function NotificationBanner() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      addNotification({
        id: `net_${Date.now()}`,
        type: "success",
        title: "تم استعادة الاتصال بالإنترنت 🌐",
        message: "أنت متصل بالشبكة الآن. سيتم ترحيل المعاملات المحفوظة تلقائياً.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      addNotification({
        id: `net_${Date.now()}`,
        type: "warning",
        title: "انقطع الاتصال بالإنترنت (وضع أوفلاين) 📡",
        message: "يمكنك متابعة العمل وتسجيل البلاغات والردود، وسيتم حفظها في قائمة (جاهز للإرسال).",
      });
    };

    const handleCustomNotice = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        addNotification({
          id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: customEvent.detail.type || "info",
          title: customEvent.detail.title || "تنبيه جديد",
          message: customEvent.detail.message || "",
        });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("marasim_notification", handleCustomNotice);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("marasim_notification", handleCustomNotice);
    };
  }, []);

  const addNotification = (item: AppNotification) => {
    setNotifications((prev) => [...prev, item]);
    // Auto dismiss after 6 seconds
    setTimeout(() => {
      removeNotification(item.id);
    }, 6000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 flex flex-col gap-2.5 pointer-events-none">
      {notifications.map((n) => {
        const borderColors = {
          success: "border-emerald-500/80 bg-[#16291E] text-emerald-100",
          warning: "border-amber-500/80 bg-[#2B2012] text-amber-100",
          error: "border-rose-500/80 bg-[#2D1416] text-rose-100",
          info: "border-blue-500/80 bg-[#14202E] text-blue-100",
        };

        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
          warning: <WifiOff className="w-5 h-5 text-amber-400 flex-shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />,
          info: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />,
        };

        return (
          <div
            key={n.id}
            className={`pointer-events-auto border-2 rounded-2xl p-3.5 shadow-2xl shadow-black/40 backdrop-blur-md transition-all duration-300 transform translate-y-0 flex items-start gap-3 ${borderColors[n.type]}`}
          >
            {icons[n.type]}
            <div className="flex-1 text-right">
              <h4 className="text-xs font-black tracking-tight">{n.title}</h4>
              <p className="text-[11px] font-semibold opacity-90 mt-0.5 leading-relaxed">{n.message}</p>
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-white/60 hover:text-white p-1 rounded-lg transition-colors flex-shrink-0"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
