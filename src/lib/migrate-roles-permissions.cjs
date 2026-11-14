const { createClient } = require('@libsql/client');

const url = 'libsql://raeed1-raydalslwy429-hue.aws-eu-central-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTQwNzUxNTcsImlkIjoiMDFhMWI3MzQtYmMwMS03ZjdmLWI1NTMtNGJlMzgyODkxZjU0Iiwia2lkIjoickV4c243NFRvQ2plQlBjeDMzRWcyM0pQT3JXdGZvaWZiYnpDcnVVY0dTZyIsInJpZCI6IjhmYjJlYzc0LThmYzctNGNjMy04MjFkLWQxNTY0ODViNDkxNiJ9.JixENvIVwegjJ2ZVr4nW5it2oNAma6D4UmV5JYy8R00Tf0oh_qt3d9oolBdrB5YVWijpIeflHG9CyO1JXqjoDw';

const db = createClient({ url, authToken });

async function migrate() {
  console.log('🚀 Migrating Turso Database schema for Roles, Permissions, and Users...');

  const migrations = [
    {
      name: 'Add permissions_json to custom_roles',
      sql: `ALTER TABLE custom_roles ADD COLUMN permissions_json TEXT DEFAULT '{}'`,
    },
    {
      name: 'Add description to custom_roles',
      sql: `ALTER TABLE custom_roles ADD COLUMN description TEXT`,
    },
    {
      name: 'Add custom_role_id to users',
      sql: `ALTER TABLE users ADD COLUMN custom_role_id INTEGER`,
    },
    {
      name: 'Add custom_role_name to users',
      sql: `ALTER TABLE users ADD COLUMN custom_role_name TEXT`,
    },
    {
      name: 'Create role_permissions_matrix table for system roles override',
      sql: `CREATE TABLE IF NOT EXISTS role_permissions_matrix (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_code TEXT NOT NULL UNIQUE,
        role_name TEXT NOT NULL,
        permissions_json TEXT NOT NULL DEFAULT '{}',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    },
  ];

  for (const m of migrations) {
    try {
      await db.execute(m.sql);
      console.log(`✅ Success: ${m.name}`);
    } catch (err) {
      console.log(`ℹ️ Notice (${m.name}): ${err.message}`);
    }
  }

  // Seed default system roles permissions if empty
  const defaultMatrix = [
    {
      code: 'super_admin',
      name: 'مدير عام المنظومة (Super Admin)',
      permissions: {
        inspect_create: 'full',
        inspect_offline: 'full',
        inspect_typeahead: 'full',
        triage_assign: 'full',
        triage_direct_user: 'full',
        triage_curated: 'full',
        field_execute: 'view_only',
        field_feedback: 'full',
        review_approve: 'full',
        review_round_bump: 'full',
        delete_cases: 'exclusive',
        export_excel: 'full',
        print_pdf: 'full',
        manage_structure: 'full',
        manage_roles: 'full',
        manage_users: 'full',
        manage_forms: 'full',
      },
    },
    {
      code: 'general_admin',
      name: 'المدير العام للنظام (General Admin)',
      permissions: {
        inspect_create: 'full',
        inspect_offline: 'full',
        inspect_typeahead: 'full',
        triage_assign: 'full',
        triage_direct_user: 'full',
        triage_curated: 'full',
        field_execute: 'view_only',
        field_feedback: 'full',
        review_approve: 'full',
        review_round_bump: 'full',
        delete_cases: 'exclusive',
        export_excel: 'full',
        print_pdf: 'full',
        manage_structure: 'full',
        manage_roles: 'full',
        manage_users: 'full',
        manage_forms: 'full',
      },
    },
    {
      code: 'admin',
      name: 'مشرف / مدير إدارة (Admin)',
      permissions: {
        inspect_create: 'dept_only',
        inspect_offline: 'full',
        inspect_typeahead: 'full',
        triage_assign: 'dept_only',
        triage_direct_user: 'dept_only',
        triage_curated: 'dept_only',
        field_execute: 'view_only',
        field_feedback: 'full',
        review_approve: 'dept_only',
        review_round_bump: 'dept_only',
        delete_cases: 'none',
        export_excel: 'dept_only',
        print_pdf: 'dept_only',
        manage_structure: 'none',
        manage_roles: 'none',
        manage_users: 'none',
        manage_forms: 'dept_only',
      },
    },
    {
      code: 'inspector',
      name: 'مفتش جودة ورقابة (Inspector)',
      permissions: {
        inspect_create: 'full',
        inspect_offline: 'full',
        inspect_typeahead: 'full',
        triage_assign: 'none',
        triage_direct_user: 'none',
        triage_curated: 'none',
        field_execute: 'none',
        field_feedback: 'full',
        review_approve: 'none',
        review_round_bump: 'none',
        delete_cases: 'none',
        export_excel: 'none',
        print_pdf: 'none',
        manage_structure: 'none',
        manage_roles: 'none',
        manage_users: 'none',
        manage_forms: 'none',
      },
    },
    {
      code: 'field_agent',
      name: 'منفذ ميداني (Field Agent)',
      permissions: {
        inspect_create: 'none',
        inspect_offline: 'full',
        inspect_typeahead: 'none',
        triage_assign: 'none',
        triage_direct_user: 'none',
        triage_curated: 'none',
        field_execute: 'full',
        field_feedback: 'full',
        review_approve: 'none',
        review_round_bump: 'none',
        delete_cases: 'none',
        export_excel: 'none',
        print_pdf: 'none',
        manage_structure: 'none',
        manage_roles: 'none',
        manage_users: 'none',
        manage_forms: 'none',
      },
    },
  ];

  for (const item of defaultMatrix) {
    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO role_permissions_matrix (role_code, role_name, permissions_json, updated_at)
              VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [item.code, item.name, JSON.stringify(item.permissions)],
      });
      console.log(`✅ Seeded matrix permissions for: ${item.code}`);
    } catch (e) {
      console.log(`Error seeding matrix for ${item.code}:`, e.message);
    }
  }

  console.log('🎉 Migration finished successfully!');
}

migrate().catch(console.error);
