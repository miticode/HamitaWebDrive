/**
 * MỘT NHÀ KHÁCH ĐI TỪ ĐẦU TỚI CUỐI — kịch bản hành trình.
 *
 *   npx tsx scripts/thu-hanh-trinh.mts
 *   npx tsx scripts/thu-don-dep.mts       ← LUÔN chạy sau
 *
 * Khác hai kịch bản kia ở chỗ: `thu-toan-bo.mts` và `thu-tien.mts` thử TỪNG
 * chức năng rời nhau, còn đây đi một mạch như một nhà khách thật — khách hỏi
 * gói PreWedding, chốt, chụp hôm sau, chọn ảnh, retouch, trả nốt tiền.
 *
 * Lỗi của một hệ thống thường không nằm trong từng chức năng mà nằm ở CHỖ NỐI
 * giữa chúng: cái trước ghi ra một kiểu, cái sau đọc một kiểu khác.
 *
 * Dùng DỊCH VỤ THẬT của tiệm (ABHG — gói hay gặp nhất trong 53 hợp đồng
 * PreWedding thật, 5 hạng mục) để đầu việc tự sinh đúng như đời thực.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { DAU } from "./thu-dau";

const { getPrisma } = await import("../src/lib/db");
const { lapHopDongMoi } = await import("../src/lib/taoHopDong");
const { suaHopDong, themPhieuThu } = await import("../src/lib/suaHopDong");
const { themTiemNang, suaTiemNang } = await import("../src/lib/khachTiemNang");
const { albumCuaHopDong } = await import("../src/lib/noiAlbum");
const { ghepChacCuaAlbum } = await import("../src/lib/ghepAlbum");
const { docBuocDayDu, buocTiepTheo } = await import("../src/lib/buocHopDong");

const p = getPrisma();

let dat = 0;
let truot = 0;
const loi: string[] = [];
function kiem(ten: string, dung: boolean, them = "") {
  if (dung) {
    dat++;
    console.log(`   ✓ ${ten}${them ? ` — ${them}` : ""}`);
  } else {
    truot++;
    loi.push(`${ten}${them ? ` — ${them}` : ""}`);
    console.log(`   ✗ ${ten}${them ? ` — ${them}` : ""}`);
  }
}
const buoc = (n: number, s: string) => console.log(`\n${n}. ${s}`);
const chan = (kq: unknown): boolean => !!kq && typeof kq === "object" && "loi" in (kq as object);
const chuLoi = (kq: unknown): string => (chan(kq) ? (kq as { loi: string }).loi : "");

const SALE = { id: "zz", ten: DAU.ten, maNV: DAU.maNV, tenDangNhap: "zztest", laQuanLy: false };
const QUAN_LY = { ...SALE, laQuanLy: true };

/* Hôm nay và ngày mai theo giờ studio. */
const { homNayStudio } = await import("../src/lib/constants");
const HOM_NAY = homNayStudio();
const NGAY_MAI = new Date(new Date(`${HOM_NAY}T00:00:00+07:00`).getTime() + 86_400_000)
  .toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

const ban = await p.hopDong.count({ where: { tenKhach: { contains: DAU.ten } } });
if (ban) {
  console.error(`Còn ${ban} hợp đồng thử của lần trước. Chạy: npx tsx scripts/thu-don-dep.mts`);
  process.exit(1);
}

console.log(`Hành trình một nhà khách PreWedding · hôm nay ${HOM_NAY} · chụp ${NGAY_MAI}`);

/* ═══ 1. Khách hỏi giá, Sale ghi vào khách tiềm năng ═══════════════════ */
buoc(1, "Khách nhắn Facebook hỏi gói PreWedding — Sale ghi lại");
const tn = await themTiemNang(
  {
    tenNguoi: `${DAU.ten} prewedding`, soDienThoai: "", nguon: "Facebook",
    nhuCau: "Chụp PreWedding", diaChi: "", phuTrachMaNV: "", khaNang: "Tiềm năng",
    tinhTrang: "Tư vấn", ghiChu: "", loaiCskh: "Zalo", ngayLienHeLai: NGAY_MAI,
    themLichSu: "khách nhắn hỏi giá gói ngoại cảnh",
  },
  DAU.maNV,
);
kiem("ghi được khách tiềm năng chưa có số điện thoại", !chan(tn), chuLoi(tn));
const tnId = chan(tn) ? "" : (tn as { id: string }).id;

