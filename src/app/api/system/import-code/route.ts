import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rootDir = process.cwd();
  const tempZip = path.resolve(rootDir, `temp_import_${Date.now()}.zip`);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "لم يتم تحديد ملف الكود المضغوط (ZIP)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Basic zip magic check (PK\x03\x04 or PK\x05\x06)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return NextResponse.json({ success: false, error: "الملف المرفوع ليس ملف ZIP صالح" }, { status: 400 });
    }

    // Save temporary zip
    fs.writeFileSync(tempZip, buffer);

    // Extract into rootDir using tar
    const extractCmd = `tar -xf "${tempZip}" -C "${rootDir}"`;
    execSync(extractCmd, { cwd: rootDir, stdio: "pipe" });

    // Clean up temporary zip
    try {
      fs.unlinkSync(tempZip);
    } catch {}

    return NextResponse.json({
      success: true,
      message: "🎉 تم بنجاح استيراد وتحديث كود وملفات المشروع والشاشات بالكامل!",
    });
  } catch (error: any) {
    if (fs.existsSync(tempZip)) {
      try { fs.unlinkSync(tempZip); } catch {}
    }
    return NextResponse.json(
      { success: false, error: error.message || "حدث خطأ أثناء استيراد ملفات المشروع" },
      { status: 500 }
    );
  }
}
