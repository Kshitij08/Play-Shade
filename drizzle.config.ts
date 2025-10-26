import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const DATABASE_URL = process.env.DB_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DB_URL or DATABASE_URL environment variable is not set");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
