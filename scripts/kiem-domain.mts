/**
 * Kiem mot domain moi da san sang phuc vu khach chua.
 *
 * Chay:  npm run kiem:domain -- https://tenmien-moi.com
 *
 * Vi sao can script rieng thay vi mo trinh duyet xem: doi domain lam hong
 * nhung thu KHONG nhin thay bang mat — sitemap tro sai dia chi, duong ket noi
 * Google tro nham noi, anh khong tai duoc vi Drive chua nhan domain moi. Mo
 * trang thay dep van co the dang hong ba thu do.
 */
import { readdirSync, readFileSync } from "node:fs";

const dich = process.argv[2]?.trim().replace(/\/+$/, "");
if (!dich || !/^https?:\/\//.test(dich)) {
  console.error("Thieu dia chi. Vi du:\n  npm run kiem:domain -- https://hamitastudio.com");
  process.exit(1);
}
const host = new URL(dich).host;

/**
 * Lay danh sach slug album tu ban sao luu moi nhat.
 *
 * Doc tu ban sao luu chu khong goi database: script nay chay duoc ca tren may
 * khong co DATABASE_URL — vi du khi muon nho nguoi khac kiem ho domain moi.
 *
 * Tra ve CA DANH SACH chu khong phai mot slug. Ban dau lay cung gallery[0],
 * nhung ban sao luu la anh chup mot thoi diem — album do co the da bi xoa tu
 * lau. Ngay 03/09/2026 dung la vay: gallery[0] tro toi mot album khong con,
 * nen bon phep kiem (trang album, anh hien duoc, manifest, danh sach da chon)
 * cung bao hong mot luc trong khi web hoan toan khoe. Mot script kiem tra hay
 * bao dong nham thi chang ai them doc no nua.
 */
function dsSlug(): string[] {
  try {
    const tep = readdirSync("data/sao-luu")
      .filter((f) => f.endsWith(".json"))
      .sort()
      .pop();
    if (!tep) return [];
    const j = JSON.parse(readFileSync(`data/sao-luu/${tep}`, "utf8")) as {
      bang?: { gallery?: { slug: string }[] };
    };
    return (j.bang?.gallery ?? []).map((g) => g.slug).filter(Boolean);
  } catch {
    return [];
  }
}

/** Album dau tien trong ban sao luu ma domain nay con phuc vu that. */
async function slugConSong(): Promise<string | null> {
  for (const s of dsSlug()) {
    try {
      const { res } = await lay(`/g/${s}`);
      if (res.status === 200) return s;
    } catch {
      /* Goi hong thi thu slug ke tiep. */
    }
  }
  return null;
}

type KetQua = { ten: string; dat: boolean; chiTiet: string };
const ra: KetQua[] = [];

function ghi(ten: string, dat: boolean, chiTiet: string) {
  ra.push({ ten, dat, chiTiet });
  console.log(`${dat ? "  OK  " : "  HONG"}  ${ten.padEnd(38)} ${chiTiet}`);
}

async function lay(duong: string, tuyChon: RequestInit = {}) {
  const t = Date.now();
  const res = await fetch(`${dich}${duong}`, { redirect: "manual", ...tuyChon });
  return { res, ms: Date.now() - t };
}

console.log(`\nKiem domain: ${dich}\n${"-".repeat(64)}`);

/* 1. Nhung trang khach va studio mo hang ngay. */
for (const [ten, duong, mongDoi] of [
  ["Trang gioi thieu", "/", 200],
  ["Trang quan ly", "/admin", 200],
  ["Duong kiem suc khoe", "/api/suc-khoe", 200],
] as const) {
  try {
    const { res, ms } = await lay(duong);
    ghi(ten, res.status === mongDoi, `${res.status} · ${ms}ms`);
  } catch (e) {
    ghi(ten, false, `khong goi duoc: ${(e as Error).message}`);
  }
}

/* 2. Database va Drive con song qua domain nay khong. */
try {
  const { res } = await lay("/api/suc-khoe");
  const j = (await res.json()) as { kiem?: { database?: boolean; drive?: boolean } };
  ghi("Database doc duoc", j.kiem?.database === true, j.kiem?.database ? "co" : "KHONG");
  ghi("Drive doc duoc", j.kiem?.drive === true, j.kiem?.drive ? "co" : "KHONG — kiem lai ket noi Google");
} catch {
  ghi("Database va Drive", false, "khong doc duoc ket qua");
}

