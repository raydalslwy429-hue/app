"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getUserEffectivePermissions } from "@/app/actions/capa";
import {
  FormTemplate,
  FormQuestion,
  FormResponse,
  FormAnswer,
  CuratedFieldDispatch,
} from "@/types/dynamic-forms";

async function hasFeaturePermission(session: NonNullable<Awaited<ReturnType<typeof getSession>>>, key: string) {
  const level = (await getUserEffectivePermissions(session)).features[key];
  if (["full", "exclusive"].includes(level)) return true;
  return level === "dept_only" && !key.startsWith("manage_") && key !== "delete_cases";
}

async function hasFeatureReadPermission(session: NonNullable<Awaited<ReturnType<typeof getSession>>>, key: string) {
  if (session.role === "super_admin" || session.role === "general_admin") return true;
  const level = (await getUserEffectivePermissions(session)).features[key];
  return ["full", "exclusive", "dept_only", "view_only"].includes(level);
}

// 1. Fetch Dynamic Templates with their Questions
export async function getDynamicTemplatesAction(userRole?: string) {
  const session = await getSession();
  if (!session || !(await hasFeatureReadPermission(session, "inspect_create"))) {
    return { success: false, error: "لا تملك صلاحية الاطلاع على استمارات التفتيش", templates: [] as FormTemplate[] };
  }
  const role = session.role === "super_admin" || session.role === "general_admin" ? userRole || session.role : session.role;

  let sql = "SELECT * FROM forms_templates WHERE status = 'active'";
  const templatesRes = await db.execute(sql);

  const templates: FormTemplate[] = [];

  for (const row of templatesRes.rows) {
    const tId = Number(row.id);
    const allowed = String(row.allowed_roles || "all");

    // Filter by allowed role unless super_admin
    if (session?.role !== "super_admin" && allowed !== "all" && !allowed.includes(role)) {
      continue;
    }

    const qRes = await db.execute({
      sql: `SELECT * FROM form_questions 
            WHERE template_id = ? 
            ORDER BY step_number ASC, order_index ASC`,
      args: [tId],
    });

    const questions: FormQuestion[] = qRes.rows.map((q: any) => ({
      id: Number(q.id),
      template_id: Number(q.template_id),
      question_code: q.question_code ? String(q.question_code) : undefined,
      question_text: String(q.question_text),
      field_type: String(q.field_type) as any,
      is_required: Boolean(q.is_required),
      options: q.options_json ? JSON.parse(String(q.options_json)) : undefined,
      options_json: q.options_json ? String(q.options_json) : undefined,
      conditional_logic: q.conditional_logic_json ? JSON.parse(String(q.conditional_logic_json)) : null,
      conditional_logic_json: q.conditional_logic_json ? String(q.conditional_logic_json) : null,
      step_number: Number(q.step_number || 1),
      order_index: Number(q.order_index || 0),
      help_text: q.help_text ? String(q.help_text) : undefined,
      placeholder: q.placeholder ? String(q.placeholder) : undefined,
    }));

    templates.push({
      id: tId,
      code: String(row.code),
      title: String(row.title),
      description: row.description ? String(row.description) : undefined,
      version: Number(row.version || 1),
      allowed_roles: allowed,
      department_code: row.department_code ? String(row.department_code) : undefined,
      status: String(row.status) as any,
      questions,
    });
  }

  return { success: true, templates };
}

