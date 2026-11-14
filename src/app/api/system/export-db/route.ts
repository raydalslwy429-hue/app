import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbPath = path.resolve(process.cwd(), "local.db");
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: "قاعدة البيانات المحلية غير موجودة حالياً" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const filename = `marasim_local_db_${dateStr}.db`;

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "فشل تصدير قاعدة البيانات" }, { status: 500 });
  }
}
