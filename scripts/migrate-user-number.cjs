const { createClient } = require('@libsql/client');

const url = 'libsql://raeed1-raydalslwy429-hue.aws-eu-central-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTQwNzUxNTcsImlkIjoiMDFhMWI3MzQtYmMwMS03ZjdmLWI1NTMtNGJlMzgyODkxZjU0Iiwia2lkIjoickV4c243NFRvQ2plQlBjeDMzRWcyM0pQT3JXdGZvaWZiYnpDcnVVY0dTZyIsInJpZCI6IjhmYjJlYzc0LThmYzctNGNjMy04MjFkLWQxNTY0ODViNDkxNiJ9.JixENvIVwegjJ2ZVr4nW5it2oNAma6D4UmV5JYy8R00Tf0oh_qt3d9oolBdrB5YVWijpIeflHG9CyO1JXqjoDw';

const rawClient = createClient({ url, authToken });
const db = {
  async execute(stmt) {
    let retries = 3;
    let lastError;
    while (retries > 0) {
      try {
        return await rawClient.execute(stmt);
      } catch (err) {
        lastError = err;
        retries--;
        if (retries === 0) break;
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
    throw lastError;
  },
};

async function rebuildTableWithoutUniquePin() {
  console.log('🔄 Rebuilding users table to allow non-unique PINs and enforce unique user_number...');

  // Create new table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_number INTEGER UNIQUE,
      full_name TEXT NOT NULL,
      pin_code TEXT NOT NULL,
      role TEXT NOT NULL,
      department_code TEXT,
      department_name TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      job_title TEXT,
      is_protected INTEGER DEFAULT 0,
      can_export_excel INTEGER DEFAULT 0,
      custom_role_id INTEGER,
      custom_role_name TEXT
    )
  `);

  // Copy data
  await db.execute(`
    INSERT INTO users_new (id, user_number, full_name, pin_code, role, department_code, department_name, status, created_at, job_title, is_protected, can_export_excel, custom_role_id, custom_role_name)
    SELECT id, user_number, full_name, pin_code, role, department_code, department_name, status, created_at, job_title, is_protected, can_export_excel, custom_role_id, custom_role_name
    FROM users
  `);

  // Drop old table and rename
  await db.execute("DROP TABLE users");
  await db.execute("ALTER TABLE users_new RENAME TO users");

  const verify = await db.execute("SELECT id, user_number, full_name, pin_code, role FROM users ORDER BY user_number ASC");
  console.log('✅ Users table rebuilt successfully. Current users:');
  console.table(verify.rows);
}

rebuildTableWithoutUniquePin().catch(console.error);
