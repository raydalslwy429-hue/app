import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateExcelWorkbookXML } from "@/lib/excel-helper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    // 1. Verify Security Token
    const validSecret =
      process.env.EXCEL_EXPORT_SECRET ||
      process.env.SESSION_SECRET ||
      "marasim_excel_sync_key_2026_secure";

    if (!secret || secret !== validSecret) {
      return NextResponse.json(
        {
          error: "401 Unauthorized",
          message: "رمز الأمان السري (Secret Token) غير صالح أو مفقود. يرجى تمرير ?secret=YOUR_TOKEN في رابط الاستعلام.",
        },
        { status: 401 }
      );
    }

    // Optional query filters
    const templateId = searchParams.get("template_id");
    const deptFilter = searchParams.get("dept");
    const statusFilter = searchParams.get("status");
    const outputFormat = searchParams.get("format")?.toLowerCase(); // 'json' (default) or 'excel'/'xls'
    const reportType = searchParams.get("type")?.toLowerCase() || "forms"; // 'forms' or 'cases'

    // ================= BRANCH A: CLASSIC CAPA CASES (AUDIT TRAIL & HORIZONTAL SCENARIOS) =================
    if (reportType === "cases") {
      let casesSql = `
        SELECT 
          c.id, c.case_number, c.internal_id, c.department_code, c.department_name,
          c.location_code, c.location_name, c.nc_code, c.nc_name,
          c.inspector_name, c.inspector_pin, c.description, c.root_cause, c.inspector_notes,
          c.status, c.current_round, c.assigned_roles, c.obs_date, c.obs_time,
          c.created_at, c.closed_at, c.closed_feedback, c.in_progress_note
        FROM cases_master c
        WHERE 1=1
      `;
      const casesArgs: any[] = [];
      if (deptFilter && deptFilter !== "all") {
        casesSql += " AND c.department_code = ?";
        casesArgs.push(deptFilter);
      }
      if (statusFilter && statusFilter !== "all") {
        casesSql += " AND c.status = ?";
        casesArgs.push(statusFilter);
      }
      casesSql += " ORDER BY c.case_number DESC";

      const casesRes = await db.execute({ sql: casesSql, args: casesArgs });
      const cases = casesRes.rows as unknown as any[];

      // Fetch all assignments & executions
      const asgRes = await db.execute(
        "SELECT id, asg_id, case_id, case_number, round, assigned_dept, dept_name, admin_name, admin_instructions, reassign_notes, status, created_at, completed_at, assigned_user_id, assigned_user_name, admin_feedback, is_accepted, accepted_at FROM case_assignments ORDER BY case_id ASC, round ASC, id ASC"
      );
      const allAssignments = asgRes.rows as unknown as any[];

      const execRes = await db.execute(
        "SELECT id, exec_id, case_id, case_number, assignment_id, round, executor_name, executor_role, role_code, action_taken, notes, created_at FROM case_executions ORDER BY case_id ASC, round ASC, id ASC"
      );
      const allExecutions = execRes.rows as unknown as any[];

      // Format date helper
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

      const mapStatus = (s: string) => {
        switch (s) {
          case "pending_assignment": return "بانتظار الفرز الإداري";
          case "assigned":
          case "in_progress": return "قيد التنفيذ الميداني";
          case "pending_review": return "بانتظار المراجعة والاعتماد";
          case "closed": return "مغلق ومعتمد";
          default: return s || "-";
        }
      };

      // Map scenarios for each case
      const casesMap = new Map<number, any[]>();
      cases.forEach((c) => {
        const cId = Number(c.id);
        const cNum = Number(c.case_number);
        const cAsgs = allAssignments.filter((a) => Number(a.case_id) === cId || Number(a.case_number) === cNum);
        const cExecs = allExecutions.filter((e) => Number(e.case_id) === cId || Number(e.case_number) === cNum);

        const scenarios: any[] = [];
        const usedExecs = new Set<string>();

        cAsgs.forEach((asg) => {
          const matchedExec = cExecs.find(
            (e) =>
              String(e.assignment_id) === String(asg.asg_id) ||
              (!usedExecs.has(String(e.exec_id)) &&
                Number(e.round) === Number(asg.round) &&
                ((asg.assigned_user_name && e.executor_name === asg.assigned_user_name) || !asg.assigned_user_name))
          );
          if (matchedExec) usedExecs.add(String(matchedExec.exec_id));

          let asgStatus = "معلق (قيد التنفيذ)";
          if (Number(asg.is_accepted) === 1 || asg.status === "approved") {
            asgStatus = "معتمد ومقبول";
          } else if (asg.status === "completed") {
            asgStatus = "تم الرد (بانتظار الاعتماد)";
          } else if (asg.status === "canceled") {
            asgStatus = "ملغي";
          }

          const dirParts: string[] = [];
          if (asg.admin_instructions) dirParts.push(`توجيه الإسناد: ${asg.admin_instructions}`);
          if (asg.reassign_notes) dirParts.push(`ملاحظات الإعادة: ${asg.reassign_notes}`);
          if (asg.admin_feedback) dirParts.push(`تعقيب الاعتماد: ${asg.admin_feedback}`);
          if (c.in_progress_note && asg.status === "pending") dirParts.push(`تنبيه التنفيذ: ${c.in_progress_note}`);

          scenarios.push({
            assignee: asg.assigned_user_name || asg.dept_name || "-",
            status: asgStatus,
            asgTime: fmtDate(asg.created_at),
            action: matchedExec?.action_taken || "-",
            notes: matchedExec?.notes || "-",
            resTime: fmtDate(asg.completed_at || matchedExec?.created_at),
            directives: dirParts.length > 0 ? dirParts.join(" | ") : "-",
          });
        });

        cExecs.forEach((e) => {
          if (!usedExecs.has(String(e.exec_id))) {
            scenarios.push({
              assignee: e.executor_name || "منفذ ميداني",
              status: "تم التنفيذ الميداني",
              asgTime: "-",
              action: e.action_taken || "-",
              notes: e.notes || "-",
              resTime: fmtDate(e.created_at),
              directives: "-",
            });
          }
        });

        casesMap.set(cId, scenarios);
      });

      const actualMax = Math.max(0, ...Array.from(casesMap.values()).map((s) => s.length));
      const totalScenarios = Math.max(10, actualMax);

      const columns: any[] = [
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

      for (let i = 1; i <= totalScenarios; i++) {
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

      columns.push(
        { header: "حالة الإغلاق", key: "closure_status", width: 140 },
        { header: "تاريخ ووقت الإغلاق", key: "closed_at", width: 140 },
        { header: "التغذية الراجعة والتعقيب النهائي للإدارة عند الإغلاق", key: "closed_feedback", width: 260 },
        { header: "إجمالي مراحل الإجراء والسيناريوهات", key: "total_scenarios", width: 130 }
      );

      const flatRows: Array<Record<string, any>> = cases.map((c) => {
        const cId = Number(c.id);
        const scenarios = casesMap.get(cId) || [];

        const row: Record<string, any> = {
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
          status_label: mapStatus(c.status),
          current_round: Number(c.current_round || 1),
          created_at: fmtDate(c.created_at),
        };

        for (let i = 1; i <= totalScenarios; i++) {
          const s = scenarios[i - 1];
          if (s) {
            row[`s${i}_assignee`] = s.assignee;
            row[`s${i}_status`] = s.status;
            row[`s${i}_asg_time`] = s.asgTime;
            row[`s${i}_action`] = s.action;
            row[`s${i}_notes`] = s.notes;
            row[`s${i}_response_time`] = s.resTime;
            row[`s${i}_directives`] = s.directives;
          } else {
            row[`s${i}_assignee`] = "-";
            row[`s${i}_status`] = "-";
            row[`s${i}_asg_time`] = "-";
            row[`s${i}_action`] = "-";
            row[`s${i}_notes`] = "-";
            row[`s${i}_response_time`] = "-";
            row[`s${i}_directives`] = "-";
          }
        }

        row.closure_status = c.status === "closed" ? "مغلق نهائياً ومعتمد" : "لا يزال قيد المتابعة والتنفيذ";
        row.closed_at = c.closed_at ? fmtDate(c.closed_at) : "-";
        row.closed_feedback = c.closed_feedback ? String(c.closed_feedback) : "-";
        row.total_scenarios = scenarios.length;

        return row;
      });

      if (outputFormat === "excel" || outputFormat === "xls") {
        const xml = generateExcelWorkbookXML({
          title: "تقرير السجل التراكمي الشامل لحالات عدم المطابقة - مطعم المراسيم",
          sheets: [
            {
              name: "السجل_التراكمي_للحالات",
              columns,
              rows: flatRows,
            },
          ],
        });

        return new NextResponse(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.ms-excel; charset=utf-8",
            "Content-Disposition": 'attachment; filename="marasim_capa_audit_trail.xls"',
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        });
      }

      return NextResponse.json(flatRows, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

    // ================= BRANCH B: FLATTENED DYNAMIC FORMS (EAV) =================
    // 2. Fetch Templates & Questions
    const templatesRes = await db.execute(
      "SELECT id, code, title, allowed_roles, department_code FROM forms_templates"
    );
    const templates = templatesRes.rows as unknown as any[];
    const templateMap = new Map<number, any>(templates.map((t) => [Number(t.id), t]));

    let questionsSql = "SELECT * FROM form_questions";
    const qArgs: any[] = [];
    if (templateId) {
      questionsSql += " WHERE template_id = ?";
      qArgs.push(Number(templateId));
    }
    questionsSql += " ORDER BY template_id ASC, step_number ASC, order_index ASC";

    const questionsRes = await db.execute({ sql: questionsSql, args: qArgs });
    const questions = questionsRes.rows as unknown as any[];

    // Group questions by template_id
    const questionsByTemplate = new Map<number, any[]>();
    for (const q of questions) {
      const tId = Number(q.template_id);
      if (!questionsByTemplate.has(tId)) {
        questionsByTemplate.set(tId, []);
      }
      questionsByTemplate.get(tId)!.push(q);
    }

    // 3. Fetch Responses
    let responsesSql = "SELECT * FROM forms_responses WHERE 1=1";
    const rArgs: any[] = [];

    if (templateId) {
      responsesSql += " AND template_id = ?";
      rArgs.push(Number(templateId));
    }
    if (deptFilter) {
      responsesSql += " AND department_code = ?";
      rArgs.push(deptFilter);
    }
    if (statusFilter && statusFilter !== "all") {
      responsesSql += " AND status = ?";
      rArgs.push(statusFilter);
    }
    responsesSql += " ORDER BY response_number DESC";

    const responsesRes = await db.execute({ sql: responsesSql, args: rArgs });
    const responses = responsesRes.rows as unknown as any[];

    // 4. Fetch All Associated Answers
    let answersSql = `
      SELECT a.* FROM forms_answers a
      JOIN forms_responses r ON a.response_id = r.id
      WHERE 1=1
    `;
    const aArgs: any[] = [];
    if (templateId) {
      answersSql += " AND r.template_id = ?";
      aArgs.push(Number(templateId));
    }
    if (deptFilter) {
      answersSql += " AND r.department_code = ?";
      aArgs.push(deptFilter);
    }
    if (statusFilter && statusFilter !== "all") {
      answersSql += " AND r.status = ?";
      aArgs.push(statusFilter);
    }

    const answersRes = await db.execute({ sql: answersSql, args: aArgs });
    const answers = answersRes.rows as unknown as any[];

    // Group answers by response_id
    const answersByResponse = new Map<number, any[]>();
    for (const a of answers) {
      const rId = Number(a.response_id);
      if (!answersByResponse.has(rId)) {
        answersByResponse.set(rId, []);
      }
      answersByResponse.get(rId)!.push(a);
    }

    // Collect all unique question texts for consistent tabular header structure
    const allUniqueQuestions: string[] = [];
    questions.forEach((q) => {
      const qText = String(q.question_text).trim();
      if (!allUniqueQuestions.includes(qText)) {
        allUniqueQuestions.push(qText);
      }
    });

    // 5. Flatten EAV into Clean 2D Records
    const flatRows: Array<Record<string, any>> = responses.map((r) => {
      const rId = Number(r.id);
      const tId = Number(r.template_id);
      const tmpl = templateMap.get(tId);
      const rAnswers = answersByResponse.get(rId) || [];
      const tQuestions = questionsByTemplate.get(tId) || [];

      // Map Arabic status labels
      let statusArabic = "غير محدد";
      switch (r.status) {
        case "pending_assignment":
          statusArabic = "بانتظار الفرز الإداري";
          break;
        case "assigned":
          statusArabic = "قيد المعالجة الميدانية";
          break;
        case "pending_review":
          statusArabic = "بانتظار المراجعة والاعتماد";
          break;
        case "completed":
          statusArabic = "مكتمل ومعتمد";
          break;
        case "rejected":
          statusArabic = "مرفوض للاستكمال";
          break;
        default:
          statusArabic = String(r.status);
      }

      // Base Record Metadata
      const row: Record<string, any> = {
        "رقم_الاستمارة": `FR-${r.response_number}`,
        "عنوان_النموذج": tmpl ? tmpl.title : "استمارة فحص جودة",
        "تاريخ_الرصد": String(r.created_at || ""),
        "المفتش_الراصد": String(r.user_name || ""),
        "الإدارة_المعنية": String(r.department_name || ""),
        "القسم_الموقع": String(r.location_name || "-"),
        "حالة_المعاملة": statusArabic,
      };

      // Map each Question to its Column
      allUniqueQuestions.forEach((qText) => {
        // Find if this question exists in this template
        const matchQ = tQuestions.find((q) => String(q.question_text).trim() === qText);
        if (!matchQ) {
          row[qText] = "-";
          return;
        }

        const matchAns = rAnswers.find((a) => Number(a.question_id) === Number(matchQ.id));
        if (!matchAns) {
          row[qText] = "-";
          return;
        }

        // Format value: Override > GPS > Media > Raw Value
        if (matchAns.admin_override_value) {
          row[qText] = String(matchAns.admin_override_value);
        } else if (matchAns.gps_lat) {
          row[qText] = `${matchAns.gps_lat}, ${matchAns.gps_lng}`;
        } else if (matchAns.media_data) {
          row[qText] = "[صورة مرفقة]";
        } else {
          row[qText] = matchAns.answer_value !== null && matchAns.answer_value !== undefined ? String(matchAns.answer_value) : "-";
        }
      });

      // Post-Inspection Curation & Field Execution Columns
      row["المنفذ_المكلف"] = String(r.assigned_to_agent_name || "-");
      row["التوجيهات_الإدارية_المنقحة"] = String(r.curated_notes || "-");
      row["الإجراء_التصحيحي_الميداني"] = String(r.field_action_taken || "-");
      row["ملاحظات_المنفذ"] = String(r.field_notes || "-");
      row["تاريخ_التنفيذ_الميداني"] = String(r.field_executed_at || "-");
      row["تاريخ_آخر_تحديث"] = String(r.updated_at || "");

      return row;
    });

    // ================= BRANCH C: NATIVE EXCEL WORKBOOK STREAMING =================
    if (outputFormat === "excel" || outputFormat === "xls") {
      const columns = Object.keys(flatRows[0] || { "رقم_الاستمارة": "" }).map((k) => ({
        header: k,
        key: k,
        width: 150,
      }));

      const xml = generateExcelWorkbookXML({
        title: "تقرير البلاغات والاستمارات الحية - مطعم المراسيم",
        sheets: [
          {
            name: "البيانات_الحية",
            columns,
            rows: flatRows,
          },
        ],
      });

      return new NextResponse(xml, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": 'attachment; filename="almarasim_live_data.xls"',
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

    // ================= DEFAULT: CLEAN 2D JSON ARRAY FOR POWER QUERY =================
    return NextResponse.json(flatRows, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Live Excel API Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error?.message || "حدث خطأ أثناء استخراج وتسطيح بيانات الاستمارات.",
      },
      { status: 500 }
    );
  }
}