/* ═══ 2. Tư vấn xong, khách cho số và chốt ═════════════════════════════ */
buoc(2, "Tư vấn hai lần, khách cho số rồi chốt");
if (tnId) {
  await suaTiemNang(tnId, {
    tenNguoi: `${DAU.ten} prewedding`, soDienThoai: DAU.sdt, nguon: "Facebook",
    nhuCau: "Chụp PreWedding", diaChi: "Long An", phuTrachMaNV: DAU.maNV, khaNang: "Đã chốt",
    tinhTrang: "Chốt deal", ghiChu: "", loaiCskh: "Zalo", ngayLienHeLai: "",
    themLichSu: "gọi lần 2, khách chốt gói ABHG, hẹn chụp sáng mai",
  });
  const sau = await p.khachTiemNang.findUnique({ where: { id: tnId } });
  kiem("khách chuyển sang Đã chốt", sau?.khaNang === "Đã chốt");
  kiem("nhật ký chăm sóc giữ cả hai lần gọi", (sau?.lichSuCskh ?? "").includes("lần 2") && (sau?.lichSuCskh ?? "").includes("hỏi giá"));
  kiem("có số điện thoại sau khi tư vấn", sau?.soDienThoai === DAU.sdt);
}

/* ═══ 3. Lập hợp đồng với dịch vụ THẬT ════════════════════════════════ */
buoc(3, "Lập hợp đồng PreWedding — dịch vụ thật, lịch sáng mai 07:30, cọc 3 triệu");
const abhg = await p.dichVu.findFirst({ where: { maDV: "ABHG", dangDung: true }, select: { id: true, maDV: true, ten: true, loai: true, donGia: true } });
const lens = await p.dichVu.findFirst({ where: { maDV: "LENS MẮT", dangDung: true }, select: { id: true, maDV: true, ten: true, loai: true, donGia: true } });
kiem("tìm được gói ABHG trong bảng Dịch vụ", !!abhg, abhg ? `${abhg.donGia.toLocaleString("vi")}đ` : "");

const hangMuc = abhg ? await p.giaHangMuc.findMany({ where: { dichVuId: abhg.id }, select: { hangMuc: true, donGia: true } }) : [];
kiem("gói này có bảng giá hạng mục để sinh đầu việc", hangMuc.length > 0, `${hangMuc.length} hạng mục`);

const hd = await lapHopDongMoi(
  {
    khachHangId: null,
    khachMoi: { ten: `${DAU.ten} prewedding`, soDienThoai: DAU.sdt, tinh: "Long An", ghiChu: "" },
    tenKhach: `${DAU.ten} prewedding`,
    loaiDV: "PreWedding",
    ngayDat: HOM_NAY,
    diaChi: "Phim trường Hamita Garden",
    ghiChu: "",
    khuyenMai: 0,
    trangThai: "2. Đã có ngày chụp",
    dong: [
      { dichVuId: abhg?.id ?? null, maDV: abhg?.maDV ?? "ABHG", tenDV: abhg?.ten ?? "Album Hamita Garden", loai: abhg?.loai ?? "Dịch vụ", donGia: abhg?.donGia ?? 0, soLuong: 1, ngayChup: NGAY_MAI, chiTiet: "", ghiChu: "" },
      { dichVuId: lens?.id ?? null, maDV: lens?.maDV ?? "LENS", tenDV: lens?.ten ?? "lens mắt", loai: lens?.loai ?? "Dịch vụ", donGia: lens?.donGia ?? 0, soLuong: 2, ngayChup: "", chiTiet: "", ghiChu: "" },
    ] as never,
    thu: [{ ngayThu: HOM_NAY, soTien: 3_000_000, hinhThuc: "Chuyển khoản", noiDung: "Cọc", ghiChu: "" }] as never,
    lich: [{ ngay: NGAY_MAI, gio: "07:30", loai: "Ngày chụp", ghiChu: "đón khách tại studio", hienThi: "" }] as never,
    viec: hangMuc.map((h) => ({ dong: 0, loai: h.hangMuc ?? "Việc", donGia: h.donGia, soLuong: 1, thoiHan: NGAY_MAI })) as never,
  },
  SALE,
);
kiem("Sale lập được hợp đồng", !chan(hd), chan(hd) ? chuLoi(hd) : (hd as { maHD: string }).maHD);
const hdId = chan(hd) ? "" : (hd as { id: string }).id;

