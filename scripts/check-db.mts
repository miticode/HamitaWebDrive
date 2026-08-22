/** Doc nhanh xem trong Postgres dang co gi. Chay: npm run db:check */
import { config as loadEnv } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: ".env.local", quiet: true });

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("Thieu DATABASE_URL trong .env.local");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

const galleries = await prisma.gallery.findMany({
  orderBy: { createdAt: "asc" },
  include: {
    lists: {
      orderBy: { position: "asc" },
      include: { _count: { select: { selections: true } } },
    },
  },
});

for (const g of galleries) {
  const lists = g.lists.map((l) => `${l.name}: ${l._count.selections}`).join(" | ");
  console.log(`${g.slug.padEnd(24)} ${lists}`);
}

console.log(`\nTong: ${galleries.length} gallery, ${await prisma.selection.count()} lua chon`);

await prisma.$disconnect();
