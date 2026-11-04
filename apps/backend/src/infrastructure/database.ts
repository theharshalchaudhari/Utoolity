import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be configured before starting the backend.");
}

export const database = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: "utoolity-backend",
  ...(process.env.NODE_ENV === "production" && process.env.PG_SSL === "true"
    ? { ssl: { rejectUnauthorized: true } }
    : {}),
});

database.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export async function closeDatabase(): Promise<void> {
  await database.end();
}