if (!hdId) {
  console.log("\nKhông lập được hợp đồng — dừng hành trình.");
  process.exit(1);
}

const d1 = await p.hopDong.findUnique({ where: { id: hdId }, include: { chiTiet: true, phieuThu: true, lich: true, congViec: true, khachHang: true } });
kiem("khách mới được tạo từ hợp đồng", !!d1?.khachHangId);
kiem("mã khách là số điện thoại", d1?.khachHang?.maAppSheet === DAU.sdt);
kiem("hai dòng dịch vụ", d1?.chiTiet.length === 2);
kiem("tiền hàng = ABHG + 2 × lens", d1?.thanhTien === (abhg?.donGia ?? 0) + (lens?.donGia ?? 0) * 2, `${d1?.thanhTien.toLocaleString("vi")}đ`);
kiem("đã thu 3 triệu cọc", d1?.daThu === 3_000_000);
kiem("còn lại = tổng − cọc", d1?.conLai === (d1?.tongTien ?? 0) - 3_000_000, `${d1?.conLai.toLocaleString("vi")}đ`);
kiem("phiếu cọc của SALE nằm Chờ duyệt", d1?.phieuThu[0]?.trangThai === "Chờ duyệt", d1?.phieuThu[0]?.trangThai ?? "");
kiem("lịch chụp đúng NGÀY MAI", d1?.lich[0]?.ngay === NGAY_MAI, d1?.lich[0]?.ngay ?? "");
kiem("lịch có GIỜ 07:30", d1?.lich[0]?.gio === "07:30", d1?.lich[0]?.gio ?? "(trống)");
kiem("đầu việc tự sinh theo bảng giá hạng mục", (d1?.congViec.length ?? 0) === hangMuc.length, `${d1?.congViec.length} việc`);
kiem("đầu việc mang thời hạn là ngày chụp", d1?.congViec.every((v) => v.thoiHan === NGAY_MAI) ?? false);

/* ═══ 4. Hôm nay nhìn vào hệ thống thấy gì ════════════════════════════ */
buoc(4, "Hôm nay quản lý mở web — thấy gì");
const lichHomNay = await p.lichChup.count({ where: { matBenAppSheet: null, ngay: HOM_NAY } });
const lichMai = await p.lichChup.count({ where: { matBenAppSheet: null, ngay: NGAY_MAI } });
kiem("buổi chụp KHÔNG tính vào 'lịch hôm nay'", lichMai > 0, `hôm nay ${lichHomNay} · ngày mai ${lichMai}`);
const choDuyet = await p.phieuThu.count({ where: { matBenAppSheet: null, trangThai: "Chờ duyệt" } });
kiem("phiếu cọc nằm trong danh sách chờ quản lý duyệt", choDuyet > 0, `${choDuyet} phiếu`);

/* ═══ 5. Quản lý duyệt cọc ════════════════════════════════════════════ */
buoc(5, "Quản lý duyệt phiếu cọc");
const { duyetPhieuThu } = await import("../src/lib/suaHopDong");
await duyetPhieuThu(d1!.phieuThu[0].id, QUAN_LY);
const sauDuyet = await p.hopDong.findUnique({ where: { id: hdId }, include: { phieuThu: true } });
kiem("phiếu đổi sang đã thu", sauDuyet?.phieuThu[0].trangThai === "Đã thu chuyển khoản", sauDuyet?.phieuThu[0].trangThai ?? "");
kiem("đã thu KHÔNG cộng hai lần sau khi duyệt", sauDuyet?.daThu === 3_000_000, `${sauDuyet?.daThu.toLocaleString("vi")}đ`);

