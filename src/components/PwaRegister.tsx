"use client";

import { useEffect, useState } from "react";
import { Bell, Check, X } from "lucide-react";

export function triggerSystemNotification(title: string, body: string, url: string = "/") {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_SYSTEM_NOTIFICATION",
        title,
        body,
        data: { url },
      });
    } else {
      try {
        new Notification(title, {
          body,
          icon: "/brand/logo.png",
          dir: "rtl",
          lang: "ar",
        });
      } catch (e) {
        console.warn("Direct Notification constructor failed:", e);
      }
    }
  }
}

export default function PwaRegister() {
  const [permissionState, setPermissionState] = useState<string>("default");
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Al-Marasim PWA ServiceWorker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("ServiceWorker registration failed:", err);
        });
    }

    // 2. Check Notification Permission
    if ("Notification" in window) {
      setPermissionState(Notification.permission);
      if (Notification.permission === "default") {
        // Show polite prompt after 3 seconds of user interaction
        const timer = setTimeout(() => setShowPrompt(true), 3500);
        return () => clearTimeout(timer);
      }
    }

    // 3. Listen to in-app notifications and elevate to OS System Notifications
    const handleInAppNotice = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && Notification.permission === "granted") {
        triggerSystemNotification(
          customEvent.detail.title || "تنبيه جديد - مطعم المراسيم",
          customEvent.detail.message || "",
          customEvent.detail.url || "/"
        );
      }
    };

    window.addEventListener("marasim_notification", handleInAppNotice);
    return () => {
      window.removeEventListener("marasim_notification", handleInAppNotice);
    };
  }, []);

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      setShowPrompt(false);
      if (permission === "granted") {
        triggerSystemNotification(
          "تم تفعيل إشعارات المنظومة بنجاح 🔔",
          "ستصلك التنبيهات الميدانية وبلاغات الجودة فوراً فوق جميع التطبيقات.",
          "/"
        );
      }
    } catch (e) {
      console.warn("Permission request failed:", e);
      setShowPrompt(false);
    }
  };

  if (!showPrompt || permissionState !== "default") return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-fadeIn pointer-events-auto">
      <div className="bg-[#1C1210] border-2 border-[#D49A3D] text-white p-4 rounded-3xl shadow-2xl shadow-black/60 flex flex-col gap-3 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#D49A3D] text-[#1B1111] rounded-2xl flex-shrink-0 shadow-md">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-black text-white">تفعيل إشعارات النظام فوق التطبيقات</h4>
            <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
              احصل على تنبيهات فورية عند وصول تكليف ميداني جديد أو اعتماد تقرير، حتى والتطبيق مغلق.
            </p>
          </div>
          <button
            onClick={() => setShowPrompt(false)}
            className="text-white/40 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={() => setShowPrompt(false)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-bold"
          >
            لاحقاً
          </button>
          <button
            onClick={handleRequestPermission}
            className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-[#FFC217] hover:brightness-110 text-[#1B1111] font-black rounded-xl text-xs shadow-md flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>تفعيل الإشعارات الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
}
