/**
 * Thử `taoThuMucVaAlbum` trên dữ liệu thật rồi DỌN SẠCH cả hai đầu:
 * thư mục trên Drive và album trong database.
 *
 * Đo luôn thời gian, để quyết định tạo đồng bộ lúc lập hợp đồng (người lập
 * đợi) hay đẩy xuống chạy nền (xong rồi mới hiện, phải tải lại trang).
 *
 * Chạy: npx tsx scripts/thu-tao-album-hd.mts
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

const { DAU } = await import("./thu-dau.js");
const { getPrisma } = await import("../src/lib/db");
const { getUserAccessToken } = await import("../src/lib/googleAuth");
const { lapHopDongMoi } = await import("../src/lib/taoHopDong");
const { taoThuMucVaAlbum, coGiaoAnh } = await import("../src/lib/thuMucHopDong");

const p = getPrisma();
const NGUOI = { id: "", ten: `${DAU.tienTo} quan ly`, maNV: DAU.maNV, tenDangNhap: "zz-thu-quan-tri" };

let dat = 0, truot = 0;
const kiem = (ten: string, ok: boolean, them = "") => {
  console.log(`  ${ok ? "OK " : "XX "} ${ten}${them ? ` — ${them}` : ""}`);
  if (ok) dat++;
  else truot++;
};

/* ── Phép lọc loại ─────────────────────────────────────────────────────── */
console.log("Loai hop dong nao sinh album:");
kiem('CƯỚI co giao anh', coGiaoAnh("CƯỚI"));
kiem('PreWedding co giao anh', coGiaoAnh("PreWedding"));
kiem('Baby co giao anh', coGiaoAnh("Baby"));
kiem('"Khách lẻ" KHONG giao anh', !coGiaoAnh("Khách lẻ"));
kiem('"Mâm quả" KHONG giao anh', !coGiaoAnh("Mâm quả"));
kiem("loai trong thi KHONG tao", !coGiaoAnh(""));
kiem("loai null thi KHONG tao", !coGiaoAnh(null));

/* ── Lập một hợp đồng thử, có lịch chụp tháng khác tháng lập ──────────── */
const tao = await lapHopDongMoi(
  {
    khachHangId: null,
    khachMoi: { ten: `${DAU.ten} album`, soDienThoai: DAU.sdt, tinh: "", ghiChu: "" },
    tenKhach: `${DAU.ten} album`,
    loaiDV: "PreWedding",
    ngayDat: "2026-11-14",
    diaChi: "",
    ghiChu: "",
    khuyenMai: 0,
    trangThai: "2. Đã có ngày chụp",
    dong: [{ dichVuId: null, maDV: "", tenDV: `${DAU.ten} goi`, loai: "dich-vu", donGia: 1_000_000, soLuong: 1, ngayChup: "", chiTiet: "", ghiChu: "" }],
    thu: [],
    /* Chụp tháng 3 năm sau — thư mục PHẢI vào T3 của 2027, không phải T11/2026. */
    lich: [{ ngay: "2027-03-08", gio: "", diaDiem: "", noiDung: "", ghiChu: "" }],
    viec: [],
  } as never,
  NGUOI as never,
);
if ("loi" in tao) { console.log(`\nKhong lap duoc hop dong: ${tao.loi}`); process.exit(1); }
console.log(`\nHop dong thu ${tao.maHD}, lap 11/2026, chup 08/03/2027\n`);

const batDau = Date.now();
const TEN_DAT = `HIS - ${DAU.ten} dat ten`;
const kq = await taoThuMucVaAlbum(tao.id, TEN_DAT);
const giay = ((Date.now() - batDau) / 1000).toFixed(2);

kiem("tao duoc thu muc + album", kq.ok, kq.ok ? kq.tenThuMuc : kq.loi);
console.log(`       mat ${giay} giay`);

if (kq.ok) {
  const album = await p.gallery.findUnique({
    where: { id: kq.galleryId },
    select: { hopDongId: true, driveFolderId: true, clientName: true, allowDownload: true, accessCode: true },
  });
  kiem("album GAN SAN hop dong", album?.hopDongId === tao.id);
  kiem("album tro dung thu muc vua tao", album?.driveFolderId === kq.thuMucDrive);
  kiem("da bat quyen tai (anh chot 14/11)", album?.allowDownload === true);
  kiem("da dat ma truy cap", !!album?.accessCode);
  kiem("album mang TEN TU CHON, khong phai ten tren hop dong",
    album?.clientName === TEN_DAT, album?.clientName ?? "");
  kiem("thu muc Drive cung mang ten do", kq.tenThuMuc === TEN_DAT, kq.tenThuMuc);

  /* Thư mục có nằm đúng T3 của 2027 không? */
  const token = await getUserAccessToken();
  const doc = async (id: string) => {
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,parents,trashed`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.ok ? ((await r.json()) as { name: string; parents?: string[]; trashed?: boolean }) : null;
  };
  const tm = await doc(kq.thuMucDrive);
  const thang = tm?.parents?.[0] ? await doc(tm.parents[0]) : null;
  const nam = thang?.parents?.[0] ? await doc(thang.parents[0]) : null;
  console.log(`       cay: "${nam?.name}" / "${thang?.name}" / "${tm?.name}"`);
  kiem("nam dung thu muc thang CHUP, khong phai thang lap", thang?.name === "T3", thang?.name ?? "?");
  kiem("nam dung nam 2027", nam?.name === "2027", nam?.name ?? "?");

  /* ── DỌN: xoá thư mục Drive, album, rồi đo lại ──────────────────────── */
  await fetch(`https://www.googleapis.com/drive/v3/files/${kq.thuMucDrive}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const conTM = await doc(kq.thuMucDrive);
  kiem("DON: thu muc album da xoa", !conTM || conTM.trashed === true);

  /* Thư mục T3 và 2027 do script này tạo ra — xoá nốt nếu còn rỗng. */
  for (const id of [thang?.parents ? tm?.parents?.[0] : null, nam ? thang?.parents?.[0] : null]) {
    if (!id) continue;
    const con = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${id}' in parents and trashed = false&fields=files(id)&pageSize=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const j = con.ok ? ((await con.json()) as { files: unknown[] }) : { files: [1] };
    if (j.files.length === 0) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`       da xoa them mot thu muc rong do script tao`);
    }
  }
}

console.log(`\nDAT ${dat} · TRUOT ${truot}`);
console.log("Don not hop dong thu: npx tsx scripts/thu-don-dep.mts");
await p.$disconnect();
