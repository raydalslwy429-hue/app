"use server";

import { getSession, UserSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateExcelWorkbookXML, ExcelColumn } from "@/lib/excel-helper";
import { getUserEffectivePermissions } from "@/app/actions/capa";

function isAuthorizedAdmin(session: UserSession | null): boolean {
  if (!session) return false;
  return session.role === "admin" || session.role === "super_admin" || session.role === "general_admin";
}

export async function createDailyReportAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "يرجى تسجيل الدخول أولاً" };
  }

  const createLevel = (await getUserEffectivePermissions(session)).features.create_daily_report;
  const canCreate = ["full", "exclusive", "dept_only"].includes(createLevel);
  if (!canCreate) {
    return { success: false, error: "عذراً، ليس لديك صلاحية إنشاء تقارير يومية في المنظومة. يرجى مراجعة مدير النظام." };
  }

  const reporterName = String(formData.get("reporter_name") || session.full_name).trim();
  const locationCode = String(formData.get("location_code") || "").trim();
  const locationName = String(formData.get("location_name") || "").trim();
  const recipientTo = String(formData.get("recipient_to") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!reporterName) {
    return { success: false, error: "اسم مقدم التقرير مطلوب" };
  }
  if (!locationName) {
    return { success: false, error: "يرجى تحديد الموقع أو القسم المرتبط بالتقرير" };
  }
  if (!recipientTo) {
    return { success: false, error: "يرجى تحديد الجهة أو الشخص الموجه له التقرير في حقل (إلى)" };
  }
  if (!title) {
    return { success: false, error: "يرجى كتابة عنوان التقرير أو موضوعه" };
  }
  if (!description) {
    return { success: false, error: "يرجى كتابة وصف ومحتوى التقرير اليومي" };
  }

  // Generate Report Number
  const maxRes = await db.execute("SELECT COALESCE(MAX(report_number), 0) + 1 as next_num FROM daily_reports");
  const reportNumber = Number(maxRes.rows[0]?.next_num || 1);
  const internalId = `REP-2026-${String(reportNumber).padStart(4, "0")}`;

  const now = new Date();
  const reportDate = now.toISOString().split("T")[0];
  const reportTime = now.toTimeString().substring(0, 5);

  await db.execute({
    sql: `INSERT INTO daily_reports (
      report_number, internal_id, reporter_id, reporter_name, reporter_dept, reporter_role,
      location_code, location_name, recipient_to, title, description, status,
      report_date, report_time, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, datetime('now'))`,
    args: [
      reportNumber,
      internalId,
      session.id,
      reporterName,
      session.department_name,
      session.role,
      locationCode,
      locationName,
      recipientTo,
      title,
      description,
      reportDate,
      reportTime,
    ],
  });

  // Log in Audit Trail
  try {
    await db.execute({
      sql: `INSERT INTO audit_logs (log_id, case_number, event_type, actor_name, actor_role, prev_state, new_state, details)
            VALUES (?, ?, 'DAILY_REPORT_CREATED', ?, ?, NULL, 'submitted', ?)`,
      args: [
        `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        reportNumber,
        session.full_name,
        session.role,
        `تم تقديم تقرير يومي جديد (${title}) موجه إلى: ${recipientTo}`,
      ],
    });
  } catch (e) {
    console.warn("Audit log note:", e);
  }

  revalidatePath("/admin");
  revalidatePath("/inspector");
  revalidatePath("/field");

  return {
    success: true,
    reportNumber,
    internalId,
    message: `🎉 تم حفظ وإرسال التقرير اليومي برقم (#${reportNumber}) بنجاح!`,
  };
}

export async function getDailyReportsAction() {
  const session = await getSession();
  if (!session) return [];

  const permissions = await getUserEffectivePermissions(session);
  const isSuper = session.role === "super_admin" || session.role === "general_admin";
  const hasArchivePerm = ["full", "exclusive", "dept_only", "view_only"].includes(permissions.features.view_daily_archive);

  if (!isSuper && !hasArchivePerm) {
    return [];
  }

  // Scoping: Super admins see all; Department admins/users see only their department's reports
  let sql = `
    SELECT id, report_number, internal_id, reporter_id, reporter_name, reporter_dept, reporter_role,
           location_code, location_name, recipient_to, title, description, status,
           report_date, report_time, created_at
    FROM daily_reports
  `;
  const args: any[] = [];

  if (!isSuper) {
    const userDept = session.department_name;
    const userDeptCode = session.department_code;
    sql += ` WHERE (reporter_dept = ? OR location_code IN (SELECT code FROM locations WHERE department_code = ?))`;
    args.push(userDept, userDeptCode);
  }

  sql += ` ORDER BY report_number DESC LIMIT 200`;

  const res = await db.execute({ sql, args });
  return res.rows as unknown as any[];
}

/**
 * 📊 تصدير أرشيف التقارير اليومية إلى إكسيل (Excel)
 * صف واحد لكل تقرير + أعمدة مستقلة ثابتة لجميع البيانات
 */
export async function exportDailyReportsToExcelAction() {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "يجب تسجيل الدخول أولاً لتصدير التقارير" };
  }

  const permissions = await getUserEffectivePermissions(session);
  const isSuper = session.role === "super_admin" || session.role === "general_admin";
  const hasArchivePerm = ["full", "exclusive", "dept_only", "view_only"].includes(permissions.features.view_daily_archive);

  if ((!isSuper && !hasArchivePerm) || !(isSuper || ["full", "exclusive", "dept_only"].includes(permissions.features.export_excel))) {
    return { success: false, error: "غير مصرح لك بالاطلاع أو تصدير أرشيف التقارير اليومية" };
  }

  // Fetch reports scoped by permission
  let sql = `
    SELECT id, report_number, internal_id, reporter_id, reporter_name, reporter_dept, reporter_role,
           location_code, location_name, recipient_to, title, description, status,
           report_date, report_time, created_at
    FROM daily_reports
  `;
  const args: any[] = [];

  if (!isSuper) {
    const userDept = session.department_name;
    const userDeptCode = session.department_code;
    sql += ` WHERE (reporter_dept = ? OR location_code IN (SELECT code FROM locations WHERE department_code = ?))`;
    args.push(userDept, userDeptCode);
  }

  sql += ` ORDER BY report_number DESC`;

  const res = await db.execute({ sql, args });
  const reports = res.rows as unknown as any[];

  if (reports.length === 0) {
    return { success: false, error: "لا توجد تقارير مسجلة في الأرشيف لتصديرها حالياً" };
  }

  // Define Columns (Fixed 13 Columns)
  const columns: ExcelColumn[] = [
    { header: "الرقم التسلسلي", key: "report_number", width: 90 },
    { header: "المعرف النظامي", key: "internal_id", width: 130 },
    { header: "تاريخ التقرير", key: "report_date", width: 100 },
    { header: "وقت الإرسال", key: "report_time", width: 90 },
    { header: "اسم مقدم التقرير", key: "reporter_name", width: 150 },
    { header: "إدارة مقدم التقرير", key: "reporter_dept", width: 160 },
    { header: "الدور الوظيفي", key: "reporter_role", width: 120 },
    { header: "الموقع أو القسم التشغيلي", key: "location_name", width: 170 },
    { header: "الموجّه له (إلى)", key: "recipient_to", width: 160 },
    { header: "عنوان وموضوع التقرير", key: "title", width: 220 },
    { header: "الوصف والتفاصيل الكاملة", key: "description", width: 320 },
    { header: "حالة التقرير", key: "status_label", width: 110 },
    { header: "تاريخ ووقت التوثيق الإلكتروني", key: "created_at", width: 150 },
  ];

  // Helper date formatter
  const fmtDate = (v: any) => {
    if (!v) return "-";
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const mn = String(d.getMinutes()).padStart(2, "0");
      return `${y}-${m}-${day} ${h}:${mn}`;
    } catch {
      return String(v);
    }
  };

  // Build 1 Row Per Report
  const rows: Array<Record<string, any>> = reports.map((r) => ({
    report_number: Number(r.report_number),
    internal_id: String(r.internal_id || `REP-2026-${String(r.report_number).padStart(4, "0")}`),
    report_date: String(r.report_date || "-"),
    report_time: String(r.report_time || "-"),
    reporter_name: String(r.reporter_name || "-"),
    reporter_dept: String(r.reporter_dept || "-"),
    reporter_role: String(r.reporter_role || "-"),
    location_name: String(r.location_name || "-"),
    recipient_to: String(r.recipient_to || "-"),
    title: String(r.title || "-"),
    description: String(r.description || "-"),
    status_label: r.status === "submitted" ? "تم التوثيق والاعتماد" : String(r.status || "تم الإرسال"),
    created_at: fmtDate(r.created_at),
  }));

  const dateStr = new Date().toISOString().split("T")[0];
  const scopeTitle = isSuper ? "الشامل لكافة الإدارات" : `إدارة ${session.department_name || ""}`;

  const xml = generateExcelWorkbookXML({
    title: `أرشيف التقارير اليومية - ${scopeTitle} - مطعم المراسيم`,
    sheets: [
      {
        name: "أرشيف_التقارير_اليومية",
        columns,
        rows,
      },
    ],
  });

  return {
    success: true,
    xml,
    count: rows.length,
    filename: `marasim_daily_reports_archive_${dateStr}.xls`,
  };
}

