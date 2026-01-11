import postgres from "postgres"

const connectionString = process.env.DATABASE_URL

export const sql = connectionString ? postgres(connectionString, { ssl: "require" }) : null

export function getDb() {
  if (!sql) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  return sql
}
