import { PrismaClient } from "@prisma/client";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Serverless hosts (Netlify) ship a read-only bundle: copy the seeded preview
// database to /tmp so the site can write. Data resets whenever an instance recycles.
function serverlessDatabaseUrl() {
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.NETLIFY) return undefined;
  const target = "/tmp/zh-preview.db";
  if (!existsSync(target)) {
    const source = [process.cwd(), process.env.LAMBDA_TASK_ROOT ?? ""]
      .map((root) => path.join(root, "prisma", "preview.db"))
      .find((p) => existsSync(p));
    if (!source) return undefined;
    copyFileSync(source, target);
  }
  return `file:${target}`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: serverlessDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
