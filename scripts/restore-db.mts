/**
 * Phuc hoi tu mot ban sao luu.
 *
 *   npm run db:restore                              — liet ke cac ban dang co
 *   npm run db:restore -- <tep>                     — XEM TRUOC, khong ghi gi
 *   npm run db:restore -- <tep> --ghi               — ghi that
 *   npm run db:restore -- <tep> --album <slug> --ghi — chi phuc hoi mot album
 *
 * HAI NGUYEN TAC AN TOAN, co y dat cung nhau:
 *
 * 1. MAC DINH LA XEM TRUOC. Phai go them --ghi moi dong vao database. Mot lenh
 *    phuc hoi go nham ma chay ngay thi con tai hai hon la khong co lenh nao.
 *
 * 2. CHI THEM, KHONG BAO GIO GHI DE HAY XOA. Ban ghi nao con ton tai thi bo
 *    qua va bao ro. Ly do: truong hop can phuc hoi thuc te gan nhu luon la
 *    "xoa nham mot album", chu khong phai "muon quay ca database ve hom qua".
 *    Ghi de thi mot lan phuc hoi nham se xoa mat nhung lua chon khach vua lam
 *    hom nay — dung cai ma ban sao luu sinh ra de bao ve.
 *
 * Ban sao luu KHONG chua phieu dang nhap Google. Phuc hoi xong phai vao trang
 * quan ly bam "Ket noi lai" — xem chu thich trong backup-db.mts.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { readFile, readdir } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

const { getPrisma, databaseIsConfigured } = await import("../src/lib/db");

const THU_MUC = join(process.cwd(), "data", "sao-luu");

/** Cac cot kieu ngay o tung bang — JSON chi giu duoc chuoi, phai doi lai. */
const COT_NGAY: Record<string, string[]> = {
  gallery: ["createdAt", "syncedAt", "expiresAt", "selectionsDoneAt"],
  selectionList: [],
  selection: ["createdAt"],
  mucXong: ["xongLuc"],
  pushSub: ["createdAt"],
  googleAccount: ["connectedAt"],
};

function doiNgay<T extends Record<string, unknown>>(bang: string, dong: T): T {
  const ra = { ...dong } as Record<string, unknown>;
  for (const cot of COT_NGAY[bang] ?? []) {
    if (typeof ra[cot] === "string") ra[cot] = new Date(ra[cot] as string);
  }
  return ra as T;
}

async function lietKe() {
  let tep: string[] = [];
  try {
    tep = (await readdir(THU_MUC))
      .filter((t) => t.startsWith("hamita-") && t.endsWith(".json"))
      .sort()
      .reverse();
  } catch {
    /* Chua co thu muc nao. */
  }

  if (tep.length === 0) {
    console.log("Chua co ban sao luu nao. Chay `npm run db:backup` truoc.");
    return;
  }

  console.log(`Co ${tep.length} ban sao luu trong data/sao-luu:\n`);
  for (const t of tep) {
    try {
      const b = JSON.parse(await readFile(join(THU_MUC, t), "utf8"));
      console.log(
        `  ${t}   ${String(b.soLuong?.gallery ?? "?").padStart(3)} album · ` +
          `${String(b.soLuong?.selection ?? "?").padStart(5)} lua chon`
      );
    } catch {
      console.log(`  ${t}   (khong doc duoc)`);
    }
  }
  console.log("\nXem truoc mot ban:  npm run db:restore -- <ten tep>");
}

