import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import AdminManager from "./AdminManager";
import { getUserEffectivePermissions } from "@/app/actions/capa";

const toPlain = <T,>(data: T): T => JSON.parse(JSON.stringify(data));

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userPerms = await getUserEffectivePermissions(session);
  const canManageSystem = ["manage_structure", "manage_roles", "manage_users", "manage_forms", "print_pdf", "export_excel"].some(
    (key) => userPerms.features[key] === "full"
  );
  if (session.role !== "admin" && session.role !== "super_admin" && session.role !== "general_admin" && !canManageSystem) {
    redirect("/");
  }

  // 0. Resolve Effective User Permissions & Department Scoping
  const isSuperAdmin = session.role === "super_admin" || session.role === "general_admin";
  const canViewAll = isSuperAdmin || userPerms.can_view === "full";
  const userDept = session.department_code;
  const canViewFeature = (key: string) => ["full", "exclusive", "dept_only", "view_only"].includes(userPerms.features[key]);
  const canViewFeatureAll = (key: string) => isSuperAdmin || ["full", "exclusive"].includes(userPerms.features[key]);

  // 1. Fetch Lookups & Structure
  const deptsRes = await db.execute("SELECT id, code, name, status, created_at FROM departments ORDER BY name ASC");
  const departments = deptsRes.rows as unknown as any[];

  // In Turso, sections are stored in locations with department_code
  const sectionsRes = await db.execute(`
    SELECT l.id, l.code, l.name, l.department_code, COALESCE(d.name, l.department_code) as department_name, l.status, l.created_at 
    FROM locations l 
    LEFT JOIN departments d ON l.department_code = d.code 
    ORDER BY d.name ASC, l.name ASC
  `);
  const sections = sectionsRes.rows as unknown as any[];

  // Roles from custom_roles
  const rolesRes = await db.execute("SELECT id, code, name, category, department_code, status, allowed_departments, allowed_sections, role_type, description, permissions_json, created_at FROM custom_roles ORDER BY id DESC");
  const roles = rolesRes.rows as unknown as any[];

  // Role permissions matrix
  const matrixRes = await db.execute("SELECT role_code, role_name, permissions_json FROM role_permissions_matrix");
  const permissionsMatrix = matrixRes.rows as unknown as any[];

  // Users with user_number, excel, daily report and archive permissions
  const usersRes = await db.execute("SELECT id, user_number, full_name, pin_code, role, department_code, department_name, status, job_title, is_protected, can_export_excel, can_create_daily_report, COALESCE(can_view_daily_archive, 0) as can_view_daily_archive, custom_role_id, custom_role_name, created_at FROM users ORDER BY COALESCE(user_number, id) ASC");
  const allUsers = usersRes.rows as unknown as any[];

  const canListExecutors = canViewFeature("view_executor_directory") || canViewFeature("triage_assign") || canViewFeature("triage_direct_user");
  const canListExecutorsAcrossDepartments = canViewFeatureAll("view_executor_directory") || canViewFeatureAll("triage_assign") || canViewFeatureAll("triage_direct_user");
  const fieldRoles = allUsers
    .filter((u: any) => u.role === "field_agent" && u.status !== "disabled" && canListExecutors && (canListExecutorsAcrossDepartments || String(u.department_code) === userDept))
    .map((r: any) => ({
      id: Number(r.id),
      user_number: r.user_number ? Number(r.user_number) : undefined,
      userNumber: r.user_number ? Number(r.user_number) : undefined,
      code: String(r.department_code),
      department_code: String(r.department_code),
      department_name: String(r.department_name),
      name: String(r.department_name),
      full_name: String(r.full_name),
      officerName: String(r.full_name),
      job_title: r.job_title ? String(r.job_title) : undefined,
      jobTitle: r.job_title ? String(r.job_title) : undefined,
      role: String(r.role),
    }));

  // Categories (حالات عدم المطابقة) with department and section names
  const categoriesRes = await db.execute(`
    SELECT c.id, c.code, c.name, c.severity, c.department_code, c.section_code, c.status, c.description, c.created_at,
           COALESCE(d.name, c.department_code) as department_name,
           COALESCE(l.name, c.section_code) as section_name
    FROM categories c
    LEFT JOIN departments d ON c.department_code = d.code
    LEFT JOIN locations l ON c.section_code = l.code
    ORDER BY c.id DESC
  `);
  const categories = categoriesRes.rows as unknown as any[];

  const locations = sections;

  // 2. Fetch Cases Pending Assignment (الحالات المفتوحة) - Scoped by Department
  const pendingCasesRes = await db.execute(
    canViewFeatureAll("view_open_cases")
      ? {
          sql: `SELECT id, case_number, internal_id, department_code, department_name, location_code, location_name, nc_code, nc_name, inspector_name, description, root_cause, inspector_notes, obs_date, obs_time, status, current_round
                FROM cases_master
                WHERE status = 'pending_assignment'
                ORDER BY case_number ASC`,
          args: [],
        }
      : {
          sql: `SELECT id, case_number, internal_id, department_code, department_name, location_code, location_name, nc_code, nc_name, inspector_name, description, root_cause, inspector_notes, obs_date, obs_time, status, current_round
                FROM cases_master
                WHERE status = 'pending_assignment' AND (department_code = ? OR department_code IS NULL)
                ORDER BY case_number ASC`,
          args: [userDept],
        }
  );
  const pendingCases = canViewFeature("view_open_cases") ? pendingCasesRes.rows as unknown as any[] : [];

  // 3. Fetch Cases In Progress in Field (الحالات قيد التنفيذ) - Scoped by Department
  const inProgressCasesRes = await db.execute(
    canViewFeatureAll("view_in_progress_cases")
      ? {
          sql: `SELECT c.id, c.case_number, c.internal_id, c.department_code, c.department_name, c.location_name, c.nc_name, c.inspector_name, c.description, c.root_cause, c.inspector_notes, c.in_progress_note, c.status, c.current_round, c.assigned_roles, c.obs_date, c.obs_time, c.created_at,
                       GROUP_CONCAT(DISTINCT a.assigned_user_id) as assigned_user_ids,
                       GROUP_CONCAT(COALESCE(a.assigned_user_name, a.dept_name) || ' (' || a.status || ')') as assignments_summary
                FROM cases_master c
                LEFT JOIN case_assignments a ON c.id = a.case_id AND c.current_round = a.round
                WHERE c.status IN ('assigned', 'in_progress', 'pending_review')
                GROUP BY c.id
                ORDER BY c.case_number DESC`,
          args: [],
        }
      : {
          sql: `SELECT c.id, c.case_number, c.internal_id, c.department_code, c.department_name, c.location_name, c.nc_name, c.inspector_name, c.description, c.root_cause, c.inspector_notes, c.in_progress_note, c.status, c.current_round, c.assigned_roles, c.obs_date, c.obs_time, c.created_at,
                       GROUP_CONCAT(DISTINCT a.assigned_user_id) as assigned_user_ids,
                       GROUP_CONCAT(COALESCE(a.assigned_user_name, a.dept_name) || ' (' || a.status || ')') as assignments_summary
                FROM cases_master c
                LEFT JOIN case_assignments a ON c.id = a.case_id AND c.current_round = a.round
                WHERE c.status IN ('assigned', 'in_progress', 'pending_review') AND (c.department_code = ? OR a.assigned_dept = ?)
                GROUP BY c.id
                ORDER BY c.case_number DESC`,
          args: [userDept, userDept],
        }
  );
  const inProgressCases = canViewFeature("view_in_progress_cases") ? inProgressCasesRes.rows as unknown as any[] : [];

  // 4. Fetch Completed Field Executions Waiting for Admin Review - Scoped by Department
  const reviewRes = await db.execute(
    canViewFeatureAll("view_review_cases")
      ? {
          sql: `SELECT 
                  e.id as exec_row_id, e.exec_id, e.case_id, e.case_number, e.assignment_id, e.round,
                  e.executor_name, e.executor_role, e.role_code, e.action_taken, e.notes as exec_notes, e.created_at as exec_time,
                  c.department_code, c.department_name, c.location_name, c.nc_name, c.inspector_name,
                  c.description as case_desc, c.root_cause as case_cause, c.inspector_notes as case_inspector_notes, c.obs_date, c.obs_time,
                  c.nc_name as title, c.nc_name as category_name, c.location_name as location,
                  e.executor_name as assigned_to_user_name,
                  e.created_at as submitted_at,
                  a.admin_instructions, a.status as asg_status
                FROM case_executions e
                JOIN cases_master c ON e.case_id = c.id
                JOIN case_assignments a ON e.assignment_id = a.asg_id
                WHERE a.status = 'completed' AND c.status != 'closed'
                ORDER BY e.id DESC`,
          args: [],
        }
      : {
          sql: `SELECT 
                  e.id as exec_row_id, e.exec_id, e.case_id, e.case_number, e.assignment_id, e.round,
                  e.executor_name, e.executor_role, e.role_code, e.action_taken, e.notes as exec_notes, e.created_at as exec_time,
                  c.department_code, c.department_name, c.location_name, c.nc_name, c.inspector_name,
                  c.description as case_desc, c.root_cause as case_cause, c.inspector_notes as case_inspector_notes, c.obs_date, c.obs_time,
                  c.nc_name as title, c.nc_name as category_name, c.location_name as location,
                  e.executor_name as assigned_to_user_name,
                  e.created_at as submitted_at,
                  a.admin_instructions, a.status as asg_status
                FROM case_executions e
                JOIN cases_master c ON e.case_id = c.id
                JOIN case_assignments a ON e.assignment_id = a.asg_id
                WHERE a.status = 'completed' AND c.status != 'closed' AND (c.department_code = ? OR a.assigned_dept = ?)
                ORDER BY e.id DESC`,
          args: [userDept, userDept],
        }
  );
  const reviewItems = canViewFeature("view_review_cases") ? reviewRes.rows as unknown as any[] : [];

  // 5. Fetch Closed Cases (الحالات المغلقة) - Scoped by Department
  const closedCasesRes = await db.execute(
    canViewFeatureAll("view_closed_cases")
      ? {
          sql: `SELECT c.id, c.case_number, c.internal_id, c.department_code, c.department_name, c.location_name, c.nc_name, c.inspector_name, c.description, c.root_cause, c.inspector_notes, c.status, c.current_round, c.assigned_roles, c.obs_date, c.obs_time, c.created_at, c.closed_at, c.closed_feedback,
                       e.action_taken, e.notes as executor_notes, e.executor_name
                FROM cases_master c
                LEFT JOIN case_executions e ON c.id = e.case_id AND c.current_round = e.round
                WHERE c.status = 'closed'
                GROUP BY c.id
                ORDER BY c.case_number DESC`,
          args: [],
        }
      : {
          sql: `SELECT c.id, c.case_number, c.internal_id, c.department_code, c.department_name, c.location_name, c.nc_name, c.inspector_name, c.description, c.root_cause, c.inspector_notes, c.status, c.current_round, c.assigned_roles, c.obs_date, c.obs_time, c.created_at, c.closed_at, c.closed_feedback,
                       e.action_taken, e.notes as executor_notes, e.executor_name
                FROM cases_master c
                LEFT JOIN case_executions e ON c.id = e.case_id AND c.current_round = e.round
                WHERE c.status = 'closed' AND c.department_code = ?
                GROUP BY c.id
                ORDER BY c.case_number DESC`,
          args: [userDept],
        }
  );
  const closedCases = canViewFeature("view_closed_cases") ? closedCasesRes.rows as unknown as any[] : [];

  // 6. Fetch All Cases Master List (السجل العام) - Scoped by Department
  const allCasesRes = await db.execute(
    canViewFeatureAll("view_all_cases")
      ? {
          sql: `SELECT 
                  c.id, c.case_number, c.internal_id, c.department_code, c.department_name, c.location_name, c.nc_name, c.inspector_name, 
                  c.description, c.root_cause, c.inspector_notes, c.status, c.current_round, c.assigned_roles, c.obs_date, c.obs_time, c.created_at, c.closed_at, c.closed_feedback
                FROM cases_master c
                ORDER BY c.case_number DESC`,
          args: [],
        }
      : {
          sql: `SELECT 
                  c.id, c.case_number, c.internal_id, c.department_code, c.department_name, c.location_name, c.nc_name, c.inspector_name, 
                  c.description, c.root_cause, c.inspector_notes, c.status, c.current_round, c.assigned_roles, c.obs_date, c.obs_time, c.created_at, c.closed_at, c.closed_feedback
                FROM cases_master c
                WHERE c.department_code = ?
                ORDER BY c.case_number DESC`,
          args: [userDept],
        }
  );
  const allCases = canViewFeature("view_all_cases") ? allCasesRes.rows as unknown as any[] : [];

  // 7. Fetch Audit Logs
  const auditRes = await db.execute(
    canViewAll
      ? `SELECT id, log_id, case_number, event_type, actor_name, actor_role, prev_state, new_state, details, created_at
         FROM audit_logs
         ORDER BY id DESC LIMIT 50`
      : {
          sql: `SELECT id, log_id, case_number, event_type, actor_name, actor_role, prev_state, new_state, details, created_at
                FROM audit_logs
                WHERE actor_name = ?
                ORDER BY id DESC LIMIT 50`,
          args: [session.full_name],
        }
  );
  const auditLogs = auditRes.rows as unknown as any[];

  return (
    <div className="min-h-screen bg-[#FAF7F4] flex flex-col">
      <Navbar user={session} userPermissions={toPlain(userPerms)} />

      <main className="w-full flex-1 flex flex-col">
        <AdminManager
          currentUser={toPlain(session)}
          userPermissions={toPlain(userPerms)}
          departments={toPlain(departments)}
          sections={toPlain(sections)}
          roles={toPlain(roles)}
          users={toPlain(canViewFeature("manage_users") ? allUsers : [])}
          fieldRoles={toPlain(fieldRoles)}
          categories={toPlain(categories)}
          locations={toPlain(locations)}
          pendingCases={toPlain(pendingCases)}
          inProgressCases={toPlain(inProgressCases)}
          reviewItems={toPlain(reviewItems)}
          closedCases={toPlain(closedCases)}
          allCases={toPlain(allCases)}
          auditLogs={toPlain(auditLogs)}
          permissionsMatrix={toPlain(permissionsMatrix)}
        />
      </main>
    </div>
  );
}