/*
  3. Sitemap va robots PHAI mang domain moi.

  Day la phep kiem quan trong nhat cua ca script: neu NEXT_PUBLIC_SITE_URL van
  con tro domain cu (hoac chua deploy lai sau khi dat), hai tep nay se khai bao
  dia chi cu — Google se di lap chi muc dia chi cu, va duong ket noi Google
  cung dung dia chi cu nen bam "Ket noi lai" se bao redirect_uri_mismatch.
  Trang van mo binh thuong nen khong ai phat hien ra.
*/
try {
  const { res } = await lay("/sitemap.xml");
  const xml = await res.text();
  const khop = xml.includes(host);
  ghi("Sitemap mang domain moi", khop, khop ? host : `van tro: ${xml.match(/https?:\/\/[^<]+/)?.[0] ?? "?"}`);
} catch {
  ghi("Sitemap mang domain moi", false, "khong doc duoc");
}

try {
  const { res } = await lay("/robots.txt");
  const txt = await res.text();
  const khop = txt.includes(host);
  ghi("robots.txt mang domain moi", khop, khop ? host : `van tro: ${txt.match(/https?:\/\/\S+/)?.[0] ?? "?"}`);
} catch {
  ghi("robots.txt mang domain moi", false, "khong doc duoc");
}

/* 4. Album that: trang khach mo duoc, va anh tai ve duoc qua domain moi. */
const slug = await slugConSong();
if (!slug) {
  console.log("  --    Bo qua phan album           khong co album nao trong ban sao luu con song");
} else {
  try {
    const { res, ms } = await lay(`/g/${slug}`);
    const html = await res.text();
    ghi("Trang album cua khach", res.status === 200, `${res.status} · ${ms}ms · /g/${slug}`);

    const noindex = /noindex/i.test(html);
    ghi("Anh cuoi khong len Google", noindex, noindex ? "co the noindex" : "THIEU — anh khach se bi lap chi muc");

    const anh = html.match(/\/api\/img\/([A-Za-z0-9_-]{10,})/)?.[1];
    if (anh) {
      const { res: r2, ms: m2 } = await lay(`/api/img/${anh}?w=640`, {
        headers: { Referer: `${dich}/g/${slug}` },
      });
      const kb = Math.round(Number(r2.headers.get("content-length") ?? 0) / 1024);
      ghi("Anh hien duoc", r2.status === 200, `${r2.status} · ${kb} KB · ${m2}ms`);
    } else {
      ghi("Anh hien duoc", false, "khong tim thay anh nao trong trang");
    }

    const { res: r3 } = await lay(`/g/${slug}/manifest.webmanifest`);
    ghi("Manifest cai app", r3.status === 200, `${r3.status}`);
  } catch (e) {
    ghi("Album cua khach", false, (e as Error).message);
  }
}

/* 5. Nhung duong chi studio duoc vao. */
for (const duong of ["/api/admin/export", "/api/admin/backup", "/api/admin/kho-anh"]) {
  try {
    const { res } = await lay(duong);
    ghi(`Chan nguoi la: ${duong}`, res.status === 401 || res.status === 403, String(res.status));
  } catch {
    ghi(`Chan nguoi la: ${duong}`, false, "khong goi duoc");
  }
}

/* 6. Danh sach khach da chon phai doi ma (nguyen tac 3). */
if (slug) {
  try {
    const { res } = await lay(`/api/selections?slug=${encodeURIComponent(slug)}`);
    ghi("Danh sach da chon doi ma", res.status === 403, String(res.status));
  } catch {
    ghi("Danh sach da chon doi ma", false, "khong goi duoc");
  }
}

/* 7. Domain cu con phuc vu link da gui khach khong. */
const CU = "https://hamita-gallery.vercel.app";
if (!dich.startsWith(CU)) {
  try {
    const res = await fetch(`${CU}/api/suc-khoe`, { redirect: "manual" });
    const chuyenHuong = res.status >= 300 && res.status < 400;
    ghi(
      "Link cu da gui khach",
      res.status === 200 || chuyenHuong,
      chuyenHuong ? `chuyen huong ${res.status} -> ${res.headers.get("location")}` : `${res.status} · van phuc vu`
    );
  } catch {
    ghi("Link cu da gui khach", false, "KHONG con phuc vu — 6 album da gui se chet");
  }
}

const hong = ra.filter((r) => !r.dat);
console.log("-".repeat(64));
console.log(`${ra.length - hong.length}/${ra.length} phep kiem dat.`);
if (hong.length) {
  console.log("\nCon hong:");
  for (const h of hong) console.log(`  · ${h.ten} — ${h.chiTiet}`);
  process.exit(1);
}
console.log("Domain moi san sang.");
