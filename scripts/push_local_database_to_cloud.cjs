const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.local");
const localDbPath = path.join(root, "local.db");

function readEnvFile(filePath) {
  const values = {};
  if (!fs.existsSync(filePath)) return values;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function getTables(client) {
  const result = await client.execute(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  return result.rows.map((row) => ({ name: String(row.name), sql: String(row.sql || "") }));
}

async function getColumns(client, tableName) {
  const result = await client.execute(`PRAGMA table_info(${quoteIdentifier(tableName)})`);
  return result.rows.map((row) => ({
    name: String(row.name),
    type: String(row.type || "").trim().toUpperCase(),
    notNull: Number(row.notnull) === 1,
    defaultValue: row.dflt_value === null ? null : String(row.dflt_value),
    primaryKeyOrder: Number(row.pk),
  }));
}

async function ensureCloudSchema(localClient, cloudClient) {
  const localTables = await getTables(localClient);
  const cloudTables = new Map((await getTables(cloudClient)).map((table) => [table.name, table]));

  for (const localTable of localTables) {
    const tableName = localTable.name;
    const quotedTable = quoteIdentifier(tableName);
    if (!cloudTables.has(tableName)) {
      if (!localTable.sql) throw new Error(`تعذر قراءة مخطط الجدول المحلي ${tableName}`);
      await cloudClient.execute(localTable.sql);
      console.log(`تم إنشاء الجدول السحابي الناقص: ${tableName}`);
    }

    const localColumns = await getColumns(localClient, tableName);
    const cloudColumns = await getColumns(cloudClient, tableName);
    const cloudByName = new Map(cloudColumns.map((column) => [column.name, column]));

    for (const column of localColumns) {
      const remoteColumn = cloudByName.get(column.name);
      if (!remoteColumn) {
        if (column.primaryKeyOrder > 0) {
          throw new Error(`العمود الأساسي ${tableName}.${column.name} غير موجود في السحابة؛ أوقفنا الرفع لحماية البيانات.`);
        }
        if (column.notNull && column.defaultValue === null) {
          throw new Error(`العمود ${tableName}.${column.name} يحتاج ترحيلًا يدويًا قبل إضافة بياناته.`);
        }
        const definition = [quoteIdentifier(column.name), column.type || "TEXT"];
        if (column.notNull) definition.push("NOT NULL");
        if (column.defaultValue !== null) definition.push(`DEFAULT ${column.defaultValue}`);
        await cloudClient.execute(`ALTER TABLE ${quotedTable} ADD COLUMN ${definition.join(" ")}`);
        console.log(`تم تجهيز العمود السحابي: ${tableName}.${column.name}`);
        continue;
      }

      if (column.type && remoteColumn.type && column.type !== remoteColumn.type) {
        throw new Error(`نوع العمود ${tableName}.${column.name} مختلف بين المحلي والسحابي؛ أوقفنا الرفع.`);
      }
      if (column.primaryKeyOrder !== remoteColumn.primaryKeyOrder) {
        throw new Error(`مفتاح الجدول ${tableName}.${column.name} مختلف بين المحلي والسحابي؛ أوقفنا الرفع.`);
      }
    }
  }

  return localTables;
}

async function pushLocalDatabase() {
  if (!fs.existsSync(localDbPath)) throw new Error("ملف قاعدة البيانات المحلية local.db غير موجود.");

  const env = readEnvFile(envPath);
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error("إعداد عنوان Turso أو رمز الاتصال مفقود من .env.local.");
  }

  const localClient = createClient({
    url: `file:${localDbPath.replaceAll(String.fromCharCode(92), "/")}`,
  });
  const cloudClient = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

  try {
    await cloudClient.execute("SELECT 1 AS ping");
    console.log("تم الاتصال بالسحابة. جاري مطابقة مخطط الجداول المحلية...");
    const tables = await ensureCloudSchema(localClient, cloudClient);
    const counts = [];

    for (const { name: tableName } of tables) {
      const quotedTable = quoteIdentifier(tableName);
      const localRows = await localClient.execute(`SELECT * FROM ${quotedTable}`);
      const columns = localRows.columns.map(quoteIdentifier);
      if (columns.length === 0 || localRows.rows.length === 0) {
        counts.push({ tableName, localCount: localRows.rows.length });
        continue;
      }

      const placeholders = columns.map(() => "?").join(", ");
      const sql = `INSERT OR REPLACE INTO ${quotedTable} (${columns.join(", ")}) VALUES (${placeholders})`;
      const stmts = localRows.rows.map((row) => ({
        sql,
        args: localRows.columns.map((column) => row[column]),
      }));

      // Batch in chunks of 50 for super-fast network execution without timeout
      for (let i = 0; i < stmts.length; i += 50) {
        const chunk = stmts.slice(i, i + 50);
        await cloudClient.batch(chunk, "write");
      }

      counts.push({ tableName, localCount: localRows.rows.length });
    }

    console.log("اكتمل دمج صفوف جميع الجداول المحلية في Turso:");
    for (const { tableName, localCount } of counts) {
      const cloudCount = await cloudClient.execute(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)}`);
      console.log(`- ${tableName}: ${localCount} محلي، ${cloudCount.rows[0].count} سحابي بعد الدمج`);
    }
    console.log("لم تُحذف الصفوف الموجودة في السحابة التي لا تقابلها صفوف محلية.");
  } finally {
    await Promise.allSettled([localClient.close(), cloudClient.close()]);
  }
}

pushLocalDatabase().catch((error) => {
  const detail = error instanceof Error ? error.message : String(error);
  console.error("فشل تجهيز/رفع قاعدة البيانات المحلية إلى Turso:", detail);
  process.exitCode = 1;
});
