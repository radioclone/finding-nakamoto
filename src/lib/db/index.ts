import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const getDatabaseUrl = () => {
  const supabaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Database URL is not defined in environment variables");
  }

  if (!supabaseUrl.includes("sslmode=")) {
    const separator = supabaseUrl.includes("?") ? "&" : "?";
    return `${supabaseUrl}${separator}sslmode=disable`;
  }

  return supabaseUrl;
};

const connectionString = getDatabaseUrl();

const sql = postgres(connectionString, {
  max: 15,
  idle_timeout: 20,
  connect_timeout: 30,
  ssl: false,
});

export const db = drizzle(sql, { schema });
export const databaseType = "postgres-js";

export async function closeDatabase() {
  await sql.end();
}

if (typeof window === "undefined") {
  const safeUrl = connectionString.split("@")[1]?.split("?")[0] || "unknown";
  console.log("🗄️ Database connecting to:", safeUrl);
}
