const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

// Read .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
let url = "libsql://raeed1-raydalslwy429-hue.aws-eu-central-1.turso.io";
let authToken = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('TURSO_DATABASE_URL=')) {
      url = trimmed.split('=')[1].trim();
    } else if (trimmed.startsWith('TURSO_AUTH_TOKEN=')) {
      authToken = trimmed.split('=')[1].trim();
    }
  });
}

console.log("Connecting to Turso Cloud:", url);
const client = createClient({ url, authToken });

const baseDir = path.resolve(__dirname, '..', 'system_data');

async function exportAll() {
  // Ensure directories exist
  const dirs = [
    '01_permissions',
    '02_reports',
    '03_departments',
    '04_categories',
    '05_users',
    '06_forms'
  ];

  dirs.forEach(d => {
    const full = path.join(baseDir, d);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  });

  // 1. Roles & Permissions
  console.log("Exporting custom_roles...");
  const rolesRes = await client.execute("SELECT * FROM custom_roles ORDER BY id ASC");
  fs.writeFileSync(
    path.join(baseDir, '01_permissions', 'roles.json'),
    JSON.stringify(rolesRes.rows, null, 2),
    'utf8'
  );

  // Permissions Matrix Definition
  const permissionsMatrix = [
    { id: 1, authority: "إدارة وإنشاء وتعديل المستخدمين ورموز PIN", super_admin: true, general_admin: true, admin: true, inspector: false, field_agent: false, note: "صلاحية حصرية للإدارة" },
    { id: 2, authority: "إدارة وتعيين الأدوار الوظيفية المخصصة", super_admin: true, general_admin: true, admin: true, inspector: false, field_agent: false, note: "توزيع الصلاحيات على الأقسام" },
    { id: 3, authority: "تسجيل بلاغات وحالات عدم المطابقة الميدانية", super_admin: true, general_admin: true, admin: true, inspector: true, field_agent: false, note: "المهمة الأساسية للمفتش" },
    { id: 4, authority: "توثيق المخالفات بالصور والملاحظات الحية", super_admin: true, general_admin: true, admin: true, inspector: true, field_agent: false, note: "توثيق فوري بدون كشف هوية المفتش" },
    { id: 5, authority: "إسناد وتوجيه المهام للأقسام والموظفين", super_admin: true, general_admin: true, admin: true, inspector: false, field_agent: false, note: "توجيه إداري إلزامي" },
    { id: 6, authority: "تنفيذ الإجراءات التصحيحية ورفع إثبات المعالجة", super_admin: true, general_admin: true, admin: true, inspector: false, field_agent: true, note: "المهمة الأساسية لمأمور الميدان" },
    { id: 7, authority: "مراجعة واعتماد إغلاق المخالفة نهائياً", super_admin: true, general_admin: true, admin: true, inspector: true, field_agent: false, note: "إغلاق الحالة بعد التحقق" },
    { id: 8, authority: "إعادة الإسناد لجولة تصحيح جديدة (Reassign)", super_admin: true, general_admin: true, admin: true, inspector: false, field_agent: false, note: "إذا كان الإجراء غير كافٍ" },
    { id: 9, authority: "حذف حالات عدم المطابقة نهائياً من النظام", super_admin: true, general_admin: true, admin: false, inspector: false, field_agent: false, note: "صلاحية سيادية محصورة بالسوبر أدمن والمدير العام" },
    { id: 10, authority: "معاينة وتصدير تقارير PDF الرسمية المعتمدة", super_admin: true, general_admin: true, admin: true, inspector: true, field_agent: true, note: "متاحة حسب صلاحيات القسم" },
    { id: 11, authority: "الاطلاع على سجل الرقابة والتدقيق الأمني (Audit Logs)", super_admin: true, general_admin: true, admin: true, inspector: false, field_agent: false, note: "تتبع كافة التغييرات وحركات النظام" },
    { id: 12, authority: "تعديل إعدادات الربط السحابي والمزامنة", super_admin: true, general_admin: false, admin: false, inspector: false, field_agent: false, note: "حصرية للسوبر أدمن (م. رائد)" },
    { id: 13, authority: "حماية الحساب السيادي (2222) من الحذف أو التعديل", super_admin: true, general_admin: false, admin: false, inspector: false, field_agent: false, note: "قفل أمان محمي برمجياً is_protected = 1" },
    { id: 14, authority: "إخفاء هوية المفتش في واجهات الميدان (حماية رقابية)", super_admin: true, general_admin: true, admin: true, inspector: true, field_agent: true, note: "سياسة حوكمة معتمدة" }
  ];
  fs.writeFileSync(
    path.join(baseDir, '01_permissions', 'permissions_matrix.json'),
    JSON.stringify(permissionsMatrix, null, 2),
    'utf8'
  );

  // 2. Reports Config
  console.log("Exporting reports configuration...");
  const reportConfig = {
    brand_name: "مطاعم المراسيم AL-MARASEEM",
    system_title: "نظام إدارة ومتابعة حالات عدم المطابقة والتحسين المستمر (CAPA)",
    logo_path: "/brand/logo.png",
    default_page_orientation: "landscape",
    paper_size: "A4",
    kpi_cards: [
      { key: "total", label: "إجمالي الحالات", color: "blue" },
      { key: "open", label: "الحالات المفتوحة", color: "amber" },
      { key: "in_progress", label: "قيد المعالجة الميدانية", color: "purple" },
      { key: "closed", label: "المغلقة والمعتمدة", color: "emerald" },
      { key: "completion_rate", label: "نسبة الإنجاز %", color: "gold" }
    ],
    signatures: [
      { role: "inspector", title: "توقيع المفتش الرقابي المُعد" },
      { role: "department_head", title: "توقيع وختم رئيس القسم المعني" },
      { role: "super_admin", title: "اعتماد الإدارة العامة لمطاعم المراسيم" }
    ]
  };
  fs.writeFileSync(
    path.join(baseDir, '02_reports', 'report_config.json'),
    JSON.stringify(reportConfig, null, 2),
    'utf8'
  );

  // 3. Departments & Locations
  console.log("Exporting departments and locations...");
  const deptRes = await client.execute("SELECT * FROM departments ORDER BY code ASC");
  fs.writeFileSync(
    path.join(baseDir, '03_departments', 'departments.json'),
    JSON.stringify(deptRes.rows, null, 2),
    'utf8'
  );

  const locRes = await client.execute("SELECT * FROM locations ORDER BY code ASC");
  fs.writeFileSync(
    path.join(baseDir, '03_departments', 'locations.json'),
    JSON.stringify(locRes.rows, null, 2),
    'utf8'
  );

  // 4. Categories (حالات عدم المطابقة)
  console.log("Exporting categories...");
  const catRes = await client.execute("SELECT * FROM categories ORDER BY code ASC");
  fs.writeFileSync(
    path.join(baseDir, '04_categories', 'categories.json'),
    JSON.stringify(catRes.rows, null, 2),
    'utf8'
  );

  // 5. Users
  console.log("Exporting users...");
  const usersRes = await client.execute("SELECT * FROM users ORDER BY id ASC");
  fs.writeFileSync(
    path.join(baseDir, '05_users', 'users.json'),
    JSON.stringify(usersRes.rows, null, 2),
    'utf8'
  );

  // 6. Forms
  console.log("Exporting forms templates...");
  try {
    const formsRes = await client.execute("SELECT * FROM forms_templates ORDER BY id ASC");
    fs.writeFileSync(
      path.join(baseDir, '06_forms', 'forms_templates.json'),
      JSON.stringify(formsRes.rows, null, 2),
      'utf8'
    );
  } catch (e) {
    fs.writeFileSync(path.join(baseDir, '06_forms', 'forms_templates.json'), "[]", 'utf8');
  }

  // Create Readme Guide in system_data
  const readmeContent = `# مجلد بيانات النظام المهيكلة (System Data Hub)

أهلاً بك مهندس رائد،
تم تنظيم هذا المجلد ليكون المرجع الأساسي لبيانات النظام، حيث يمكنك تعديل أي قسم محلياً عبر فتح ملف الـ JSON المخصص له وتعديله أو استبداله.

---

## 📂 الأقسام والمجلدات:

### 1. 01_permissions (الصلاحيات والأدوار)
- **roles.json**: يحتوي على الأدوار المخصصة (Custom Roles) مع الإدارات والأقسام المسموحة لكل دور.
- **permissions_matrix.json**: مصفوفة الصلاحيات الـ 14 وقواعد توزيعها على كافة الرتب.

### 2. 02_reports (التقارير المعتمدة)
- **report_config.json**: إعدادات الترويسة، الشعار، بطاقات مؤشرات الأداء (KPIs)، وخانات التوقيع والاعتماد.

### 3. 03_departments (الإدارات والأقسام)
- **departments.json**: الإدارات الرئيسية في مطاعم المراسيم.
- **locations.json**: الفروع والأقسام التابعة لكل إدارة.

### 4. 04_categories (حالات عدم المطابقة)
- **categories.json**: قائمة المخالفات وحالات عدم المطابقة مع ربط كل حالة بالإدارة والقسم ومستوى الخطورة.

### 5. 05_users (المستخدمين ورموز PIN)
- **users.json**: قائمة الموظفين والمفتشين والسوبر أدمن ورموز الدخول المعتمدة.

### 6. 06_forms (نماذج الاستمارات)
- **forms_templates.json**: قوالب الاستمارات التفتيشية الديناميكية.

---

## 🚀 أوامر المزامنة المتاحة:
- **تحديث المجلدات من السحابة:** \`npm run data:pull\`
- **رفع محتويات المجلدات إلى السحابة الحية:** \`npm run data:push\`
- **تطبيق محتويات المجلدات على قاعدة البيانات المحلية (Local DB):** \`npm run data:local\`
`;

  fs.writeFileSync(path.join(baseDir, 'README.md'), readmeContent, 'utf8');

  console.log("✅ Successfully exported all system data into system_data/");

  // 7. Update local.db automatically so it matches the cloud
  console.log("💾 Updating local.db with cloud tables & cases...");
  try {
    const { execSync } = require('child_process');
    const syncLocalPath = path.resolve(__dirname, 'sync_to_local.cjs');
    execSync(`node "${syncLocalPath}"`, { stdio: 'inherit' });

    // Sync operational data from cloud to local.db
    const localDbPath = path.resolve(__dirname, '..', 'local.db');
    const localClient = createClient({ url: `file:${localDbPath.replace(/\\/g, '/')}` });

    // Helper to query cloud with retry on transient network glitch
    async function queryWithRetry(sql, retries = 3) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await client.execute(sql);
        } catch (err) {
          if (attempt === retries) throw err;
          console.warn(`Retry ${attempt}/${retries} for query...`);
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }

    const operationalTables = [
      'cases_master',
      'case_assignments',
      'case_executions',
      'admin_decisions',
      'forms_responses',
      'forms_answers',
      'audit_logs',
      'daily_reports',
      'role_permissions_matrix'
    ];
    for (const t of operationalTables) {
      try {
        const cloudRows = await queryWithRetry(`SELECT * FROM ${t}`);
        if (cloudRows && cloudRows.rows && cloudRows.rows.length > 0) {
          const cols = Object.keys(cloudRows.rows[0]);
          const quotedCols = cols.map(c => `"${c}"`);
          const placeholders = cols.map(() => '?').join(', ');
          const sql = `INSERT OR REPLACE INTO "${t}" (${quotedCols.join(', ')}) VALUES (${placeholders})`;
          const stmts = cloudRows.rows.map(row => ({
            sql,
            args: cols.map(c => row[c])
          }));
          // Batch in chunks of 50
          for (let i = 0; i < stmts.length; i += 50) {
            await localClient.batch(stmts.slice(i, i + 50), "write");
          }
          console.log(`✔ Synced ${cloudRows.rows.length} rows for ${t} into local.db.`);
        }
      } catch (tableErr) {
        console.warn(`Note on table ${t}:`, tableErr.message);
      }
    }
    console.log("🎉 Successfully synchronized local.db with all cloud cases and data!");
  } catch (localErr) {
    console.warn("Could not auto-sync local.db:", localErr.message);
  }
}

exportAll().catch(err => {
  console.error("❌ Export error:", err);
  process.exit(1);
});
