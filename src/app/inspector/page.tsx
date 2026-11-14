import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import { getUserEffectivePermissions } from "@/app/actions/capa";
import InspectorForm from "./InspectorForm";
import { AlertCircle, Clock, CheckCircle2, FileText, MapPin, Tag, Sparkles } from "lucide-react";

const toPlain = <T,>(data: T): T => JSON.parse(JSON.stringify(data));

export default async function InspectorDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userPermissions = await getUserEffectivePermissions(session);
  if (session.role !== "inspector" && session.role !== "admin" && session.role !== "super_admin" && session.role !== "general_admin") {
    redirect("/");
  }

  // Fetch departments
  const deptsRes = await db.execute("SELECT code, name FROM departments WHERE status = 'active' ORDER BY name ASC");
  const departments = deptsRes.rows.map((r) => ({ code: String(r.code), name: String(r.name) }));

  // Fetch locations (sections) with department_code
  const locRes = await db.execute("SELECT code, name, department_code FROM locations WHERE status = 'active' ORDER BY name ASC");
  const locations = locRes.rows.map((r) => ({
    code: String(r.code),
    name: String(r.name),
    department_code: r.department_code ? String(r.department_code) : undefined,
  }));

  // Fetch categories with department_code and section_code
  const catRes = await db.execute("SELECT code, name, severity, department_code, section_code FROM categories WHERE status = 'active' ORDER BY name ASC");
  const categories = catRes.rows.map((r) => ({
    code: String(r.code),
    name: String(r.name),
    severity: String(r.severity || "medium"),
    department_code: r.department_code ? String(r.department_code) : "all",
    section_code: r.section_code ? String(r.section_code) : "all",
  }));

  // Fetch recent cases created by this inspector (or all for admin)
  const isAll = session.role === "admin" || session.role === "super_admin" || session.role === "general_admin";
  const canViewOwnInspections = userPermissions.features.inspect_view_own !== "none";
  const recentCases = canViewOwnInspections
    ? (await db.execute(
        isAll
          ? "SELECT id, case_number, internal_id, location_name, nc_name, description, status, obs_date, obs_time FROM cases_master ORDER BY case_number DESC LIMIT 20"
          : {
              sql: "SELECT id, case_number, internal_id, location_name, nc_name, description, status, obs_date, obs_time FROM cases_master WHERE inspector_pin = ? ORDER BY case_number DESC LIMIT 20",
              args: [session.pin_code],
            }
      )).rows
    : [];

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending_assignment: { label: "بانتظار فرز وتوجيه الإدارة", color: "bg-amber-100 text-amber-900 border-amber-300" },
    assigned: { label: "قيد التنفيذ الميداني", color: "bg-blue-100 text-blue-900 border-blue-300" },
    pending_review: { label: "جاهز لمراجعة الإدارة", color: "bg-[#682722]/10 text-[#682722] border-[#682722]/30" },
    closed: { label: "مغلق ومعتمد بنجاح", color: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4] flex flex-col">
      <Navbar user={session} userPermissions={JSON.parse(JSON.stringify(userPermissions))} />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        
        {/* Page Title with Brand Identity */}
        <div className="mb-8 bg-gradient-to-l from-[#1B1111] via-[#2A1C16] to-[#1B1111] text-white p-6 rounded-3xl border-2 border-[#D49A3D]/40 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC217]/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-[#D49A3D] text-[#1B1111] rounded-2xl shadow-md">
                <FileText className="w-7 h-7" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white">استمارة التفتيش ورصد عدم المطابقة</h2>
                  <span className="text-[10px] bg-[#682722] text-amber-100 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                    النظام الإداري لمطاعم المراسيم
                  </span>
                </div>
                <p className="text-xs font-semibold text-amber-200/80 mt-1">
                  رصد وتوثيق حالات عدم المطابقة التشغيلية وترحيلها لحظياً للإدارة (ربط متسلسل: الإدارة ⬅ القسم ⬅ نوع الحالة)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-[#1B1111]/80 border border-[#D49A3D]/30 px-4 py-2 rounded-2xl">
                <span className="text-[11px] font-bold text-slate-300">المفتش المعتمد:</span>
                <p className="text-xs font-black text-[#FFC217]">{session.full_name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Form Card (7 Cols) */}
          <div hidden={!(["full", "exclusive", "dept_only"].includes(userPermissions.features.inspect_create))} className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative">
            <h3 className="text-base font-black text-[#1B1111] mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D49A3D]"></span>
              <span>تسجيل حالة عدم مطابقة جديدة</span>
            </h3>

            <InspectorForm
              departments={toPlain(departments)}
              locations={toPlain(locations)}
              categories={toPlain(categories)}
            />
          </div>

          {/* Recent Cases Timeline (5 Cols) */}
          <div hidden={!canViewOwnInspections} className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-[#1B1111] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D49A3D]" />
                <span>آخر الحالات المسجلة حديثاً</span>
              </h3>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                {recentCases.length} حالة
              </span>
            </div>

            {recentCases.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold">
                لا توجد حالات مسجلة حتى الآن
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {recentCases.map((c: any) => {
                  const badge = statusLabels[c.status] || { label: c.status, color: "bg-slate-100 text-slate-800" };
                  return (
                    <div key={c.id} className="p-4 rounded-2xl bg-[#FAF7F4] border border-slate-100 space-y-2 hover:border-[#D49A3D]/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-[#682722]">
                          #{c.case_number} ({c.internal_id})
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="text-xs font-black text-[#1B1111]">
                        {c.nc_name}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {c.location_name}
                        </span>
                        <span>•</span>
                        <span>{c.obs_date} {c.obs_time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
