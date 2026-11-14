import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  const rootDir = process.cwd();
  const tempZip = path.resolve(rootDir, `marasim_export_${Date.now()}.zip`);

  try {
    // Run tar to bundle source files and configs
    const cmd = `tar -a -c -f "${tempZip}" --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="*.log" --exclude="local.db*" --exclude="temp_*.zip" --exclude="marasim_export_*.zip" src public system_data scripts package.json tsconfig.json tailwind.config.ts postcss.config.mjs .env.local system_mode.json`;
    
    execSync(cmd, { cwd: rootDir, stdio: "pipe" });

    if (!fs.existsSync(tempZip)) {
      return NextResponse.json({ error: "فشل إنشاء ملف أرشيف الكود" }, { status: 500 });
    }

    const fileBuffer = fs.readFileSync(tempZip);
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const filename = `marasim_project_code_${dateStr}.zip`;

    // Clean up temporary zip on disk
    try {
      fs.unlinkSync(tempZip);
    } catch {}

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    if (fs.existsSync(tempZip)) {
      try { fs.unlinkSync(tempZip); } catch {}
    }
    return NextResponse.json({ error: error.message || "فشل تصدير كود المشروع" }, { status: 500 });
  }
}
