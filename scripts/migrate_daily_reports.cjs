const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

// Read .env.local manually
try {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  }
} catch (e) {}

async function migrate() {
  console.log("🚀 جاري تهيئة جداول التقارير اليومية والصلاحيات...");

  // 1. Local Database
  const localDb = createClient({ url: 'file:local.db' });
  try {
    await localDb.execute('ALTER TABLE users ADD COLUMN can_create_daily_report INTEGER DEFAULT 1');
    console.log("✅ تمت إضافة عمود can_create_daily_report في local.db بنجاح");
  } catch (e) {
    console.log("ℹ️ تنبيه can_create_daily_report محلي:", e.message);
  }

  await localDb.execute(`
    CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_number INTEGER NOT NULL,
      internal_id TEXT NOT NULL,
      reporter_id INTEGER,
      reporter_name TEXT NOT NULL,
      reporter_dept TEXT,
      reporter_role TEXT,
      location_code TEXT,
      location_name TEXT NOT NULL,
      recipient_to TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'submitted',
      report_date TEXT NOT NULL,
      report_time TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log("✅ تم إنشاء وتأكيد جدول daily_reports في local.db بنجاح");

  // 2. Turso Cloud Database (if credentials exist)
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    try {
      const cloudDb = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      try {
        await cloudDb.execute('ALTER TABLE users ADD COLUMN can_create_daily_report INTEGER DEFAULT 1');
        console.log("✅ تمت إضافة عمود can_create_daily_report في سحابة Turso");
      } catch (e) {
        console.log("ℹ️ تنبيه can_create_daily_report سحابي:", e.message);
      }

      await cloudDb.execute(`
        CREATE TABLE IF NOT EXISTS daily_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_number INTEGER NOT NULL,
          internal_id TEXT NOT NULL,
          reporter_id INTEGER,
          reporter_name TEXT NOT NULL,
          reporter_dept TEXT,
          reporter_role TEXT,
          location_code TEXT,
          location_name TEXT NOT NULL,
          recipient_to TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT DEFAULT 'submitted',
          report_date TEXT NOT NULL,
          report_time TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);
      console.log("✅ تم إنشاء وتأكيد جدول daily_reports في سحابة Turso Cloud بنجاح");
    } catch (err) {
      console.warn("⚠️ تعذر تطبيق الهجرة على السحابة الآن:", err.message);
    }
  }

  console.log("🎉 اكتملت عملية تهيئة الجداول بنجاح!");
}

migrate();
