import { NextRequest, NextResponse } from "next/server";
import { exportCasesAuditTrailToExcelAction } from "@/app/actions/capa";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const res = await exportCasesAuditTrailToExcelAction();
    if (!res.success || !res.xml) {
      return NextResponse.json(
        { error: res.error || "فشل تصدير ملف الإكسيل" },
        { status: 400 }
      );
    }

    const filename = res.filename || "marasim_capa_audit_trail.xls";

    return new NextResponse(res.xml, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
