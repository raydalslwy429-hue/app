import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { resetDbClient } from "@/lib/db";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "لم يتم تحديد ملف قاعدة البيانات" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Basic SQLite magic header check (16 bytes: "SQLite format 3\0")
    if (buffer.length < 16) {
      return NextResponse.json({ success: false, error: "الملف المرفوع صغير جداً أو تالف" }, { status: 400 });
    }

    const header = buffer.subarray(0, 16).toString("utf-8");
    if (!header.startsWith("SQLite format 3")) {
      return NextResponse.json(
        { success: false, error: "الملف المحدد ليس ملف قاعدة بيانات SQLite صالح" },
        { status: 400 }
      );
    }

    const dbPath = path.resolve(process.cwd(), "local.db");

    // Create backup of current local.db if exists
    if (fs.existsSync(dbPath)) {
      const backupPath = path.resolve(process.cwd(), `local.db.bak_${Date.now()}`);
      try {
        fs.copyFileSync(dbPath, backupPath);
      } catch (e) {
        console.warn("Could not create local.db backup:", e);
      }
    }

    // Write new local.db
    fs.writeFileSync(dbPath, buffer);

    // Invalidate cached db client
    resetDbClient();

    // Verify database readability and count cases
    let caseCount = 0;
    try {
      const verifyClient = createClient({
        url: `file:${dbPath.replace(/\\/g, "/")}`,
      });
      const res = await verifyClient.execute("SELECT COUNT(*) as cnt FROM cases_master");
      caseCount = Number(res.rows[0]?.cnt || 0);
    } catch (e: any) {
      console.warn("Table check note:", e.message);
    }

    return NextResponse.json({
      success: true,
      message: `تم استيراد واسترجاع قاعدة البيانات المحلية بنجاح! تحتوي على (${caseCount}) حالة عدم مطابقة.`,
      caseCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "حدث خطأ أثناء استيراد قاعدة البيانات" },
      { status: 500 }
    );
  }
}
