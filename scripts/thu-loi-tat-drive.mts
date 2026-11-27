/**
 * THỬ MỘT LỐI TẮT TRÊN DRIVE THẬT — anh duyệt 27/11/2026 (chọn cách B).
 *
 *   npx tsx scripts/thu-loi-tat-drive.mts
 *
 * Câu hỏi phải trả lời trước khi viết bất cứ dòng nào vào luồng thật: album
 * có ĐỌC ĐƯỢC ảnh qua một lối tắt Drive không, với đúng quyền web đang có.
 *
 * Anh hỏi: "giả sử khách đó làm prewedding và cưới thì thư mục album đang nằm
 * bên drive chứa a cưới, rồi sau này chụp bé… thì thư mục tạo ra nằm ở bên
 * drive kia nhưng vẫn hiển thị chung album được k".
 *
 * Cách B: thư mục thật vẫn nằm đúng nếp năm/tháng, nhưng có một LỐI TẮT đặt
 * trong thư mục album cũ trỏ sang nó.
 *
 * AN TOÀN: kịch bản tạo MỘT thư mục thử của riêng nó rồi đặt lối tắt bên
 * trong, trỏ tới một thư mục album có sẵn — CHỈ TRỎ TỚI, không sửa gì album
 * ấy. Xong thì xoá thư mục thử và đo lại để xác nhận sạch.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { getUserAccessToken } = await import("../src/lib/googleAuth");
const { getGalleryTree } = await import("../src/lib/drive");
const { getPrisma } = await import("../src/lib/db");

const API = "https://www.googleapis.com/drive/v3";
const FOLDER = "application/vnd.google-apps.folder";
const SHORTCUT = "application/vnd.google-apps.shortcut";
const TEN_THU = `THU-LOI-TAT-${Date.now()}`;

let truot = 0;
const kiem = (ten: string, duoc: unknown, mong: unknown) => {
  const ok = JSON.stringify(duoc) === JSON.stringify(mong);
  if (!ok) truot++;
  console.log(`${ok ? "  ok " : "TRUOT"} ${ten} → ${JSON.stringify(duoc)} (mong ${JSON.stringify(mong)})`);
};

const token = await getUserAccessToken();
if (!token) {
  console.log("Chưa kết nối Google Drive — không chạy được.");
  process.exit(1);
}

async function goi(path: string, init?: RequestInit & { params?: Record<string, string> }) {
  const url = `${API}${path}${init?.params ? "?" + new URLSearchParams(init.params) : ""}`;
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const chu = await r.text();
  if (!r.ok) throw new Error(`Drive ${r.status}: ${chu.slice(0, 300)}`);
  return chu ? JSON.parse(chu) : {};
}

/* Một album THẬT có ảnh, để lối tắt trỏ tới — chỉ đọc, không đụng. */
const p = getPrisma();
const mau = await p.gallery.findFirst({
  where: { photoCount: { gt: 0 } },
  select: { title: true, driveFolderId: true, photoCount: true },
  orderBy: { photoCount: "asc" },
});
await p.$disconnect();
if (!mau) {
  console.log("Không tìm thấy album nào có ảnh để thử.");
  process.exit(1);
}
console.log(`Album mẫu để trỏ tới: "${mau.title}" (${mau.photoCount} ảnh)\n`);

let idThu: string | null = null;
try {
  /* 1. Thư mục thử của riêng kịch bản này, nằm ngay gốc Drive. */
  const thu = await goi("/files", {
    method: "POST",
    params: { supportsAllDrives: "true", fields: "id,name" },
    body: JSON.stringify({ name: TEN_THU, mimeType: FOLDER }),
  });
  idThu = thu.id as string;
  console.log(`1. Đã tạo thư mục thử ${TEN_THU}`);

  /* 2. Lối tắt bên trong, trỏ tới album mẫu. */
  const loiTat = await goi("/files", {
    method: "POST",
    params: { supportsAllDrives: "true", fields: "id,name,mimeType,shortcutDetails" },
    body: JSON.stringify({
      name: "Ảnh lần chụp sau",
      mimeType: SHORTCUT,
      parents: [idThu],
      shortcutDetails: { targetId: mau.driveFolderId },
    }),
  });
  console.log(`2. Đã tạo lối tắt "${loiTat.name}"`);
  kiem("lối tắt mang đúng mimeType", loiTat.mimeType, SHORTCUT);
  kiem("lối tắt trỏ đúng thư mục đích", loiTat.shortcutDetails?.targetId, mau.driveFolderId);
  kiem("Drive cho biết đích là THƯ MỤC", loiTat.shortcutDetails?.targetMimeType, FOLDER);

  /* 3. Liệt kê con của thư mục thử — đúng cách `listChildren` đang làm. */
  const ls = await goi("/files", {
    params: {
      q: `'${idThu}' in parents and trashed = false`,
      fields: "files(id,name,mimeType,shortcutDetails(targetId,targetMimeType))",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    },
  });
  const con = (ls.files ?? []) as { name: string; mimeType: string; shortcutDetails?: { targetId: string } }[];
  console.log(`3. Liệt kê con: ${con.map((f) => `${f.name} [${f.mimeType.split(".").pop()}]`).join(", ")}`);
  kiem("thấy đúng một mục con", con.length, 1);
  kiem("và nó KHÔNG mang mimeType folder", con[0]?.mimeType === FOLDER, false);
  kiem("nhưng đọc được targetId để đi tiếp", !!con[0]?.shortcutDetails?.targetId, true);

  /* 4. Đọc thư mục đích qua targetId — có ra ảnh không. */
  const dich = con[0]!.shortcutDetails!.targetId;
  const anh = await goi("/files", {
    params: {
      q: `'${dich}' in parents and trashed = false`,
      fields: "files(id,name,mimeType)",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      pageSize: "10",
    },
  });
  const soCon = (anh.files ?? []).length;
  console.log(`4. Đi theo lối tắt, thư mục đích có ${soCon} mục con`);
  kiem("đi theo lối tắt đọc được nội dung đích", soCon > 0, true);

  /* 5. Và `getGalleryTree` hiện tại thấy gì — đây mới là câu hỏi thật. */
  const cay = await getGalleryTree(idThu);
  console.log(`5. getGalleryTree() đọc thư mục thử: ${cay.albums.length} mục · ${cay.totalPhotos} ảnh`);
  console.log(`   mục thấy được: ${cay.albums.map((a) => `"${a.name}" (${a.photos.length} ảnh)`).join(", ") || "(không có)"}`);
  kiem("đi qua lối tắt thấy đúng một mục", cay.albums.length, 1);
  kiem("mục mang TÊN CỦA LỐI TẮT, không phải tên thư mục đích", cay.albums[0]?.name, "Ảnh lần chụp sau");
  kiem("và đọc đủ ảnh của thư mục đích", cay.totalPhotos, mau.photoCount);
} finally {
  console.log("\n— Dọn —");
  if (idThu) {
    await goi(`/files/${idThu}`, { method: "DELETE", params: { supportsAllDrives: "true" } });
    /* Đo lại chứ không tin là đã xoá. */
    const con = await goi("/files", {
      params: {
        q: `name = '${TEN_THU}' and trashed = false`,
        fields: "files(id)",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
      },
    });
    kiem("không còn thư mục thử trên Drive", (con.files ?? []).length, 0);
  }
}

console.log(truot === 0 ? "\nTẤT CẢ ĐỀU ĐÚNG" : `\nCÓ ${truot} PHÉP TRƯỢT`);
process.exit(truot === 0 ? 0 : 1);
