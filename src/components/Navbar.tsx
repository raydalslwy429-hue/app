"use client";

import React, { useState, useEffect } from "react";
import { UserSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/capa";
import {
  LogOut,
  User,
  Sparkles,
  Menu,
  Bell,
  Wifi,
  WifiOff,
  Send,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileText,
} from "lucide-react";
import AppDrawer from "@/components/AppDrawer";
import ChangePinModal from "@/components/ChangePinModal";
import OutboxModal from "@/components/OutboxModal";
import SystemModeToggle from "@/components/SystemModeToggle";
import CreateDailyReportModal from "@/components/CreateDailyReportModal";
import DailyReportsArchiveModal from "@/components/DailyReportsArchiveModal";
import DataSyncHubModal from "@/components/DataSyncHubModal";
import { getOfflineQueue, subscribeToQueue } from "@/lib/offline-client";

export default function Navbar({
  user,
  userPermissions,
}: {
  user: UserSession;
  userPermissions: { can_view: string; features: Record<string, string> };
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showOutbox, setShowOutbox] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [showDailyArchiveModal, setShowDailyArchiveModal] = useState(false);
  const [showDataSyncModal, setShowDataSyncModal] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const hasFeature = (key: string) => ["full", "exclusive", "dept_only"].includes(userPermissions.features[key]);
  const canCreateDailyReport = hasFeature("create_daily_report");

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    const queue = getOfflineQueue();
    setOutboxCount(queue.length);

    const unsubscribe = subscribeToQueue((newQueue) => {
      setOutboxCount(newQueue.length);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleOpenReport = () => setShowDailyReportModal(true);
    const handleOpenArchive = () => setShowDailyArchiveModal(true);
    window.addEventListener("marasim_open_daily_report", handleOpenReport);
    window.addEventListener("marasim_open_daily_archive", handleOpenArchive);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("marasim_open_daily_report", handleOpenReport);
      window.removeEventListener("marasim_open_daily_archive", handleOpenArchive);
    };
  }, []);

  const handleSelectMenu = (menuKey: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("marasim_drawer_navigate", { detail: { key: menuKey } })
      );
    }
  };

  const roleBadges: Record<string, { label: string; color: string }> = {
    super_admin: { label: "مدير عام المنظومة (Super Admin)", color: "bg-purple-500/20 text-purple-200 border-purple-400/40" },
    general_admin: { label: "المدير العام للنظام", color: "bg-amber-500/20 text-amber-200 border-amber-400/40" },
    admin: { label: "الإدارة العامة والحوكمة", color: "bg-blue-500/20 text-blue-200 border-blue-400/40" },
    inspector: { label: "تفتيش ورقابة الجودة", color: "bg-indigo-500/20 text-indigo-200 border-indigo-400/40" },
    field_agent: { label: "تنفيذ ومعالجة ميدانية", color: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40" },
  };

  const badge =
    user.custom_role_name
      ? { label: `🛡️ ${user.custom_role_name}`, color: "bg-purple-500/25 text-purple-200 border-purple-400/50" }
      : roleBadges[user.role] || { label: user.role, color: "bg-slate-500/20 text-slate-300 border-slate-500/30" };

  return (
    <>
      <header className="bg-[#1B1111] text-white border-b border-[#D49A3D]/25 sticky top-0 z-30 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Right Section: Hamburger Menu & Brand */}
          <div className="flex items-center gap-3">
            {/* Hamburger Drawer Toggle Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2.5 rounded-2xl bg-[#2A1C16] hover:bg-[#682722] text-[#FFC217] hover:text-white border border-[#D49A3D]/40 transition-all shadow-md flex items-center justify-center"
              title="القائمة الرئيسية والتنقل"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <div className="bg-white/95 rounded-2xl p-1.5 shadow-md shadow-black/30 border border-[#D49A3D]/40 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo.png"
                alt="شعار مطعم المراسيم"
                className="h-10 w-auto object-contain"
              />
            </div>

            <div className="border-r border-[#D49A3D]/30 pr-4 hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white tracking-tight">
                  مطعم المراسيم <span className="text-[#FFC217] font-serif text-xs font-semibold">almaRasim</span>
                </h1>
                <span className="text-[10px] bg-[#682722] text-amber-100 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  يحبها قلبك
                </span>
              </div>
              <p className="text-xs text-[#D49A3D] font-bold mt-0.5 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`}></span>
                النظام الإداري الموحد (CAPA V2)
              </p>
            </div>
          </div>

          {/* Center Section: Interactive System Runtime Mode Toggle & Create Daily Report */}
          <div className="flex items-center gap-3">
            {hasFeature("manage_sync") && <SystemModeToggle variant="navbar" />}

            {/* Daily Report Button - Governed by user permission */}
            {canCreateDailyReport && (
              <button
                type="button"
                onClick={() => setShowDailyReportModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-[#D49A3D] to-[#9E6E20] hover:brightness-110 text-[#1B1111] font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                title="إنشاء وتقديم تقرير يومي جديد"
              >
                <FileText className="w-3.5 h-3.5 text-[#1B1111]" />
                <span className="hidden sm:inline">إنشاء تقرير يومي</span>
              </button>
            )}
          </div>

          {/* Left Section: Alerts, Outbox, User Info & Logout */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Outbox Badge Shortcut */}
            <button
              hidden={!hasFeature("offline_outbox")}
              onClick={() => setShowOutbox(true)}
              className={`p-2 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 ${
                outboxCount > 0
                  ? "bg-amber-500 text-[#1B1111] border-amber-400 shadow-md animate-bounce"
                  : "bg-[#2A1C16] text-slate-300 border-[#D49A3D]/30 hover:bg-white/10"
              }`}
              title="قائمة الإرسال أوفلاين"
            >
              <Send className="w-4 h-4 rotate-180" />
              {outboxCount > 0 && <span className="font-mono text-xs">{outboxCount}</span>}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-2xl bg-[#2A1C16] hover:bg-[#682722] text-amber-200 hover:text-white border border-[#D49A3D]/30 transition-all relative"
                title="التنبيهات والإشعارات"
              >
                <Bell className="w-4 h-4 text-[#FFC217]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FFC217] animate-ping"></span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FFC217]"></span>
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 text-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-black text-xs text-[#1B1111] flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-[#682722]" />
                      التنبيهات المباشرة
                    </span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="py-3 space-y-2 text-xs">
                    <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-1">
                      <span className="font-black text-[11px] text-[#682722] block">🚀 المنظومة متصلة وجاهزة</span>
                      <p className="text-[10px] text-slate-600">
                        مرحباً بك ({user.full_name}). يمكنك متابعة كافة البلاغات والتكليفات في الوقت الفعلي.
                      </p>
                    </div>
                    {outboxCount > 0 && (
                      <div className="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                        <span className="font-black text-[11px] text-emerald-900 block">📤 مسودات بانتظار الإرسال</span>
                        <p className="text-[10px] text-slate-600">
                          لديك {outboxCount} تقرير محفوظ أوفلاين بانتظار المزامنة عند استقرار الشبكة.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-amber-50">{user.full_name}</span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
              <span className="text-xs font-semibold text-amber-200/70">{user.department_name}</span>
            </div>

            {/* Logout Action */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-black text-amber-200 hover:text-white bg-[#2A1C16] hover:bg-[#682722] border border-[#D49A3D]/30 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5 text-[#FFC217]" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </form>
          </div>

        </div>
      </header>

      {/* App Drawer (Hamburger Menu) */}
      <AppDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        userPermissions={userPermissions}
        onOpenChangePin={() => setShowChangePin(true)}
        onOpenOutbox={() => setShowOutbox(true)}
        onOpenSyncModal={() => setShowDataSyncModal(true)}
        onOpenDailyReport={() => setShowDailyReportModal(true)}
        onOpenDailyArchive={() => setShowDailyArchiveModal(true)}
        onSelectMenu={handleSelectMenu}
        outboxCount={outboxCount}
        isOnline={isOnline}
      />

      {/* Change PIN Modal */}
      <ChangePinModal
        isOpen={showChangePin}
        onClose={() => setShowChangePin(false)}
        currentUserPin={user.pin_code}
      />

      {/* Outbox Offline Modal */}
      <OutboxModal
        isOpen={showOutbox}
        onClose={() => setShowOutbox(false)}
      />

      {/* Create Daily Report Modal */}
      <CreateDailyReportModal
        isOpen={showDailyReportModal}
        onClose={() => setShowDailyReportModal(false)}
        currentUser={{
          id: Number(user.id),
          full_name: user.full_name,
          role: user.role,
          department_name: user.department_name,
          department_code: user.department_code,
        }}
        onSuccess={() => {
          setShowDailyReportModal(false);
          setShowDailyArchiveModal(true);
        }}
      />

      {/* Daily Reports Archive Modal */}
      <DailyReportsArchiveModal
        isOpen={showDailyArchiveModal}
        onClose={() => setShowDailyArchiveModal(false)}
        onOpenCreateNew={() => {
          setShowDailyArchiveModal(false);
          setShowDailyReportModal(true);
        }}
        canCreateReport={canCreateDailyReport}
        canExportReports={hasFeature("export_excel")}
      />

      <DataSyncHubModal isOpen={showDataSyncModal} onClose={() => setShowDataSyncModal(false)} />
    </>
  );
}