/* ═══ 6. Hôm sau: chụp xong ═══════════════════════════════════════════ */
buoc(6, "Sáng mai chụp xong — chuyển bước 2 → 3");
const dongCu = (await p.chiTietHopDong.findMany({ where: { hopDongId: hdId } })).map((c) => ({
  id: c.id, dichVuId: c.dichVuId, maDV: c.maDV ?? "", tenDV: c.tenDV ?? "", loai: c.loai ?? "",
  donGia: c.donGia, soLuong: c.soLuong, ngayChup: c.ngayChup ?? "", chiTiet: c.chiTiet ?? "", ghiChu: c.ghiChu ?? "",
}));
const sua = (tt: string) => ({
  tenKhach: `${DAU.ten} prewedding`, loaiDV: "PreWedding", ngayDat: HOM_NAY,
  diaChi: "Phim trường Hamita Garden", ghiChu: "", khuyenMai: 0, trangThai: tt, dong: dongCu,
});
kiem("chuyển sang '3. Đã chụp'", !chan(await suaHopDong(hdId, sua("3. Đã chụp") as never, QUAN_LY)));

const cacBuoc = await docBuocDayDu();
const sau3 = await p.hopDong.findUnique({ where: { id: hdId } });
kiem("web chỉ đúng bước kế tiếp", buocTiepTheo(cacBuoc, sau3?.trangThai ?? null)?.thuTu === 4, buocTiepTheo(cacBuoc, sau3?.trangThai ?? null)?.ten ?? "");
kiem("và nói ai lo bước đó", !!buocTiepTheo(cacBuoc, sau3?.trangThai ?? null)?.trachNhiem, buocTiepTheo(cacBuoc, sau3?.trangThai ?? null)?.trachNhiem ?? "(trống)");

/* ═══ 7. Media tạo album và ghép hợp đồng ═════════════════════════════ */
buoc(7, "Media tạo album, web tự đề nghị hợp đồng");
const album = await p.gallery.create({
  data: {
    slug: `zz-thu-prewedding-${Date.now().toString(36)}`,
    title: `HC - ${DAU.ten} prewedding`,
    clientName: `HC - ${DAU.ten} prewedding`,
    driveFolderId: "zz-thu-folder",
    photoCount: 420,
    subfolders: [],
  },
});
const deNghi = await ghepChacCuaAlbum(album.clientName!);
kiem("web tự tìm ra hợp đồng khớp rõ", deNghi?.hopDongId === hdId, deNghi?.tenHopDong ?? "không tìm thấy");

await p.gallery.update({ where: { id: album.id }, data: { hopDongId: hdId } });
const daGan = await albumCuaHopDong(hdId);
kiem("trang hợp đồng thấy album", daGan.length === 1, daGan[0]?.ten ?? "");

/* ═══ 8. Gửi link, khách chọn ảnh ═════════════════════════════════════ */
buoc(8, "Gửi link, khách chọn 80 ảnh rồi báo xong");
const ds = await p.selectionList.create({ data: { galleryId: album.id, name: "Ảnh in", icon: "heart" } });
await p.selection.createMany({
  data: Array.from({ length: 80 }, (_, i) => ({
    listId: ds.id, driveFileId: `zz-file-${i}`, fileName: `IMG_${i}.jpg`,
    albumName: "Ngoại cảnh", visitorId: "zz-visitor",
  })),
});
await p.mucXong.create({ data: { galleryId: album.id, albumId: "", tenMuc: "Ngoại cảnh", loai: "xong" } });

const sauChon = await albumCuaHopDong(hdId);
kiem("trang hợp đồng đếm đúng số ảnh khách thả tim", sauChon[0]?.soTim === 80, `${sauChon[0]?.soTim} tấm`);
kiem("và biết khách đã báo xong", !!sauChon[0]?.xongLuc);
kiem("đếm đúng số thư mục báo xong", sauChon[0]?.soMucXong === 1);

/* ═══ 9. Lời nhắc chuyển bước ═════════════════════════════════════════ */
buoc(9, "Hợp đồng còn ở bước 3 mà khách đã chọn xong — web có nhắc không");
await suaHopDong(hdId, sua("4. Đã gửi ảnh gốc, chờ Khách chọn") as never, QUAN_LY);
const o4 = await p.hopDong.findUnique({ where: { id: hdId } });
const albumXong = (await albumCuaHopDong(hdId)).find((a) => a.xongLuc);
/* Cùng phép kiểm mà trang chi tiết hợp đồng dùng (xem `[id]/page.tsx`). */
const nhac = !!albumXong && (o4?.buoc === 4 || o4?.buoc === 13);
kiem("web nhắc chuyển bước khi khách chọn xong", nhac, `đang ở bước ${o4?.buoc}`);

