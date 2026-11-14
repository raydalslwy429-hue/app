const { createClient } = require('@libsql/client');

const url = 'libsql://raeed-raydalslwy429-hue.aws-eu-central-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTQwMjY4ODEsImlkIjoiMDFhMWIzN2MtNGUwMS03NGEyLWJkMDYtYjhjOTdkMTVlMTQ4Iiwia2lkIjoickV4c243NFRvQ2plQlBjeDMzRWcyM0pQT3JXdGZvaWZiYnpDcnVVY0dTZyIsInJpZCI6ImIyNjM4ZjlmLWUwMTYtNGZhYy04ZDA1LTUyYzBlMzVjNzhkYiJ9.DMf7hXwjuWYStObxLshj424v2Vxc6fvxACLvZGYleplPcn_ayDW-EdRR2mBhFpFUB1_my-WEdhtBcgYiumhpAQ';

const db = createClient({ url, authToken });

async function initDatabase() {
  console.log('🚀 Initializing Turso Cloud Database Tables...');

  // 1. Users Table (PIN Authentication)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      pin_code TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('admin', 'inspector', 'field_agent')),
      department_code TEXT NOT NULL,
      department_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created table: users');

  // 2. Locations Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created table: locations');

  // 3. Categories Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      severity TEXT DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created table: categories');

  // 4. Cases Master Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cases_master (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number INTEGER NOT NULL UNIQUE,
      internal_id TEXT NOT NULL,
      location_code TEXT NOT NULL,
      location_name TEXT NOT NULL,
      nc_code TEXT NOT NULL,
      nc_name TEXT NOT NULL,
      inspector_name TEXT NOT NULL,
      inspector_pin TEXT NOT NULL,
      description TEXT NOT NULL,
      root_cause TEXT,
      inspector_notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending_assignment' CHECK(status IN ('pending_assignment', 'assigned', 'pending_review', 'closed')),
      current_round INTEGER NOT NULL DEFAULT 1,
      assigned_roles TEXT,
      obs_date TEXT NOT NULL,
      obs_time TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME
    );
  `);
  console.log('✅ Created table: cases_master');

  // 5. Case Assignments Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS case_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asg_id TEXT NOT NULL UNIQUE,
      case_id INTEGER NOT NULL REFERENCES cases_master(id) ON DELETE CASCADE,
      case_number INTEGER NOT NULL,
      round INTEGER NOT NULL DEFAULT 1,
      assigned_dept TEXT NOT NULL,
      dept_name TEXT NOT NULL,
      admin_name TEXT,
      admin_instructions TEXT,
      reassign_notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'approved', 'rejected', 'canceled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );
  `);
  console.log('✅ Created table: case_assignments');

  // 6. Case Executions Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS case_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exec_id TEXT NOT NULL UNIQUE,
      case_id INTEGER NOT NULL REFERENCES cases_master(id) ON DELETE CASCADE,
      case_number INTEGER NOT NULL,
      assignment_id TEXT NOT NULL,
      round INTEGER NOT NULL DEFAULT 1,
      executor_name TEXT NOT NULL,
      executor_role TEXT NOT NULL,
      role_code TEXT NOT NULL,
      action_taken TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created table: case_executions');

  // 7. Admin Decisions Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_id TEXT NOT NULL UNIQUE,
      case_id INTEGER NOT NULL REFERENCES cases_master(id) ON DELETE CASCADE,
      case_number INTEGER NOT NULL,
      round INTEGER NOT NULL,
      admin_name TEXT NOT NULL,
      action_type TEXT NOT NULL,
      decision TEXT NOT NULL,
      target_roles TEXT,
      directive TEXT,
      reassign_notes TEXT,
      closure_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created table: admin_decisions');

  // 8. Audit Logs Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_id TEXT NOT NULL UNIQUE,
      case_number INTEGER,
      event_type TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      prev_state TEXT,
      new_state TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created table: audit_logs');

  // Seeding Users
  const users = [
    { full_name: 'أحمد اللبني', pin_code: '1111', role: 'inspector', department_code: 'inspector_lead', department_name: 'مفتش الجودة الرئيسي' },
    { full_name: 'عبد الحكيم القباطي', pin_code: '1234', role: 'inspector', department_code: 'inspector_officer', department_name: 'مفتش الجودة والسلامة' },
    { full_name: 'رائد الصلوي', pin_code: '2222', role: 'admin', department_code: 'admin', department_name: 'إدارة الجودة والتطوير' },
    { full_name: 'أحمد الجلاب', pin_code: '3333', role: 'field_agent', department_code: 'shift_manager_am', department_name: 'مدير الوردية الصباحية' },
    { full_name: 'خالد الجلاب', pin_code: '4444', role: 'field_agent', department_code: 'shift_manager_pm', department_name: 'مدير الوردية المسائية' },
    { full_name: 'الشيف العام', pin_code: '5555', role: 'field_agent', department_code: 'exec_chef', department_name: 'الشيف العام والإنتاج' },
    { full_name: 'مشرف الإنتاج 1', pin_code: '6666', role: 'field_agent', department_code: 'prod_supervisor_1', department_name: 'مشرف الإنتاج الأول' },
    { full_name: 'رئيس قسم 1', pin_code: '7777', role: 'field_agent', department_code: 'section_head_1', department_name: 'رئيس قسم التجهيز' },
    { full_name: 'مشرف الجودة الميداني', pin_code: '8888', role: 'field_agent', department_code: 'quality_supervisor', department_name: 'مشرف الجودة الميداني' },
    { full_name: 'مسؤول الصيانة والتشغيل', pin_code: '9999', role: 'field_agent', department_code: 'maintenance_lead', department_name: 'مسؤول الصيانة والتشغيل' }
  ];

  for (const u of users) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO users (full_name, pin_code, role, department_code, department_name)
            VALUES (?, ?, ?, ?, ?)`,
      args: [u.full_name, u.pin_code, u.role, u.department_code, u.department_name]
    });
  }
  console.log(`✅ Seeded ${users.length} users with PIN codes.`);

  // Seeding Locations
  const locations = [
    { code: 'loc_meat', name: 'معمل اللحوم' },
    { code: 'loc_veg', name: 'قسم ومغسلة الخضار' },
    { code: 'loc_seafood', name: 'قسم الأسماك والبحريات' },
    { code: 'loc_prep', name: 'صالة التجهيز والتحضير' }
  ];

  for (const l of locations) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO locations (code, name) VALUES (?, ?)`,
      args: [l.code, l.name]
    });
  }
  console.log(`✅ Seeded ${locations.length} locations.`);

  // Seeding Categories
  const categories = [
    { code: 'nc_ppe', name: 'عدم ارتداء مهمات الوقاية الشخصية (PPE)', severity: 'high' },
    { code: 'nc_discipline', name: 'عدم الالتزام بالانضباط التشغيلي أو جدول النظافة اليومي', severity: 'medium' },
    { code: 'nc_hygiene', name: 'نظافة عامة ومخالفة اشتراطات بيئة العمل', severity: 'high' }
  ];

  for (const c of categories) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO categories (code, name, severity) VALUES (?, ?, ?)`,
      args: [c.code, c.name, c.severity]
    });
  }
  console.log(`✅ Seeded ${categories.length} violation categories.`);

  console.log('\n🎉 ALL TABLES AND LOOKUPS INITIALIZED SUCCESSFULLY IN TURSO!');
}

initDatabase().catch(err => {
  console.error('❌ Error initializing database:', err);
});
