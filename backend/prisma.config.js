import { defineConfig, env } from "prisma/config";

try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js --force",
  },
  datasource: { url: env("DATABASE_URL") },
});