/* ═══ 10. Giao Retouch ════════════════════════════════════════════════ */
buoc(10, "Giao việc Photoshop cho người, rồi làm xong");
const viecPS = await p.congViec.findFirst({ where: { hopDongId: hdId, loai: { contains: "hotoshop" } } });
kiem("có đầu việc Photoshop sinh sẵn từ lúc lập hợp đồng", !!viecPS, viecPS?.loai ?? "");
if (viecPS) {
  await p.congViec.update({ where: { id: viecPS.id }, data: { nguoiPhuTrachMaNV: DAU.maNV, trangThai: "Đang làm" } });
  await suaHopDong(hdId, sua("5. Đang Retouch") as never, QUAN_LY);
  await p.congViec.update({ where: { id: viecPS.id }, data: { trangThai: "Đã làm", ngayHoanThanh: NGAY_MAI } });
  const v = await p.congViec.findUnique({ where: { id: viecPS.id } });
  kiem("việc giao được và đánh dấu xong", v?.trangThai === "Đã làm" && !!v.ngayHoanThanh);
}

/* ═══ 11. Đi hết tới Hoàn thành ═══════════════════════════════════════ */
buoc(11, "Duyệt ảnh, gửi in, nhận hình, hoàn thành");
let diDu = true;
for (const b of ["6. Chờ Khách duyệt", "7. Gửi in", "8. Đã nhận hình in", "9. Hoàn thành"]) {
  if (chan(await suaHopDong(hdId, sua(b) as never, QUAN_LY))) diDu = false;
}
kiem("đi hết các bước còn lại không vướng", diDu);
const xong = await p.hopDong.findUnique({ where: { id: hdId } });
kiem("hợp đồng ở bước 9", xong?.buoc === 9);
const { laBuocXong } = await import("../src/lib/buocHopDong");
kiem("web biết đây là điểm kết của nhánh chụp", laBuocXong(cacBuoc, xong?.trangThai ?? null));

/* ═══ 12. Khách trả nốt tiền ══════════════════════════════════════════ */
buoc(12, "Khách trả nốt — công nợ phải về 0");
const conPhaiThu = xong?.conLai ?? 0;
await themPhieuThu(hdId, { ngayThu: NGAY_MAI, soTien: conPhaiThu, hinhThuc: "Tiền mặt", noiDung: "Thanh toán đủ", ghiChu: "" } as never, QUAN_LY);
const cuoi = await p.hopDong.findUnique({ where: { id: hdId }, include: { phieuThu: true } });
kiem("đã thu = tổng hợp đồng", cuoi?.daThu === cuoi?.tongTien, `${cuoi?.daThu.toLocaleString("vi")}đ`);
kiem("còn lại về 0", cuoi?.conLai === 0);
kiem("hai phiếu thu: cọc và tất toán", cuoi?.phieuThu.length === 2);
const noSau = await p.hopDong.count({ where: { matBenAppSheet: null, conLai: { gt: 0 }, id: hdId } });
kiem("hợp đồng rời khỏi danh sách còn nợ", noSau === 0);

/* ═══ 13. Nhà khách nhìn lại ══════════════════════════════════════════ */
buoc(13, "Mở hồ sơ nhà khách — thấy đủ hành trình chưa");
const kh = await p.khachHang.findUnique({
  where: { id: d1!.khachHangId! },
  include: { hopDong: { include: { chiTiet: true, phieuThu: true, lich: true, congViec: true } } },
});
kiem("nhà khách có đúng một hợp đồng", kh?.hopDong.length === 1);
const h = kh?.hopDong[0];
kiem("và từ đó thấy được dịch vụ, phiếu thu, lịch, đầu việc", !!h && h.chiTiet.length === 2 && h.phieuThu.length === 2 && h.lich.length === 1 && h.congViec.length === hangMuc.length);
const albumCuoi = await albumCuaHopDong(hdId);
kiem("và thấy album kèm số ảnh khách đã chọn", albumCuoi.length === 1 && albumCuoi[0].soTim === 80);

/* ═══ TỔNG KẾT ════════════════════════════════════════════════════════ */
console.log(`\n${"═".repeat(62)}`);
console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
if (truot) {
  console.log("\nKhông đạt:");
  for (const l of loi) console.log(`  · ${l}`);
}
console.log("\nChạy tiếp: npx tsx scripts/thu-don-dep.mts");