// 2. Super Admin: Create Dynamic Template with Questions
export async function createDynamicTemplateAction(data: {
  code: string;
  title: string;
  description?: string;
  allowed_roles?: string;
  allowed_users_json?: string;
  department_code?: string;
  questions: Array<{
    question_code?: string;
    question_text: string;
    field_type: string;
    is_required: boolean;
    options?: string[];
    conditional_logic?: any;
    step_number: number;
    order_index: number;
    help_text?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || !(await hasFeaturePermission(session, "manage_forms"))) {
    return { success: false, error: "صلاحية إنشاء الاستمارات محصورة بالقيادة العامة للمنظومة" };
  }

  const cleanCode = data.code.trim().toLowerCase().replace(/\s+/g, "_");
  const cleanTitle = data.title.trim();

  if (!cleanCode || !cleanTitle) {
    return { success: false, error: "يرجى تحديد كود وعنوان الاستمارة" };
  }

  // Insert Template
  const tRes = await db.execute({
    sql: `INSERT INTO forms_templates (code, title, description, allowed_roles, department_code, allowed_users_json, version, status)
          VALUES (?, ?, ?, ?, ?, ?, 1, 'active')
          RETURNING id;`,
    args: [
      cleanCode,
      cleanTitle,
      data.description?.trim() || null,
      data.allowed_roles || "all",
      data.department_code || "all",
      data.allowed_users_json || "all",
    ],
  });

  const templateId = Number(tRes.rows[0]?.id);

  // Insert Questions
  for (let idx = 0; idx < data.questions.length; idx++) {
    const q = data.questions[idx];
    const qCode = q.question_code || `q_${templateId}_${idx + 1}`;
    await db.execute({
      sql: `INSERT INTO form_questions (
        template_id, question_code, question_text, field_type, is_required,
        options_json, conditional_logic_json, step_number, order_index, help_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        templateId,
        qCode,
        q.question_text.trim(),
        q.field_type,
        q.is_required ? 1 : 0,
        q.options ? JSON.stringify(q.options) : null,
        q.conditional_logic ? JSON.stringify(q.conditional_logic) : null,
        q.step_number || 1,
        idx + 1,
        q.help_text?.trim() || null,
      ],
    });
  }

  // Audit log
  await db.execute({
    sql: `INSERT INTO audit_logs (log_id, event_type, actor_name, actor_role, details)
          VALUES (?, 'FORM_TEMPLATE_CREATED', ?, 'super_admin', ?)`,
    args: [
      `LOG-FORM-${Date.now()}`,
      session.full_name,
      `تم إنشاء استمارة ديناميكية جديدة (${cleanTitle}) تضم (${data.questions.length}) سؤالاً ومرحلة.`,
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/inspector");
  return { success: true, templateId };
}

// 3. Submit Form Response (Inspector / Mobile / Offline Sync)
export async function submitFormResponseAction(data: {
  template_id: number;
  location_code: string;
  answers: Array<{
    question_id: number;
    answer_value: string;
    media_data?: string;
    gps_lat?: number;
    gps_lng?: number;
  }>;
}) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "يجب تسجيل الدخول أولاً لتسجيل الاستمارة" };
  }
  if (!(await hasFeaturePermission(session, "inspect_create"))) {
    return { success: false, error: "لا تملك صلاحية إرسال استمارات التفتيش" };
  }

  // Resolve Location & Department
  const locRes = await db.execute({
    sql: `SELECT l.name as loc_name, l.department_code, d.name as dept_name 
          FROM locations l 
          LEFT JOIN departments d ON l.department_code = d.code 
          WHERE l.code = ?`,
    args: [data.location_code],
  });

  const locationName = locRes.rows[0]?.loc_name ? String(locRes.rows[0].loc_name) : data.location_code;
  const departmentCode = locRes.rows[0]?.department_code
    ? String(locRes.rows[0].department_code)
    : (session.department_code || "dept_production");
  const departmentName = locRes.rows[0]?.dept_name
    ? String(locRes.rows[0].dept_name)
    : (session.department_name || "إدارة الإنتاج والتجهيز");

  // Sequential Response Number
  const maxRes = await db.execute("SELECT COALESCE(MAX(response_number), 0) + 1 as next_num FROM forms_responses");
  const responseNumber = Number(maxRes.rows[0]?.next_num || 1);

  // Insert Response Master
  const respInsert = await db.execute({
    sql: `INSERT INTO forms_responses (
      template_id, response_number, user_id, user_name, user_role,
      location_code, location_name, department_code, department_name, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_assignment')
    RETURNING id;`,
    args: [
      data.template_id,
      responseNumber,
      session.id,
      session.full_name,
      session.role,
      data.location_code,
      locationName,
      departmentCode,
      departmentName,
    ],
  });

  const responseId = Number(respInsert.rows[0]?.id);

  // Insert Each Answer (EAV)
  for (const ans of data.answers) {
    await db.execute({
      sql: `INSERT INTO forms_answers (
        response_id, question_id, answer_value, media_data, gps_lat, gps_lng
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        responseId,
        ans.question_id,
        ans.answer_value || "",
        ans.media_data || null,
        ans.gps_lat || null,
        ans.gps_lng || null,
      ],
    });
  }

  // Audit Log
  await db.execute({
    sql: `INSERT INTO audit_logs (log_id, event_type, actor_name, actor_role, details)
          VALUES (?, 'FORM_SUBMITTED', ?, ?, ?)`,
    args: [
      `LOG-RESP-${Date.now()}`,
      session.full_name,
      session.role,
      `تم استلام استمارة تفتيش جديدة رقم (#${responseNumber}) للقسم (${locationName}) تتبع (${departmentName}).`,
    ],
  });

  revalidatePath("/inspector");
  revalidatePath("/admin");
  return { success: true, responseNumber, responseId };
}

// 4. Dept Admin: Curate, Edit, Filter Visibility, & Assign to Field Agent
export async function curateAndAssignResponseAction(data: CuratedFieldDispatch) {
  const session = await getSession();
  if (!session || !(await hasFeaturePermission(session, "triage_curated"))) {
    return { success: false, error: "صلاحية تحرير وتنقية الإسناد محصورة بمدير الإدارة" };
  }

  const { response_id, target_agent_id, target_role, admin_instructions, hidden_question_ids, field_overrides } = data;

  // Resolve target agent name
  const agentRes = await db.execute({
    sql: "SELECT full_name, department_name FROM users WHERE id = ?",
    args: [target_agent_id],
  });
  const agentName = agentRes.rows[0]?.full_name ? String(agentRes.rows[0].full_name) : "المنفذ الميداني";

  // Update visibility on answers
  await db.execute({
    sql: "UPDATE forms_answers SET is_hidden_from_field = 0 WHERE response_id = ?",
    args: [response_id],
  });

  if (hidden_question_ids && hidden_question_ids.length > 0) {
    for (const qId of hidden_question_ids) {
      await db.execute({
        sql: "UPDATE forms_answers SET is_hidden_from_field = 1 WHERE response_id = ? AND question_id = ?",
        args: [response_id, qId],
      });
    }
  }

  // Apply any text overrides / clarifications from Admin
  if (field_overrides) {
    for (const [qIdStr, overrideVal] of Object.entries(field_overrides)) {
      const qId = Number(qIdStr);
      if (overrideVal !== undefined) {
        await db.execute({
          sql: "UPDATE forms_answers SET admin_override_value = ? WHERE response_id = ? AND question_id = ?",
          args: [String(overrideVal), response_id, qId],
        });
      }
    }
  }

  // Update response status to assigned
  await db.execute({
    sql: `UPDATE forms_responses SET 
          status = 'assigned',
          curated_notes = ?,
          hidden_questions_json = ?,
          assigned_to_role = ?,
          assigned_to_agent_id = ?,
          assigned_to_agent_name = ?,
          updated_at = datetime('now')
          WHERE id = ?`,
    args: [
      admin_instructions.trim(),
      JSON.stringify(hidden_question_ids || []),
      target_role,
      target_agent_id,
      agentName,
      response_id,
    ],
  });

  // Audit Log
  await db.execute({
    sql: `INSERT INTO audit_logs (log_id, event_type, actor_name, actor_role, details)
          VALUES (?, 'FORM_CURATED_ASSIGNED', ?, 'admin', ?)`,
    args: [
      `LOG-CUR-${Date.now()}`,
      session.full_name,
      `تم تنقية وإسناد الاستمارة رقم (#${response_id}) للمنفذ (${agentName}) مع إخفاء (${hidden_question_ids?.length || 0}) حقول.`,
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/field");
  return { success: true };
}

// 5. Fetch Responses (Scoped by Department for Dept Admin, All for Super Admin, Curated for Field)
export async function getDynamicResponsesAction(statusFilter?: string) {
  const session = await getSession();
  if (!session) return { success: false, responses: [] };

  const isSuperAdmin = session.role === "super_admin" || session.role === "general_admin";
  const isDeptAdmin = session.role === "admin";
  const isField = session.role === "field_agent";
  const isInspector = session.role === "inspector";
  const canReadResponses = isSuperAdmin
    || (isDeptAdmin && (await hasFeatureReadPermission(session, "triage_curated") || await hasFeatureReadPermission(session, "review_approve")))
    || (isField && await hasFeatureReadPermission(session, "field_execute"))
    || (isInspector && (await hasFeatureReadPermission(session, "inspect_create") || await hasFeatureReadPermission(session, "inspect_view_own")));
  if (!canReadResponses) return { success: false, responses: [] };

  let query = `
    SELECT 
      r.*,
      t.title as template_title
    FROM forms_responses r
    JOIN forms_templates t ON r.template_id = t.id
  `;

  const whereClauses: string[] = [];
  const args: any[] = [];

  if (isDeptAdmin) {
    whereClauses.push("r.department_code = ?");
    args.push(session.department_code);
  } else if (isField) {
    whereClauses.push("r.assigned_to_agent_id = ?");
    args.push(session.id);
  } else if (isInspector) {
    whereClauses.push("r.user_id = ?");
    args.push(session.id);
  }

  if (statusFilter && statusFilter !== "all") {
    whereClauses.push("r.status = ?");
    args.push(statusFilter);
  }

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  query += " ORDER BY r.response_number DESC LIMIT 100";

  const res = await db.execute({ sql: query, args });
  const responses: FormResponse[] = [];

  for (const r of res.rows) {
    const respId = Number(r.id);

    // Fetch answers
    let ansQuery = `
      SELECT 
        a.*,
        q.question_text,
        q.question_code,
        q.field_type
      FROM forms_answers a
      JOIN form_questions q ON a.question_id = q.id
      WHERE a.response_id = ?
    `;

    // If Field Agent, exclude hidden answers
    if (isField) {
      ansQuery += " AND a.is_hidden_from_field = 0";
    }

    ansQuery += " ORDER BY q.step_number ASC, q.order_index ASC";

    const ansRes = await db.execute({ sql: ansQuery, args: [respId] });
    const answers: FormAnswer[] = ansRes.rows.map((a: any) => ({
      id: Number(a.id),
      response_id: Number(a.response_id),
      question_id: Number(a.question_id),
      question_code: a.question_code ? String(a.question_code) : undefined,
      question_text: String(a.question_text),
      field_type: String(a.field_type) as any,
      answer_value: String(a.answer_value || ""),
      media_data: a.media_data ? String(a.media_data) : undefined,
      gps_lat: a.gps_lat ? Number(a.gps_lat) : undefined,
      gps_lng: a.gps_lng ? Number(a.gps_lng) : undefined,
      admin_override_value: a.admin_override_value ? String(a.admin_override_value) : undefined,
      is_hidden_from_field: Boolean(a.is_hidden_from_field),
    }));

    responses.push({
      id: respId,
      template_id: Number(r.template_id),
      template_title: String(r.template_title),
      response_number: Number(r.response_number),
      user_id: Number(r.user_id),
      user_name: String(r.user_name),
      user_role: String(r.user_role),
      location_code: r.location_code ? String(r.location_code) : undefined,
      location_name: r.location_name ? String(r.location_name) : undefined,
      department_code: String(r.department_code),
      department_name: String(r.department_name),
      status: String(r.status) as any,
      curated_notes: r.curated_notes ? String(r.curated_notes) : undefined,
      hidden_questions_json: r.hidden_questions_json ? String(r.hidden_questions_json) : undefined,
      assigned_to_role: r.assigned_to_role ? String(r.assigned_to_role) : undefined,
      assigned_to_agent_id: r.assigned_to_agent_id ? Number(r.assigned_to_agent_id) : undefined,
      assigned_to_agent_name: r.assigned_to_agent_name ? String(r.assigned_to_agent_name) : undefined,
      field_action_taken: r.field_action_taken ? String(r.field_action_taken) : undefined,
      field_notes: r.field_notes ? String(r.field_notes) : undefined,
      field_media_data: r.field_media_data ? String(r.field_media_data) : undefined,
      field_executed_at: r.field_executed_at ? String(r.field_executed_at) : undefined,
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
      answers,
    });
  }

  return { success: true, responses };
}

// 6. Field Agent: Submit Execution for Assigned Dynamic Form
export async function submitDynamicResponseExecutionAction(data: {
  responseId: number;
  actionTaken: string;
  notes?: string;
  photoBase64?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "يجب تسجيل الدخول" };
  if (session.role !== "field_agent" || !(await hasFeaturePermission(session, "field_execute"))) {
    return { success: false, error: "لا تملك صلاحية تنفيذ الاستمارات الميدانية" };
  }

  const { responseId, actionTaken, notes, photoBase64 } = data;
  if (!actionTaken || actionTaken.trim() === "") {
    return { success: false, error: "يرجى كتابة الإجراء التصحيحي المتخذ ميدانياً" };
  }

  const assignedResponse = await db.execute({
    sql: "SELECT id FROM forms_responses WHERE id = ? AND assigned_to_agent_id = ? AND status = 'assigned'",
    args: [responseId, session.id],
  });
  if (assignedResponse.rows.length === 0) return { success: false, error: "الاستمارة غير مسندة إليك أو تم إرسالها مسبقاً" };

  await db.execute({
    sql: `UPDATE forms_responses SET
          status = 'pending_review',
          field_action_taken = ?,
          field_notes = ?,
          field_media_data = ?,
          field_executed_at = datetime('now'),
          updated_at = datetime('now')
          WHERE id = ? AND assigned_to_agent_id = ? AND status = 'assigned'`,
    args: [
      actionTaken.trim(),
      notes?.trim() || null,
      photoBase64 || null,
      responseId,
      session.id,
    ],
  });

  await db.execute({
    sql: `INSERT INTO audit_logs (log_id, event_type, actor_name, actor_role, details)
          VALUES (?, 'FIELD_EXECUTED_DYNAMIC_FORM', ?, ?, ?)`,
    args: [
      `LOG-FEX-${Date.now()}`,
      session.full_name,
      session.role,
      `تم إنجاز المعالجة الميدانية للاستمارة رقم (#${responseId}) بواسطة (${session.full_name}).`,
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/field");
  return { success: true };
}

// 7. Admin: Review and Approve/Return Dynamic Form Response
export async function reviewDynamicResponseAction(data: {
  responseId: number;
  decision: "approve" | "return";
  adminNotes?: string;
}) {
  const session = await getSession();
  if (!session || !(await hasFeaturePermission(session, "review_approve"))) {
    return { success: false, error: "غير مصرح" };
  }

  const { responseId, decision, adminNotes } = data;
  const newStatus = decision === "approve" ? "completed" : "assigned";

  await db.execute({
    sql: `UPDATE forms_responses SET
          status = ?,
          curated_notes = CASE WHEN ? = 'return' THEN ? ELSE curated_notes END,
          updated_at = datetime('now')
          WHERE id = ?`,
    args: [
      newStatus,
      decision,
      adminNotes?.trim() || "يرجى استكمال المعالجة الميدانية",
      responseId,
    ],
  });

  await db.execute({
    sql: `INSERT INTO audit_logs (log_id, event_type, actor_name, actor_role, details)
          VALUES (?, ?, ?, 'admin', ?)`,
    args: [
      `LOG-REV-${Date.now()}`,
      decision === "approve" ? "DYNAMIC_FORM_APPROVED" : "DYNAMIC_FORM_RETURNED",
      session.full_name,
      decision === "approve"
        ? `تم اعتماد وإغلاق الاستمارة رقم (#${responseId}) بنجاح.`
        : `تم إعادة الاستمارة رقم (#${responseId}) للمنفذ لاستكمال الملاحظات: ${adminNotes}`,
    ],
  });

  revalidatePath("/admin");
  revalidatePath("/field");
  return { success: true };
}

// 6. Export Dynamic Template Responses to Flattened Column-based Excel Structure
export async function exportDynamicFormToExcelAction(templateId: number) {
  const session = await getSession();
  if (!session) return { success: false, error: "يجب تسجيل الدخول" };
  const exportLevel = (await getUserEffectivePermissions(session)).features.export_excel;
  if (!["full", "exclusive", "dept_only"].includes(exportLevel)) return { success: false, error: "لا تملك صلاحية تصدير تقارير Excel" };
  if (exportLevel === "dept_only" && !session.department_code) return { success: false, error: "لا يمكن تحديد نطاق الإدارة لتصدير التقرير" };

  // Fetch Template & Questions
  const tRes = await db.execute({ sql: "SELECT * FROM forms_templates WHERE id = ?", args: [templateId] });
  if (tRes.rows.length === 0) return { success: false, error: "الاستمارة غير موجودة" };
  const template = tRes.rows[0];

  const qRes = await db.execute({
    sql: "SELECT id, question_text, question_code FROM form_questions WHERE template_id = ? ORDER BY step_number ASC, order_index ASC",
    args: [templateId],
  });
  const questions = qRes.rows;

  // Build Column Definitions
  const columns: Array<{ header: string; key: string; width?: number }> = [
    { header: "رقم الاستمارة", key: "response_number", width: 100 },
    { header: "تاريخ التسجيل", key: "created_at", width: 120 },
    { header: "المفتش الراصد", key: "inspector_name", width: 130 },
    { header: "الإدارة المعنية", key: "department_name", width: 140 },
    { header: "الموقع / القسم", key: "location_name", width: 140 },
    { header: "حالة المعاملة", key: "status", width: 120 },
  ];

  // Add each dynamic question as its own discrete column
  questions.forEach((q: any) => {
    columns.push({
      header: String(q.question_text),
      key: `q_${q.id}`,
      width: 160,
    });
  });

  // Add curation & field completion columns
  columns.push(
    { header: "المنفذ المكلف", key: "assigned_agent", width: 130 },
    { header: "توجيهات الإدارة المنقحة", key: "curated_notes", width: 180 },
    { header: "تاريخ آخر تحديث", key: "updated_at", width: 120 }
  );

  // Fetch Responses for this template (Department scoped if Dept Admin)
  let respQuery = "SELECT * FROM forms_responses WHERE template_id = ?";
  const respArgs: any[] = [templateId];

  if (exportLevel === "dept_only" && session.department_code) {
    respQuery += " AND department_code = ?";
    respArgs.push(session.department_code);
  }
  respQuery += " ORDER BY response_number DESC";

  const responsesRes = await db.execute({ sql: respQuery, args: respArgs });

  // Fetch all answers for these responses
  const answersRes = await db.execute({
    sql: `SELECT a.* FROM forms_answers a 
          JOIN forms_responses r ON a.response_id = r.id 
          WHERE r.template_id = ?`,
    args: [templateId],
  });

  const answers = answersRes.rows;

  // Flatten rows
  const rows: Array<Record<string, any>> = responsesRes.rows.map((r: any) => {
    const rId = Number(r.id);
    const rAnswers = answers.filter((a: any) => Number(a.response_id) === rId);

    const rowObj: Record<string, any> = {
      response_number: Number(r.response_number),
      created_at: String(r.created_at),
      inspector_name: String(r.user_name),
      department_name: String(r.department_name),
      location_name: String(r.location_name || "-"),
      status:
        r.status === "pending_assignment"
          ? "بانتظار الفرز الإداري"
          : r.status === "assigned"
          ? "قيد التنفيذ الميداني"
          : r.status === "pending_review"
          ? "قيد المراجعة والاعتماد"
          : "مكتمل ومعتمد",
      assigned_agent: String(r.assigned_to_agent_name || "-"),
      curated_notes: String(r.curated_notes || "-"),
      updated_at: String(r.updated_at),
    };

    // Populate dynamic question answers
    questions.forEach((q: any) => {
      const ans = rAnswers.find((a: any) => Number(a.question_id) === Number(q.id));
      rowObj[`q_${q.id}`] = ans ? String(ans.admin_override_value || ans.answer_value || "-") : "-";
    });

    return rowObj;
  });

  return {
    success: true,
    sheetName: String(template.title),
    columns,
    rows,
  };
}
