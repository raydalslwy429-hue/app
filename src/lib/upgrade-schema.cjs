const { createClient } = require('@libsql/client');

const url = 'libsql://raeed-raydalslwy429-hue.aws-eu-central-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTQwMjY4ODEsImlkIjoiMDFhMWIzN2MtNGUwMS03NGEyLWJkMDYtYjhjOTdkMTVlMTQ4Iiwia2lkIjoickV4c243NFRvQ2plQlBjeDMzRWcyM0pQT3JXdGZvaWZiYnpDcnVVY0dTZyIsInJpZCI6ImIyNjM4ZjlmLWUwMTYtNGZhYy04ZDA1LTUyYzBlMzVjNzhkYiJ9.DMf7hXwjuWYStObxLshj424v2Vxc6fvxACLvZGYleplPcn_ayDW-EdRR2mBhFpFUB1_my-WEdhtBcgYiumhpAQ';

const db = createClient({ url, authToken });

async function upgrade() {
  console.log('🚀 Upgrading Turso Database with Hierarchy, Roles, and Report Templates...');

  // 1. Departments Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      manager_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created table: departments');

  // 2. Sections Table (Linked to Departments)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER,
      department_code TEXT NOT NULL,
      department_name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      supervisor_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created table: sections');

  // 3. Roles Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      badge_color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created table: roles');

  // 4. Report Templates Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS report_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      columns_json TEXT NOT NULL,
      filters_json TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created table: report_templates');

  // Seed default Roles if not present
  const defaultRoles = [
    { code: 'admin', name: 'مدير نظام / إداري', description: 'صلاحيات كاملة لإدارة النظام والفرز والاعتماد وتعديل الهيكل', badge_color: 'bg-amber-100 text-amber-900 border-amber-300' },
    { code: 'inspector', name: 'مفتش جودة ورقابة', description: 'رصد وتسجيل حالات عدم المطابقة في الميدان وتوثيق الملاحظات', badge_color: 'bg-blue-100 text-blue-900 border-blue-300' },
    { code: 'field_agent', name: 'منفذ ميداني', description: 'استلام التكليفات وتنفيذ المعالجات التصحيحية ورفع التقارير', badge_color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  ];

  for (const r of defaultRoles) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO roles (code, name, description, badge_color) VALUES (?, ?, ?, ?)`,
      args: [r.code, r.name, r.description, r.badge_color],
    });
  }
  console.log('✅ Seeded default roles');

  // Seed default Departments
  const defaultDepts = [
    { code: 'dept_kitchen', name: 'إدارة المطابخ والإنتاج', description: 'مسؤولة عن تجهيز الأطعمة والطهي وسلامة الغذاء', manager_name: 'الشيف التنفيذي' },
    { code: 'dept_ops', name: 'إدارة العمليات والتشغيل والصالات', description: 'مسؤولة عن الفترات الصباحية والمسائية والخدمة', manager_name: 'أحمد الجلاب' },
    { code: 'dept_maint', name: 'إدارة الصيانة والمرافق', description: 'مسؤولة عن الأجهزة والمعدات والتبريد والسلامة المهنية', manager_name: 'سامي ناصر' },
    { code: 'dept_quality', name: 'إدارة الرقابة والجودة والحوكمة', description: 'الإشراف على معايير الجودة والـ CAPA والتفتيش المستمر', manager_name: 'م. رائد الصلوي' },
  ];

  for (const d of defaultDepts) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO departments (code, name, description, manager_name) VALUES (?, ?, ?, ?)`,
      args: [d.code, d.name, d.description, d.manager_name],
    });
  }
  console.log('✅ Seeded default departments');

  // Seed default Sections linked to Departments
  const defaultSections = [
    { deptCode: 'dept_kitchen', deptName: 'إدارة المطابخ والإنتاج', code: 'sec_meat', name: 'قسم اللحوم والشواء', supervisor_name: 'الشيف التنفيذي' },
    { deptCode: 'dept_kitchen', deptName: 'إدارة المطابخ والإنتاج', code: 'sec_veg', name: 'قسم الخضار والسلطات', supervisor_name: 'شيف قسم الخضار' },
    { deptCode: 'dept_kitchen', deptName: 'إدارة المطابخ والإنتاج', code: 'sec_seafood', name: 'قسم الأسماك والمأكولات البحرية', supervisor_name: 'شيف الأسماك' },
    { deptCode: 'dept_kitchen', deptName: 'إدارة المطابخ والإنتاج', code: 'sec_prep', name: 'قسم الإعداد والتجهيز الأولي', supervisor_name: 'مسؤول التجهيز' },
    { deptCode: 'dept_ops', deptName: 'إدارة العمليات والتشغيل والصالات', code: 'sec_am_shift', name: 'فترة التشغيل الصباحية', supervisor_name: 'أحمد الجلاب' },
    { deptCode: 'dept_ops', deptName: 'إدارة العمليات والتشغيل والصالات', code: 'sec_pm_shift', name: 'فترة التشغيل المسائية', supervisor_name: 'خالد الحريبي' },
    { deptCode: 'dept_ops', deptName: 'إدارة العمليات والتشغيل والصالات', code: 'sec_vip', name: 'صالات كبار الشخصيات والفعاليات', supervisor_name: 'مشرف الصالات' },
    { deptCode: 'dept_maint', deptName: 'إدارة الصيانة والمرافق', code: 'sec_cool', name: 'قسم التبريد والتكييف', supervisor_name: 'فني التبريد' },
    { deptCode: 'dept_maint', deptName: 'إدارة الصيانة والمرافق', code: 'sec_general_maint', name: 'قسم الصيانة العامة والكهرباء', supervisor_name: 'سامي ناصر' },
    { deptCode: 'dept_quality', deptName: 'إدارة الرقابة والجودة والحوكمة', code: 'sec_audit', name: 'قسم التدقيق والتفتيش الميداني', supervisor_name: 'أحمد اللبني' },
  ];

  for (const s of defaultSections) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO sections (department_code, department_name, code, name, supervisor_name) VALUES (?, ?, ?, ?, ?)`,
      args: [s.deptCode, s.deptName, s.code, s.name, s.supervisor_name],
    });
  }
  console.log('✅ Seeded default sections linked to departments');

  // Seed default Report Template
  const defaultColumns = JSON.stringify([
    { field: 'case_number', label: 'رقم البلاغ', visible: true, width: 80 },
    { field: 'internal_id', label: 'المعرف الفريد', visible: true, width: 120 },
    { field: 'obs_date', label: 'تاريخ الرصد', visible: true, width: 100 },
    { field: 'obs_time', label: 'الوقت', visible: true, width: 80 },
    { field: 'location_name', label: 'الموقع / القسم', visible: true, width: 140 },
    { field: 'nc_name', label: 'نوع المخالفة', visible: true, width: 140 },
    { field: 'description', label: 'وصف المخالفة', visible: true, width: 220 },
    { field: 'inspector_name', label: 'المفتش', visible: true, width: 120 },
    { field: 'status', label: 'الحالة الحالية', visible: true, width: 110 },
    { field: 'current_round', label: 'الجولة', visible: true, width: 70 },
  ]);

  await db.execute({
    sql: `INSERT OR IGNORE INTO report_templates (title, columns_json, filters_json, created_by) VALUES (?, ?, ?, ?)`,
    args: ['التقرير الشامل لحالات عدم المطابقة', defaultColumns, JSON.stringify({ status: 'all' }), 'م. رائد الصلوي'],
  });
  console.log('✅ Seeded default report template');

  console.log('🎉 Turso Database Schema Upgrade Complete!');
}

upgrade().catch(console.error);
