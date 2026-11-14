import { createClient, InStatement } from "@libsql/client";
import path from "path";
import fs from "fs";

type LibSqlClient = ReturnType<typeof createClient>;

let cachedClient: LibSqlClient | null = null;
let cachedMode: string | undefined = undefined;

export function getPersistedDatabaseMode(): "local" | "cloud" {
  try {
    const configPath = path.resolve(process.cwd(), "system_mode.json");
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (data.mode === "local" || data.mode === "cloud") {
        return data.mode;
      }
    }
  } catch {}
  return (process.env.DATABASE_MODE as "local" | "cloud") || "local";
}

export function setPersistedDatabaseMode(mode: "local" | "cloud") {
  try {
    const configPath = path.resolve(process.cwd(), "system_mode.json");
    fs.writeFileSync(configPath, JSON.stringify({ mode, updatedAt: new Date().toISOString() }, null, 2), "utf-8");
  } catch {}
  process.env.DATABASE_MODE = mode;
  cachedClient = null;
  cachedMode = undefined;
}

export function resetDbClient() {
  cachedClient = null;
  cachedMode = undefined;
}

export function getClient(): LibSqlClient {
  const currentMode = getPersistedDatabaseMode();
  if (cachedClient && cachedMode === currentMode) {
    return cachedClient;
  }

  const isLocal = currentMode === "local";
  const localDbUrl = `file:${path.resolve(process.cwd(), "local.db").replace(/\\/g, "/")}`;

  const url = isLocal
    ? localDbUrl
    : (process.env.TURSO_DATABASE_URL || "libsql://raeed1-raydalslwy429-hue.aws-eu-central-1.turso.io");

  const authToken = isLocal ? undefined : (process.env.TURSO_AUTH_TOKEN || "");

  cachedClient = createClient({
    url,
    authToken,
  });
  cachedMode = currentMode;
  return cachedClient;
}

export const db = {
  async execute(stmt: InStatement) {
    const client = getClient();
    return await client.execute(stmt);
  },
  async batch(stmts: InStatement[], mode?: any) {
    const client = getClient();
    return await client.batch(stmts, mode);
  },
};
