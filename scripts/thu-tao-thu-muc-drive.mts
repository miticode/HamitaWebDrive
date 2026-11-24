/**
 * THỬ: web có tạo được thư mục con BÊN TRONG thư mục ảnh cưới sẵn có không?
 *
 * Đây là câu hỏi quyết định của ý "lập hợp đồng xong tự tạo link Drive".
 * Kết nối "default" xin `drive.readonly` + `drive.file`. Phần `drive.file`
 * chỉ cho đụng tới tệp DO CHÍNH WEB TẠO — nên tạo thư mục ở gốc My Drive thì
 * chắc chắn được (sao lưu đêm vẫn làm), nhưng tạo thư mục CON trong một thư
 * mục do người ta tạo tay thì phải thử mới biết.
 *
 * Script tạo một thư mục rỗng tên "ZZ THU NGHIEM …" rồi XOÁ NGAY, và đọc lại
 * để xác nhận đã sạch. Không đụng tới một tấm ảnh nào.
 *
 * Chạy: npx tsx scripts/thu-tao-thu-muc-drive.mts
 */
import { readFileSync } from "node:fs";
for (const t of [".env.local", ".env"]) {
  try {
    for (const d of readFileSync(t, "utf8").split("\n")) {
      const m = d.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const { getPrisma } = await import("../src/lib/db");
const { getUserAccessToken } = await import("../src/lib/googleAuth");

const TEN_THU = `ZZ THU NGHIEM thu-muc-${Date.now()}`;
const p = getPrisma();
const token = await getUserAccessToken();
if (!token) {
  console.log("Chua ket noi Google Drive — khong thu duoc.");
  process.exit(1);
}

const api = async (url: string, init?: RequestInit) => {
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  return { ok: r.ok, status: r.status, than: await r.text() };
};

/* Lấy một album thật để biết thư mục CHA của các album. */
const album = await p.gallery.findFirst({
  where: { driveFolderId: { not: "" } },
  orderBy: { createdAt: "desc" },
  select: { title: true, clientName: true, driveFolderId: true },
});
if (!album) { console.log("Khong co album nao de lay thu muc cha."); process.exit(1); }

const meta = await api(
  `https://www.googleapis.com/drive/v3/files/${album.driveFolderId}?fields=id,name,parents`,
);
if (!meta.ok) { console.log(`Khong doc duoc thu muc album: ${meta.status} ${meta.than.slice(0, 200)}`); process.exit(1); }
const info = JSON.parse(meta.than) as { name: string; parents?: string[] };
const cha = info.parents?.[0];
console.log(`Thu muc album: "${info.name}"`);
console.log(`Thu muc cha:   ${cha ?? "(khong thay — co the la o chia se)"}\n`);

let dat = 0, truot = 0;
const kiem = (ten: string, ok: boolean, them = "") => {
  console.log(`  ${ok ? "OK " : "XX "} ${ten}${them ? ` — ${them}` : ""}`);
  if (ok) dat++;
  else truot++;
};

/* ── Thử 1: tạo thư mục con trong đúng thư mục cha đó ─────────────────── */
let idMoi: string | null = null;
const tao = await api("https://www.googleapis.com/drive/v3/files?fields=id,name,parents,webViewLink", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: TEN_THU,
    mimeType: "application/vnd.google-apps.folder",
    ...(cha ? { parents: [cha] } : {}),
  }),
});
kiem("tao duoc thu muc con trong thu muc cha", tao.ok, tao.ok ? "" : `${tao.status} ${tao.than.slice(0, 160)}`);
if (tao.ok) {
  const t = JSON.parse(tao.than) as { id: string; webViewLink?: string };
  idMoi = t.id;
  console.log(`       id = ${t.id}`);
  console.log(`       link = ${t.webViewLink ?? "(khong tra ve)"}`);

  /* ── Thử 2: đọc lại được không (phần readonly có thấy thư mục mới?) ── */
  const doc = await api(`https://www.googleapis.com/drive/v3/files/${t.id}?fields=id,name`);
  kiem("doc lai duoc thu muc vua tao", doc.ok, doc.ok ? "" : `${doc.status}`);

  /* ── Thử 3: đặt quyền chia sẻ "ai có link cũng xem được" ───────────── */
  const quyen = await api(`https://www.googleapis.com/drive/v3/files/${t.id}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  kiem("dat duoc quyen chia se bang link", quyen.ok, quyen.ok ? "" : `${quyen.status} ${quyen.than.slice(0, 120)}`);
}

/* ── Dọn: xoá hẳn thư mục thử ─────────────────────────────────────────── */
if (idMoi) {
  const xoa = await api(`https://www.googleapis.com/drive/v3/files/${idMoi}`, { method: "DELETE" });
  kiem("XOA SACH thu muc thu", xoa.ok || xoa.status === 404, xoa.ok ? "" : `${xoa.status}`);
  const con = await api(`https://www.googleapis.com/drive/v3/files/${idMoi}?fields=id,trashed`);
  kiem("do lai: thu muc khong con", !con.ok || JSON.parse(con.than).trashed === true,
    con.ok ? `trashed=${JSON.parse(con.than).trashed}` : `${con.status}`);
}

console.log(`\nDAT ${dat} · TRUOT ${truot}`);
await p.$disconnect();
