/**
 * DỌN DẸP sau kịch bản thử — chạy độc lập được, bao nhiêu lần cũng được.
 *
 * Mọi thứ kịch bản tạo ra đều mang một trong ba dấu nhận biết dưới đây, nên
 * dọn không cần nhớ id nào. Viết TRƯỚC kịch bản chứ không phải sau: kịch bản
 * hỏng giữa chừng thì vẫn phải dọn sạch được.
 *
 *   npx tsx scripts/thu-don-dep.mts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { DAU } from "./thu-dau";

const { getPrisma } = await import("../src/lib/db");
const p = getPrisma();

const xoa: [string, () => Promise<{ count: number }>][] = [
  ["congViec", () => p.congViec.deleteMany({ where: { hopDong: { tenKhach: { contains: DAU.ten } } } })],
  ["lichChup", () => p.lichChup.deleteMany({ where: { hopDong: { tenKhach: { contains: DAU.ten } } } })],
  ["phieuThu", () => p.phieuThu.deleteMany({ where: { hopDong: { tenKhach: { contains: DAU.ten } } } })],
  ["chiTietHD", () => p.chiTietHopDong.deleteMany({ where: { hopDong: { tenKhach: { contains: DAU.ten } } } })],
  ["hopDong", () => p.hopDong.deleteMany({ where: { tenKhach: { contains: DAU.ten } } })],
  ["khachHang", () => p.khachHang.deleteMany({ where: { OR: [{ ten: { contains: DAU.ten } }, { soDienThoai: { in: [DAU.sdt, DAU.sdt2, DAU.sdt3] } }] } })],
  /* Album thử: xoá SelectionList và MucXong trước (khoá ngoại Cascade lo phần Selection). */
  ["mucXong", () => p.mucXong.deleteMany({ where: { gallery: { slug: { startsWith: "zz-thu-" } } } })],
  ["selectionList", () => p.selectionList.deleteMany({ where: { gallery: { slug: { startsWith: "zz-thu-" } } } })],
  ["gallery", () => p.gallery.deleteMany({ where: { slug: { startsWith: "zz-thu-" } } })],
  ["khachTiemNang", () => p.khachTiemNang.deleteMany({ where: { tenNguoi: { contains: DAU.ten } } })],
  ["chiTieu", () => p.chiTieu.deleteMany({ where: { dienGiai: { contains: DAU.ten } } })],
  ["chamCong", () => p.chamCong.deleteMany({ where: { maNV: { equals: DAU.maNV, mode: "insensitive" } } })],
  ["donTu", () => p.donTu.deleteMany({ where: { maNV: { equals: DAU.maNV, mode: "insensitive" } } })],
  ["suCo", () => p.suCo.deleteMany({ where: { vanDe: { contains: DAU.ten } } })],
  ["luongNhanVien", () => p.luongNhanVien.deleteMany({ where: { kyLuong: DAU.kyLuong } })],
  ["kyLuong", () => p.kyLuong.deleteMany({ where: { maAppSheet: DAU.kyLuong } })],
  /* Nhật ký: lọc theo TIỀN TỐ chung, và theo cả tên trong `chiTiet` — dòng do
     tài khoản thử ghi mang tên "ZZ THU quản lý", không phải "ZZ THU NGHIEM". */
  ["nhatKy", () => p.nhatKy.deleteMany({ where: { nguoiTen: { contains: DAU.tienTo } } })],
  ["nhatKy-ct", () => p.nhatKy.deleteMany({ where: { chiTiet: { path: ["ten"], string_contains: DAU.tienTo } } })],
  ["nhanVien", () => p.nhanVien.deleteMany({ where: { tenDangNhap: { startsWith: "zz-thu-" } } })],
];

let tong = 0;
for (const [ten, f] of xoa) {
  const { count } = await f();
  if (count) console.log(`  xoá ${String(count).padStart(3)} dòng ${ten}`);
  tong += count;
}
console.log(tong ? `Đã xoá ${tong} dòng.` : "Không còn gì để xoá.");

