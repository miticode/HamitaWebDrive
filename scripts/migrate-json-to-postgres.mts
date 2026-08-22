/**
 * Chuyen du lieu tu kho JSON (data/db.json) sang Postgres.
 * Chay mot lan khi doi tu chay o may sang chay tren mang:
 *
 *   node scripts/migrate-json-to-postgres.mts
 *
 * Chay lai nhieu lan khong sao — gallery da co (trung slug) se duoc bo qua.
 */
import { readFileSync } from "node:fs";
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

type JsonGallery = {
  id: string;
  slug: string;
  title: string;
  clientName: string | null;
  driveFolderId: string;
  allowDownload: boolean;
  createdAt: string;
};
type JsonList = { id: string; galleryId: string; name: string; icon: string; position: number };
type JsonSelection = {
  id: string;
  listId: string;
  driveFileId: string;
  fileName: string;
  albumName: string;
  visitorId: string;
  note: string | null;
  createdAt: string;
};
type JsonDb = { galleries: JsonGallery[]; lists: JsonList[]; selections: JsonSelection[] };

let db: JsonDb;
try {
  db = JSON.parse(readFileSync("data/db.json", "utf8")) as JsonDb;
} catch {
  console.log("Khong co data/db.json — khong co gi de chuyen.");
  process.exit(0);
}

const listsOf = (galleryId: string) => db.lists.filter((l) => l.galleryId === galleryId);
const selectionsOf = (listId: string) => db.selections.filter((s) => s.listId === listId);

let added = 0;
let skipped = 0;

for (const g of db.galleries ?? []) {
  const existing = await prisma.gallery.findUnique({ where: { slug: g.slug } });
  if (existing) {
    console.log(`bo qua (da co): ${g.slug}`);
    skipped++;
    continue;
  }

  await prisma.gallery.create({
    data: {
      slug: g.slug,
      title: g.title,
      clientName: g.clientName,
      driveFolderId: g.driveFolderId,
      allowDownload: g.allowDownload,
      createdAt: new Date(g.createdAt),
      lists: {
        create: listsOf(g.id).map((l) => ({
          name: l.name,
          icon: l.icon,
          position: l.position,
          selections: {
            create: selectionsOf(l.id).map((s) => ({
              driveFileId: s.driveFileId,
              fileName: s.fileName,
              albumName: s.albumName,
              visitorId: s.visitorId,
              note: s.note,
              createdAt: new Date(s.createdAt),
            })),
          },
        })),
      },
    },
  });

  console.log(`da chuyen: ${g.slug}`);
  added++;
}

const counts = {
  gallery: await prisma.gallery.count(),
  danhSachChon: await prisma.selectionList.count(),
  luaChon: await prisma.selection.count(),
};

console.log(`\nChuyen ${added} gallery, bo qua ${skipped}.`);
console.log("Trong Postgres hien co:", counts);

await prisma.$disconnect();
