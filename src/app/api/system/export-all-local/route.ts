import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserEffectivePermissions } from "@/app/actions/capa";
import { db, getPersistedDatabaseMode } from "@/lib/db";
import { generateExcelWorkbookXML } from "@/lib/excel-helper";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const permissions = await getUserEffectivePermissions(session);
  if (!session || (!(["super_admin", "general_admin"].includes(session.role)) && permissions.features.export_excel !== "full")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  if (getPersistedDatabaseMode() !== "local") {
    return NextResponse.json({ error: "التصدير متاح عند تشغيل قاعدة البيانات المحلية فقط" }, { status: 409 });
  }

  const tablesResult = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const tables = tablesResult.rows.map((row) => String(row.name));
  const sheets = [];
  for (const table of tables) {
    const safeName = table.replace(/[^a-zA-Z0-9_]/g, "");
    if (!safeName) continue;
    const result = await db.execute(`SELECT * FROM "${safeName}"`);
    const columns = result.columns.map((column) => ({ header: column, key: column }));
    sheets.push({ name: safeName, columns, rows: result.rows.map((row) => ({ ...row })) as Array<Record<string, unknown>> });
  }
  const xml = generateExcelWorkbookXML({ title: "نسخة بيانات المراسيم المحلية", sheets });
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="marasim_local_backup.xls"`,
      "Cache-Control": "no-store",
    },
  });
}
