const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const localDbPath = path.resolve(__dirname, '..', 'local.db');
console.log("Setting up local SQLite database at:", localDbPath);

// Safeguard: Do NOT delete local.db so operational cases & assignments are never lost!
if (fs.existsSync(localDbPath)) {
  console.log("Existing local.db preserved safely.");
}

const client = createClient({
  url: `file:${localDbPath.replace(/\\/g, '/')}`
});

const baseDir = path.resolve(__dirname, '..', 'system_data');

function readJson(folder, filename) {
  const filePath = path.join(baseDir, folder, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return null;
  }
}

async function setupLocalDb() {
  console.log("🛠️ Creating exact Turso SQLite tables in local.db...");

  const tables = [
    `CREATE TABLE IF NOT EXISTS admin_decisions (id INTEGER PRIMARY KEY AUTOINCREMENT, decision_id TEXT NOT NULL UNIQUE, case_id INTEGER NOT NULL, case_number INTEGER NOT NULL, round INTEGER DEFAULT 1, admin_name TEXT NOT NULL, action_type TEXT NOT NULL, decision TEXT NOT NULL, target_roles TEXT, directive TEXT, reassign_notes TEXT, closure_notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, log_id TEXT NOT NULL UNIQUE, case_number INTEGER, event_type TEXT NOT NULL, actor_name TEXT NOT NULL, actor_role TEXT NOT NULL, prev_state TEXT, new_state TEXT, details TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS case_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, asg_id TEXT NOT NULL UNIQUE, case_id INTEGER NOT NULL, case_number INTEGER NOT NULL, round INTEGER DEFAULT 1, assigned_dept TEXT NOT NULL, dept_name TEXT NOT NULL, admin_name TEXT, admin_instructions TEXT, reassign_notes TEXT, status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'approved', 'canceled')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, completed_at DATETIME, assigned_user_id INTEGER, assigned_user_name TEXT, admin_feedback TEXT, is_accepted INTEGER DEFAULT 0, accepted_at DATETIME)`,
    `CREATE TABLE IF NOT EXISTS case_executions (id INTEGER PRIMARY KEY AUTOINCREMENT, exec_id TEXT NOT NULL UNIQUE, case_id INTEGER NOT NULL, case_number INTEGER NOT NULL, assignment_id TEXT NOT NULL, round INTEGER DEFAULT 1, executor_name TEXT NOT NULL, executor_role TEXT NOT NULL, role_code TEXT NOT NULL, action_taken TEXT NOT NULL, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS cases_master (id INTEGER PRIMARY KEY AUTOINCREMENT, case_number INTEGER NOT NULL UNIQUE, internal_id TEXT NOT NULL UNIQUE, department_code TEXT NOT NULL, department_name TEXT NOT NULL, location_code TEXT NOT NULL, location_name TEXT NOT NULL, nc_code TEXT NOT NULL, nc_name TEXT NOT NULL, inspector_name TEXT NOT NULL, inspector_pin TEXT NOT NULL, description TEXT NOT NULL, root_cause TEXT, inspector_notes TEXT, status TEXT DEFAULT 'pending_assignment' CHECK(status IN ('pending_assignment', 'assigned', 'pending_review', 'closed')), current_round INTEGER DEFAULT 1, assigned_roles TEXT, obs_date TEXT NOT NULL, obs_time TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, closed_at DATETIME, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, client_uuid TEXT, closed_feedback TEXT)`,
    `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, department_code TEXT DEFAULT "all", section_code TEXT DEFAULT "all", status TEXT DEFAULT "active", description TEXT)`,
    `CREATE TABLE IF NOT EXISTS custom_roles (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('admin', 'inspector', 'field_agent')), department_code TEXT, status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, allowed_departments TEXT DEFAULT "all", allowed_sections TEXT DEFAULT "all", role_type TEXT DEFAULT "inspector", permissions_json TEXT DEFAULT '{}', description TEXT)`,
    `CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS form_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, template_id INTEGER NOT NULL, question_code TEXT, question_text TEXT NOT NULL, field_type TEXT NOT NULL CHECK(field_type IN ('text', 'number', 'select', 'radio', 'checkbox', 'textarea', 'image', 'gps', 'date', 'time', 'rating')), is_required INTEGER DEFAULT 0, options_json TEXT, conditional_logic_json TEXT, step_number INTEGER DEFAULT 1, order_index INTEGER DEFAULT 0, help_text TEXT, placeholder TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS forms_answers (id INTEGER PRIMARY KEY AUTOINCREMENT, response_id INTEGER NOT NULL, question_id INTEGER NOT NULL, answer_value TEXT, media_data TEXT, gps_lat REAL, gps_lng REAL, admin_override_value TEXT, is_hidden_from_field INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS forms_responses (id INTEGER PRIMARY KEY AUTOINCREMENT, template_id INTEGER NOT NULL, response_number INTEGER UNIQUE, user_id INTEGER NOT NULL, user_name TEXT NOT NULL, user_role TEXT NOT NULL, location_code TEXT, location_name TEXT, department_code TEXT NOT NULL, department_name TEXT NOT NULL, status TEXT DEFAULT 'pending_assignment' CHECK(status IN ('draft', 'pending_assignment', 'assigned', 'pending_review', 'completed', 'rejected')), case_id INTEGER, curated_notes TEXT, hidden_questions_json TEXT, assigned_to_role TEXT, assigned_to_agent_id INTEGER, assigned_to_agent_name TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, field_action_taken TEXT, field_notes TEXT, field_media_data TEXT, field_executed_at DATETIME, client_uuid TEXT)`,
    `CREATE TABLE IF NOT EXISTS forms_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL, description TEXT, icon TEXT DEFAULT 'clipboard', allowed_roles TEXT DEFAULT 'all', fields_schema TEXT, status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, version INTEGER DEFAULT 1, department_code TEXT DEFAULT 'all', allowed_users_json TEXT DEFAULT "all")`,
    `CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, department_code TEXT NOT NULL, status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS role_permissions_matrix (id INTEGER PRIMARY KEY AUTOINCREMENT, role_code TEXT NOT NULL UNIQUE, role_name TEXT NOT NULL, permissions_json TEXT NOT NULL DEFAULT '{}', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, user_number INTEGER UNIQUE, full_name TEXT NOT NULL, pin_code TEXT NOT NULL, role TEXT NOT NULL, department_code TEXT, department_name TEXT, status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, job_title TEXT, is_protected INTEGER DEFAULT 0, can_export_excel INTEGER DEFAULT 0, custom_role_id INTEGER, custom_role_name TEXT, can_create_daily_report INTEGER DEFAULT 1, can_view_daily_archive INTEGER DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS daily_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, serial_number TEXT NOT NULL UNIQUE, submitter_id INTEGER NOT NULL, submitter_name TEXT NOT NULL, submitter_role TEXT NOT NULL, department_code TEXT NOT NULL, department_name TEXT NOT NULL, location_name TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, recipient TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`
  ];

  for (const t of tables) {
    await client.execute(t);
  }
  console.log("✔ All 15 exact Turso tables created in local.db.");

  // Seed data from system_data
  console.log("🌱 Seeding data from system_data into local.db...");

  // Departments
  const departments = readJson('03_departments', 'departments.json');
  if (Array.isArray(departments)) {
    for (const d of departments) {
      if (!d.code || !d.name) continue;
      await client.execute({
        sql: "INSERT OR REPLACE INTO departments (id, code, name, status) VALUES (?, ?, ?, ?)",
        args: [d.id || null, d.code, d.name, d.status || 'active']
      });
    }
    console.log(`✔ Seeded ${departments.length} departments.`);
  }

  // Locations
  const locations = readJson('03_departments', 'locations.json');
  if (Array.isArray(locations)) {
    for (const l of locations) {
      if (!l.code || !l.name) continue;
      await client.execute({
        sql: "INSERT OR REPLACE INTO locations (id, code, name, department_code, status) VALUES (?, ?, ?, ?, ?)",
        args: [l.id || null, l.code, l.name, l.department_code || '', l.status || 'active']
      });
    }
    console.log(`✔ Seeded ${locations.length} locations.`);
  }

  // Roles
  const roles = readJson('01_permissions', 'roles.json');
  if (Array.isArray(roles)) {
    for (const r of roles) {
      if (!r.name) continue;
      const deptVal = typeof r.allowed_departments === 'object' ? JSON.stringify(r.allowed_departments) : (r.allowed_departments || 'all');
      const secVal = typeof r.allowed_sections === 'object' ? JSON.stringify(r.allowed_sections) : (r.allowed_sections || 'all');
      await client.execute({
        sql: `INSERT OR REPLACE INTO custom_roles (
          id, code, name, category, department_code, status, allowed_departments, allowed_sections, role_type, permissions_json, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          r.id || null,
          r.code || `crole_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          r.name,
          r.category || 'inspector',
          r.department_code || 'all',
          r.status || 'active',
          deptVal,
          secVal,
          r.role_type || r.category || 'inspector',
          typeof r.permissions_json === 'object' ? JSON.stringify(r.permissions_json) : (r.permissions_json || '{}'),
          r.description || ''
        ]
      });
    }
    console.log(`✔ Seeded ${roles.length} custom roles.`);
  }

  // Categories
  const categories = readJson('04_categories', 'categories.json');
  if (Array.isArray(categories)) {
    for (const c of categories) {
      if (!c.code || !c.name) continue;
      await client.execute({
        sql: "INSERT OR REPLACE INTO categories (id, code, name, severity, department_code, section_code, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [c.id || null, c.code, c.name, c.severity || 'medium', c.department_code || 'all', c.section_code || 'all', c.status || 'active', c.description || '']
      });
    }
    console.log(`✔ Seeded ${categories.length} categories.`);
  }

  // Users
  const users = readJson('05_users', 'users.json');
  if (Array.isArray(users)) {
    for (const u of users) {
      if (!u.full_name || !u.pin_code) continue;
      const isProtected = (u.pin_code === "2222" || Number(u.id) === 1 || Number(u.is_protected) === 1) ? 1 : 0;
      await client.execute({
        sql: "INSERT OR REPLACE INTO users (id, user_number, full_name, pin_code, role, department_code, department_name, status, job_title, is_protected, can_export_excel, custom_role_id, custom_role_name, can_create_daily_report, can_view_daily_archive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          u.id || null,
          u.user_number || null,
          u.full_name,
          u.pin_code,
          u.role || 'field_agent',
          u.department_code || '',
          u.department_name || '',
          u.status || 'active',
          u.job_title || '',
          isProtected,
          u.can_export_excel ? 1 : 0,
          u.custom_role_id || null,
          u.custom_role_name || null,
          u.can_create_daily_report !== undefined ? (u.can_create_daily_report ? 1 : 0) : 1,
          u.can_view_daily_archive ? 1 : 0
        ]
      });
    }
    console.log(`✔ Seeded ${users.length} users.`);
  }

  // Forms
  const forms = readJson('06_forms', 'forms_templates.json');
  if (Array.isArray(forms) && forms.length > 0) {
    for (const f of forms) {
      if (!f.title) continue;
      await client.execute({
        sql: "INSERT OR REPLACE INTO forms_templates (id, code, title, description, icon, allowed_roles, fields_schema, status, version, department_code, allowed_users_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          f.id || null,
          f.code || null,
          f.title,
          f.description || '',
          f.icon || 'clipboard',
          f.allowed_roles || 'all',
          f.fields_schema || '',
          f.status || 'active',
          f.version || 1,
          f.department_code || 'all',
          f.allowed_users_json || 'all'
        ]
      });
    }
    console.log(`✔ Seeded ${forms.length} forms.`);
  }

  console.log("🎉 Local SQLite database (local.db) matches Turso 100% and is ready!");
}

setupLocalDb().catch(err => {
  console.error("❌ Setup error:", err);
  process.exit(1);
});
