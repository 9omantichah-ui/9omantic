import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

async function createPrismaClient() {
  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = await import("@libsql/client");
    const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter } as never);
  }
  return new PrismaClient();
}

let prismaPromise: Promise<PrismaClient>;

if (globalForPrisma.prisma) {
  prismaPromise = Promise.resolve(globalForPrisma.prisma);
} else {
  prismaPromise = createPrismaClient().then((client) => {
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
    return client;
  });
}

export { prismaPromise as prismaAsync };

// 同步导出（本地开发用）
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
export default prisma;