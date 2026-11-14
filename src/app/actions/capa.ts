"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, getPersistedDatabaseMode } from "@/lib/db";
import { generateExcelWorkbookXML, ExcelColumn } from "@/lib/excel-helper";
import { authenticateWithPin, authenticateWithCredentials, destroySession, getSession, UserSession } from "@/lib/auth";

function isAuthorizedAdmin(session: any): session is UserSession {
  if (!session) return false;
  return session.role === "admin" || session.role === "super_admin" || session.role === "general_admin";
}

async function hasFeaturePermission(session: UserSession | null, key: string): Promise<boolean> {
  if (!session) return false;
  if (session.role === "super_admin" || session.role === "general_admin") return true;
  const level = (await getUserEffectivePermissions(session)).features[key];
  if (["full", "exclusive"].includes(level)) return true;
  if (isAuthorizedAdmin(session) && (key === "manage_sync" || key === "import_excel") && level !== "none") return true;
  return level === "dept_only" && !key.startsWith("manage_") && key !== "delete_cases";
}

export interface RolePermissions {
  can_view: "full" | "dept_only" | "none";
  can_create: "full" | "dept_only" | "none";
  can_assign: "full" | "dept_only" | "none";
  can_review: "full" | "dept_only" | "none";
  can_close: "full" | "dept_only" | "none";
  can_delete: "full" | "none";
  features: Record<string, string>;
}

function resolveRolePermission(parsed: Record<string, any>, key: string, alias: string, fallback: string, preferAlias = false) {
  const value = preferAlias ? (parsed[alias] ?? parsed[key]) : (parsed[key] ?? parsed[alias]);
  if (value === "view_only") return "none";
  return value === "full" || value === "dept_only" || value === "none" ? value : fallback;
}

export async function getUserEffectivePermissions(session: UserSession | null): Promise<RolePermissions> {
  const emptyFeatures: Record<string, string> = {};
  const featureKeys = ["inspect_create", "inspect_offline", "inspect_typeahead", "inspect_view_own", "offline_outbox", "change_own_pin", "view_open_cases", "view_in_progress_cases", "view_review_cases", "view_closed_cases", "view_all_cases", "view_executor_directory", "triage_assign", "triage_direct_user", "triage_curated", "additional_assignment", "write_in_progress_note", "close_in_progress_case", "field_execute", "field_feedback", "review_approve", "review_round_bump", "delete_cases", "inspect_secret_notes", "manage_structure", "manage_roles", "manage_users", "manage_sync", "import_excel", "export_excel", "print_pdf", "manage_forms", "create_daily_report", "view_daily_archive"];
  if (!session) {
    return {
      can_view: "none",
      can_create: "none",
      can_assign: "none",
      can_review: "none",
      can_close: "none",
      can_delete: "none",
      features: emptyFeatures,
    };
  }

  // Super Admin & General Admin have unrestricted full access
  if (session.role === "super_admin" || session.role === "general_admin") {
    return {
      can_view: "full",
      can_create: "full",
      can_assign: "full",
      can_review: "full",
      can_close: "full",
      can_delete: "full",
      features: Object.fromEntries(featureKeys.map((key) => [key, "full"])),
    };
  }

  let parsed: Record<string, any> | null = null;
  try {
    if (session.custom_role_id) {
      const roleResult = await db.execute({ sql: "SELECT permissions_json FROM custom_roles WHERE id = ?", args: [session.custom_role_id] });
      if (roleResult.rows[0]?.permissions_json) parsed = JSON.parse(String(roleResult.rows[0].permissions_json));
    }
    if (!parsed) {
      const matrixResult = await db.execute({ sql: "SELECT permissions_json FROM role_permissions_matrix WHERE role_code = ?", args: [session.role] });
      if (matrixResult.rows[0]?.permissions_json) parsed = JSON.parse(String(matrixResult.rows[0].permissions_json));
    }
  } catch {}

  const defaults = session.role === "admin"
    ? { can_view: "dept_only", can_create: "dept_only", can_assign: "dept_only", can_review: "dept_only", can_close: "dept_only", can_delete: "none" }
    : session.role === "inspector"
      ? { can_view: "dept_only", can_create: "full", can_assign: "none", can_review: "none", can_close: "none", can_delete: "none" }
      : { can_view: "none", can_create: "none", can_assign: "none", can_review: "none", can_close: "none", can_delete: "none" };
  if (!parsed) parsed = {};
  const defaultFeatures: Record<string, string> = session.role === "admin"
    ? { inspect_create: "dept_only", triage_assign: "dept_only", triage_direct_user: "dept_only", triage_curated: "dept_only", review_approve: "dept_only", review_round_bump: "dept_only" }
    : session.role === "inspector"
      ? { inspect_create: "full", inspect_offline: "full", inspect_typeahead: "full" }
      : session.role === "field_agent"
        ? { field_execute: "full", field_feedback: "full" }
        : {};
  if (Number(session.can_export_excel) === 1) defaultFeatures.export_excel = "full";
  // Retain the legacy per-user switches as defaults, while allowing the role matrix
  // to explicitly override them for every role.
  if (session.can_create_daily_report !== 0) defaultFeatures.create_daily_report = "full";
  if (Number(session.can_view_daily_archive) === 1) defaultFeatures.view_daily_archive = "full";
  defaultFeatures.change_own_pin = "full";
  if (session.role === "super_admin" || session.role === "general_admin" || session.role === "admin") {
    defaultFeatures.manage_sync = "full";
    defaultFeatures.import_excel = "full";
  }
  defaultFeatures.offline_outbox = "full";
  if (session.role === "inspector") defaultFeatures.inspect_view_own = "full";
  if (session.role === "admin") {
    const assignDefault = String(parsed.triage_assign ?? parsed.can_assign ?? defaultFeatures.triage_assign ?? "none");
    const reviewDefault = String(parsed.review_approve ?? parsed.can_close ?? defaultFeatures.review_approve ?? "none");
    const viewDefault = String(parsed.can_view ?? defaults.can_view ?? "none");
    defaultFeatures.view_open_cases = assignDefault;
    defaultFeatures.view_in_progress_cases = assignDefault !== "none" ? assignDefault : String(parsed.field_execute ?? defaultFeatures.field_execute ?? "none");
    defaultFeatures.view_review_cases = reviewDefault;
    defaultFeatures.view_closed_cases = viewDefault;
    defaultFeatures.view_all_cases = viewDefault;
    defaultFeatures.view_executor_directory = assignDefault;
    if (assignDefault !== "none") {
      defaultFeatures.additional_assignment = assignDefault;
      defaultFeatures.write_in_progress_note = assignDefault;
    }
    if (reviewDefault !== "none") defaultFeatures.close_in_progress_case = reviewDefault;
  }
  const features = Object.fromEntries(featureKeys.map((key) => [key, String(parsed?.[key] ?? defaultFeatures[key] ?? "none")]));
  return {
    can_view: resolveRolePermission(parsed, "can_view", "inspect_create", defaults.can_view),
    can_create: resolveRolePermission(parsed, "can_create", "inspect_create", defaults.can_create, true),
    can_assign: resolveRolePermission(parsed, "can_assign", "triage_assign", defaults.can_assign, true),
    can_review: resolveRolePermission(parsed, "can_review", "review_approve", defaults.can_review, true),
    can_close: resolveRolePermission(parsed, "can_close", "review_approve", defaults.can_close, true),
    can_delete: ["full", "exclusive"].includes(parsed.can_delete ?? parsed.delete_cases) ? "full" : "none",
    features,
  };
}

// ==========================================
// 🔑 AUTH ACTIONS
// ==========================================

