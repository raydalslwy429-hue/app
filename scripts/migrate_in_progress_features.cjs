const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

// Read .env.local for Turso Cloud credentials
const envPath = path.resolve(__dirname, '..', '.env.local');
let cloudUrl = "libsql://raeed1-raydalslwy429-hue.aws-eu-central-1.turso.io";
let authToken = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('TURSO_DATABASE_URL=')) {
      cloudUrl = trimmed.split('=')[1].trim();
    } else if (trimmed.startsWith('TURSO_AUTH_TOKEN=')) {
      authToken = trimmed.split('=')[1].trim();
    }
  });
}

const localDbPath = path.resolve(__dirname, '..', 'local.db');

async function migrate() {
  console.log("🚀 جاري إضافة حقول الملاحظات والتنبيهات المباشرة للحالات قيد التنفيذ...");

  // 1. Local Database
  if (fs.existsSync(localDbPath)) {
    const localDb = createClient({ url: `file:${localDbPath.replace(/\\/g, '/')}` });
    try {
      await localDb.execute("ALTER TABLE cases_master ADD COLUMN in_progress_note TEXT");
      console.log("✅ تم إضافة عمود in_progress_note إلى cases_master في local.db");
    } catch (e) {
      if (e.message && e.message.includes("duplicate column")) {
        console.log("ℹ️ عمود in_progress_note موجود مسبقاً في local.db");
      } else {
        console.warn("⚠️ تنبيه local.db:", e.message);
      }
    }
  }

  // 2. Turso Cloud
  if (cloudUrl && authToken) {
    const cloudDb = createClient({ url: cloudUrl, authToken: authToken });
    try {
      await cloudDb.execute("ALTER TABLE cases_master ADD COLUMN in_progress_note TEXT");
      console.log("✅ تم إضافة عمود in_progress_note إلى cases_master في Turso Cloud");
    } catch (e) {
      if (e.message && (e.message.includes("duplicate column") || e.message.includes("already exists"))) {
        console.log("ℹ️ عمود in_progress_note موجود مسبقاً في Turso Cloud");
      } else {
        console.warn("⚠️ تنبيه Turso Cloud:", e.message);
      }
    }
  }

  console.log("🎉 اكتمل تحديث قاعدة البيانات بنجاح!");
}

migrate().catch(console.error);
