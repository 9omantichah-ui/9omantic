// Prisma 已弃用，统一使用 @/lib/db (libSQL client)
// 此文件保留以避免可能的旧导入报错
export default async function makePrisma() { throw new Error("Prisma 已弃用，请使用 @/lib/db"); }