/* ── ĐO LẠI để xác nhận sạch, không chỉ tin là đã dọn ─────────────────── */
const con = {
  hopDong: await p.hopDong.count({ where: { tenKhach: { contains: DAU.ten } } }),
  khachHang: await p.khachHang.count({ where: { OR: [{ ten: { contains: DAU.ten } }, { soDienThoai: { in: [DAU.sdt, DAU.sdt2, DAU.sdt3] } }] } }),
  khachTiemNang: await p.khachTiemNang.count({ where: { tenNguoi: { contains: DAU.ten } } }),
  chiTieu: await p.chiTieu.count({ where: { dienGiai: { contains: DAU.ten } } }),
  chamCong: await p.chamCong.count({ where: { maNV: { equals: DAU.maNV, mode: "insensitive" } } }),
  donTu: await p.donTu.count({ where: { maNV: { equals: DAU.maNV, mode: "insensitive" } } }),
  suCo: await p.suCo.count({ where: { vanDe: { contains: DAU.ten } } }),
  kyLuong: await p.kyLuong.count({ where: { maAppSheet: DAU.kyLuong } }),
  luongNV: await p.luongNhanVien.count({ where: { kyLuong: DAU.kyLuong } }),
  nhatKy: await p.nhatKy.count({ where: { nguoiTen: { contains: DAU.tienTo } } }),
  nhatKyCt: await p.nhatKy.count({ where: { chiTiet: { path: ["ten"], string_contains: DAU.tienTo } } }),
  nhanVien: await p.nhanVien.count({ where: { tenDangNhap: { startsWith: "zz-thu-" } } }),
  gallery: await p.gallery.count({ where: { slug: { startsWith: "zz-thu-" } } }),
};
const sot = Object.entries(con).filter(([, v]) => v > 0);
console.log(sot.length ? `CÒN SÓT: ${sot.map(([k, v]) => `${k}=${v}`).join(", ")}` : "ĐÃ SẠCH — đo lại 13 bảng, không còn dòng thử nào.");

/* ── DỌN CẢ TRÊN DRIVE, không chỉ trong database (thêm 14/11/2026) ─────
 *
 * Từ hôm nay lập hợp đồng sẽ TẠO THƯ MỤC THẬT trên Drive của tiệm
 * (`taoThuMucVaAlbum`). Nghĩa là một kịch bản thử để sót không còn chỉ là
 * vài dòng database mà là thư mục nằm chình ình giữa kho ảnh cưới — chỗ
 * người thật mở ra xem mỗi ngày. Dọn một nửa còn tệ hơn không dọn, vì lần
 * sau nhìn database sạch là tưởng đã xong.
 *
 * Chỉ đụng thư mục mang đúng dấu thử và do chính web tạo (`'me' in owners`,
 * và `drive.file` vốn chỉ cho sửa tệp web tạo ra) — không với tới được một
 * tấm ảnh nào của khách.
 */
try {
  const { getUserAccessToken } = await import("../src/lib/googleAuth");
  const token = await getUserAccessToken().catch(() => null);
  if (!token) {
    console.log("Drive: chưa kết nối — bỏ qua phần dọn trên Drive.");
  } else {
    const q =
      `name contains '${DAU.tienTo}' and mimeType = 'application/vnd.google-apps.folder' ` +
      `and trashed = false and 'me' in owners`;
    const r = await fetch(
      `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q, fields: "files(id,name)", pageSize: "50" })}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!r.ok) {
      console.log(`Drive: không soát được (${r.status}).`);
    } else {
      const { files } = (await r.json()) as { files: { id: string; name: string }[] };
      for (const f of files) {
        const x = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log(`  Drive: ${x.ok ? "xoá" : `KHÔNG xoá được (${x.status})`} thư mục "${f.name}"`);
      }
      const lai = await fetch(
        `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q, fields: "files(id)", pageSize: "5" })}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const conLai = lai.ok ? ((await lai.json()) as { files: unknown[] }).files.length : -1;
      console.log(
        conLai === 0
          ? "Drive: SẠCH — không còn thư mục thử nào."
          : `Drive: CÒN ${conLai} thư mục thử.`,
      );
    }
  }
} catch (e) {
  console.log(`Drive: lỗi khi dọn — ${e instanceof Error ? e.message : String(e)}`);
}