export async function toggleUserDailyReportAction(userId: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session)) {
    return { success: false, error: "صلاحية محصورة بإدارة النظام العليا" };
  }

  await db.execute({
    sql: `UPDATE users 
          SET can_create_daily_report = CASE WHEN COALESCE(can_create_daily_report, 1) = 1 THEN 0 ELSE 1 END 
          WHERE id = ?`,
    args: [userId],
  });

  revalidatePath("/admin");
  return { success: true, message: "تم تعديل صلاحية إنشاء التقرير اليومي بنجاح" };
}

export async function toggleUserDailyArchivePermissionAction(userId: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session)) {
    return { success: false, error: "صلاحية محصورة بإدارة النظام العليا" };
  }

  await db.execute({
    sql: `UPDATE users
          SET can_view_daily_archive = CASE WHEN COALESCE(can_view_daily_archive, 0) = 1 THEN 0 ELSE 1 END
          WHERE id = ?`,
    args: [userId],
  });

  revalidatePath("/admin");
  return { success: true, message: "تم تعديل صلاحية الاطلاع على أرشيف التقارير بنجاح" };
}

export async function getActiveLocationsAction() {
  const res = await db.execute("SELECT code, name, department_code FROM locations WHERE status = 'active' ORDER BY name ASC");
  return res.rows as unknown as Array<{ code: string; name: string; department_code?: string }>;
}
