"use server";

import { getPersistedDatabaseMode, setPersistedDatabaseMode } from "@/lib/db";
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import { getSession } from "@/lib/auth";
import { getUserEffectivePermissions } from "@/app/actions/capa";

export async function getDatabaseModeAction(): Promise<"local" | "cloud"> {
  return getPersistedDatabaseMode();
}

export async function testDatabaseConnectionAction(targetMode?: "local" | "cloud"): Promise<{
  success: boolean;
  mode: "local" | "cloud";
  pingTimeMs?: number;
  error?: string;
}> {
  const mode = targetMode || getPersistedDatabaseMode();
  const startTime = Date.now();

  try {
    if (mode === "cloud") {
      const url = process.env.TURSO_DATABASE_URL || "libsql://raeed1-raydalslwy429-hue.aws-eu-central-1.turso.io";
      const authToken = process.env.TURSO_AUTH_TOKEN || "";
      const client = createClient({ url, authToken });
      await client.execute("SELECT 1 as ping");
      const pingTimeMs = Date.now() - startTime;
      return { success: true, mode: "cloud", pingTimeMs };
    } else {
      const localDbPath = path.resolve(process.cwd(), "local.db");
      if (!fs.existsSync(localDbPath)) {
        return { success: false, mode: "local", error: "ملف قاعدة البيانات المحلية (local.db) غير موجود" };
      }
      const client = createClient({ url: `file:${localDbPath.replace(/\\/g, "/")}` });
      await client.execute("SELECT 1 as ping");
      const pingTimeMs = Date.now() - startTime;
      return { success: true, mode: "local", pingTimeMs };
    }
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : String(err || "");
    return {
      success: false,
      mode,
      error: /fetch|network|enotfound|eai_again|timeout|connect|socket/i.test(errorMessage)
        ? mode === "cloud"
          ? "تعذر الاتصال بالسحابة: تحقق من اتصال الإنترنت"
          : "تعذر الاتصال بقاعدة البيانات المحلية"
        : (errorMessage || "فشل الاتصال بقاعدة البيانات"),
    };
  }
}

export async function toggleDatabaseModeAction(requestedMode?: "local" | "cloud"): Promise<{
  success: boolean;
  mode: "local" | "cloud";
  message: string;
  error?: string;
  pingTimeMs?: number;
}> {
  const session = await getSession();
  const permissions = await getUserEffectivePermissions(session);
  const isAllowedAdmin = session?.role === "super_admin" || session?.role === "general_admin" || session?.role === "admin";
  if (!session || (!isAllowedAdmin && !["full", "exclusive"].includes(permissions.features.manage_sync))) {
    return {
      success: false,
      mode: getPersistedDatabaseMode(),
      message: "",
      error: "تحتاج إلى صلاحية إدارة وضع قاعدة البيانات والمزامنة",
    };
  }

  const currentMode = getPersistedDatabaseMode();
  const targetMode = requestedMode || (currentMode === "local" ? "cloud" : "local");

  // If switching to Cloud: Test connection first to prevent stranded state
  if (targetMode === "cloud") {
    const testRes = await testDatabaseConnectionAction("cloud");
    if (!testRes.success) {
      return {
        success: false,
        mode: currentMode,
        error: `⚠️ لم يتم التفعيل: تعذر الاتصال بسحابة Turso (${testRes.error || "تحقق من اتصال الإنترنت"}). تم الإبقاء على وضع الأوفلاين المحلي للحفاظ على استقرار العمل.`,
        message: "لم يتم التحويل للسحابة بسبب تعذر الاتصال",
      };
    }

    // Switching modes only changes the active database target; it does not sync data.
    setPersistedDatabaseMode("cloud");
    if (getPersistedDatabaseMode() !== "cloud") {
      return {
        success: false,
        mode: currentMode,
        error: "تعذر حفظ وضع السحابة في إعدادات هذا الجهاز",
        message: "لم يتم التحويل للسحابة",
      };
    }
    return {
      success: true,
      mode: "cloud",
      pingTimeMs: testRes.pingTimeMs,
      message: `🎉 تمت عملية التفعيل بنجاح! النظام متصل الآن بسحابة Turso (أونلاين) - استجابة السحابة: ${testRes.pingTimeMs}ms.`,
    };
  } else {
    // Switching to Local
    const testRes = await testDatabaseConnectionAction("local");
    if (!testRes.success) {
      return {
        success: false,
        mode: currentMode,
        error: `تعذر الاتصال بقاعدة البيانات المحلية: ${testRes.error || "تحقق من ملف local.db"}`,
        message: "لم يتم التحويل للوضع المحلي",
      };
    }
    setPersistedDatabaseMode("local");
    if (getPersistedDatabaseMode() !== "local") {
      return {
        success: false,
        mode: currentMode,
        error: "تعذر حفظ الوضع المحلي في إعدادات هذا الجهاز",
        message: "لم يتم التحويل للوضع المحلي",
      };
    }
    return {
      success: true,
      mode: "local",
      pingTimeMs: testRes.pingTimeMs,
      message: "💻 تمت عملية التفعيل بنجاح! النظام يعمل الآن محلياً بالكامل (أوفلاين) على قاعدة البيانات المحلية local.db.",
    };
  }
}
