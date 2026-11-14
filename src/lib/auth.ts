import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "capa_secret_key_almaraseem_quality_system_2026_secure"
);

const COOKIE_NAME = "capa_session";

export interface UserSession {
  id: number;
  user_number?: number;
  full_name: string;
  pin_code: string;
  role: "admin" | "super_admin" | "general_admin" | "inspector" | "field_agent" | string;
  department_code: string;
  department_name: string;
  job_title?: string;
  custom_role_id?: number | null;
  custom_role_name?: string | null;
  can_export_excel?: number;
  can_create_daily_report?: number;
  can_view_daily_archive?: number;
}

export async function createSession(user: UserSession) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function authenticateWithCredentials(
  userNumberOrName: string,
  pin: string
): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  const cleanId = String(userNumberOrName || "").trim();
  const cleanPin = String(pin || "").trim();

  if (!cleanId) {
    return { success: false, error: "يرجى إدخال رقم المستخدم" };
  }
  if (!cleanPin) {
    return { success: false, error: "يرجى إدخال كلمة المرور / رمز PIN" };
  }

  // Look up user by user_number (if numeric) or full_name
  const isNumeric = /^\d+$/.test(cleanId);
  const sql = isNumeric
    ? "SELECT id, user_number, full_name, pin_code, role, department_code, department_name, status, job_title, can_export_excel, can_create_daily_report, COALESCE(can_view_daily_archive, 0) as can_view_daily_archive, custom_role_id, custom_role_name FROM users WHERE user_number = ? OR pin_code = ?"
    : "SELECT id, user_number, full_name, pin_code, role, department_code, department_name, status, job_title, can_export_excel, can_create_daily_report, COALESCE(can_view_daily_archive, 0) as can_view_daily_archive, custom_role_id, custom_role_name FROM users WHERE full_name = ?";
  
  const args = isNumeric ? [parseInt(cleanId, 10), cleanPin] : [cleanId];

  const res = await db.execute({ sql, args });

  if (res.rows.length === 0) {
    return { success: false, error: "رقم المستخدم غير موجود في النظام" };
  }

  // If multiple found (e.g. matched pin fallback), match user with correct user_number or pin
  const matchedUser = res.rows.find((r: any) => {
    if (isNumeric && Number(r.user_number) === parseInt(cleanId, 10)) return true;
    if (String(r.full_name).toLowerCase() === cleanId.toLowerCase()) return true;
    return false;
  }) || res.rows[0];

  if (matchedUser.status === "disabled") {
    return { success: false, error: "حساب المستخدم معطل حالياً من قِبل إدارة النظام. يرجى مراجعة المسؤول." };
  }

  if (String(matchedUser.pin_code) !== cleanPin) {
    return { success: false, error: "كلمة المرور غير صحيحة، يرجى إعادة المحاولة" };
  }

  const user: UserSession = {
    id: Number(matchedUser.id),
    user_number: matchedUser.user_number ? Number(matchedUser.user_number) : undefined,
    full_name: String(matchedUser.full_name),
    pin_code: String(matchedUser.pin_code),
    role: String(matchedUser.role),
    department_code: String(matchedUser.department_code),
    department_name: String(matchedUser.department_name),
    job_title: matchedUser.job_title ? String(matchedUser.job_title) : undefined,
    custom_role_id: matchedUser.custom_role_id ? Number(matchedUser.custom_role_id) : null,
    custom_role_name: matchedUser.custom_role_name ? String(matchedUser.custom_role_name) : null,
    can_export_excel: matchedUser.can_export_excel ? Number(matchedUser.can_export_excel) : 0,
    can_create_daily_report: matchedUser.can_create_daily_report !== undefined ? Number(matchedUser.can_create_daily_report) : 1,
    can_view_daily_archive: matchedUser.can_view_daily_archive ? Number(matchedUser.can_view_daily_archive) : 0,
  };

  await createSession(user);
  return { success: true, user };
}

export async function authenticateWithPin(pin: string): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  const cleanPin = pin.trim();
  if (!cleanPin) {
    return { success: false, error: "يرجى إدخال رمز المرور" };
  }

  const res = await db.execute({
    sql: "SELECT id, user_number, full_name, pin_code, role, department_code, department_name, status, job_title, can_export_excel, can_create_daily_report, COALESCE(can_view_daily_archive, 0) as can_view_daily_archive, custom_role_id, custom_role_name FROM users WHERE pin_code = ?",
    args: [cleanPin],
  });

  if (res.rows.length === 0) {
    return { success: false, error: "رمز المرور غير صحيح. تحقق من الرمز وأعد المحاولة." };
  }

  const row = res.rows[0];
  if (row.status === "disabled") {
    return { success: false, error: "حساب المستخدم معطل حالياً من قِبل إدارة النظام. يرجى مراجعة المسؤول." };
  }

  const user: UserSession = {
    id: Number(row.id),
    user_number: row.user_number ? Number(row.user_number) : undefined,
    full_name: String(row.full_name),
    pin_code: String(row.pin_code),
    role: String(row.role),
    department_code: String(row.department_code),
    department_name: String(row.department_name),
    job_title: row.job_title ? String(row.job_title) : undefined,
    custom_role_id: row.custom_role_id ? Number(row.custom_role_id) : null,
    custom_role_name: row.custom_role_name ? String(row.custom_role_name) : null,
    can_export_excel: row.can_export_excel ? Number(row.can_export_excel) : 0,
    can_create_daily_report: row.can_create_daily_report !== undefined ? Number(row.can_create_daily_report) : 1,
    can_view_daily_archive: row.can_view_daily_archive ? Number(row.can_view_daily_archive) : 0,
  };

  await createSession(user);
  return { success: true, user };
}
