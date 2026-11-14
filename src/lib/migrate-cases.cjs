const { createClient } = require('@libsql/client');

const url = 'libsql://raeed-raydalslwy429-hue.aws-eu-central-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTQwMjY4ODEsImlkIjoiMDFhMWIzN2MtNGUwMS03NGEyLWJkMDYtYjhjOTdkMTVlMTQ4Iiwia2lkIjoickV4c243NFRvQ2plQlBjeDMzRWcyM0pQT3JXdGZvaWZiYnpDcnVVY0dTZyIsInJpZCI6ImIyNjM4ZjlmLWUwMTYtNGZhYy04ZDA1LTUyYzBlMzVjNzhkYiJ9.DMf7hXwjuWYStObxLshj424v2Vxc6fvxACLvZGYleplPcn_ayDW-EdRR2mBhFpFUB1_my-WEdhtBcgYiumhpAQ';

const db = createClient({ url, authToken });

async function migrateExistingCases() {
  console.log('🔄 Migrating real cases into Turso...');

  // Case 1
  await db.execute({
    sql: `INSERT OR REPLACE INTO cases_master (
      id, case_number, internal_id, location_code, location_name, nc_code, nc_name,
      inspector_name, inspector_pin, description, root_cause, inspector_notes,
      status, current_round, obs_date, obs_time
    ) VALUES (
      1, 1, 'CAPA-2026-0001', 'loc_meat', 'معمل اللحوم', 'nc_ppe', 'عدم ارتداء مهمات الوقاية الشخصية (PPE)',
      'أحمد اللبني', '1111', 'عدم ارتداء القفازات ومهمات الوقاية أثناء العمل بالمعمل', 'إهمال وتهاون', 'تم التنبيه الفوري',
      'pending_assignment', 1, '2026-11-06', '22:53'
    )`,
    args: []
  });

  // Case 3
  await db.execute({
    sql: `INSERT OR REPLACE INTO cases_master (
      id, case_number, internal_id, location_code, location_name, nc_code, nc_name,
      inspector_name, inspector_pin, description, root_cause, inspector_notes,
      status, current_round, obs_date, obs_time
    ) VALUES (
      3, 3, 'CAPA-2026-0003', 'loc_seafood', 'قسم الأسماك والبحريات', 'nc_hygiene', 'نظافة عامة ومخالفة اشتراطات بيئة العمل',
      'عبد الحكيم القباطي', '1234', 'تراكم مياه الغسيل ومخالفة اشتراطات بيئة العمل', 'انسداد الصرف الصحي المؤقت', 'ضرورة التدخل السريع',
      'pending_assignment', 1, '2026-11-07', '04:23'
    )`,
    args: []
  });

  // Case 2
  const c2Roles = ['exec_chef', 'section_head_1', 'prod_supervisor_1', 'maintenance_lead', 'quality_supervisor', 'shift_manager_am', 'shift_manager_pm'];
  await db.execute({
    sql: `INSERT OR REPLACE INTO cases_master (
      id, case_number, internal_id, location_code, location_name, nc_code, nc_name,
      inspector_name, inspector_pin, description, root_cause, inspector_notes,
      status, current_round, assigned_roles, obs_date, obs_time
    ) VALUES (
      2, 2, 'CAPA-2026-0002', 'loc_veg', 'قسم ومغسلة الخضار', 'nc_discipline', 'عدم الالتزام بالانضباط التشغيلي أو جدول النظافة اليومي',
      'أحمد اللبني', '1111', 'ملاحظة عدم الالتزام بجدول النظافة اليومي للمغسلة', 'ضغط العمل في الوردية', 'مطلوب اتخاذ اللازم فوراً',
      'assigned', 1, ?, '2026-11-06', '23:08'
    )`,
    args: [c2Roles.join(',')]
  });

  const deptNames = {
    'exec_chef': 'الشيف العام',
    'section_head_1': 'رئيس قسم 1',
    'prod_supervisor_1': 'مشرف الإنتاج 1',
    'maintenance_lead': 'مسؤول الصيانة والتشغيل',
    'quality_supervisor': 'مشرف الجودة الميداني',
    'shift_manager_am': 'مدير الوردية الصباحية',
    'shift_manager_pm': 'مدير الوردية المسائية'
  };

  for (const r of c2Roles) {
    const isCompleted = (r === 'shift_manager_am' || r === 'shift_manager_pm');
    await db.execute({
      sql: `INSERT OR REPLACE INTO case_assignments (
        asg_id, case_id, case_number, round, assigned_dept, dept_name, admin_name, admin_instructions, status, completed_at
      ) VALUES (?, 2, 2, 1, ?, ?, 'رائد الصلوي', 'اهتموا بالموضوع وتنظيف القسم بالكامل فوراً', ?, ?)`,
      args: [
        `ASG-2-R1-${r}`,
        r,
        deptNames[r] || r,
        isCompleted ? 'completed' : 'pending',
        isCompleted ? '2026-11-07 01:42:00' : null
      ]
    });
  }

  // Case 2 Executions (Ahmed & Khalid)
  await db.execute({
    sql: `INSERT OR REPLACE INTO case_executions (
      exec_id, case_id, case_number, assignment_id, round, executor_name, executor_role, role_code, action_taken, notes
    ) VALUES (
      'EXE-2-R1-shift_manager_am', 2, 2, 'ASG-2-R1-shift_manager_am', 1, 'أحمد الجلاب', 'مدير الوردية الصباحية', 'shift_manager_am', 'طيب حاضر معك تم توجيه العمال وتنظيف وتطهير المغسلة بالكامل', 'احمد'
    )`,
    args: []
  });

  await db.execute({
    sql: `INSERT OR REPLACE INTO case_executions (
      exec_id, case_id, case_number, assignment_id, round, executor_name, executor_role, role_code, action_taken, notes
    ) VALUES (
      'EXE-2-R1-shift_manager_pm', 2, 2, 'ASG-2-R1-shift_manager_pm', 1, 'خالد الجلاب', 'مدير الوردية المسائية', 'shift_manager_pm', 'ولا يهمك معك خالد تم مراجعة القسم والتأكد من إتمام النظافة وجدول الوردية', 'طيب'
    )`,
    args: []
  });

  // Case 4
  const c4Roles = ['exec_chef', 'shift_manager_am', 'shift_manager_pm', 'prod_supervisor_1', 'section_head_1', 'quality_supervisor', 'maintenance_lead'];
  await db.execute({
    sql: `INSERT OR REPLACE INTO cases_master (
      id, case_number, internal_id, location_code, location_name, nc_code, nc_name,
      inspector_name, inspector_pin, description, root_cause, inspector_notes,
      status, current_round, assigned_roles, obs_date, obs_time
    ) VALUES (
      4, 4, 'CAPA-2026-0004', 'loc_prep', 'صالة التجهيز والتحضير', 'nc_discipline', 'عدم الالتزام بالانضباط التشغيلي أو جدول النظافة اليومي',
      'رائد الصلوي', '2222', 'تكدس أدوات التحضير بدون ترتيب في الصالة', 'سرعة التجهيز للطلبات', 'مطلوب إعادة تنظيم الصالة وتطبيق معايير السلامة',
      'assigned', 1, ?, '2026-11-07', '04:28'
    )`,
    args: [c4Roles.join(',')]
  });

  for (const r of c4Roles) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO case_assignments (
        asg_id, case_id, case_number, round, assigned_dept, dept_name, admin_name, admin_instructions, status
      ) VALUES (?, 4, 4, 1, ?, ?, 'رائد الصلوي', 'شوفو الموضوع ورتبوا الصالة بشكل عاجل', 'pending')`,
      args: [`ASG-4-R1-${r}`, r, deptNames[r] || r]
    });
  }

  console.log('✅ Migrated all 4 cases and live assignments into Turso successfully!');
}

migrateExistingCases().catch(console.error);