/* ── Bat dau ────────────────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const ghiThat = args.includes("--ghi");
const viTriAlbum = args.indexOf("--album");
const chiAlbum = viTriAlbum >= 0 ? args[viTriAlbum + 1] : null;
const tenTep = args.find((a) => !a.startsWith("--") && a !== chiAlbum);

if (!tenTep) {
  await lietKe();
  process.exit(0);
}

if (!databaseIsConfigured()) {
  console.error("Thieu DATABASE_URL trong .env.local.");
  process.exit(1);
}

const duongDan = isAbsolute(tenTep) ? tenTep : join(THU_MUC, tenTep);
let ban: {
  luc: string;
  bang: Record<string, Record<string, unknown>[]>;
};
try {
  ban = JSON.parse(await readFile(duongDan, "utf8"));
} catch {
  console.error(`Khong doc duoc tep: ${duongDan}`);
  process.exit(1);
}

console.log(`Ban sao luu luc ${ban.luc}`);
console.log(ghiThat ? "CHE DO: GHI THAT\n" : "CHE DO: xem truoc, khong ghi gi\n");

const prisma = getPrisma();

/*
  Chon ra dung nhung dong can phuc hoi. Loc theo album thi phai keo theo ca
  danh sach chon va lua chon cua no, neu khong se phuc hoi ra mot album rong.
*/
let dsGallery = ban.bang.gallery ?? [];
if (chiAlbum) {
  dsGallery = dsGallery.filter((g) => g.slug === chiAlbum);
  if (dsGallery.length === 0) {
    console.error(`Khong tim thay album co slug "${chiAlbum}" trong ban nay.`);
    process.exit(1);
  }
}
const idGallery = new Set(dsGallery.map((g) => g.id as string));

const dsList = (ban.bang.selectionList ?? []).filter((l) =>
  idGallery.has(l.galleryId as string)
);
const idList = new Set(dsList.map((l) => l.id as string));
const dsSelection = (ban.bang.selection ?? []).filter((s) =>
  idList.has(s.listId as string)
);
const dsMucXong = (ban.bang.mucXong ?? []).filter((m) =>
  idGallery.has(m.galleryId as string)
);

/*
  PushSub co tinh khong phuc hoi: phieu do gan voi mot trinh duyet cu the va
  het hieu luc khi khach go app. Phuc hoi lai chi tao ra mot dong rac ma lan
  gui dau tien se xoa di.
*/

let daThem = 0;
let boQua = 0;

for (const g of dsGallery) {
  const dangCo = await prisma.gallery.findUnique({
    where: { id: g.id as string },
  });
  const ten = (g.clientName as string) ?? (g.title as string);

  if (dangCo) {
    console.log(`  bo qua   ${String(g.slug).padEnd(36)} ${ten}  (van con trong database)`);
    boQua++;
    continue;
  }

  const listCuaNo = dsList.filter((l) => l.galleryId === g.id);
  const idListCuaNo = new Set(listCuaNo.map((l) => l.id));
  const selCuaNo = dsSelection.filter((s) => idListCuaNo.has(s.listId));
  const mucCuaNo = dsMucXong.filter((m) => m.galleryId === g.id);

  console.log(
    `  ${ghiThat ? "phuc hoi" : "SE them "} ${String(g.slug).padEnd(36)} ${ten}` +
      `  (${selCuaNo.length} lua chon, ${listCuaNo.length} danh sach)`
  );

  if (ghiThat) {
    /*
      Mot giao dich cho ca album: neu ghi lua chon that bai giua chung thi khong
      de lai mot album rong trong database, kho hieu hon la khong co gi.
    */
    await prisma.$transaction([
      prisma.gallery.create({ data: doiNgay("gallery", g) as never }),
      ...listCuaNo.map((l) =>
        prisma.selectionList.create({ data: doiNgay("selectionList", l) as never })
      ),
      ...selCuaNo.map((s) =>
        prisma.selection.create({ data: doiNgay("selection", s) as never })
      ),
      ...mucCuaNo.map((m) =>
        prisma.mucXong.create({ data: doiNgay("mucXong", m) as never })
      ),
    ]);
  }
  daThem++;
}

console.log(
  `\n${ghiThat ? "Da phuc hoi" : "Se phuc hoi"} ${daThem} album` +
    (boQua ? `, bo qua ${boQua} album van con trong database.` : ".")
);

if (!ghiThat && daThem > 0) {
  console.log("\nGhi that thi them --ghi vao cuoi lenh.");
}
if (ghiThat && daThem > 0) {
  console.log(
    "\nNho: ban sao luu khong chua phieu Google. Neu vua phuc hoi sau mot su co " +
      "lon thi vao trang quan ly kiem tra muc ket noi Drive."
  );
}