export async function loginAction(userNumberOrPin: string, pinCode?: string) {
  let result;
  if (pinCode !== undefined && pinCode !== null && pinCode !== "") {
    result = await authenticateWithCredentials(userNumberOrPin, pinCode);
  } else {
    result = await authenticateWithPin(userNumberOrPin);
  }

  if (!result.success || !result.user) {
    return { success: false, error: result.error || "فشل تسجيل الدخول" };
  }

  let redirectUrl = "/";
  if (result.user.role === "admin" || result.user.role === "super_admin" || result.user.role === "general_admin") {
    redirectUrl = "/admin";
  } else if (result.user.role === "inspector") {
    redirectUrl = "/inspector";
  } else if (result.user.role === "field_agent") {
    redirectUrl = "/field";
  }

  return { success: true, redirectUrl };
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

// ==========================================
// 📝 INSPECTOR & CASE REPORTING ACTIONS
// ==========================================

export async function createInspectionAction(formDataOrPlain: FormData | any) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "يرجى تسجيل الدخول أولاً" };
  }
  const perms = await getUserEffectivePermissions(session);
  if (perms.can_create === "none") {
    return { success: false, error: "غير مصرح لك بتسجيل حالة عدم مطابقة" };
  }

  const getVal = (key: string): string => {
    if (!formDataOrPlain) return "";
    if (typeof (formDataOrPlain as any).get === "function") {
      return String((formDataOrPlain as FormData).get(key) || "").trim();
    }
    return String((formDataOrPlain as any)[key] || "").trim();
  };

  const clientUuid = getVal("client_uuid");
  const locationCode = getVal("location_code");
  const ncCode = getVal("nc_code");
  const description = getVal("description");
  const rootCause = getVal("root_cause");
  const inspectorNotes = getVal("inspector_notes");

  if (!locationCode || !ncCode || !description) {
    return { success: false, error: "يرجى ملء الحقول الإلزامية (الموقع، نوع حالة عدم المطابقة، الوصف)" };
  }

  // Idempotency check: if client_uuid already registered, return existing case
  if (clientUuid) {
    const existing = await db.execute({
      sql: "SELECT case_number FROM cases_master WHERE client_uuid = ?",
      args: [clientUuid],
    });
    if (existing.rows.length > 0) {
      return { success: true, caseNumber: Number(existing.rows[0].case_number), duplicated: true };
    }
  }

  // Lookups
  const locRes = await db.execute({ sql: "SELECT name, department_code FROM locations WHERE code = ?", args: [locationCode] });
  const locationName = locRes.rows[0]?.name ? String(locRes.rows[0].name) : locationCode;
  const deptCode = locRes.rows[0]?.department_code ? String(locRes.rows[0].department_code) : "dept_all";

  const deptRes = await db.execute({ sql: "SELECT name FROM departments WHERE code = ?", args: [deptCode] });
  const deptName = deptRes.rows[0]?.name ? String(deptRes.rows[0].name) : deptCode;

  const ncRes = await db.execute({ sql: "SELECT name FROM categories WHERE code = ?", args: [ncCode] });
  const ncName = ncRes.rows[0]?.name ? String(ncRes.rows[0].name) : ncCode;

  // Next clean sequential case number
  const maxRes = await db.execute("SELECT COALESCE(MAX(case_number), 0) + 1 as next_num FROM cases_master");
  const caseNumber = Number(maxRes.rows[0]?.next_num || 1);
  const internalId = `CAPA-2026-${String(caseNumber).padStart(4, "0")}`;

  const now = new Date();
  const obsDate = now.toISOString().split("T")[0];
  const obsTime = now.toTimeString().substring(0, 5);

  await db.execute({
    sql: `INSERT INTO cases_master (
      case_number, internal_id, department_code, department_name, location_code, location_name, nc_code, nc_name,
      inspector_name, inspector_pin, description, root_cause, inspector_notes,
      status, current_round, obs_date, obs_time, client_uuid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_assignment', 1, ?, ?, ?)`,
    args: [
      caseNumber,
      internalId,
      deptCode,
      deptName,
      locationCode,
      locationName,
      ncCode,
      ncName,
      session.full_name,
      session.pin_code,
      description,
      rootCause,
      inspectorNotes,
      obsDate,
      obsTime,
      clientUuid || null,
    ],
  });

  // Audit Log
  await db.execute({
    sql: `INSERT INTO audit_logs (log_id, case_number, event_type, actor_name, actor_role, prev_state, new_state, details)
          VALUES (?, ?, 'CASE_CREATED', ?, ?, NULL, 'pending_assignment', ?)`,
    args: [
      `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      caseNumber,
      session.full_name,
      session.role,
      `تم رصد حالة عدم مطابقة جديدة برقم (${caseNumber}) في قسم (${locationName}) لحالة: ${ncName}`,
    ],
  });

  revalidatePath("/inspector");
  revalidatePath("/admin");
  return { success: true, caseNumber };
}

// ==========================================
// 🚀 ASSIGNMENT & DISPATCH ACTIONS
// ==========================================

export async function assignCaseAction(
  caseId: number,
  targetDepts: string[],
  instructions: string,
  targetUsers?: Array<{ id: number; name: string; deptCode: string }>
) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "يرجى تسجيل الدخول أولاً" };
  }

  const perms = await getUserEffectivePermissions(session);
  if (perms.can_assign === "none") {
    return { success: false, error: "ليس لديك صلاحية إسناد أو تكليف البلاغات" };
  }

  if ((!targetDepts || targetDepts.length === 0) && (!targetUsers || targetUsers.length === 0)) {
    return { success: false, error: "يرجى اختيار جهة أو موظف مكلف واحد على الأقل" };
  }

  const caseRes = await db.execute({
    sql: "SELECT case_number, internal_id, current_round, location_name, department_code FROM cases_master WHERE id = ?",
    args: [caseId],
  });

  if (caseRes.rows.length === 0) {
    return { success: false, error: "الحالة غير موجودة" };
  }

  const caseRow = caseRes.rows[0];
  const caseDept = String(caseRow.department_code || "");

  // If assign permission is restricted to department only
  if (perms.can_assign === "dept_only") {
    if (caseDept && caseDept !== session.department_code) {
      return { success: false, error: "صلاحيتك محصورة بإسناد وتكليف بلاغات إدارتك فقط" };
    }
    if (targetDepts && targetDepts.some((d) => d !== session.department_code)) {
      return { success: false, error: "لا يمكنك تكليف إدارات أخرى، صلاحية التكليف الشامل لجميع الإدارات محصورة بالإدارة العليا" };
    }
    if (targetUsers && targetUsers.some((u) => u.deptCode && u.deptCode !== session.department_code)) {
      return { success: false, error: "لا يمكنك تكليف موظفين خارج نطاق إدارتك" };
    }
  }

  const caseNumber = Number(caseRow.case_number);
  const round = Number(caseRow.current_round);

  // Department names mapping
  const usersRes = await db.execute("SELECT department_code, department_name FROM users");
  const deptMap: Record<string, string> = {};
  usersRes.rows.forEach((r) => {
    deptMap[String(r.department_code)] = String(r.department_name);
  });

  const assignedSummary: string[] = [];

  // Assign to departments
  if (targetDepts && targetDepts.length > 0) {
    for (const deptCode of targetDepts) {
      const asgId = `ASG-${caseNumber}-R${round}-${deptCode}`;
      await db.execute({
        sql: `INSERT OR REPLACE INTO case_assignments (
          asg_id, case_id, case_number, round, assigned_dept, dept_name, admin_name, admin_instructions, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        args: [asgId, caseId, caseNumber, round, deptCode, deptMap[deptCode] || deptCode, session.full_name, instructions],
      });
      assignedSummary.push(deptMap[deptCode] || deptCode);
    }
  }

  // Assign to specific users if provided
  if (targetUsers && targetUsers.length > 0) {
    for (const u of targetUsers) {
      const asgId = `ASG-${caseNumber}-R${round}-U${u.id}`;
      await db.execute({
        sql: `INSERT OR REPLACE INTO case_assignments (
          asg_id, case_id, case_number, round, assigned_dept, dept_name, assigned_user_id, assigned_user_name, admin_name, admin_instructions, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        args: [asgId, caseId, caseNumber, round, u.deptCode, deptMap[u.deptCode] || u.deptCode, u.id, u.name, session.full_name, instructions],
      });
      assignedSummary.push(u.name);
    }
  }

  // Update cases_master
  await db.execute({
    sql: "UPDATE cases_master SET status = 'assigned', assigned_roles = ?, updated_at = datetime('now') WHERE id = ?",
    args: [assignedSummary.join(", "), caseId],
  });

  // Audit Log
  await db.execute({
    sql: `INSERT INTO audit_logs (log_id, case_number, event_type, actor_name, actor_role, prev_state, new_state, details)
          VALUES (?, ?, 'ASSIGNMENT_ISSUED', ?, ?, 'pending_assignment', 'assigned', ?)`,
    args: [
      `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      caseNumber,
      session.full_name,
      session.role,
      `تم إسناد الحالة إلى: ${assignedSummary.join(", ")} بتوجيه: ${instructions || "لا توجد ملاحظات"}`,
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/field");
  return { success: true };
}

// ➕ ASSIGN TO ADDITIONAL PERSON(S) FOR IN-PROGRESS CASE (إسناد لشخص إضافي دون حذف السابقين)
export async function assignAdditionalUsersAction(
  caseId: number,
  targetUsers: Array<{ id: number; name: string; deptCode: string }>,
  instructions?: string
) {
  const session = await getSession();
  if (!session) return { success: false, error: "يرجى تسجيل الدخول أولاً" };
  if (!(await hasFeaturePermission(session, "additional_assignment"))) {
    return { success: false, error: "لا تملك صلاحية إسناد منفذ إضافي أثناء التنفيذ" };
  }

  const permissions = await getUserEffectivePermissions(session);
  const additionalAssignmentLevel = permissions.features.additional_assignment;

  if (!targetUsers || targetUsers.length === 0) {
    return { success: false, error: "يرجى اختيار موظف إضافي واحد على الأقل" };
  }

  const caseRes = await db.execute({
    sql: "SELECT case_number, current_round, department_code, assigned_roles, status FROM cases_master WHERE id = ?",
    args: [caseId],
  });
  if (caseRes.rows.length === 0) return { success: false, error: "الحالة غير موجودة" };

  const caseRow = caseRes.rows[0];
  const caseNumber = Number(caseRow.case_number);
  const round = Number(caseRow.current_round);
  const currentAssignedRoles = String(caseRow.assigned_roles || "");
  const caseDept = String(caseRow.department_code || "");
  if (!["assigned", "in_progress", "pending_review"].includes(String(caseRow.status || ""))) {
    return { success: false, error: "الإسناد الإضافي متاح للحالات قيد التنفيذ فقط" };
  }
  if (additionalAssignmentLevel === "dept_only" && caseDept !== session.department_code) {
    return { success: false, error: "صلاحية الإسناد الإضافي محصورة بمنفذي إدارتك" };
  }

  // Fetch departments mapping
  const usersRes = await db.execute("SELECT id, full_name, department_code, department_name FROM users WHERE status = 'active'");
  const deptMap: Record<string, string> = {};
  const userMap = new Map<number, { full_name: string; department_code: string }>();
  usersRes.rows.forEach((r) => {
    deptMap[String(r.department_code)] = String(r.department_name);
    userMap.set(Number(r.id), { full_name: String(r.full_name), department_code: String(r.department_code || "") });
  });

  const resolvedTargets: Array<{ id: number; name: string; deptCode: string }> = [];
  for (const target of targetUsers) {
    const actualUser = userMap.get(Number(target.id));
    if (!actualUser) return { success: false, error: "أحد المنفذين المحددين غير موجود أو غير نشط" };
    if (additionalAssignmentLevel === "dept_only" && actualUser.department_code !== session.department_code) {
      return { success: false, error: "صلاحية الإسناد الإضافي محصورة بمنفذي إدارتك" };
    }
    resolvedTargets.push({ id: Number(target.id), name: actualUser.full_name, deptCode: actualUser.department_code });
  }

  const newlyAssignedNames: string[] = [];

  for (const u of resolvedTargets) {
    const asgId = `ASG-${caseNumber}-R${round}-U${u.id}`;
    // Insert new assignment row for this user (or update if existed previously in this round)
    await db.execute({
      sql: `INSERT OR REPLACE INTO case_assignments (
        asg_id, case_id, case_number, round, assigned_dept, dept_name, assigned_user_id, assigned_user_name, admin_name, admin_instructions, status, is_accepted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      args: [
        asgId,
        caseId,
        caseNumber,
        round,
        u.deptCode,
        deptMap[u.deptCode] || u.deptCode,
        u.id,
        u.name,
        session.full_name,
        instructions || "",
      ],
    });
    newlyAssignedNames.push(u.name);
  }

  // Update cases_master assigned_roles by appending newly assigned users safely
  const existingList = currentAssignedRoles ? currentAssignedRoles.split(",").map((s) => s.trim()) : [];
  for (const name of newlyAssignedNames) {
    if (!existingList.includes(name)) {
      existingList.push(name);
    }
  }

  await db.execute({
    sql: "UPDATE cases_master SET assigned_roles = ?, updated_at = datetime('now') WHERE id = ?",
    args: [existingList.join(", "), caseId],
  });

  // Audit Log
  await db.execute({
    sql: `INSERT INTO audit_logs (log_id, case_number, event_type, actor_name, actor_role, prev_state, new_state, details)
          VALUES (?, ?, 'ADDITIONAL_ASSIGNMENT', ?, ?, 'in_progress', 'in_progress', ?)`,
    args: [
      `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      caseNumber,
      session.full_name,
      session.role,
      `تم إسناد إضافي للمنفذين: ${newlyAssignedNames.join(", ")} بتوجيه: ${instructions || "لا توجد ملاحظات إضافية"}`,
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/field");
  return {
    success: true,
    message: `تم إسناد الحالة بنجاح إلى (${newlyAssignedNames.join("، ")}) دون المساس بالتكليفات السابقة.`,
  };
}

// 📝 WRITE NOTE / DIRECTIVE TO IN-PROGRESS EXECUTORS (كتابة ملاحظة أو تنبيه تظهر مباشرة للمنفذين)
export async function addInProgressNoteAction(caseId: number, note: string) {
  const session = await getSession();
  if (!session || !isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "write_in_progress_note"))) {
    return { success: false, error: "لا تملك صلاحية كتابة ملاحظة للمنفذين أثناء التنفيذ" };
  }

  if (!note || !note.trim()) {
    return { success: false, error: "يرجى كتابة نص الملاحظة أو التنبيه للمنفذين" };
  }

  const caseRes = await db.execute({
    sql: "SELECT case_number, current_round, department_code FROM cases_master WHERE id = ?",
    args: [caseId],
  });
  if (caseRes.rows.length === 0) return { success: false, error: "الحالة غير موجودة" };

  const permissions = await getUserEffectivePermissions(session);
  if (permissions.features.write_in_progress_note === "dept_only" && String(caseRes.rows[0].department_code || "") !== session.department_code) {
    return { success: false, error: "صلاحية الملاحظات محصورة بحالات إدارتك" };
  }

  const caseNumber = Number(caseRes.rows[0].case_number);
  const round = Number(caseRes.rows[0].current_round);
  const trimmedNote = note.trim();

  // 1. Update cases_master with the direct note
  await db.execute({
    sql: "UPDATE cases_master SET in_progress_note = ?, updated_at = datetime('now') WHERE id = ?",
    args: [trimmedNote, caseId],
  });

  // 2. Also update admin_instructions for active assignments of this case
  const nowStr = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  await db.execute({
    sql: `UPDATE case_assignments 
          SET admin_instructions = CASE 
            WHEN admin_instructions IS NULL OR admin_instructions = '' THEN ? 
            ELSE admin_instructions || ' | [تنبيه إداري ' || ? || ']: ' || ? 
          END
          WHERE case_id = ? AND round = ? AND status != 'closed'`,
    args: [trimmedNote, nowStr, trimmedNote, caseId, round],
  });

  // 3. Audit log
  await db.execute({
    sql: `INSERT INTO audit_logs (log_id, case_number, event_type, actor_name, actor_role, prev_state, new_state, details)
          VALUES (?, ?, 'ADMIN_DIRECTIVE_ISSUED', ?, ?, 'in_progress', 'in_progress', ?)`,
    args: [
      `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      caseNumber,
      session.full_name,
      session.role,
      `تم إرسال تنبيه وملاحظة إدارية للمنفذين: "${trimmedNote}"`,
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/field");
  return {
    success: true,
    message: "تم إرسال الملاحظة والتنبيه للمنفذين بنجاح وسيظهر لهم فوراً في لوحة التنفيذ.",
  };
}

// ==========================================
// 🛠️ FIELD AGENT ACTIONS
// ==========================================

export async function submitExecutionAction(caseId: number, asgId: string, actionTaken: string, notes?: string) {
  const session = await getSession();
  if (!session || !(await hasFeaturePermission(session, "field_execute"))) {
    return { success: false, error: "صلاحية التنفيذ الميداني محصورة بالمنفذين المكلفين" };
  }

  if (!actionTaken || actionTaken.trim() === "") {
    return { success: false, error: "يرجى كتابة الإجراء التصحيحي المتخذ ميدانياً" };
  }

  const asgRes = await db.execute({
    sql: "SELECT case_number, round, assigned_dept FROM case_assignments WHERE asg_id = ? AND case_id = ?",
    args: [asgId, caseId],
  });

  if (asgRes.rows.length === 0) {
    return { success: false, error: "التكليف غير موجود" };
  }

  const asgRow = asgRes.rows[0];
  const caseNumber = Number(asgRow.case_number);
  const round = Number(asgRow.round);
  const execId = `EXE-${caseNumber}-R${round}-${session.id || session.department_code || Date.now()}`;

  // Insert execution
  await db.execute({
    sql: `INSERT OR REPLACE INTO case_executions (
      exec_id, case_id, case_number, assignment_id, round, executor_name, executor_role, role_code, action_taken, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      execId,
      caseId,
      caseNumber,
      asgId,
      round,
      session.full_name,
      session.department_name || "المنفذ الميداني",
      session.department_code || "dept",
      actionTaken.trim(),
      notes?.trim() || null,
    ],
  });

  // Mark assignment completed
  await db.execute({
    sql: "UPDATE case_assignments SET status = 'completed', completed_at = datetime('now') WHERE asg_id = ?",
    args: [asgId],
  });

  // Keep case open in-progress so other assigned executors can still reply until final closure
  await db.execute({
    sql: "UPDATE cases_master SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?",
    args: [caseId],
  });

  // Check if any other assigned roles are still pending (for informational logging)
  const pendingRes = await db.execute({
    sql: "SELECT COUNT(*) as cnt FROM case_assignments WHERE case_id = ? AND round = ? AND status = 'pending'",
    args: [caseId, round],
  });
  const pendingCount = Number(pendingRes.rows[0]?.cnt || 0);

  // Audit Log
  await db.execute({
    sql: `INSERT INTO audit_logs (log_id, case_number, event_type, actor_name, actor_role, prev_state, new_state, details)
          VALUES (?, ?, 'FIELD_SUBMITTED', ?, ?, 'assigned', 'in_progress', ?)`,
    args: [
      `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      caseNumber,
      session.full_name,
      session.department_name || "منفذ ميداني",
      `تم استلام رد المنفذ (${session.full_name}): ${actionTaken.trim()} (المتبقي معلق: ${pendingCount})`,
    ],
  });

  revalidatePath("/field");
  revalidatePath("/admin");
  return { success: true };
}

// ==========================================
// 🔍 ADMIN REVIEW ACTIONS
// ==========================================

export async function approveTaskAction(asgId: string, approvalNotes?: string) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "يرجى تسجيل الدخول أولاً" };
  }

  const perms = await getUserEffectivePermissions(session);
  if (perms.can_review === "none") {
    return { success: false, error: "ليس لديك صلاحية مراجعة واعتماد المهام" };
  }

  const asgRes = await db.execute({
    sql: "SELECT case_id, case_number, round, assigned_dept, dept_name FROM case_assignments WHERE asg_id = ?",
    args: [asgId],
  });

  if (asgRes.rows.length === 0) return { success: false, error: "التكليف غير موجود" };

  const asg = asgRes.rows[0];
  const caseId = Number(asg.case_id);
  const caseNumber = Number(asg.case_number);
  const round = Number(asg.round);
  const deptCode = String(asg.assigned_dept);

  if (perms.can_review === "dept_only" && deptCode !== session.department_code) {
    return { success: false, error: "لا يمكنك اعتماد مهام خارج نطاق إدارتك" };
  }

  // Mark assignment accepted & record feedback (Without closing cases_master, so other executors can still reply)
  await db.execute({
    sql: "UPDATE case_assignments SET status = 'approved', is_accepted = 1, accepted_at = datetime('now'), admin_feedback = ? WHERE asg_id = ?",
    args: [approvalNotes || "تم قبول واعتماد المعالجة من الإدارة", asgId],
  });

  // Log decision
  await db.execute({
    sql: `INSERT INTO admin_decisions (
      decision_id, case_id, case_number, round, admin_name, action_type, decision, target_roles, directive
    ) VALUES (?, ?, ?, ?, ?, 'pending_review', 'task_accepted', ?, ?)`,
    args: [
      `DEC-${caseNumber}-R${round}-${Math.random().toString(36).substring(2, 8)}`,
      caseId,
      caseNumber,
      round,
      session.full_name,
      deptCode,
      approvalNotes || "تم قبول معالجة المنفذ (الحالة مقبولة للمنفذ ومعلقة لدى البقية)",
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/field");
  return { success: true, message: "تم قبول رد المنفذ بنجاح (الحالة مقبولة لهذا المنفذ ومعلقة لدى البقية حتى الإغلاق النهائي)" };
}

export async function reassignTaskAction(
  caseId: number,
  targetDepts: string[],
  reassignNotes: string,
  targetUsers?: Array<{ id: number; name: string; deptCode: string }>
) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "يرجى تسجيل الدخول أولاً" };
  }

  const perms = await getUserEffectivePermissions(session);
  if (perms.can_review === "none") {
    return { success: false, error: "ليس لديك صلاحية مراجعة وإعادة إسناد المهام" };
  }
  if (!(await hasFeaturePermission(session, "review_round_bump"))) return { success: false, error: "لا تملك صلاحية إعادة المهمة للاستكمال" };

  if (!reassignNotes || reassignNotes.trim() === "") {
    return { success: false, error: "يرجى كتابة ملاحظات وتوجيهات استكمال المهمة للمنفذين" };
  }

  if ((!targetDepts || targetDepts.length === 0) && (!targetUsers || targetUsers.length === 0)) {
    return { success: false, error: "يرجى اختيار منفذ واحد على الأقل أو جهة مكلفة لاستكمال المهمة" };
  }

  const caseRes = await db.execute({
    sql: "SELECT case_number, current_round, department_code FROM cases_master WHERE id = ?",
    args: [caseId],
  });
  if (caseRes.rows.length === 0) return { success: false, error: "الحالة غير موجودة" };

  const caseDept = String(caseRes.rows[0]?.department_code || "");
  if (perms.can_review === "dept_only") {
    if (caseDept && caseDept !== session.department_code) {
      return { success: false, error: "صلاحيتك محصورة بمراجعة بلاغات إدارتك فقط" };
    }
    if (targetDepts && targetDepts.some((d) => d !== session.department_code)) {
      return { success: false, error: "لا يمكنك إعادة الإسناد لإدارات أخرى، صلاحية التكليف الشامل محصورة بالإدارة العليا" };
    }
    if (targetUsers && targetUsers.some((u) => u.deptCode && u.deptCode !== session.department_code)) {
      return { success: false, error: "لا يمكنك تكليف موظفين خارج نطاق إدارتك" };
    }
  }

  const caseNumber = Number(caseRes.rows[0].case_number);
  const nextRound = Number(caseRes.rows[0].current_round) + 1;

  const usersRes = await db.execute("SELECT department_code, department_name FROM users");
  const deptMap: Record<string, string> = {};
  usersRes.rows.forEach((r) => {
    deptMap[String(r.department_code)] = String(r.department_name);
  });

  const assignedSummary: string[] = [];

  // Assign to departments if specified
  if (targetDepts && targetDepts.length > 0) {
    for (const deptCode of targetDepts) {
      const asgId = `ASG-${caseNumber}-R${nextRound}-${deptCode}`;
      await db.execute({
        sql: `INSERT OR REPLACE INTO case_assignments (
          asg_id, case_id, case_number, round, assigned_dept, dept_name, admin_name, admin_instructions, reassign_notes, status, is_accepted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
        args: [
          asgId,
          caseId,
          caseNumber,
          nextRound,
          deptCode,
          deptMap[deptCode] || deptCode,
          session.full_name,
          `استكمال المهمة للجولة (${nextRound}): ${reassignNotes.trim()}`,
          reassignNotes.trim(),
        ],
      });
      assignedSummary.push(deptMap[deptCode] || deptCode);
    }
  }

  // Assign to specific executors if selected
  if (targetUsers && targetUsers.length > 0) {
    for (const u of targetUsers) {
      const asgId = `ASG-${caseNumber}-R${nextRound}-U${u.id}`;
      await db.execute({
        sql: `INSERT OR REPLACE INTO case_assignments (
          asg_id, case_id, case_number, round, assigned_dept, dept_name, assigned_user_id, assigned_user_name, admin_name, admin_instructions, reassign_notes, status, is_accepted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
        args: [
          asgId,
          caseId,
          caseNumber,
          nextRound,
          u.deptCode,
          deptMap[u.deptCode] || u.deptCode,
          u.id,
          u.name,
          session.full_name,
          `استكمال المهمة للجولة (${nextRound}): ${reassignNotes.trim()}`,
          reassignNotes.trim(),
        ],
      });
      assignedSummary.push(u.name);
    }
  }

  // Update cases_master
  await db.execute({
    sql: "UPDATE cases_master SET status = 'assigned', current_round = ?, assigned_roles = ?, updated_at = datetime('now') WHERE id = ?",
    args: [nextRound, assignedSummary.join(", "), caseId],
  });

  // Log decision
  await db.execute({
    sql: `INSERT INTO admin_decisions (
      decision_id, case_id, case_number, round, admin_name, action_type, decision, target_roles, reassign_notes
    ) VALUES (?, ?, ?, ?, ?, 'pending_review', 'reassigned', ?, ?)`,
    args: [
      `DEC-${caseNumber}-R${nextRound}-${Math.random().toString(36).substring(2, 8)}`,
      caseId,
      caseNumber,
      nextRound,
      session.full_name,
      assignedSummary.join(", "),
      reassignNotes.trim(),
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/field");
  return { success: true, nextRound };
}

export async function closeCaseEntirelyAction(caseId: number, closureNotes: string) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "يرجى تسجيل الدخول أولاً" };
  }

  const perms = await getUserEffectivePermissions(session);

  if (!closureNotes || closureNotes.trim() === "") {
    return {
      success: false,
      error: "كتابة الملاحظات والتوجيهات الإدارية إلزامي لإغلاق الحالة نهائياً كتغذية راجعة للمنفذين",
    };
  }

  const caseRes = await db.execute({
    sql: "SELECT case_number, current_round, department_code, status FROM cases_master WHERE id = ?",
    args: [caseId],
  });
  if (caseRes.rows.length === 0) return { success: false, error: "الحالة غير موجودة" };

  const caseDept = String(caseRes.rows[0]?.department_code || "");
  const isActiveExecution = ["assigned", "in_progress"].includes(String(caseRes.rows[0]?.status || ""));
  if (isActiveExecution) {
    if (!(await hasFeaturePermission(session, "close_in_progress_case"))) {
      return { success: false, error: "لا تملك صلاحية إغلاق المهمة وهي قيد التنفيذ" };
    }
    if (perms.features.close_in_progress_case === "dept_only" && caseDept && caseDept !== session.department_code) {
      return { success: false, error: "صلاحية إغلاق المهمة محصورة بحالات إدارتك" };
    }
  } else {
    if (perms.can_close === "none") return { success: false, error: "ليس لديك صلاحية إغلاق البلاغات نهائياً" };
    if (perms.can_close === "dept_only" && caseDept && caseDept !== session.department_code) {
      return { success: false, error: "صلاحيتك محصورة بإغلاق بلاغات إدارتك فقط" };
    }
  }

  const caseNumber = Number(caseRes.rows[0].case_number);
  const round = Number(caseRes.rows[0].current_round);

  await db.execute({
    sql: "UPDATE cases_master SET status = 'closed', closed_at = datetime('now'), closed_feedback = ?, updated_at = datetime('now') WHERE id = ?",
    args: [closureNotes.trim(), caseId],
  });

  // Mark all assignments closed and store feedback for all executors to see
  await db.execute({
    sql: "UPDATE case_assignments SET status = 'closed', admin_feedback = ? WHERE case_id = ?",
    args: [closureNotes.trim(), caseId],
  });

  await db.execute({
    sql: `INSERT INTO admin_decisions (
      decision_id, case_id, case_number, round, admin_name, action_type, decision, closure_notes
    ) VALUES (?, ?, ?, ?, ?, 'pending_review', 'closed', ?)`,
    args: [
      `DEC-${caseNumber}-R${round}-${Math.random().toString(36).substring(2, 8)}`,
      caseId,
      caseNumber,
      round,
      session.full_name,
      closureNotes.trim(),
    ],
  });

  // Audit Log
  await db.execute({
    sql: `INSERT INTO audit_logs (log_id, case_number, event_type, actor_name, actor_role, prev_state, new_state, details)
          VALUES (?, ?, 'CASE_CLOSED', ?, ?, 'in_progress', 'closed', ?)`,
    args: [
      `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      caseNumber,
      session.full_name,
      session.role,
      `تم إغلاق الحالة نهائياً بتوجيه إداري: ${closureNotes.trim()}`,
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/field");
  return { success: true };
}

// ==========================================
// 🗑️ CASE DELETION (SUPER ADMIN & GENERAL ADMIN)
// ==========================================

export async function deleteCaseAction(caseId: number) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "يرجى تسجيل الدخول أولاً" };
  }

  const perms = await getUserEffectivePermissions(session);
  if (perms.can_delete !== "full") {
    return { success: false, error: "صلاحية حذف الحالات محصورة بالمدير العام ومدير النظام الأعلى فقط" };
  }

  const caseRes = await db.execute({
    sql: "SELECT case_number, internal_id FROM cases_master WHERE id = ?",
    args: [caseId],
  });

  if (caseRes.rows.length === 0) {
    return { success: false, error: "الحالة غير موجودة" };
  }

  const caseNumber = Number(caseRes.rows[0].case_number);
  const internalId = String(caseRes.rows[0].internal_id);

  // Cascading cleanup
  await db.execute({ sql: "DELETE FROM case_executions WHERE case_id = ?", args: [caseId] });
  await db.execute({ sql: "DELETE FROM case_assignments WHERE case_id = ?", args: [caseId] });
  await db.execute({ sql: "DELETE FROM admin_decisions WHERE case_id = ?", args: [caseId] });
  await db.execute({ sql: "DELETE FROM cases_master WHERE id = ?", args: [caseId] });

  // Audit Log
  await db.execute({
    sql: `INSERT INTO audit_logs (log_id, case_number, event_type, actor_name, actor_role, prev_state, new_state, details)
          VALUES (?, ?, 'CASE_DELETED', ?, ?, 'active', 'deleted', ?)`,
    args: [
      `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      caseNumber,
      session.full_name,
      session.role,
      `تم حذف الحالة رقم (${caseNumber} - ${internalId}) نهائياً وتنظيف كافة سجلاتها المتعلقة`,
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/inspector");
  revalidatePath("/field");
  return { success: true };
}

// ==========================================
// 🏢 1. DEPARTMENT MANAGEMENT ACTIONS
// ==========================================

export async function createDepartmentAction(name: string, description?: string) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الهيكل التنظيمي" };
  if (!name.trim()) return { success: false, error: "يرجى كتابة اسم الإدارة" };

  const code = `dept_${Date.now()}`;
  await db.execute({
    sql: "INSERT INTO departments (code, name, status) VALUES (?, ?, 'active')",
    args: [code, name.trim()],
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateDepartmentAction(id: number, name: string) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الهيكل التنظيمي" };
  if (!name.trim()) return { success: false, error: "يرجى كتابة اسم الإدارة" };

  await db.execute({
    sql: "UPDATE departments SET name = ? WHERE id = ?",
    args: [name.trim(), id],
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteDepartmentAction(id: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الهيكل التنظيمي" };

  await db.execute({ sql: "DELETE FROM departments WHERE id = ?", args: [id] });
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleDepartmentStatusAction(id: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الهيكل التنظيمي" };

  await db.execute({
    sql: "UPDATE departments SET status = CASE WHEN status = 'active' THEN 'disabled' ELSE 'active' END WHERE id = ?",
    args: [id],
  });

  revalidatePath("/admin");
  return { success: true };
}

// ==========================================
// 📂 2. SECTION / LOCATION MANAGEMENT ACTIONS
// ==========================================

export async function createSectionAction(deptCode: string, name: string) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الهيكل التنظيمي" };
  if (!deptCode || !name.trim()) return { success: false, error: "يرجى اختيار الإدارة وكتابة اسم القسم" };

  const code = `sec_${Date.now()}`;
  await db.execute({
    sql: "INSERT INTO locations (code, name, department_code, status) VALUES (?, ?, ?, 'active')",
    args: [code, name.trim(), deptCode],
  });

  revalidatePath("/admin");
  revalidatePath("/inspector");
  return { success: true };
}

export async function updateSectionAction(id: number, name: string, deptCode: string) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الهيكل التنظيمي" };
  if (!name.trim()) return { success: false, error: "يرجى كتابة اسم القسم" };

  await db.execute({
    sql: "UPDATE locations SET name = ?, department_code = ? WHERE id = ?",
    args: [name.trim(), deptCode, id],
  });

  revalidatePath("/admin");
  revalidatePath("/inspector");
  return { success: true };
}

export async function deleteSectionAction(id: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الهيكل التنظيمي" };

  await db.execute({ sql: "DELETE FROM locations WHERE id = ?", args: [id] });
  revalidatePath("/admin");
  revalidatePath("/inspector");
  return { success: true };
}

export async function toggleSectionStatusAction(id: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الهيكل التنظيمي" };

  await db.execute({
    sql: "UPDATE locations SET status = CASE WHEN status = 'active' THEN 'disabled' ELSE 'active' END WHERE id = ?",
    args: [id],
  });

  revalidatePath("/admin");
  revalidatePath("/inspector");
  return { success: true };
}

// ==========================================
// 🛡️ 3. CUSTOM ROLES MANAGEMENT ACTIONS
// ==========================================

export async function createCustomRoleAction(data: {
  name: string;
  category: "admin" | "inspector" | "field_agent";
  allowedDepartments: string[];
  allowedSections: string[];
  description?: string;
  permissions?: Record<string, string>;
}) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_roles"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الأدوار" };
  if (!data.name?.trim()) return { success: false, error: "يرجى إدخال مسمى الدور الوظيفي" };

  const code = `crole_${Date.now()}`;
  const deptsVal = data.allowedDepartments && data.allowedDepartments.length > 0 ? data.allowedDepartments.join(",") : "all";
  const secsVal = data.allowedSections && data.allowedSections.length > 0 ? data.allowedSections.join(",") : "all";

  const defaultPerms: Record<string, string> = {
    inspect_create: data.category === "inspector" ? "full" : "none",
    inspect_offline: "full",
    inspect_typeahead: data.category === "inspector" ? "full" : "none",
    triage_assign: data.category === "admin" ? "dept_only" : "none",
    triage_direct_user: data.category === "admin" ? "dept_only" : "none",
    triage_curated: data.category === "admin" ? "dept_only" : "none",
    field_execute: data.category === "field_agent" ? "full" : "none",
    field_feedback: "full",
    review_approve: data.category === "admin" ? "dept_only" : "none",
    review_round_bump: data.category === "admin" ? "dept_only" : "none",
    delete_cases: "none",
    export_excel: "none",
    print_pdf: "none",
    manage_structure: "none",
    manage_roles: "none",
    manage_users: "none",
    manage_forms: "none",
  };
  const permsVal = JSON.stringify({ ...defaultPerms, ...(data.permissions || {}) });

  await db.execute({
    sql: `INSERT INTO custom_roles (
      code, name, category, role_type, department_code, allowed_departments, allowed_sections, description, permissions_json, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    args: [
      code,
      data.name.trim(),
      data.category || "inspector",
      data.category || "inspector",
      deptsVal,
      deptsVal,
      secsVal,
      data.description?.trim() || null,
      permsVal,
    ],
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateCustomRoleAction(
  id: number,
  data: {
    name: string;
    category: "admin" | "inspector" | "field_agent";
    allowedDepartments: string[];
    allowedSections: string[];
    description?: string;
    permissions?: Record<string, string>;
  }
) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_roles"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الأدوار" };
  if (!data.name?.trim()) return { success: false, error: "يرجى إدخال مسمى الدور الوظيفي" };

  const deptsVal = data.allowedDepartments && data.allowedDepartments.length > 0 ? data.allowedDepartments.join(",") : "all";
  const secsVal = data.allowedSections && data.allowedSections.length > 0 ? data.allowedSections.join(",") : "all";

  if (data.permissions) {
    const existingPermissions = await db.execute({ sql: "SELECT permissions_json FROM custom_roles WHERE id = ?", args: [id] });
    let previousPermissions: Record<string, string> = {};
    try { previousPermissions = JSON.parse(String(existingPermissions.rows[0]?.permissions_json || "{}")); } catch {}
    await db.execute({
      sql: `UPDATE custom_roles SET 
        name = ?, category = ?, role_type = ?, department_code = ?, allowed_departments = ?, allowed_sections = ?, description = ?, permissions_json = ?
        WHERE id = ?`,
      args: [
        data.name.trim(),
        data.category || "inspector",
        data.category || "inspector",
        deptsVal,
        deptsVal,
        secsVal,
        data.description?.trim() || null,
        JSON.stringify({ ...previousPermissions, ...data.permissions }),
        id,
      ],
    });
  } else {
    await db.execute({
      sql: `UPDATE custom_roles SET 
        name = ?, category = ?, role_type = ?, department_code = ?, allowed_departments = ?, allowed_sections = ?, description = ?
        WHERE id = ?`,
      args: [
        data.name.trim(),
        data.category || "inspector",
        data.category || "inspector",
        deptsVal,
        deptsVal,
        secsVal,
        data.description?.trim() || null,
        id,
      ],
    });
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function updateRolePermissionsAction(
  roleCode: string,
  permissions: Record<string, string>
) {
  const session = await getSession();
  if (!session) return { success: false, error: "غير مصرح" };
  if (getPersistedDatabaseMode() !== "local") return { success: false, error: "تعديل الصلاحيات متاح في وضع قاعدة البيانات المحلية فقط" };
  const effectivePermissions = await getUserEffectivePermissions(session);
  if (session.role !== "super_admin" && session.role !== "general_admin" && effectivePermissions.features.manage_roles !== "full") {
    return { success: false, error: "صلاحية تعديل مصفوفة الصلاحيات محصورة بمدير المنظومة" };
  }
  if (roleCode === "super_admin" || roleCode === "general_admin") {
    return { success: false, error: "صلاحيات إدارة النظام العليا ثابتة ولا يمكن تعديلها من المصفوفة" };
  }

  const permsStr = JSON.stringify(permissions);

  if (roleCode.startsWith("crole_")) {
    await db.execute({
      sql: "UPDATE custom_roles SET permissions_json = ? WHERE code = ?",
      args: [permsStr, roleCode],
    });
  } else {
    await db.execute({
      sql: `INSERT OR REPLACE INTO role_permissions_matrix (role_code, role_name, permissions_json, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [roleCode, roleCode, permsStr],
    });
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteCustomRoleAction(id: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_roles"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الأدوار" };

  await db.execute({ sql: "DELETE FROM custom_roles WHERE id = ?", args: [id] });
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleCustomRoleStatusAction(id: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_roles"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الأدوار" };

  await db.execute({
    sql: "UPDATE custom_roles SET status = CASE WHEN status = 'active' THEN 'disabled' ELSE 'active' END WHERE id = ?",
    args: [id],
  });

  revalidatePath("/admin");
  return { success: true };
}

// ==========================================
// ⚠️ 4. CATEGORIES (NON-CONFORMITY CASES) ACTIONS
// ==========================================

export async function createCategoryAction(
  name: string,
  severity: "low" | "medium" | "high",
  departmentCode: string | string[] = "all",
  sectionCode: string | string[] = "all",
  description?: string
) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure"))) return { success: false, error: "تحتاج إلى صلاحية إدارة دليل الحالات" };
  if (!name || !name.trim()) return { success: false, error: "يرجى إدخال اسم حالة عدم المطابقة" };

  const code = `nc_${Date.now()}`;
  const deptsVal = Array.isArray(departmentCode)
    ? (departmentCode.length === 0 || departmentCode.includes("all") ? "all" : departmentCode.join(","))
    : (departmentCode || "all");
  const secsVal = Array.isArray(sectionCode)
    ? (sectionCode.length === 0 || sectionCode.includes("all") ? "all" : sectionCode.join(","))
    : (sectionCode || "all");

  await db.execute({
    sql: `INSERT INTO categories (code, name, severity, department_code, section_code, description, status)
          VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    args: [
      code,
      name.trim(),
      severity || "medium",
      deptsVal,
      secsVal,
      description?.trim() || null,
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/inspector");
  return { success: true };
}

export async function updateCategoryAction(
  id: number,
  name: string,
  severity: "low" | "medium" | "high",
  departmentCode: string | string[] = "all",
  sectionCode: string | string[] = "all",
  description?: string
) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure"))) return { success: false, error: "تحتاج إلى صلاحية إدارة دليل الحالات" };
  if (!name || !name.trim()) return { success: false, error: "يرجى إدخال اسم حالة عدم المطابقة" };

  const deptsVal = Array.isArray(departmentCode)
    ? (departmentCode.length === 0 || departmentCode.includes("all") ? "all" : departmentCode.join(","))
    : (departmentCode || "all");
  const secsVal = Array.isArray(sectionCode)
    ? (sectionCode.length === 0 || sectionCode.includes("all") ? "all" : sectionCode.join(","))
    : (sectionCode || "all");

  await db.execute({
    sql: `UPDATE categories SET 
      name = ?, severity = ?, department_code = ?, section_code = ?, description = ?
      WHERE id = ?`,
    args: [
      name.trim(),
      severity || "medium",
      deptsVal,
      secsVal,
      description?.trim() || null,
      id,
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/inspector");
  return { success: true };
}

export async function deleteCategoryAction(id: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure"))) return { success: false, error: "تحتاج إلى صلاحية إدارة دليل الحالات" };

  await db.execute({ sql: "DELETE FROM categories WHERE id = ?", args: [id] });
  revalidatePath("/admin");
  revalidatePath("/inspector");
  return { success: true };
}

export async function toggleCategoryStatusAction(id: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure"))) return { success: false, error: "تحتاج إلى صلاحية إدارة دليل الحالات" };

  await db.execute({
    sql: "UPDATE categories SET status = CASE WHEN status = 'active' THEN 'disabled' ELSE 'active' END WHERE id = ?",
    args: [id],
  });

  revalidatePath("/admin");
  revalidatePath("/inspector");
  return { success: true };
}

// ==========================================
// 👥 5. USERS & PIN MANAGEMENT ACTIONS
// ==========================================

export async function createUserAction(formData: FormData) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_users"))) return { success: false, error: "تحتاج إلى صلاحية إدارة المستخدمين" };

  const fullName = String(formData.get("full_name") || "").trim();
  const pinCode = String(formData.get("pin_code") || "").trim();
  const customRoleIdStr = String(formData.get("custom_role_id") || "").trim();
  const canExportExcel = formData.get("can_export_excel") === "1" ? 1 : 0;
  const canViewDailyArchive = formData.get("can_view_daily_archive") === "1" ? 1 : 0;

  if (!fullName || !pinCode) {
    return { success: false, error: "يرجى تعبئة الحقول الإلزامية (اسم الموظف ورمز المرور)" };
  }

  if (pinCode.length !== 4 || !/^\d{4}$/.test(pinCode)) {
    return { success: false, error: "يجب أن يتكون رمز المرور من 4 أرقام بالضبط" };
  }

  let customRoleId: number | null = null;
  let customRoleName: string | null = null;
  let finalRole = String(formData.get("role") || "inspector").trim();
  let departmentCode = String(formData.get("department_code") || "").trim();

  // If a unified custom role was chosen, inherit role type, role name, and default department
  if (customRoleIdStr && customRoleIdStr !== "none") {
    customRoleId = parseInt(customRoleIdStr, 10);
    const crRes = await db.execute({
      sql: "SELECT name, category, role_type, allowed_departments FROM custom_roles WHERE id = ?",
      args: [customRoleId],
    });
    if (crRes.rows.length > 0) {
      const cr = crRes.rows[0];
      customRoleName = String(cr.name);
      finalRole = String(cr.category || cr.role_type || "inspector");
      if (!departmentCode || departmentCode === "auto") {
        const allowedDepts = String(cr.allowed_departments || "all");
        departmentCode = (allowedDepts !== "all" && allowedDepts) ? allowedDepts.split(",")[0].trim() : "dept_admin";
      }
    }
  }

  if (!departmentCode) {
    departmentCode = "dept_admin";
  }

  const deptRes = await db.execute({ sql: "SELECT name FROM departments WHERE code = ?", args: [departmentCode] });
  const deptName = deptRes.rows[0]?.name ? String(deptRes.rows[0].name) : departmentCode;

  // Auto-generate sequential user number
  const maxNumRes = await db.execute("SELECT COALESCE(MAX(user_number), 100) as max_num FROM users");
  const nextUserNumber = Number(maxNumRes.rows[0]?.max_num || 100) + 1;

  await db.execute({
    sql: `INSERT INTO users (user_number, full_name, pin_code, role, department_code, department_name, job_title, can_export_excel, can_create_daily_report, can_view_daily_archive, custom_role_id, custom_role_name, is_protected, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0, 'active')`,
    args: [nextUserNumber, fullName, pinCode, finalRole, departmentCode, deptName, customRoleName || finalRole, canExportExcel, canViewDailyArchive, customRoleId, customRoleName],
  });

  revalidatePath("/admin");
  return { success: true, userNumber: nextUserNumber, message: `تم إنشاء المستخدم بنجاح برقم مستخدم (#${nextUserNumber})` };
}

export async function updateUserAction(id: number, formData: FormData) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_users"))) return { success: false, error: "تحتاج إلى صلاحية إدارة المستخدمين" };

  const fullName = String(formData.get("full_name") || "").trim();
  const customRoleIdStr = String(formData.get("custom_role_id") || "").trim();
  const canExportExcel = formData.get("can_export_excel") === "1" ? 1 : 0;
  const canViewDailyArchive = formData.get("can_view_daily_archive") === "1" ? 1 : 0;
  const pinCode = String(formData.get("pin_code") || "").trim();
  let departmentCode = String(formData.get("department_code") || "").trim();

  if (!fullName) {
    return { success: false, error: "يرجى كتابة اسم الموظف" };
  }

  let customRoleId: number | null = null;
  let customRoleName: string | null = null;
  let finalRole = String(formData.get("role") || "inspector").trim();

  if (customRoleIdStr && customRoleIdStr !== "none") {
    customRoleId = parseInt(customRoleIdStr, 10);
    const crRes = await db.execute({
      sql: "SELECT name, category, role_type, allowed_departments FROM custom_roles WHERE id = ?",
      args: [customRoleId],
    });
    if (crRes.rows.length > 0) {
      const cr = crRes.rows[0];
      customRoleName = String(cr.name);
      finalRole = String(cr.category || cr.role_type || "inspector");
      if (!departmentCode || departmentCode === "auto") {
        const allowedDepts = String(cr.allowed_departments || "all");
        departmentCode = (allowedDepts !== "all" && allowedDepts) ? allowedDepts.split(",")[0].trim() : "dept_admin";
      }
    }
  }

  if (!departmentCode) {
    const prevUser = await db.execute({ sql: "SELECT department_code FROM users WHERE id = ?", args: [id] });
    departmentCode = String(prevUser.rows[0]?.department_code || "dept_admin");
  }

  const deptRes = await db.execute({ sql: "SELECT name FROM departments WHERE code = ?", args: [departmentCode] });
  const deptName = deptRes.rows[0]?.name ? String(deptRes.rows[0].name) : departmentCode;

  if (pinCode && pinCode.length === 4) {
    await db.execute({
      sql: `UPDATE users SET full_name = ?, pin_code = ?, role = ?, department_code = ?, department_name = ?, job_title = ?, can_export_excel = ?, can_view_daily_archive = ?, custom_role_id = ?, custom_role_name = ? WHERE id = ? AND is_protected = 0`,
      args: [fullName, pinCode, finalRole, departmentCode, deptName, customRoleName || finalRole, canExportExcel, canViewDailyArchive, customRoleId, customRoleName, id],
    });
  } else {
    await db.execute({
      sql: `UPDATE users SET full_name = ?, role = ?, department_code = ?, department_name = ?, job_title = ?, can_export_excel = ?, can_view_daily_archive = ?, custom_role_id = ?, custom_role_name = ? WHERE id = ? AND is_protected = 0`,
      args: [fullName, finalRole, departmentCode, deptName, customRoleName || finalRole, canExportExcel, canViewDailyArchive, customRoleId, customRoleName, id],
    });
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteUserAction(id: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_users"))) return { success: false, error: "تحتاج إلى صلاحية إدارة المستخدمين" };

  const userRes = await db.execute({ sql: "SELECT pin_code, is_protected FROM users WHERE id = ?", args: [id] });
  if (userRes.rows.length === 0) return { success: false, error: "المستخدم غير موجود" };

  if (Number(userRes.rows[0].is_protected) === 1) {
    return { success: false, error: "لا يمكن حذف حساب القيادة العامة المحمي" };
  }

  if (userRes.rows[0]?.pin_code === session.pin_code) {
    return { success: false, error: "لا يمكنك حذف حسابك الحالي" };
  }

  await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [id] });
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleUserStatusAction(id: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_users"))) return { success: false, error: "تحتاج إلى صلاحية إدارة المستخدمين" };

  const userRes = await db.execute({ sql: "SELECT is_protected FROM users WHERE id = ?", args: [id] });
  if (userRes.rows.length > 0 && Number(userRes.rows[0].is_protected) === 1) {
    return { success: false, error: "لا يمكن تعطيل حساب القيادة المحمي" };
  }

  await db.execute({
    sql: "UPDATE users SET status = CASE WHEN status = 'active' THEN 'disabled' ELSE 'active' END WHERE id = ? AND is_protected = 0",
    args: [id],
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function toggleUserExcelAction(id: number) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_users"))) return { success: false, error: "تحتاج إلى صلاحية إدارة المستخدمين" };

  await db.execute({
    sql: "UPDATE users SET can_export_excel = CASE WHEN can_export_excel = 1 THEN 0 ELSE 1 END WHERE id = ?",
    args: [id],
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function changeUserPinAction(userId: number, newPin: string) {
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_users"))) return { success: false, error: "تحتاج إلى صلاحية إدارة المستخدمين" };

  if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    return { success: false, error: "رمز المرور الجديد يجب أن يتكون من 4 أرقام" };
  }

  await db.execute({
    sql: "UPDATE users SET pin_code = ? WHERE id = ?",
    args: [newPin, userId],
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function changeMyPinAction(currentPin: string, newPin: string) {
  const session = await getSession();
  if (!session || !(await hasFeaturePermission(session, "change_own_pin"))) return { success: false, error: "لا تملك صلاحية تغيير رمز المرور الشخصي" };

  if (session.pin_code !== currentPin) {
    return { success: false, error: "رمز المرور الحالي غير صحيح" };
  }

  if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    return { success: false, error: "رمز المرور الجديد يجب أن يتكون من 4 أرقام بالضبط" };
  }

  await db.execute({
    sql: "UPDATE users SET pin_code = ? WHERE id = ?",
    args: [newPin, session.id],
  });

  revalidatePath("/admin");
  return { success: true };
}

// Backward compatibility alias
export const createRoleAction = async (name: string, description?: string) => {
  return createCustomRoleAction({
    name,
    category: "inspector",
    allowedDepartments: ["all"],
    allowedSections: ["all"],
    description,
  });
};

export async function deleteRoleAction(id: number) {
  return deleteCustomRoleAction(id);
}
export const saveReportTemplateAction = async () => ({ success: true });
export const deleteReportTemplateAction = async () => ({ success: true });

// Backward compatibility PIN action
export async function changePinAction(currentPin: string, newPin: string) {
  return changeMyPinAction(currentPin, newPin);
}

// Database Reset Action (Protected & Safe)
export async function resetDatabaseAction(adminPin: string, resetScope: "cases_only" | "full_reset") {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "general_admin")) {
    return { success: false, error: "صلاحية تصفير البيانات محصورة بالمدير العام ومدير النظام الأعلى فقط" };
  }
  if (session.pin_code !== adminPin) {
    return { success: false, error: "رمز المرور الإداري غير صحيح للتأكيد" };
  }
  if (resetScope === "cases_only") {
    try {
      await db.execute("DELETE FROM case_executions");
      await db.execute("DELETE FROM case_assignments");
      await db.execute("DELETE FROM admin_decisions");
      try { await db.execute("DELETE FROM forms_responses"); } catch (e) {}
      await db.execute("DELETE FROM audit_logs");
      await db.execute("DELETE FROM cases_master");

      // Insert audit log for the reset event
      await db.execute({
        sql: `INSERT INTO audit_logs (log_id, case_number, event_type, actor_name, actor_role, prev_state, new_state, details)
              VALUES (?, NULL, 'DATABASE_RESET', ?, ?, NULL, 'EMPTY', 'تم تصفير جميع سجلات البلاغات والتنفيذ بنجاح والبدء من الصفر')`,
        args: [
          `LOG-RESET-${Date.now()}`,
          session.full_name,
          session.role,
        ],
      });

      revalidatePath("/admin");
      revalidatePath("/inspector");
      revalidatePath("/field");
      return { success: true, message: "تم تصفير جميع سجلات البلاغات والتنفيذ الميداني بنجاح، والنظام الآن جاهز للتشغيل من الصفر" };
    } catch (e: any) {
      return { success: false, error: e.message || "حدث خطأ أثناء التصفير" };
    }
  }
  return { success: false, error: "تم حماية تصفير الهيكل الإداري والمستخدمين منعاً لفقدان الحسابات، يمكنك تصفير البلاغات بأمان" };
}

// Bulk Import Actions for Excel
export async function bulkImportDepartmentsAction(rows: Array<{ code: string; name: string; status?: string }>) {
  if (getPersistedDatabaseMode() !== "local") return { success: false, error: "الاستيراد متاح في وضع قاعدة البيانات المحلية فقط" };
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure")) || !(await hasFeaturePermission(session, "import_excel"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الهيكل والاستيراد من Excel" };
  let count = 0;
  for (const r of rows) {
    if (!r.code || !r.name) continue;
    await db.execute({
      sql: "INSERT OR REPLACE INTO departments (code, name, status) VALUES (?, ?, ?)",
      args: [r.code.trim(), r.name.trim(), r.status || "active"],
    });
    count++;
  }
  revalidatePath("/admin");
  return { success: true, count };
}

export async function bulkImportSectionsAction(rows: Array<{ code: string; name: string; department_code: string; status?: string }>) {
  if (getPersistedDatabaseMode() !== "local") return { success: false, error: "الاستيراد متاح في وضع قاعدة البيانات المحلية فقط" };
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure")) || !(await hasFeaturePermission(session, "import_excel"))) return { success: false, error: "تحتاج إلى صلاحية إدارة الهيكل والاستيراد من Excel" };
  let count = 0;
  for (const r of rows) {
    if (!r.code || !r.name) continue;
    await db.execute({
      sql: "INSERT OR REPLACE INTO locations (code, name, department_code, status) VALUES (?, ?, ?, ?)",
      args: [r.code.trim(), r.name.trim(), r.department_code?.trim() || "", r.status || "active"],
    });
    count++;
  }
  revalidatePath("/admin");
  return { success: true, count };
}

export async function bulkImportUsersAction(rows: Array<{ full_name: string; pin_code: string; role: string; department_code?: string }>) {
  if (getPersistedDatabaseMode() !== "local") return { success: false, error: "الاستيراد متاح في وضع قاعدة البيانات المحلية فقط" };
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_users")) || !(await hasFeaturePermission(session, "import_excel"))) return { success: false, error: "تحتاج إلى صلاحية إدارة المستخدمين والاستيراد من Excel" };
  let count = 0;
  for (const r of rows) {
    if (!r.full_name || !/^\d{4}$/.test(String(r.pin_code || ""))) continue;
    const deptRes = await db.execute({
      sql: "SELECT name FROM departments WHERE code = ?",
      args: [r.department_code || ""],
    });
    const deptName = String(deptRes.rows[0]?.name || "الإدارة العامة");
    await db.execute({
      sql: "INSERT INTO users (full_name, pin_code, role, department_code, department_name, status) VALUES (?, ?, ?, ?, ?, 'active')",
      args: [r.full_name.trim(), r.pin_code.trim(), r.role || "field_agent", r.department_code || "", deptName],
    });
    count++;
  }
  revalidatePath("/admin");
  return { success: true, count };
}

export async function bulkImportCategoriesAction(rows: Array<{ code: string; name: string; severity?: string }>) {
  if (getPersistedDatabaseMode() !== "local") return { success: false, error: "الاستيراد متاح في وضع قاعدة البيانات المحلية فقط" };
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_structure")) || !(await hasFeaturePermission(session, "import_excel"))) return { success: false, error: "تحتاج إلى صلاحية إدارة دليل الحالات والاستيراد من Excel" };
  let count = 0;
  for (const r of rows) {
    if (!r.code || !r.name) continue;
    await db.execute({
      sql: "INSERT OR REPLACE INTO categories (code, name, severity, department_code, section_code, status) VALUES (?, ?, ?, 'all', 'all', 'active')",
      args: [r.code.trim(), r.name.trim(), r.severity || "medium"],
    });
    count++;
  }
  revalidatePath("/admin");
  return { success: true, count };
}

export async function bulkImportTemplatesAction(rows: Array<{ code: string; title: string; description?: string; allowed_roles?: string }>) {
  if (getPersistedDatabaseMode() !== "local") return { success: false, error: "الاستيراد متاح في وضع قاعدة البيانات المحلية فقط" };
  const session = await getSession();
  if (!isAuthorizedAdmin(session) || !(await hasFeaturePermission(session, "manage_forms")) || !(await hasFeaturePermission(session, "import_excel"))) return { success: false, error: "تحتاج إلى صلاحية إدارة النماذج والاستيراد من Excel" };
  let count = 0;
  for (const r of rows) {
    if (!r.code?.trim() || !r.title?.trim()) continue;
    await db.execute({
      sql: `INSERT INTO forms_templates (code, title, description, allowed_roles, status)
            VALUES (?, ?, ?, ?, 'active')
            ON CONFLICT(code) DO UPDATE SET title = excluded.title, description = excluded.description,
              allowed_roles = excluded.allowed_roles, status = 'active', version = COALESCE(forms_templates.version, 1) + 1`,
      args: [r.code.trim(), r.title.trim(), r.description?.trim() || null, r.allowed_roles?.trim() || "all"],
    });
    count++;
  }
  revalidatePath("/admin");
  return { success: true, count };
}

// ==========================================
// ☁️ SYSTEM DATA SYNC ACTIONS
// ==========================================

export async function pushSystemDataAction() {
  const session = await getSession();
  if (!(await hasFeaturePermission(session, "manage_sync"))) return { success: false, error: "تحتاج إلى صلاحية إدارة المزامنة" };
  try {
    const { execSync } = await import("child_process");
    const path = await import("path");
    const scriptPath = path.resolve(process.cwd(), "scripts", "sync_to_cloud.cjs");
    const output = execSync(`node "${scriptPath}"`, { encoding: "utf8" });
    revalidatePath("/admin");
    return { 
      success: true, 
      message: "تم بنجاح رفع ومزامنة كافة التحديثات والحالات وقاعدة البيانات مع سحابة Turso Cloud!" 
    };
  } catch (err: any) {
    const errText = (err.stderr || err.stdout || err.message || "").toString();
    if (errText.includes("غير متصل بالإنترنت") || errText.includes("Offline") || errText.includes("ENOTFOUND") || errText.includes("TIMEOUT") || errText.includes("ConnectTimeoutError") || errText.includes("fetch failed")) {
      return { 
        success: false, 
        error: "⚠️ تعذر الاتصال بالسحابة: جهاز الكمبيوتر غير متصل بالإنترنت حالياً (Offline). يرجى تشغيل الإنترنت/الواي فاي أولاً ثم الضغط مجدداً لتتم المزامنة." 
      };
    }
    return { success: false, error: errText || "حدث خطأ أثناء المزامنة السحابية" };
  }
}

export async function pullSystemDataAction() {
  const session = await getSession();
  if (!(await hasFeaturePermission(session, "manage_sync"))) return { success: false, error: "تحتاج إلى صلاحية إدارة المزامنة" };
  try {
    const { execSync } = await import("child_process");
    const path = await import("path");
    const scriptPath = path.resolve(process.cwd(), "scripts", "export_to_system_data.cjs");
    execSync(`node "${scriptPath}"`, { encoding: "utf8" });
    revalidatePath("/admin");
    return { success: true, message: "تم بنجاح سحب وتحديث المجلدات المحلية من سحابة Turso Cloud!" };
  } catch (err: any) {
    const errText = (err.stderr || err.stdout || err.message || "").toString();
    if (errText.includes("غير متصل بالإنترنت") || errText.includes("Offline") || errText.includes("ENOTFOUND") || errText.includes("TIMEOUT") || errText.includes("ConnectTimeoutError") || errText.includes("fetch failed")) {
      return { 
        success: false, 
        error: "⚠️ تعذر الاتصال بالسحابة: جهاز الكمبيوتر غير متصل بالإنترنت حالياً (Offline). يرجى تشغيل الإنترنت لسحب البيانات." 
      };
    }
    return { success: false, error: errText || "حدث خطأ أثناء سحب البيانات" };
  }
}

export async function syncLocalDbAction() {
  const session = await getSession();
  if (!(await hasFeaturePermission(session, "manage_sync"))) return { success: false, error: "تحتاج إلى صلاحية إدارة المزامنة" };
  try {
    const { execSync } = await import("child_process");
    const path = await import("path");
    const scriptPath = path.resolve(process.cwd(), "scripts", "sync_to_local.cjs");
    execSync(`node "${scriptPath}"`, { stdio: "pipe" });
    revalidatePath("/admin");
    return { success: true, message: "تم بنجاح بناء وتحديث قاعدة البيانات المحلية (local.db) من المجلدات!" };
  } catch (err: any) {
    return { success: false, error: err.message || "حدث خطأ أثناء بناء قاعدة البيانات المحلية" };
  }
}

export async function pushCodeToGithubAction(customMessage?: string) {
  const session = await getSession();
  if (!(await hasFeaturePermission(session, "manage_sync"))) return { success: false, error: "تحتاج إلى صلاحية إدارة تحديثات النظام" };
  try {
    const { execSync } = await import("child_process");
    const path = await import("path");
    const scriptPath = path.resolve(process.cwd(), "scripts", "push_to_github.cjs");
    const arg = customMessage ? ` "${customMessage.replace(/"/g, '\\"')}"` : "";
    const output = execSync(`node "${scriptPath}"${arg}`, { encoding: "utf8" });
    return { 
      success: true, 
      message: "تم بنجاح رفع وتحديث كود البرمجة والشاشات والتصاميم إلى مستودع GitHub الخاص بك بنجاح!" 
    };
  } catch (err: any) {
    const errText = (err.stderr || err.stdout || err.message || "").toString();
    if (errText.includes("غير متصل بالإنترنت") || errText.includes("Offline") || errText.includes("ENOTFOUND") || errText.includes("TIMEOUT")) {
      return { 
        success: false, 
        error: "⚠️ تعذر الاتصال بـ GitHub: جهاز الكمبيوتر غير متصل بالإنترنت حالياً. يرجى توصيل الإنترنت ثم المحاولة مجدداً." 
      };
    }
    return { success: false, error: errText || "حدث خطأ أثناء الرفع إلى GitHub" };
  }
}

export async function pullCodeFromGithubAction() {
  const session = await getSession();
  if (!(await hasFeaturePermission(session, "manage_sync"))) return { success: false, error: "تحتاج إلى صلاحية إدارة تحديثات النظام" };
  try {
    const { execSync } = await import("child_process");
    const path = await import("path");
    const scriptPath = path.resolve(process.cwd(), "scripts", "pull_from_github.cjs");
    const output = execSync(`node "${scriptPath}"`, { encoding: "utf8" });
    return { 
      success: true, 
      message: "تم بنجاح سحب وتحديث كود البرمجة والشاشات من مستودع GitHub!" 
    };
  } catch (err: any) {
    const errText = (err.stderr || err.stdout || err.message || "").toString();
    if (errText.includes("غير متصل بالإنترنت") || errText.includes("Offline") || errText.includes("ENOTFOUND") || errText.includes("TIMEOUT")) {
      return { 
        success: false, 
        error: "⚠️ تعذر الاتصال بـ GitHub: جهاز الكمبيوتر غير متصل بالإنترنت حالياً. يرجى توصيل الإنترنت ثم المحاولة مجدداً." 
      };
    }
    return { success: false, error: errText || "حدث خطأ أثناء السحب من GitHub" };
  }
}

// Helper: Format date/time cleanly for Excel
function formatExcelDateTime(val: any): string {
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return String(val);
  }
}

function mapCaseStatusToArabic(status: string): string {
  switch (status) {
    case "pending_assignment":
      return "بانتظار الفرز الإداري والتكليف";
    case "assigned":
    case "in_progress":
      return "قيد التنفيذ الميداني";
    case "pending_review":
      return "بانتظار المراجعة والاعتماد";
    case "closed":
      return "مغلق ومعتمد نهائياً";
    default:
      return status || "غير محدد";
  }
}

interface ScenarioStepData {
  round: number;
  assignee: string;
  status: string;
  asgTime: string;
  actionTaken: string;
  execNotes: string;
  responseTime: string;
  adminDirectives: string;
}

/**
 * 📊 تصدير السجل التراكمي الشامل للحالات إلى إكسيل (Audit Trail)
 * صف واحد لكل حالة + تمدد أفقي متكرر للسيناريوهات والمراحل + أعمدة إغلاق موحدة
 */
export async function exportCasesAuditTrailToExcelAction() {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "يجب تسجيل الدخول أولاً لتصدير التقارير" };
  }

  const canExport = (session.role === "super_admin" || session.role === "general_admin") ||
    (await hasFeaturePermission(session, "export_excel"));

  if (!canExport) {
    return { success: false, error: "غير مصرح لك بتصدير تقارير الإكسيل" };
  }

  // 1. Determine Scope
  const canViewAll =
    session.role === "super_admin" ||
    session.role === "general_admin" ||
    !session.department_code ||
    session.department_code === "dept_all";

  // 2. Fetch Cases
  let casesSql = `
    SELECT 
      c.id, c.case_number, c.internal_id, c.department_code, c.department_name,
      c.location_code, c.location_name, c.nc_code, c.nc_name,
      c.inspector_name, c.inspector_pin, c.description, c.root_cause, c.inspector_notes,
      c.status, c.current_round, c.assigned_roles, c.obs_date, c.obs_time,
      c.created_at, c.closed_at, c.closed_feedback, c.in_progress_note
    FROM cases_master c
  `;
  const casesArgs: any[] = [];
  if (!canViewAll) {
    casesSql += " WHERE c.department_code = ?";
    casesArgs.push(session.department_code);
  }
  casesSql += " ORDER BY c.case_number DESC";

  const casesRes = await db.execute({ sql: casesSql, args: casesArgs });
  const cases = casesRes.rows as unknown as any[];

  if (cases.length === 0) {
    return { success: false, error: "لا توجد حالات مسجلة متاحة للتصدير حالياً" };
  }

  // 3. Fetch All Assignments
  const asgRes = await db.execute(
    "SELECT id, asg_id, case_id, case_number, round, assigned_dept, dept_name, admin_name, admin_instructions, reassign_notes, status, created_at, completed_at, assigned_user_id, assigned_user_name, admin_feedback, is_accepted, accepted_at FROM case_assignments ORDER BY case_id ASC, round ASC, id ASC"
  );
  const allAssignments = asgRes.rows as unknown as any[];

  // 4. Fetch All Executions
  const execRes = await db.execute(
    "SELECT id, exec_id, case_id, case_number, assignment_id, round, executor_name, executor_role, role_code, action_taken, notes, created_at FROM case_executions ORDER BY case_id ASC, round ASC, id ASC"
  );
  const allExecutions = execRes.rows as unknown as any[];

  // 5. Structure Scenarios for Each Case
  const casesScenariosMap = new Map<number, ScenarioStepData[]>();

  for (const c of cases) {
    const caseId = Number(c.id);
    const caseNum = Number(c.case_number);

    const caseAsgs = allAssignments.filter(
      (a) => Number(a.case_id) === caseId || Number(a.case_number) === caseNum
    );
    const caseExecs = allExecutions.filter(
      (e) => Number(e.case_id) === caseId || Number(e.case_number) === caseNum
    );

    const scenarios: ScenarioStepData[] = [];
    const matchedExecIds = new Set<string>();

    for (const asg of caseAsgs) {
      // Find matching execution for this assignment
      const matchingExec = caseExecs.find(
        (e) =>
          String(e.assignment_id) === String(asg.asg_id) ||
          (!matchedExecIds.has(String(e.exec_id)) &&
            Number(e.round) === Number(asg.round) &&
            ((asg.assigned_user_name && e.executor_name === asg.assigned_user_name) ||
              !asg.assigned_user_name))
      );

      if (matchingExec) {
        matchedExecIds.add(String(matchingExec.exec_id));
      }

      // Assignment status
      let asgStatus = "معلق (قيد التنفيذ)";
      if (Number(asg.is_accepted) === 1 || asg.status === "approved") {
        asgStatus = "معتمد ومقبول ✅";
      } else if (asg.status === "completed") {
        asgStatus = "تم الرد (بانتظار الاعتماد) ⏳";
      } else if (asg.status === "canceled") {
        asgStatus = "ملغي ❌";
      }

      // Administrative Directives and Alerts for this stage
      const directiveParts: string[] = [];
      if (asg.admin_instructions && asg.admin_instructions.trim()) {
        directiveParts.push(`توجيه التكليف: ${asg.admin_instructions.trim()}`);
      }
      if (asg.reassign_notes && asg.reassign_notes.trim()) {
        directiveParts.push(`ملاحظات إعادة الإسناد: ${asg.reassign_notes.trim()}`);
      }
      if (asg.admin_feedback && asg.admin_feedback.trim()) {
        directiveParts.push(`تعقيب الاعتماد: ${asg.admin_feedback.trim()}`);
      }
      if (c.in_progress_note && c.in_progress_note.trim() && asg.status === "pending") {
        directiveParts.push(`تنبيه أثناء التنفيذ: ${c.in_progress_note.trim()}`);
      }
      const adminDirectives = directiveParts.length > 0 ? directiveParts.join(" | ") : "-";

      scenarios.push({
        round: Number(asg.round || 1),
        assignee: asg.assigned_user_name || asg.dept_name || "غير محدد",
        status: asgStatus,
        asgTime: formatExcelDateTime(asg.created_at),
        actionTaken: matchingExec?.action_taken || "-",
        execNotes: matchingExec?.notes || "-",
        responseTime: formatExcelDateTime(asg.completed_at || matchingExec?.created_at),
        adminDirectives,
      });
    }

    // Append any unmatched executions if present
    for (const exec of caseExecs) {
      if (!matchedExecIds.has(String(exec.exec_id))) {
        scenarios.push({
          round: Number(exec.round || 1),
          assignee: exec.executor_name || "منفذ ميداني",
          status: "تم التنفيذ الميداني",
          asgTime: "-",
          actionTaken: exec.action_taken || "-",
          execNotes: exec.notes || "-",
          responseTime: formatExcelDateTime(exec.created_at),
          adminDirectives: "-",
        });
      }
    }

    casesScenariosMap.set(caseId, scenarios);
  }

  // 6. Calculate Maximum Scenarios to Ensure Fixed Uniform Structure
  const actualMaxScenarios = Math.max(
    0,
    ...Array.from(casesScenariosMap.values()).map((s) => s.length)
  );
  // Default to at least 10 scenario blocks, or dynamically expand if cases exceed 10
  const totalScenarioColumns = Math.max(10, actualMaxScenarios);

  // 7. Define Comprehensive Excel Columns
  const columns: ExcelColumn[] = [
    // --- أولاً: البيانات الأساسية الثابتة للحالة (صف واحد لكل حالة) ---
    { header: "رقم الحالة", key: "case_number", width: 90 },
    { header: "المعرف الداخلي", key: "internal_id", width: 130 },
    { header: "الإدارة المسؤولة", key: "department_name", width: 160 },
    { header: "القسم والموقع التشغيلي", key: "location_name", width: 170 },
    { header: "نوع حالة عدم المطابقة", key: "nc_name", width: 200 },
    { header: "المفتش الراصد", key: "inspector_name", width: 130 },
    { header: "تاريخ الرصد", key: "obs_date", width: 100 },
    { header: "وقت الرصد", key: "obs_time", width: 80 },
    { header: "الوصف التفصيلي لعدم المطابقة", key: "description", width: 240 },
    { header: "السبب الجذري المرصود", key: "root_cause", width: 200 },
    { header: "ملاحظات وتوجيهات المفتش", key: "inspector_notes", width: 200 },
    { header: "الحالة العامة للبلاغ", key: "status_label", width: 140 },
    { header: "الجولة الحالية", key: "current_round", width: 90 },
    { header: "تاريخ ووقت تسجيل البلاغ", key: "created_at", width: 140 },
  ];

  // --- ثانياً: التمدد الأفقي المنظم للسيناريوهات والمراحل (1 إلى N) ---
  for (let i = 1; i <= totalScenarioColumns; i++) {
    columns.push(
      { header: `(السيناريو ${i}) المكلف بالإجراء`, key: `s${i}_assignee`, width: 150 },
      { header: `(السيناريو ${i}) حالة الإسناد`, key: `s${i}_status`, width: 130 },
      { header: `(السيناريو ${i}) تاريخ ووقت الإسناد`, key: `s${i}_asg_time`, width: 140 },
      { header: `(السيناريو ${i}) تفاصيل الإجراء الميداني المتخذ`, key: `s${i}_action`, width: 220 },
      { header: `(السيناريو ${i}) ملاحظات المنفذ الميداني`, key: `s${i}_notes`, width: 200 },
      { header: `(السيناريو ${i}) تاريخ ووقت الرد الميداني`, key: `s${i}_response_time`, width: 140 },
      { header: `(السيناريو ${i}) التوجيهات والتنبيهات الإدارية`, key: `s${i}_directives`, width: 220 }
    );
  }

  // --- ثالثاً: توثيق التغذية الراجعة والإغلاق النهائي ---
  columns.push(
    { header: "حالة الإغلاق", key: "closure_status", width: 140 },
    { header: "تاريخ ووقت الإغلاق", key: "closed_at", width: 140 },
    { header: "التغذية الراجعة والتعقيب النهائي للإدارة عند الإغلاق", key: "closed_feedback", width: 260 },
    { header: "إجمالي مراحل الإجراء والسيناريوهات", key: "total_scenarios", width: 130 }
  );

  // 8. Build Flat Rows (Exact 1-to-1 Row per Case)
  const rows: Array<Record<string, any>> = cases.map((c) => {
    const caseId = Number(c.id);
    const scenarios = casesScenariosMap.get(caseId) || [];

    const rowObj: Record<string, any> = {
      case_number: Number(c.case_number),
      internal_id: String(c.internal_id || `CAPA-2026-${String(c.case_number).padStart(4, "0")}`),
      department_name: String(c.department_name || "-"),
      location_name: String(c.location_name || "-"),
      nc_name: String(c.nc_name || "-"),
      inspector_name: String(c.inspector_name || "-"),
      obs_date: String(c.obs_date || "-"),
      obs_time: String(c.obs_time || "-"),
      description: String(c.description || "-"),
      root_cause: String(c.root_cause || "-"),
      inspector_notes: String(c.inspector_notes || "-"),
      status_label: mapCaseStatusToArabic(c.status),
      current_round: Number(c.current_round || 1),
      created_at: formatExcelDateTime(c.created_at),
    };

    // Populate every scenario column (leave empty/dash if case hasn't reached this scenario)
    for (let i = 1; i <= totalScenarioColumns; i++) {
      const s = scenarios[i - 1];
      if (s) {
        rowObj[`s${i}_assignee`] = s.assignee;
        rowObj[`s${i}_status`] = s.status;
        rowObj[`s${i}_asg_time`] = s.asgTime;
        rowObj[`s${i}_action`] = s.actionTaken;
        rowObj[`s${i}_notes`] = s.execNotes;
        rowObj[`s${i}_response_time`] = s.responseTime;
        rowObj[`s${i}_directives`] = s.adminDirectives;
      } else {
        rowObj[`s${i}_assignee`] = "-";
        rowObj[`s${i}_status`] = "-";
        rowObj[`s${i}_asg_time`] = "-";
        rowObj[`s${i}_action`] = "-";
        rowObj[`s${i}_notes`] = "-";
        rowObj[`s${i}_response_time`] = "-";
        rowObj[`s${i}_directives`] = "-";
      }
    }

    // Populate closing and audit summary
    rowObj.closure_status = c.status === "closed" ? "مغلق نهائياً ومعتمد" : "لا يزال قيد المتابعة والتنفيذ";
    rowObj.closed_at = c.closed_at ? formatExcelDateTime(c.closed_at) : "-";
    rowObj.closed_feedback = c.closed_feedback && String(c.closed_feedback).trim() ? String(c.closed_feedback).trim() : "-";
    rowObj.total_scenarios = scenarios.length;

    return rowObj;
  });

  // 9. Generate Native Excel SpreadsheetML XML
  const dateStr = new Date().toISOString().split("T")[0];
  const scopeTitle = canViewAll ? "الشامل لكافة الإدارات" : `إدارة ${session.department_name || ""}`;
  const xml = generateExcelWorkbookXML({
    title: `السجل التراكمي الشامل لحالات عدم المطابقة - ${scopeTitle} - مطعم المراسيم`,
    sheets: [
      {
        name: "السجل_التراكمي_للحالات",
        columns,
        rows,
      },
    ],
  });

  return {
    success: true,
    xml,
    count: rows.length,
    totalScenarios: totalScenarioColumns,
    filename: `marasim_capa_audit_trail_${dateStr}.xls`,
  };
}
